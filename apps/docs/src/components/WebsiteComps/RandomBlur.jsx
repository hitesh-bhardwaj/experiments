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
 * Scroll-triggered random character blur reveal.
 *
 * Under `prefers-reduced-motion: reduce` the text still fades in, but as a
 * single block: no per-character split, no blur, no random stagger.
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

        if (reduceMotion) {
          gsap.set(container, { autoAlpha: 0 });
        } else {
          split = SplitText.create(container, {
            type: "words,chars",
            charsClass: "inline-block",
            aria: "none",
          });

          gsap.set(container, { autoAlpha: 1 });

          gsap.set(split.chars, {
            opacity: 0,
            filter: `blur(${blur})`,
            force3D: true,
          });
        }

        const createAnimation = () => {
          if (hasCreatedAnimation) return;
          if (!reduceMotion && !split?.chars?.length) return;

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
              if (!document.contains(container)) return;

              const scrollTrigger = {
                trigger: container,
                start,
                once,
                markers: false,
                invalidateOnRefresh: true,
              };

              // The tween is born two frames after the matchMedia callback
              // returned, so it has to be re-parented onto the context by hand
              // for mm.revert() to clean up its ScrollTrigger.
              context.add(() => {
                if (reduceMotion) {
                  gsap.fromTo(
                    container,
                    { autoAlpha: 0 },
                    {
                      autoAlpha: 1,
                      delay,
                      duration: REDUCED_MOTION_DURATION,
                      ease: REDUCED_MOTION_EASE,
                      scrollTrigger,
                    }
                  );

                  return;
                }

                if (!document.contains(split.chars[0])) return;

                gsap.fromTo(
                  split.chars,
                  {
                    opacity: 0,
                    // filter: `blur(${blur})`,
                    force3D: true,
                  },
                  {
                    opacity: 1,
                    // filter: "blur(0px)",
                    force3D: true,
                    delay,
                    duration,
                    ease,
                    stagger: {
                      amount: staggerAmount,
                      from: "random",
                    },
                    scrollTrigger,
                  }
                );
              });

              ScrollTrigger.refresh(true);
            });
          });
        };

        const handleLoaderComplete = () => {
          createAnimation();
        };

        if (hasLoaderRun() && !isLoaderActive()) {
          createAnimation();
        } else {
          window.addEventListener("loaderComplete", handleLoaderComplete, {
            once: true,
          });

          poll = window.setInterval(() => {
            if (hasLoaderRun() && !isLoaderActive()) {
              createAnimation();
            }
          }, 60);

          bootCheck = window.setTimeout(() => {
            if (!isLoaderActive()) {
              createAnimation();
            }
          }, 700);
        }

        return () => {
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
      container
    );

    return () => mm.revert();
  }, [start, once, duration, staggerAmount, ease, delay, blur]);

  return (
    <Tag ref={containerRef} className={`${className} opacity-0`}>
      {children}
    </Tag>
  );
}
