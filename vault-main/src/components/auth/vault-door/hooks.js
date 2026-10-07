"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { RESEND_COOLDOWN_SECONDS } from "./constants";
import { createCore } from "./core";
import { createDoor } from "./door";
import { measureSeam } from "./utils";
import { MEDIA } from "@/lib/breakpoints";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
// Tablet and below (the max-lg: range); the globe is hidden there
const COMPACT_QUERY = MEDIA.tablet;

function useMediaQuery(query, serverValue) {
  return useSyncExternalStore(
    (callback) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", callback);
      return () => list.removeEventListener("change", callback);
    },
    () => window.matchMedia(query).matches,
    () => serverValue
  );
}

export function usePrefersReducedMotion() {
  return useMediaQuery(REDUCED_MOTION_QUERY, false);
}

// Seconds left before a code can be re-sent, and a way to restart the count
export function useResendCooldown() {
  const [secondsLeft, setSecondsLeft] = useState(0);
  const timerRef = useRef(null);

  const start = useCallback(() => {
    clearInterval(timerRef.current);
    setSecondsLeft(RESEND_COOLDOWN_SECONDS);
    timerRef.current = setInterval(() => {
      setSecondsLeft((seconds) => {
        if (seconds > 1) return seconds - 1;
        clearInterval(timerRef.current);
        return 0;
      });
    }, 1000);
  }, []);

  useEffect(() => () => clearInterval(timerRef.current), []);

  return [secondsLeft, start];
}

// Mounts the door shader and the catalogue core, and hands back stable
// handles to drive them from the form. The core (globe) only runs from
// desktop width up; phones and tablets get the door alone. `sound` is the site-wide
// engine (InteractionProvider), toggled from the header.
export function useVaultScene({ effects, reducedMotion, sound }) {
  const showCore = !useMediaQuery(COMPACT_QUERY, false);
  const doorCanvasRef = useRef(null);
  const coreCanvasRef = useRef(null);
  const coreLayerRef = useRef(null);
  const tooltipRef = useRef(null);
  const sceneRef = useRef({ door: null, core: null });

  useEffect(() => {
    const door = createDoor(doorCanvasRef.current, {
      reducedMotion,
      measure: () => measureSeam(doorCanvasRef.current, coreLayerRef.current),
      observe: [coreLayerRef.current],
    });
    sceneRef.current = { ...sceneRef.current, door };

    return () => {
      door.destroy();
      sceneRef.current = { ...sceneRef.current, door: null };
    };
  }, [reducedMotion]);

  useEffect(() => {
    if (!showCore) return;

    const core = createCore({
      canvas: coreCanvasRef.current,
      layer: coreCanvasRef.current.parentElement,
      tooltip: tooltipRef.current,
      effects,
      onHover: (effect, x) => effect && sound?.hover(x, "link"),
    });
    sceneRef.current = { ...sceneRef.current, core };

    return () => {
      core.destroy();
      sceneRef.current = { ...sceneRef.current, core: null };
    };
  }, [effects, showCore, sound]);

  return { doorCanvasRef, coreCanvasRef, coreLayerRef, tooltipRef, sceneRef, showCore };
}

// Writes the fixed site header's height to --header-h on the target, so the
// stage can start just below it. Uses offsetHeight, which ignores the
// header's intro slide-in transform.
export function useSiteHeaderHeight(targetRef) {
  useEffect(() => {
    const headers = [...document.querySelectorAll("[data-site-header]")];

    function update() {
      const visible = headers.filter((header) => getComputedStyle(header).display !== "none");
      const height = Math.max(0, ...visible.map((header) => header.offsetHeight));
      if (height) targetRef.current?.style.setProperty("--header-h", `${height}px`);
    }

    update();
    const observer = new ResizeObserver(update);
    headers.forEach((header) => observer.observe(header));
    window.addEventListener("resize", update);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [targetRef]);
}
