"use client";

import React, { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/dist/ScrollTrigger";
import { SplitText } from "gsap/dist/SplitText";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, SplitText);
}

function refreshScrollTriggerSafely() {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      ScrollTrigger.refresh(true);
    });
  });
}

const REDUCED_MOTION_DURATION = 0.4;
const REDUCED_MOTION_EASE = "power1.out";

/**
 * Scroll-triggered random character blur reveal.
 *
 * Under `prefers-reduced-motion: reduce` the text still fades in on scroll,
 * just as a single block: no per-character split, no blur, no random stagger.
 */
export default function RandomBlur({
  children,
  as: Tag = "div",
  className = "",
  start = "top 90%",
  delay = 0,
  once = true,
  duration = 1,
  staggerAmount = 0.5,
  ease = "power3.out",
  blur = "5px",
}) {
  const containerRef = useRef(null);

  useLayoutEffect(() => {
    const container = containerRef.current;

    if (!container) return;

    // Reduced motion: skip the split (avoids the SplitText forced-layout
    // cost) but still fade the block in on scroll, matching the full-motion
    // reveal's scroll-triggered feel instead of popping in instantly.
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) {
      const tween = gsap.fromTo(
        container,
        { autoAlpha: 0 },
        {
          autoAlpha: 1,
          delay,
          duration: REDUCED_MOTION_DURATION,
          ease: REDUCED_MOTION_EASE,
          scrollTrigger: {
            trigger: container,
            start,
            once,
            markers: false,
            invalidateOnRefresh: true,
          },
        }
      );

      return () => {
        tween.scrollTrigger?.kill();
        tween.kill();
      };
    }

    let ctx;
    let split;
    let raf1 = null;
    let raf2 = null;

    // Decoupled from the site loader: the loader is a fixed z-9999 opaque
    // overlay with scroll locked while it plays, so nothing below-fold can
    // scroll into view (and thus this IO can't fire) until it's already
    // gone. Above-fold instances build+animate hidden behind the overlay,
    // which is strictly better than serializing after it - by the time the
    // overlay lifts the content is already in its revealed end state.
    const mount = () => {
      ctx = gsap.context(() => {
        split = SplitText.create(container, {
          type: "words,chars",
          charsClass: "inline-block",
          aria: "none",
        });

        gsap.set(container, {
          autoAlpha: 1,
        });

        gsap.set(split.chars, {
          opacity: 0,
          filter: `blur(5px)`,
          force3D: true,
        });
      }, container);

      refreshScrollTriggerSafely();

      raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => {
          if (!split?.chars?.length || !document.contains(split.chars[0])) return;
          gsap.fromTo(
            split.chars,
            {
              opacity: 0,
              filter: `blur(5px)`,
              force3D: true,
            },
            {
              opacity: 1,
              filter: "blur(0px)",
              force3D: true,
              delay,
              duration,
              ease,
              stagger: {
                amount: staggerAmount,
                from: "random",
              },
              scrollTrigger: {
                trigger: container,
                start,
                once,
                markers: false,
                invalidateOnRefresh: true,
              },
            }
          );

          ScrollTrigger.refresh(true);
        });
      });
    };

    // ponytail: splitting text is a forced-layout DOM mutation; doing it for
    // every RandomBlur instance on mount (25+ on this page) is what caused
    // the style-recalc/layout storm. Defer the split itself until the
    // section is nearly on screen, same rootMargin DeferredMount uses.
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          io.disconnect();
          mount();
        }
      },
      { rootMargin: "500px 0px" }
    );
    io.observe(container);

    return () => {
      io.disconnect();

      if (raf1) cancelAnimationFrame(raf1);
      if (raf2) cancelAnimationFrame(raf2);

      ScrollTrigger.getAll().forEach((trigger) => {
        if (trigger.trigger === container) {
          trigger.kill();
        }
      });

      if (ctx) {
        ctx.revert();
      }

      split?.revert();
    };
  }, [start, once, duration, staggerAmount, ease, delay, blur]);

  return (
    <Tag ref={containerRef} className={`${className} opacity-0`}>
      {children}
    </Tag>
  );
}