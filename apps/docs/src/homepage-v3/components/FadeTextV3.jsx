"use client";

import { memo, useEffect, useRef } from "react";

const FADE_OUT_MS = 450;
const DEFAULT_DURATION_MS = 500;

function FadeTextV3({
  text,
  children,
  active,
  armed = false,
  as: Component = "p",
  className = "",
  delay = 0,
  duration = DEFAULT_DURATION_MS,
  y = 0,
  ...props
}) {
  const elRef = useRef(null);
  const wasActiveRef = useRef(false);

  useEffect(() => {
    const el = elRef.current;
    if (!el) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const settle = () => {
      el.style.transition = "none";
      el.style.opacity = "1";
      el.style.transform = "none";
    };

    const clear = (opacityMs = 0) => {
      el.style.transition = prefersReducedMotion
        ? "none"
        : `opacity ${opacityMs}ms ease-out, transform ${opacityMs}ms ease-out`;
      el.style.opacity = "0";
      if (y !== 0) {
        el.style.transform = `translateY(${y}px)`;
      }
    };

    if (!active) {
      if (!armed) {
        settle();
      } else {
        clear(wasActiveRef.current ? FADE_OUT_MS : 0);
      }
      wasActiveRef.current = false;
      return;
    }

    wasActiveRef.current = true;

    if (prefersReducedMotion) {
      settle();
      return;
    }

    // Reset initial state before animating
    el.style.transition = "none";
    el.style.opacity = "0";
    if (y !== 0) {
      el.style.transform = `translateY(${y}px)`;
    }

    const rafId = requestAnimationFrame(() => {
      el.style.transition = `opacity ${duration}ms cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms, transform ${duration}ms cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`;
      el.style.opacity = "1";
      el.style.transform = "none";
    });

    return () => cancelAnimationFrame(rafId);
  }, [active, armed, delay, duration, y]);

  return (
    <Component ref={elRef} className={className} {...props}>
      {children ?? text}
    </Component>
  );
}

export default memo(FadeTextV3);
