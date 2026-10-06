// Built using Hyperiux Vault: https://vault.hyperiux.com

"use client";

import { useEffect, useRef, type ReactNode } from "react";
import gsap from "gsap";
import { SplitText } from "gsap/SplitText";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(SplitText, ScrollTrigger);

type OverflowTextRevealDirection = 'top' | 'bottom' | 'left' | 'right';
type OverflowTextRevealSplitBy = 'chars' | 'lines';

// "bottom" is the original default behavior (yPercent: 100, rotate: 8)
const DIRECTION_INITIAL: Record<OverflowTextRevealDirection, { yPercent: number, xPercent: number, rotate: number }> = {
  top: { yPercent: -100, xPercent: 0, rotate: 0 },
  bottom: { yPercent: 100, xPercent: 0, rotate: 0 },
  left: { yPercent: 0, xPercent: -100, rotate: 0 },
  right: { yPercent: 0, xPercent: 100, rotate: 0 },
};

// `document.fonts.ready` waits on every face on the page, holding copy at
// opacity 0 the whole time. Faces are `font-display: swap`, so text is already
// painting in the fallback by the time this cap fires.
const FONT_WAIT_CAP = 300;

const REDUCED_MOTION_FADE_DURATION = 0.8;
const REDUCED_MOTION_Y_OFFSET = 24;
const DEFAULT_TEXT = <p>Characters rise from below.</p>;

interface OverflowTextRevealProps {
  children?: ReactNode;
  animateOnScroll?: boolean;
  delay?: number;
  className?: string;
  scrub?: boolean;
  direction?: OverflowTextRevealDirection;
  /** "chars" (default) reveals one character at a time - the original
   *  behavior. "lines" reveals one whole line at a time instead, using
   *  the same direction/scroll/reduced-motion machinery. */
  splitBy?: OverflowTextRevealSplitBy;
  /** Delay between each char/line's start. Defaults to 0.03 for "chars"
   *  and 0.1 for "lines" if left unset - pass this to override either. */
  stagger?: number;
  /** How long each individual char/line's own reveal tween takes. */
  duration?: number;
  /** Fires once every char/line has finished revealing. */
  onComplete?: () => void;
  /** Fires onComplete this many seconds BEFORE the reveal visually
   *  finishes, instead of exactly at completion - lets a chained
   *  animation start while the tail end of this one is still playing.
   *  Computed from this reveal's own duration/stagger/delay math, not
   *  from the tween's native onComplete. Defaults to 0 (fires exactly
   *  at completion, same as before this prop existed). Ignored if
   *  animateOnScroll's ScrollTrigger hasn't fired yet at that point -
   *  timing is measured from mount, so a trigger that fires later than
   *  mount (rare for above-the-fold text) would shift it later too. */
  completeOverlap?: number;
  /** Gates when the reveal actually starts. Defaults to true (starts as
   *  soon as it would have before this prop existed). Pass false to hold
   *  the text hidden-but-in-the-DOM (still server-rendered, still crawlable,
   *  just not yet split/animated) until some external event - flip it to
   *  true and the reveal begins then. Built for chaining multiple
   *  OverflowTextReveal instances off of one another's onComplete without
   *  hardcoding guessed durations. */
  start?: boolean;
}

