"use client";

import React, { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/dist/ScrollTrigger";
import { SplitText } from "gsap/dist/SplitText";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, SplitText);
}

const LOADER_STORAGE_KEY = "hyperiux-loader-has-run";

const REDUCED_MOTION_DURATION = 0.4;
const REDUCED_MOTION_EASE = "power1.out";

function hasLoaderRun() {
  if (typeof window === "undefined") return false;

  // Loader.jsx writes sessionStorage (not localStorage) and sets the window
  // flag when it completes or is skipped.
  return (
    window.sessionStorage.getItem(LOADER_STORAGE_KEY) === "true" ||
    window.__HYPERIUX_LOADER_COMPLETE__ === true
  );
}

function isLoaderActive() {
  if (typeof window === "undefined") return false;

  return (
    document.body.classList.contains("loader-active") ||
    window.__HYPERIUX_LOADER_RUNNING__ === true
  );
}

function refreshScrollTriggerSafely() {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      ScrollTrigger.refresh(true);
    });
  });
}

/**
 * Scroll-triggered line reveal - text lines or a decorative horizontal line.
 *
 * Under `prefers-reduced-motion: reduce` both variants still fade in, but
 * without the masked line-by-line rise or the horizontal scale-out.
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
  const hasChildren = Boolean(children);

  useLayoutEffect(() => {
    const wrapper = wrapperRef.current;
    const decorativeLine = lineRef.current;

    const target = hasChildren ? wrapper : decorativeLine;

    if (!target) return;

    const mm = gsap.matchMedia();

    mm.add(
      {
        reduceMotion: "(prefers-reduced-motion: reduce)",
        fullMotion: "(prefers-reduced-motion: no-preference)",
      },
      (context) => {
        const { reduceMotion } = context.conditions;

        let split;
        let poll;
        let bootCheck;
        let raf1 = null;
        let raf2 = null;
        let hasCreatedAnimation = false;

        // ponytail: same fix as Homepage/SplitLine and RandomBlur - the
        // SplitText.create() below is a forced-layout DOM mutation, so it's
        // deferred behind an IntersectionObserver instead of running on
        // every mount. Only the hasChildren (real split) path needs this -
        // the decorative-line branch is a plain gsap.set, nothing to defer.
        // This file has two independent gates now (loader complete AND
        // near-viewport), so createAnimation only fires once both
        // splitReady and loaderReady are true - whichever finishes last is
        // the one that actually triggers it.
        let splitReady = reduceMotion || !hasChildren;
        let loaderReady = false;
        let io;

        const doSplit = () => {
          split = SplitText.create(wrapper, {
            type: "lines",
            mask: "lines",
            aria: "none",
          });

          gsap.set(wrapper, { autoAlpha: 1 });

          gsap.set(split.lines, {
            opacity: 0,
            yPercent: 100,
          });

          splitReady = true;
          createAnimation();
        };

        if (hasChildren) {
          if (reduceMotion) {
            gsap.set(wrapper, { autoAlpha: 0 });
          }
          // full-motion split happens in doSplit(), gated below.
        } else {
          gsap.set(decorativeLine, {
            opacity: 0,
            scaleX: reduceMotion ? 1 : 0,
            transformOrigin: origin,
          });
        }

        const createAnimation = () => {
          if (hasCreatedAnimation || !splitReady || !loaderReady) return;

          hasCreatedAnimation = true;

          if (poll) {
            window.clearInterval(poll);
            poll = null;
          }

          if (bootCheck) {
            window.clearTimeout(bootCheck);
            bootCheck = null;
          }

          refreshScrollTriggerSafely();

          raf1 = requestAnimationFrame(() => {
            raf2 = requestAnimationFrame(() => {
              if (!document.contains(target)) return;

              const scrollTrigger = {
                trigger: target,
                start,
                once,
                invalidateOnRefresh: true,
                markers: false,
              };

              // The tween is born two frames after the matchMedia callback
              // returned, so it has to be re-parented onto the context by hand
              // for mm.revert() to clean up its ScrollTrigger.
              context.add(() => {
                if (reduceMotion) {
                  gsap.fromTo(
                    target,
                    hasChildren ? { autoAlpha: 0 } : { opacity: 0 },
                    {
                      ...(hasChildren ? { autoAlpha: 1 } : { opacity: 1 }),
                      delay,
                      duration: REDUCED_MOTION_DURATION,
                      ease: REDUCED_MOTION_EASE,
                      scrollTrigger,
                    }
                  );
                } else if (hasChildren && split?.lines?.length) {
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
                      scrollTrigger,
                    }
                  );
                } else if (!hasChildren) {
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
                      scrollTrigger,
                    }
                  );
                }
              });

              ScrollTrigger.refresh(true);
            });
          });
        };

        const handleLoaderComplete = () => {
          loaderReady = true;
          createAnimation();
        };

        if (hasLoaderRun() && !isLoaderActive()) {
          loaderReady = true;
        } else {
          window.addEventListener("loaderComplete", handleLoaderComplete, {
            once: true,
          });

          poll = window.setInterval(() => {
            if (hasLoaderRun() && !isLoaderActive()) {
              loaderReady = true;
              createAnimation();
            }
          }, 60);

          bootCheck = window.setTimeout(() => {
            if (!isLoaderActive()) {
              loaderReady = true;
              createAnimation();
            }
          }, 700);
        }

        if (!hasChildren || reduceMotion) {
          // No split to defer - just needs the loader gate, which may
          // already be satisfied above.
          createAnimation();
        } else {
          io = new IntersectionObserver(
            (entries) => {
              if (entries[0]?.isIntersecting) {
                io.disconnect();
                doSplit();
              }
            },
            { rootMargin: "500px 0px" }
          );
          io.observe(target);
        }

        return () => {
          io?.disconnect();
          window.removeEventListener("loaderComplete", handleLoaderComplete);

          if (raf1) cancelAnimationFrame(raf1);
          if (raf2) cancelAnimationFrame(raf2);

          if (poll) {
            window.clearInterval(poll);
          }

          if (bootCheck) {
            window.clearTimeout(bootCheck);
          }

          split?.revert();
        };
      },
      target
    );

    return () => mm.revert();
  }, [hasChildren, start, once, duration, ease, origin, delay, stagger]);

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
