"use client";

import gsap from "gsap";
import { useLayoutEffect } from "react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { shouldSkipSidebarDocsAnimation } from "@/lib/sidebar-navigation";
import { prefersReducedMotion } from "@/lib/motion";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : () => {};

function refreshScrollTrigger() {
  if (typeof window === "undefined") return;

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      ScrollTrigger?.refresh?.();
    });
  });
}

function getFadeTargets(containerRef) {
  if (typeof document === "undefined") return [];

  const root = containerRef?.current || document;

  return gsap.utils.toArray(".fadeup", root);
}

function getLineTargets(containerRef) {
  if (typeof document === "undefined") return [];

  const root = containerRef?.current || document;

  return gsap.utils.toArray('.lineDraw, [class*="contentDivider"]', root);
}

function getFadeInTargets(containerRef) {
  if (typeof document === "undefined") return [];

  const root = containerRef?.current || document;

  return gsap.utils.toArray(".fadein", root);
}

export function useFadeUp(containerRef, deps = []) {
  useIsomorphicLayoutEffect(() => {
    const content = getFadeTargets(containerRef);

    if (!content.length) return;

    if (shouldSkipSidebarDocsAnimation()) {
      gsap.set(content, {
        opacity: 1,
        y: 0,
        clearProps: "opacity,transform",
      });

      refreshScrollTrigger();

      return;
    }

    const reduceMotion = prefersReducedMotion();

    gsap.set(content, {
      opacity: 0,
      y: reduceMotion ? 0 : 50,
    });

    const ctx = gsap.context(() => {
      content.forEach((element) => {
        const rawDelay = parseFloat(element.dataset.fadeupDelay || "0") || 0;
        const delay = reduceMotion ? Math.min(rawDelay, 0.2) : rawDelay;

        gsap.to(element, {
          scrollTrigger: {
            trigger: element,
            start: "top 90%",
            once: true,
          },
          opacity: 1,
          y: 0,
          ease: reduceMotion ? "power2.out" : "power3.out",
          duration: reduceMotion ? 0.6 : 1.2,
          delay,
          onComplete: () => {
            gsap.set(element, {
              clearProps: "opacity,transform",
            });
          },
        });
      });
    }, containerRef?.current || document);

    refreshScrollTrigger();

    return () => ctx.revert();
  }, [containerRef, ...deps]);
}

export function useFadeIn(containerRef, deps = []) {
  useIsomorphicLayoutEffect(() => {
    const content = getFadeInTargets(containerRef);

    if (!content.length) return;

    if (shouldSkipSidebarDocsAnimation()) {
      gsap.set(content, {
        opacity: 1,
        clearProps: "opacity",
      });

      refreshScrollTrigger();

      return;
    }

    const reduceMotion = prefersReducedMotion();

    gsap.set(content, {
      opacity: 0,
    });

    const ctx = gsap.context(() => {
      content.forEach((element) => {
        const rawDelay = parseFloat(element.dataset.fadeinDelay || "0") || 0;
        const delay = reduceMotion ? Math.min(rawDelay, 0.2) : rawDelay;

        gsap.to(element, {
          scrollTrigger: {
            trigger: element,
            start: "top 90%",
            once: true,
          },
          opacity: 1,
          ease: reduceMotion ? "power2.out" : "power3.out",
          duration: reduceMotion ? 0.6 : 1,
          delay,
          onComplete: () => {
            gsap.set(element, {
              clearProps: "opacity",
            });
          },
        });
      });
    }, containerRef?.current || document);

    refreshScrollTrigger();

    return () => ctx.revert();
  }, [containerRef, ...deps]);
}

export function useLineAnim(containerRef, deps = []) {
  useIsomorphicLayoutEffect(() => {
    const lineDraws = getLineTargets(containerRef);

    if (!lineDraws.length) return;

    if (shouldSkipSidebarDocsAnimation() || prefersReducedMotion()) {
      gsap.set(lineDraws, {
        scaleX: 1,
        clearProps: "transform",
      });

      refreshScrollTrigger();

      return;
    }

    const ctx = gsap.context(() => {
      lineDraws.forEach((lineDraw) => {
        gsap.from(lineDraw, {
          scrollTrigger: {
            trigger: lineDraw,
            start: "top 80%",
            once: true,
          },
          scaleX: 0,
          transformOrigin: "left",
          duration: 1,
          stagger: 0.07,
          ease: "power3.out",
        });
      });
    }, containerRef?.current || document);

    refreshScrollTrigger();

    return () => ctx.revert();
  }, [containerRef, ...deps]);
}