"use client";

import { memo, useEffect, useRef } from "react";

const FADE_OUT_MS = 450;
const DEFAULT_DURATION_MS = 450;

function DrawSvgV3({
  children,
  active,
  armed = false,
  className = "",
  viewBox = "0 0 24 24",
  stroke = "currentColor",
  strokeWidth = 2.5,
  delay = 0,
  duration = DEFAULT_DURATION_MS,
  stagger = 60,
  ...props
}) {
  const svgRef = useRef(null);
  const wasActiveRef = useRef(false);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const drawableElements = Array.from(
      svg.querySelectorAll("path, polyline, line, polygon, circle, rect")
    );
    if (!drawableElements.length) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    // Cache computed stroke lengths
    const lengths = drawableElements.map((el) => {
      try {
        if (typeof el.getTotalLength === "function") {
          return el.getTotalLength();
        }
      } catch {}
      if (el.tagName.toLowerCase() === "line") {
        const x1 = parseFloat(el.getAttribute("x1") || 0);
        const y1 = parseFloat(el.getAttribute("y1") || 0);
        const x2 = parseFloat(el.getAttribute("x2") || 0);
        const y2 = parseFloat(el.getAttribute("y2") || 0);
        return Math.hypot(x2 - x1, y2 - y1) || 50;
      }
      return 100;
    });

    const settle = () => {
      svg.style.transition = "none";
      svg.style.opacity = "1";
      drawableElements.forEach((el) => {
        el.style.transition = "none";
        el.style.strokeDasharray = "none";
        el.style.strokeDashoffset = "0";
      });
    };

    const clear = (fadeMs = 0) => {
      svg.style.transition = prefersReducedMotion
        ? "none"
        : `opacity ${fadeMs}ms ease-out`;
      svg.style.opacity = "0";
      drawableElements.forEach((el, i) => {
        const len = lengths[i];
        el.style.transition = "none";
        el.style.strokeDasharray = `${len} ${len}`;
        el.style.strokeDashoffset = `${len}`;
      });
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

    // Set initial hidden stroke state
    svg.style.transition = "none";
    svg.style.opacity = "0";
    drawableElements.forEach((el, i) => {
      const len = lengths[i];
      el.style.transition = "none";
      el.style.strokeDasharray = `${len} ${len}`;
      el.style.strokeDashoffset = `${len}`;
    });

    const rafId = requestAnimationFrame(() => {
      // Fade in the container
      svg.style.transition = `opacity 80ms ease-out ${delay}ms`;
      svg.style.opacity = "1";

      // Animate stroke draw
      drawableElements.forEach((el, i) => {
        const itemDelay = delay + i * stagger;
        el.style.transition = `stroke-dashoffset ${duration}ms cubic-bezier(0.25, 1, 0.5, 1) ${itemDelay}ms`;
        el.style.strokeDashoffset = "0";
      });
    });

    return () => cancelAnimationFrame(rafId);
  }, [active, armed, delay, duration, stagger]);

  return (
    <svg
      ref={svgRef}
      viewBox={viewBox}
      fill="none"
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      {children}
    </svg>
  );
}

export default memo(DrawSvgV3);
