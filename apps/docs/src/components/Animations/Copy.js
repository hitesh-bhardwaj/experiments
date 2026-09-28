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

export default function Copy({
  children,
  animateOnScroll = true,
  delay = 0,
  animationKey = "",
}) {
  const containerRef = useRef(null);
  const splitRefs = useRef([]);
  const tweenRef = useRef(null);
  const triggerRef = useRef(null);
  const runIdRef = useRef(0);

  useIsomorphicLayoutEffect(() => {
    const container = containerRef.current;

    if (!container) return;

    const runId = ++runIdRef.current;

    tweenRef.current?.kill();
    triggerRef.current?.kill();

    splitRefs.current.forEach((split) => {
      split?.revert();
    });

    splitRefs.current = [];

    if (shouldSkipSidebarDocsAnimation()) {
      gsap.set(container, {
        opacity: 1,
        clearProps: "opacity,transform",
      });
      return;
    }

    if (prefersReducedMotion()) {
      gsap.set(container, {
        opacity: 0,
      });

      tweenRef.current = gsap.to(container, {
        opacity: 1,
        duration: 0.6,
        ease: "power2.out",
        delay,
      });

      return;
    }

    let isKilled = false;

    gsap.set(container, {
      opacity: 0,
    });

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
        const split = SplitText.create(element, {
          type: "lines",
          mask: "lines",
          linesClass: "line++",
          lineThreshold: 0.1,
          aria: "none",
        });

        splitRefs.current.push(split);

        const textIndent = getComputedStyle(element).textIndent;

        if (textIndent && textIndent !== "0px" && split.lines.length > 0) {
          split.lines[0].style.paddingLeft = textIndent;
          element.style.textIndent = "0";
        }

        allLines.push(...split.lines);
      });

      if (!allLines.length) {
        gsap.set(container, {
          opacity: 1,
          clearProps: "opacity",
        });

        gsap.set(allLines, {
          y: "0%",
          clearProps: "transform",
        });

        return;
      }

      gsap.set(allLines, {
        y: "100%",
        willChange: "transform",
      });

      gsap.set(container, {
        opacity: 1,
      });

      const animationProps = {
        y: "0%",
        duration: 1.4,
        stagger: 0.15,
        ease: "power4.out",
        delay,
        onComplete: () => {
          gsap.set(allLines, {
            clearProps: "transform,willChange",
          });

          ScrollTrigger.refresh(true);
        },
      };

      if (animateOnScroll) {
        tweenRef.current = gsap.to(allLines, {
          ...animationProps,
          scrollTrigger: {
            trigger: container,
            start: "top bottom",
            once: true,
          },
        });

        triggerRef.current = tweenRef.current.scrollTrigger;
      } else {
        tweenRef.current = gsap.to(allLines, animationProps);
      }
    };

    run();

    return () => {
      isKilled = true;

      tweenRef.current?.kill();
      triggerRef.current?.kill();

      splitRefs.current.forEach((split) => {
        split?.revert();
      });

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
    <div
      ref={containerRef}
      data-copy-wrapper="true"
      style={{ opacity: 0 }}
    >
      {children}
    </div>
  );
}