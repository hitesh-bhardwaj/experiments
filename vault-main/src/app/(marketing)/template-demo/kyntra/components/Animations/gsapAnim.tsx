// Built using Hyperiux Vault: https://vault.hyperiux.com

"use client";

import {
  useRef,
  type ComponentPropsWithoutRef,
  type ElementType,
  type ReactNode,
} from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { prefersReducedMotion } from "./reducedMotion";

gsap.registerPlugin(useGSAP, ScrollTrigger, SplitText);

// Reduced motion still reveals, just as a short fade
const REDUCED_MOTION_FADE = 0.3;


const FONT_WAIT_CAP = 300;

type FadeUpProps<T extends ElementType> = {
  /** Element to render as */
  as?: T;
  children?: ReactNode;
  className?: string;
  /** Delay, for staggering siblings */
  delay?: number;
  /** Selector for the triggering element */
  watch?: string;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "children" | "className">;

/** Fades children up on first view */
export function FadeUp<T extends ElementType = "div">({
  as,
  children,
  className = "",
  delay = 0,
  watch,
  ...props
}: FadeUpProps<T>) {
  const Tag = (as ?? "div") as any;
  const ref = useRef<any>(null);

  useGSAP(() => {
    const el = ref.current;
    if (!el) return;

    // Class prevents flash; paths restore opacity
    if (prefersReducedMotion()) {
      gsap.set(el, { opacity: 1 });
      return;
    }

    // Adds only the starting offset
    gsap.set(el, { y: 24 });

    // Fixed elements need an external trigger
    const target = (watch && document.querySelector(watch)) || el;

    // Fires once, then disconnects
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        gsap.to(el, {
          opacity: 1,
          y: 0,
          duration: 0.8,
          delay,
          ease: "power2.out",
          onComplete: () => {
       
            el.style.removeProperty("opacity");
            el.classList.remove("opacity-0");
          },
        });
        observer.disconnect();
      },
      { rootMargin: "0px 0px -15% 0px" },
    );
    observer.observe(target);

    return () => observer.disconnect();
  }, []);

  return (
    <Tag ref={ref} className={`opacity-0 ${className}`.trim()} {...props}>
      {children}
    </Tag>
  );
}

export default FadeUp;

