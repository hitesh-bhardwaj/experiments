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
 * Scroll-triggered line reveal - text lines or a decorative horizontal line.
 *
 * Under `prefers-reduced-motion: reduce` both variants still fade in on
 * scroll, but without the masked line-by-line rise or the horizontal
 * scale-out.
 */
export default function SplitLine({
  children,
  as: Tag = "div",
  className = "",
  lineClassName = "",
  start = "top 92%",
  delay = 0,
  once = true,
  duration = 0.9,
  ease = "power3.out",
  origin = "0% 50%",
  stagger = 0.08,
}) {
  const wrapperRef = useRef(null);
  const lineRef = useRef(null);

  useLayoutEffect(() => {
    const wrapper = wrapperRef.current;
    const decorativeLine = lineRef.current;

    const target = children ? wrapper : decorativeLine;

    if (!target) return;

    // Reduced motion: skip the split (avoids the SplitText forced-layout
    // cost) but still fade the target in on scroll.
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) {
      const tween = children
        ? gsap.fromTo(
            wrapper,
            { autoAlpha: 0 },
            {
              autoAlpha: 1,
              delay,
              duration: REDUCED_MOTION_DURATION,
              ease: REDUCED_MOTION_EASE,
              scrollTrigger: {
                trigger: wrapper,
                start,
                once,
                invalidateOnRefresh: true,
                markers: false,
              },
            }
          )
        : gsap.fromTo(
            decorativeLine,
            { opacity: 0, scaleX: 0, transformOrigin: origin },
            {
              opacity: 1,
              scaleX: 1,
              delay,
              duration: REDUCED_MOTION_DURATION,
              ease: REDUCED_MOTION_EASE,
              scrollTrigger: {
                trigger: decorativeLine,
                start,
                once,
                invalidateOnRefresh: true,
                markers: false,
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
        if (children) {
          split = SplitText.create(wrapper, {
            type: "lines",
            mask: "lines",
            aria: "none",
          });

          gsap.set(wrapper, {
            autoAlpha: 1,
          });

          gsap.set(split.lines, {
            opacity: 0,
            yPercent: 100,
          });
        } else {
          gsap.set(decorativeLine, {
            opacity: 0,
            scaleX: 0,
            transformOrigin: origin,
          });
        }
      }, target);

      refreshScrollTriggerSafely();

      raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => {
          if (children && split?.lines?.length) {
            gsap.fromTo(
              split.lines,
              {
                opacity: 0,
                yPercent: 100,
              },
              {
                opacity: 1,
                yPercent: 0,
                delay,
                duration,
                ease,
                stagger,
                scrollTrigger: {
                  trigger: wrapper,
                  start,
                  once,
                  invalidateOnRefresh: true,
                  markers: false,
                },
              }
            );
          }

          if (!children && decorativeLine) {
            gsap.fromTo(
              decorativeLine,
              {
                opacity: 0,
                scaleX: 0,
                transformOrigin: origin,
              },
              {
                opacity: 1,
                scaleX: 1,
                delay,
                duration,
                ease,
                scrollTrigger: {
                  trigger: decorativeLine,
                  start,
                  once,
                  invalidateOnRefresh: true,
                  markers: false,
                },
              }
            );
          }

          ScrollTrigger.refresh(true);
        });
      });
    };

    // ponytail: same fix as RandomBlur - defer the forced-layout SplitText
    // split until the section is nearly on screen instead of on mount.
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          io.disconnect();
          mount();
        }
      },
      { rootMargin: "500px 0px" }
    );
    io.observe(target);

    return () => {
      io.disconnect();

      if (raf1) cancelAnimationFrame(raf1);
      if (raf2) cancelAnimationFrame(raf2);

      ScrollTrigger.getAll().forEach((trigger) => {
        if (trigger.trigger === wrapper || trigger.trigger === decorativeLine) {
          trigger.kill();
        }
      });

      if (ctx) {
        ctx.revert();
      }

      split?.revert();
    };
  }, [children, start, once, duration, ease, origin, delay, stagger]);

  if (children) {
    return (
      <Tag ref={wrapperRef} className={`${className} opacity-0`}>
        {children}
      </Tag>
    );
  }

  return (
    <div className={className}>
      <div ref={lineRef} className={`${lineClassName} opacity-0`} />
    </div>
  );
}