export default function OverflowTextReveal({
  children = DEFAULT_TEXT,
  animateOnScroll = true,
  delay = 0,
  className = "",
  scrub = false,
  direction = "bottom",
  splitBy = "chars",
  stagger,
  duration = 0.5,
  onComplete,
  completeOverlap = 0,
  start = true,
}: OverflowTextRevealProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const splitRefs = useRef<any[]>([]);
  // Holds whichever unit is being animated - chars or lines, depending on
  // splitBy. Named generically (not charsRef) since it's shared by both modes.
  const targetsRef = useRef<any[]>([]);

  useEffect(() => {
    if (!containerRef.current || !start) return;

    splitRefs.current = [];
    targetsRef.current = [];

    const elements = containerRef.current.hasAttribute("data-copy-wrapper")
      ? Array.from(containerRef.current.children)
      : [containerRef.current];

    const prefersReduced =
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let ctx: ReturnType<typeof gsap.context> | undefined;
    let fontTimer: number | undefined;
    let deferredObserver: IntersectionObserver | null = null;
    let unmounted = false;

    const init = () => {
      if (unmounted || !containerRef.current) return;

      ctx = gsap.context(() => {
        elements.forEach((element) => {
          if (splitBy === "lines") {
            const split = SplitText.create(element, {
              type: "lines",
              mask: "lines",
              linesClass: "line++",
              reduceWhiteSpace: false,
            });

            splitRefs.current.push(split);
            targetsRef.current.push(...(split.lines as HTMLElement[]));
            return;
          }

          const split = SplitText.create(element, {
            type: "lines,chars",
            mask: "chars",
            charsClass: "char++",
            reduceWhiteSpace: false,
          });

          // Compensates for char-level masks clipping descenders/italics -
          // a chars-only concern, so this doesn't run for line splits.
          split.masks?.forEach((mask) => {
            const maskEl = mask as HTMLElement;
            maskEl.style.paddingInline = "0.04em";
            maskEl.style.marginInline = "-0.04em";
            maskEl.style.boxSizing = "content-box";
          });

          splitRefs.current.push(split);
          targetsRef.current.push(...(split.chars as HTMLElement[]));
        });

        if (prefersReduced) {
          gsap.set(targetsRef.current, { yPercent: 0, xPercent: 0, rotate: 0, opacity: 1 });
          gsap.set(containerRef.current, { opacity: 0, y: REDUCED_MOTION_Y_OFFSET });

          const fadeUpProps = {
            opacity: 1,
            y: 0,
            duration: REDUCED_MOTION_FADE_DURATION,
            ease: "power2.out",
            delay,
          };

          if (onComplete) {
            const totalDuration = delay + REDUCED_MOTION_FADE_DURATION;
            gsap.delayedCall(Math.max(totalDuration - completeOverlap, 0), onComplete);
          }

          if (animateOnScroll) {
            gsap.to(containerRef.current, {
              ...fadeUpProps,
              scrollTrigger: {
                trigger: containerRef.current,
                start: "top 85%",
                once: true,
              },
            });
          } else {
            gsap.to(containerRef.current, fadeUpProps);
          }

          return;
        }

        const initialProps = DIRECTION_INITIAL[direction] ?? DIRECTION_INITIAL.bottom;

        // Reveal the container immediately - opacity-0 was only to prevent FOUC
        // GSAP will handle per-char opacity from here
        gsap.set(containerRef.current, { opacity: 1 });

        const fromProps = {
          ...initialProps,
          // opacity: 0,
          willChange: "transform",
        };

        // Lines are fewer and visually larger than chars, so a wider
        // stagger reads better than the tight per-character timing -
        // that's only the fallback though, an explicit stagger prop
        // always wins.
        const resolvedStagger = stagger ?? (splitBy === "lines" ? 0.1 : 0.03);

        const toProps = {
          yPercent: 0,
          xPercent: 0,
          rotate: 0,
          opacity: 1,
          duration,
          stagger: resolvedStagger,
          ease: "power3.out",
          delay,
        };

        if (onComplete) {
          // GSAP's stagger total = (targetCount - 1) * stagger + duration,
          // plus this tween's own delay.
          const totalDuration =
            delay + resolvedStagger * Math.max(targetsRef.current.length - 1, 0) + duration;
          gsap.delayedCall(Math.max(totalDuration - completeOverlap, 0), onComplete);
        }

        if (animateOnScroll) {
          gsap.fromTo(targetsRef.current, fromProps, {
            ...toProps,
            scrollTrigger: {
              trigger: containerRef.current,
              start: "top 85%",
              end: "bottom 68%",
              scrub,
            },
          });
        } else {
          gsap.fromTo(targetsRef.current, fromProps, toProps);
        }
      }, containerRef);
    };

    // Wait only on the faces this element actually renders in, capped so a
    // slow font can never block the reveal.
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

      const { fontFamily, fontWeight, fontSize } = getComputedStyle(
        containerRef.current as HTMLElement,
      );
      try {
        fonts.load(`${fontWeight} ${fontSize} ${fontFamily}`).then(runOnce, runOnce);
      } catch {
        // Malformed shorthand: fall back to the whole-page promise
        fonts.ready.then(runOnce, runOnce);
      }

      fontTimer = window.setTimeout(runOnce, FONT_WAIT_CAP);
    };

    // SplitText forces a synchronous layout read per element, so splitting
    // every instance on mount is the main Style & Layout cost. Copy far from
    // the viewport waits, with enough margin that the reveal is still set up
    // well before it scrolls into view.
    const box = containerRef.current.getBoundingClientRect();
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
      deferredObserver.observe(containerRef.current);
    }

    return () => {
      unmounted = true;
      window.clearTimeout(fontTimer);
      deferredObserver?.disconnect();
      if (ctx) ctx.revert();
      splitRefs.current.forEach((split) => split?.revert());
    };
  }, [animateOnScroll, delay, scrub, direction, splitBy, stagger, duration, onComplete, completeOverlap, start]);

  return (
    <div ref={containerRef} data-copy-wrapper="true" className={`opacity-0 ${className}`}>
      {children}
    </div>
  );
}
