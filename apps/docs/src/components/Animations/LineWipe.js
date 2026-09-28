"use client";

import React, { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { SplitText } from "gsap/SplitText";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { shouldSkipSidebarDocsAnimation } from "@/lib/sidebar-navigation";
import { prefersReducedMotion } from "@/lib/motion";

if (typeof window !== "undefined") {
  gsap.registerPlugin(SplitText, ScrollTrigger);
}

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : () => {};

// Each line is painted with a background-clip gradient that `--bg-progress`
// sweeps across it, so glyphs are revealed left to right and each one passes
// through the accent colour as the leading edge crosses it before settling.
// Words on a line sweep together because they share its gradient. The
// reference settles to a black/grey two-tone; here everything settles to white.
const ACCENT = "#ff5f00";
const LIT = "#ffffff";

function isInViewport(element) {
  if (!element || typeof window === "undefined") return false;

  const rect = element.getBoundingClientRect();

  return rect.top < window.innerHeight * 0.9 && rect.bottom > 0;
}

export default function LineWipe({
  children,
  animateOnScroll = true,
  delay = 0,
  duration = 1.6,
  stagger = 0.1,
  start = "top top+=90%",
  accent = ACCENT,
  lit = LIT,
  animationKey = "",
  lineStyle = null,
}) {
  const containerRef = useRef(null);
  const splitRefs = useRef([]);
  const tweenRef = useRef(null);
  const triggerRef = useRef(null);
  const refreshRef = useRef(null);
  const runIdRef = useRef(0);

  useIsomorphicLayoutEffect(() => {
    const container = containerRef.current;

    if (!container) return;

    const runId = ++runIdRef.current;

    tweenRef.current?.kill();
    triggerRef.current?.kill();
    refreshRef.current?.kill();

    splitRefs.current.forEach((split) => split?.revert());
    splitRefs.current = [];

    let isKilled = false;

    if (shouldSkipSidebarDocsAnimation()) {
      gsap.set(container, { autoAlpha: 1, clearProps: "visibility,opacity" });

      return;
    }

    gsap.set(container, { autoAlpha: 0 });

    if (prefersReducedMotion()) {
      tweenRef.current = gsap.to(container, {
        autoAlpha: 1,
        duration: 0.6,
        ease: "power2.out",
        delay,
      });

      return;
    }

    const elements = container.hasAttribute("data-copy-wrapper")
      ? Array.from(container.children)
      : [container];

    const run = async () => {
      if (document.fonts?.ready) {
        try {
          await document.fonts.ready;
        } catch {}
      }

      if (isKilled || runId !== runIdRef.current || !containerRef.current) {
        return;
      }

      const allLines = [];

      elements.forEach((element) => {
        if (!element) return;

        const split = SplitText.create(element, {
          type: "lines",
          linesClass: "line++",
          lineThreshold: 0.1,
          aria: "none",
        });

        splitRefs.current.push(split);
        allLines.push(...split.lines);
      });

      if (!allLines.length) {
        gsap.set(container, { autoAlpha: 1, clearProps: "visibility,opacity" });

        return;
      }

      // Geometry lifted from the reference's own `.split-line-p` rule: a 350%
      // background whose stops put the settled colour up to 30%, the accent at
      // a single 40% stop and transparent from 50% on. The gradient sits on
      // each line - words on a line sweep together because they share it, and
      // the position is driven by `calc((100 - progress) * 1%)`.
      allLines.forEach((line) => {
        if (lineStyle) Object.assign(line.style, lineStyle);
        line.style.setProperty("--color-final", lit);
        line.style.backgroundImage =
          `linear-gradient(90deg, var(--color-final) 0%, var(--color-final) 30%, ${accent} 40%, transparent 50%, transparent 60%, transparent 100%)`;
        line.style.backgroundSize = "350% 100%";
        line.style.backgroundRepeat = "no-repeat";
        line.style.webkitBackgroundClip = "text";
        line.style.backgroundClip = "text";
        line.style.color = "transparent";
        line.style.willChange = "background-position";
      });

      // The reference starts at 30, not 0 - the first third of the ramp is
      // skipped, so the sweep begins already part-way across.
      gsap.set(allLines, { "--bg-progress": 30 });
      allLines.forEach((line) => {
        line.style.backgroundPositionX = "70%";
      });

      tweenRef.current = gsap.to(allLines, {
        "--bg-progress": 100,
        duration,
        stagger,
        ease: "power1.inOut",
        delay,
        paused: animateOnScroll,
        // The container stays hidden until the tween actually starts. The
        // IntersectionObserver below fires 500px before the element enters the
        // viewport, so revealing it there would show the text long before the
        // ScrollTrigger plays this.
        onStart: () => {
          gsap.set(container, { autoAlpha: 1 });
        },
        onUpdate: function () {
          this.targets().forEach((line) => {
            const progress = gsap.getProperty(line, "--bg-progress");

            // The reference drives this as calc((100 - progress) * 1%): at 30
            // the transparent tail covers the line, at 100 the settled colour
            // has come fully across it.
            line.style.backgroundPositionX = `${100 - progress}%`;
          });
        },
        onComplete: () => {
          allLines.forEach((line) => {
            line.style.willChange = "";
          });

          refreshRef.current?.kill();
          refreshRef.current = gsap.delayedCall(0.05, () => {
            ScrollTrigger.refresh(true);
          });
        },
      });

      if (!animateOnScroll) {
        tweenRef.current.play(0);

        return;
      }

      triggerRef.current = ScrollTrigger.create({
        trigger: container,
        start,
        once: true,
        markers:false,
        invalidateOnRefresh: true,
        onEnter: () => {
          tweenRef.current?.play(0);
        },
      });

      refreshRef.current?.kill();
      refreshRef.current = gsap.delayedCall(0.2, () => {
        ScrollTrigger.refresh(true);

        if (isInViewport(container) && tweenRef.current?.progress() === 0) {
          tweenRef.current.play(0);
          triggerRef.current?.kill();
          triggerRef.current = null;
        }
      });
    };

    // Same deferral the other split components use - SplitText.create() forces
    // layout, so it waits until the element is near the viewport.
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          io.disconnect();
          run();
        }
      },
      { rootMargin: "500px 0px" },
    );

    io.observe(container);

    return () => {
      isKilled = true;
      io.disconnect();

      tweenRef.current?.kill();
      triggerRef.current?.kill();
      refreshRef.current?.kill();

      splitRefs.current.forEach((split) => split?.revert());
      splitRefs.current = [];

      if (container) {
        gsap.set(container, { clearProps: "visibility,opacity,transform" });
      }
    };
  }, [animateOnScroll, delay, duration, stagger, start, accent, lit, animationKey, lineStyle]);

  const child =
    React.Children.count(children) === 1
      ? React.Children.toArray(children)[0]
      : null;

  if (child && React.isValidElement(child)) {
    return React.cloneElement(child, {
      ref: (node) => {
        const childRef = child.ref;
        if (typeof childRef === "function") childRef(node);
        else if (childRef) childRef.current = node;
        containerRef.current = node;
      },
      style: {
        ...child.props.style,
        opacity: 0,
      },
    });
  }

  return (
    <div ref={containerRef} data-copy-wrapper="true" style={{ opacity: 0 }}>
      {children}
    </div>
  );
}
