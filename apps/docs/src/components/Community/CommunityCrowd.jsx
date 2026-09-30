"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { isLighthouseOrHeadless, isSoftwareRenderer } from "@/lib/audit";
import { prefersReducedMotion } from "@/lib/motion";
import { restoreJoined, setCrowd } from "./community-store";
import { mountCrowd } from "./src/crowd";

const SMALL_SCREEN = "(max-width: 760px)";
const LOW_CORE_COUNT = 4;

// One fixed canvas behind the whole page: the crowd drifts between the dark
// sections' poses (data-zone) and the light sheets slide over it. Hero, Stack
// and Join all share this instance through the community store.
// Audits and software renderers get the CSS glow only; reduced motion gets a
// still crowd with no render loop.
export default function CommunityCrowd() {
  const canvasRef = useRef(null);
  const [skipGPU, setSkipGPU] = useState(true);

  useEffect(() => {
    restoreJoined();
    // WebGL capability is only knowable on the client, after hydration
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSkipGPU(isLighthouseOrHeadless() || isSoftwareRenderer());
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (skipGPU || !canvas) return undefined;
    const zoneRoot = canvas.closest(".cm-x");
    const small = window.matchMedia(SMALL_SCREEN).matches || (navigator.hardwareConcurrency || 8) <= LOW_CORE_COUNT;
    const crowd = mountCrowd(canvas, { THREE, zoneRoot, small, reducedMotion: prefersReducedMotion() });
    setCrowd(crowd);

    // Pause the loop (and hide the fixed canvas) once the page's crowd
    // sections are off-screen, e.g. over the footer
    const io = new IntersectionObserver(([entry]) => {
      canvas.style.visibility = entry.isIntersecting ? "" : "hidden";
      if (entry.isIntersecting) crowd.start?.();
      else crowd.stop?.();
    });
    io.observe(zoneRoot);

    return () => {
      io.disconnect();
      setCrowd(null);
      crowd.destroy();
    };
  }, [skipGPU]);

  return (
    <>
      <div className="cm-glow" aria-hidden="true" />
      {!skipGPU && <canvas ref={canvasRef} className="cm-crowd" aria-hidden="true" />}
    </>
  );
}