type ParaAnimProps<T extends ElementType> = {
  /** Element to render as */
  as?: T;
  children?: ReactNode;
  className?: string;
  /** Delay, ignored when scrubbing */
  delay?: number;
  /** Scrub instead of playing once */
  scrub?: boolean | number;
  /** ScrollTrigger start string */
  top?: string;
  /** Seconds between each line */
  stagger?: number;
  duration?: number;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "children" | "className">;

/** Reveals copy line by line */
export function ParaAnim<T extends ElementType = "div">({
  as,
  children,
  className = "",
  delay = 0,
  scrub = false,
  top = "top 85%",
  stagger = 0.08,
  duration = 0.85,
  ...props
}: ParaAnimProps<T>) {
  const Tag = (as ?? "div") as any;
  const ref = useRef<any>(null);

  useGSAP(() => {
    const el = ref.current;
    if (!el) return;

    let split: SplitText | null = null;
    let trigger: ScrollTrigger | null = null;

    if (prefersReducedMotion()) {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (!entry.isIntersecting) return;
          gsap.to(el, {
            opacity: 1,
            duration: REDUCED_MOTION_FADE,
    
            delay: scrub ? 0 : delay,
            ease: "none",
            onComplete: () => {
              el.style.removeProperty("opacity");
              el.classList.remove("opacity-0");
            },
          });
          observer.disconnect();
        },
        { rootMargin: "0px 0px -15% 0px" },
      );
      observer.observe(el);

      return () => observer.disconnect();
    }

    let fontTimer: number | undefined;
    let deferredObserver: IntersectionObserver | null = null;

    const init = () => {
      if (!ref.current) return;

      split = SplitText.create(el, {
        type: "lines",
        linesClass: "line-wrapper",
        // Lines rise from their own box
        mask: "lines",
      });

      const lines = split.lines;
      if (!lines || lines.length === 0) {
        gsap.set(el, { opacity: 1 });
        return;
      }

      gsap.set(el, { opacity: 1 });
      gsap.set(lines, { yPercent: 150 });

      const to = {
        yPercent: 0,
        duration,
        stagger,
        ease: "power3.out",
      };

      if (scrub) {
        gsap.to(lines, {
          ...to,
          scrollTrigger: {
            trigger: el,
            start: top,
            end: "bottom 60%",
            scrub: scrub === true ? true : scrub,
          },
        });
        return;
      }

      // Copy already on screen would otherwise wait for ScrollTrigger's first
      // refresh before onEnter fires. Same tween, started directly.
      const rect = el.getBoundingClientRect();
      const inView = rect.top < window.innerHeight && rect.bottom > 0;
      if (inView) {
        gsap.to(lines, { ...to, delay });
        return;
      }

      trigger = ScrollTrigger.create({
        trigger: el,
        start: top,
        once: true,
        onEnter: () => gsap.to(lines, { ...to, delay }),
      });
    };

    // Wait only on the faces this element actually renders in, and never
    // longer than FONT_WAIT_CAP.
    const splitWhenFontReady = () => {
      let done = false;
      const runOnce = () => {
        if (done) return;
        done = true;
        window.clearTimeout(fontTimer);
        init();
      };

      const fonts = document.fonts;
      if (!fonts) {
        init();
        return;
      }

      const { fontFamily, fontWeight, fontSize } = getComputedStyle(el);
      try {
        fonts.load(`${fontWeight} ${fontSize} ${fontFamily}`).then(runOnce, runOnce);
      } catch {
        // Malformed shorthand: fall back to the whole-page promise
        fonts.ready.then(runOnce, runOnce);
      }

      fontTimer = window.setTimeout(runOnce, FONT_WAIT_CAP);
    };


    const box = el.getBoundingClientRect();
    const nearViewport =
      box.top < window.innerHeight * 1.5 && box.bottom > -window.innerHeight;

    if (nearViewport) {
      splitWhenFontReady();
    } else {
      deferredObserver = new IntersectionObserver(
        ([entry], obs) => {
          if (!entry.isIntersecting) return;
          obs.disconnect();
          deferredObserver = null;
          splitWhenFontReady();
        },
        { rootMargin: "200% 0px" },
      );
      deferredObserver.observe(el);
    }

    return () => {
      window.clearTimeout(fontTimer);
      deferredObserver?.disconnect();
      trigger?.kill();
      split?.revert();
    };
  }, []);

  return (
    <Tag ref={ref} className={`opacity-0 ${className}`.trim()} {...props}>
      {children}
    </Tag>
  );
}

/** Draws hairline rules on scroll */
export function lineDraw() {
  /* eslint-disable-next-line react-hooks/rules-of-hooks */
  useGSAP(
    () => {
      const elements =
        document.querySelectorAll<HTMLElement>("[data-line-draw]");
      const reducedMotion = prefersReducedMotion();

      elements.forEach((element) => {
        // Trigger the container, not the line
        const trigger = element.parentElement ?? element;

        if (reducedMotion) {
          gsap.from(element, {
            scrollTrigger: { 
              trigger, 
              start: "top 65%",
             },
            opacity: 0,
            duration: 0.8,
            ease: "power2.out",
            
          });
          return;
        }

        gsap.fromTo(
          element,
          { scaleX: 0 },
          {
            scrollTrigger: { 
              trigger, 
              start: "top 65%",
             },
            scaleX: 1,
            transformOrigin: "left",
            duration: 0.8,
            ease: "power2.out",
          },
        );
      });
    },
    // Empty deps: avoids stacking triggers
    { dependencies: [] },
  );
}
