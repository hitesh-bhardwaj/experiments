"use client";

import React, { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { SplitText } from "gsap/dist/SplitText";
import { ScrollTrigger } from "gsap/dist/ScrollTrigger";
import { shouldSkipSidebarDocsAnimation } from "@/lib/sidebar-navigation";
import { prefersReducedMotion } from "@/lib/motion";

if (typeof window !== "undefined") {
  gsap.registerPlugin(SplitText, ScrollTrigger);
}

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : () => {};

function waitForFontsAndLayout() {
  return new Promise(async (resolve) => {
    if (typeof document !== "undefined" && document.fonts?.ready) {
      try {
        await document.fonts.ready;
      } catch {}
    }

    requestAnimationFrame(() => {
      requestAnimationFrame(resolve);
    });
  });
}

function isInViewport(element) {
  if (!element || typeof window === "undefined") return false;

  const rect = element.getBoundingClientRect();

  return rect.top < window.innerHeight * 0.9 && rect.bottom > 0;
}

export default function HeadAnim({
  children,
  animateOnScroll = true,
  delay = 0,
  animationKey = "",
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

    gsap.set(container, {
      autoAlpha: 0,
    });

    if (shouldSkipSidebarDocsAnimation()) {
      gsap.set(container, {
        autoAlpha: 1,
        clearProps: "visibility,opacity,transform",
      });

      return;
    }

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
      await waitForFontsAndLayout();

      if (isKilled || runId !== runIdRef.current || !containerRef.current) {
        return;
      }

      const allChars = [];

      elements.forEach((element) => {
        if (!element) return;

        const split = SplitText.create(element, {
          type: "lines,words,chars",
          mask: "chars",
          wordsClass: "word++",
          charsClass: "char++",
          reduceWhiteSpace: false,
          aria: "none",
        });

        splitRefs.current.push(split);

        gsap.set(split.words, {
          display: "inline-block",
          whiteSpace: "nowrap",
        });

        allChars.push(...split.chars);
      });

      if (!allChars.length) {
        gsap.set(container, {
          autoAlpha: 1,
        });

        return;
      }

      // background-clip: text on a parent doesn't paint transformed child chars, so a
      // gradient word (.gradient-text-animate) would vanish while it animates. Put the
      // gradient on its chars for the entrance; reverting the split afterwards restores
      // the original markup, and with it the one continuous gradient across the word.
      const gradientHosts = Array.from(
        container.querySelectorAll(".gradient-text-animate")
      );

      gradientHosts.forEach((host) => {
        allChars
          .filter((char) => host.contains(char))
          .forEach((char) => char.classList.add("gradient-text-animate"));
        host.classList.remove("gradient-text-animate");
      });

      gsap.set(allChars, {
        yPercent: 100,
        rotate: 8,
        willChange: "transform",
      });

      gsap.set(container, {
        autoAlpha: 1,
      });

      tweenRef.current = gsap.to(allChars, {
        yPercent: 0,
        rotate: 0,
        duration: 0.5,
        stagger: 0.02,
        ease: "power3.out",
        delay,
        paused: animateOnScroll,
        onComplete: () => {
          gsap.set(allChars, {
            clearProps: "willChange",
          });

          if (gradientHosts.length) {
            splitRefs.current.forEach((split) => split?.revert());
            splitRefs.current = [];
          }

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
        start: "top 85%",
        once: true,
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

    run();

    return () => {
      isKilled = true;

      tweenRef.current?.kill();
      triggerRef.current?.kill();
      refreshRef.current?.kill();

      splitRefs.current.forEach((split) => split?.revert());
      splitRefs.current = [];

      if (container) {
        gsap.set(container, {
          clearProps: "visibility,opacity,transform",
        });
      }
    };
  }, [animateOnScroll, delay, animationKey]);

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