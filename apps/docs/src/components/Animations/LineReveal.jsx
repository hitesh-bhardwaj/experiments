"use client";

import React, { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { SplitText } from "gsap/dist/SplitText";
import { ScrollTrigger } from "gsap/dist/ScrollTrigger";

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

// `gradient-text-single`: one gradient runs across the whole phrase instead
// of restarting in every word. Each word paints a phrase-wide gradient offset
// by where it sits in the phrase (words on later lines continue from where
// the previous line ended); one tween on the phrase drifts it for every word,
// like .gradient-text-animate's 300%-wide gradient sliding its full span.
const GRADIENT_DRIFT_S = 10;

function spanGradientAcross(phrase, words) {
  let x = 0;
  words.forEach((word, i) => {
    word.classList.add("gradient-text-single-word");
    word.style.setProperty("--g-x", `${x}px`);
    const rect = word.getBoundingClientRect();
    const next = words[i + 1]?.getBoundingClientRect();
    const sameLine = next && Math.abs(next.top - rect.top) < rect.height / 2;
    x += sameLine ? next.left - rect.left : rect.width;
  });
  phrase.style.setProperty("--g-w", `${x}px`);
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return null;
  return gsap.fromTo(
    phrase,
    { "--g-shift": "0px" },
    { "--g-shift": `${-2 * x}px`, duration: GRADIENT_DRIFT_S, ease: "sine.inOut", repeat: -1, yoyo: true },
  );
}

export default function LineReveal({
  text,
  children,
  as = "div",
  className = "",
  direction = "next",
  animateOnScroll = true,
  start = "top 85%",
  delay = 0,
  duration = 0.8,
  stagger = 0.08,
  animationKey = "",
  markers = false,
  ...rest
}) {
  const containerRef = useRef(null);
  const splitRef = useRef(null);
  const tweenRef = useRef(null);
  const driftsRef = useRef([]);
  const triggerRef = useRef(null);
  const refreshRef = useRef(null);
  const runIdRef = useRef(0);

  useIsomorphicLayoutEffect(() => {
    const container = containerRef.current;

    if (!container) return;

    const runId = ++runIdRef.current;

    tweenRef.current?.kill();
    driftsRef.current.forEach((t) => t.kill());
    driftsRef.current = [];
    triggerRef.current?.kill();
    refreshRef.current?.kill();
    splitRef.current?.revert();
    splitRef.current = null;

    let isKilled = false;

    gsap.set(container, {
      autoAlpha: 0,
    });

    const run = async () => {
      await waitForFontsAndLayout();

      if (isKilled || runId !== runIdRef.current || !containerRef.current) {
        return;
      }

      splitRef.current = SplitText.create(container, {
        type: "words",
        mask: "words",
        wordsClass: "word++",
        aria: "none",
      });

      const words = splitRef.current.words;

      if (!words.length) {
        gsap.set(container, {
          autoAlpha: 1,
        });

        return;
      }

      // SplitText wraps nested markup; `background-clip: text` on a parent
      // `.gradient-text-animate` span no longer paints child word glyphs.
      // Move the class onto the split word nodes that actually hold the text.
      container.querySelectorAll(".gradient-text-animate").forEach((el) => {
        const nested = words.filter((word) => el.contains(word));
        if (!nested.length) return;
        el.classList.remove("gradient-text-animate");
        if (el.classList.contains("gradient-text-single")) {
          const drift = spanGradientAcross(el, nested);
          if (drift) driftsRef.current.push(drift);
          return;
        }
        nested.forEach((word) => word.classList.add("gradient-text-animate"));
      });

      const yFrom = direction === "next" ? 110 : -110;

      gsap.set(words, {
        yPercent: yFrom,
        willChange: "transform",
      });

      gsap.set(container, {
        autoAlpha: 1,
      });

      tweenRef.current = gsap.to(words, {
        yPercent: 0,
        duration,
        ease: "power2.out",
        delay,
        stagger: {
          each: stagger,
          from: direction === "next" ? "start" : "end",
        },
        paused: animateOnScroll,
        onComplete: () => {
          gsap.set(words, {
            clearProps: "willChange",
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
        invalidateOnRefresh: true,
        markers:markers,
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

    // ponytail: same fix as RandomBlur/SplitLine - SplitText.create() inside
    // run() is a forced-layout DOM mutation, so it's deferred behind an
    // IntersectionObserver instead of firing on every mount regardless of
    // scroll position.
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          io.disconnect();
          run();
        }
      },
      { rootMargin: "500px 0px" }
    );
    io.observe(container);

    return () => {
      isKilled = true;
      io.disconnect();

      tweenRef.current?.kill();
      driftsRef.current.forEach((t) => t.kill());
      driftsRef.current = [];
      triggerRef.current?.kill();
      refreshRef.current?.kill();
      splitRef.current?.revert();
      splitRef.current = null;

      if (container) {
        gsap.set(container, {
          clearProps: "visibility,opacity,transform",
        });
      }
    };
  }, [text, direction, animateOnScroll, start, delay, duration, stagger, animationKey]);

  return React.createElement(
    as,
    { ref: containerRef, className, style: { opacity: 0 }, ...rest },
    text ?? children
  );
}
