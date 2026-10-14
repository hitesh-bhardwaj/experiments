"use client";

import { useEffect, useRef, useState } from "react";
import { isLighthouseOrHeadless, isSoftwareRenderer } from "@/lib/audit";
import { prefersReducedMotion } from "@/lib/motion";
import { restoreJoined, setCrowd } from "./community-store";
import { createPortal } from "react-dom";
import { useInteraction } from "@/homepage/components/InteractionProvider";
import { getSiteFluid } from "@/homepage/components/SiteBackground";
import { MEDIA } from "@/lib/breakpoints";

const LOW_CORE_COUNT = 4;

// One fixed canvas behind the whole page: the crowd drifts between the dark
// sections' poses (data-zone) and the light sheets slide over it. Hero, Stack
// and Join all share this instance through the community store.
// Audits and software renderers get the CSS glow only; reduced motion gets a
// still crowd with no render loop.
export default function CommunityCrowd() {
  const canvasRef = useRef(null);
  const { sound } = useInteraction() ?? {};
  const [toast, setToast] = useState({ msg: "", on: false });
  const toastT = useRef(0);
  const [skipGPU, setSkipGPU] = useState(true);
  // Tablet and mobile never mount the crowd - the hero plays a video instead
  const [isDesktop, setIsDesktop] = useState(null);

  useEffect(() => {
    const mq = window.matchMedia(MEDIA.tablet);
    const sync = () => setIsDesktop(!mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    restoreJoined();
    // WebGL capability is only knowable on the client, after hydration
    // As in the prototype: run wherever WebGL works. Only crawler / audit user agents
    // skip it (mountCrowd itself falls back to the glow if WebGL can't start).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSkipGPU(isLighthouseOrHeadless() || isSoftwareRenderer());
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!isDesktop || skipGPU || !canvas) return undefined;
    const zoneRoot = document.querySelector(".cm-x");
    const small = window.matchMedia(MEDIA.mobile).matches || (navigator.hardwareConcurrency || 8) <= LOW_CORE_COUNT;
    // Prototype: showToast, 3.4s
    const onToast = (msg) => {
      setToast({ msg, on: true });
      clearTimeout(toastT.current);
      toastT.current = setTimeout(() => setToast((t) => ({ ...t, on: false })), 3400);
    };
    // three.js and the crowd load only here, once the scene will actually run, so
    // audit agents, tablets and phones never download them
    let cancelled = false;
    let crowd;
    let io;
    Promise.all([import("three"), import("./src/crowd")]).then(([THREE, { mountCrowd }]) => {
      if (cancelled) return;
      crowd = mountCrowd(canvas, { THREE, zoneRoot, small, reducedMotion: prefersReducedMotion(), sound, getFluid: getSiteFluid, onToast });
      setCrowd(crowd);
      // The blob fades in (it starts already formed, see crowd.js startInBlob)
      requestAnimationFrame(() => requestAnimationFrame(() => { canvas.style.opacity = "1"; }));

      // Pause the loop (and hide the fixed canvas) once the page's crowd
      // sections are off-screen, e.g. over the footer
      io = new IntersectionObserver(([entry]) => {
        canvas.style.visibility = entry.isIntersecting ? "" : "hidden";
        if (entry.isIntersecting) crowd.start?.();
        else crowd.stop?.();
      });
      io.observe(zoneRoot);
    });

    return () => {
      cancelled = true;
      io?.disconnect();
      if (crowd) {
        setCrowd(null);
        crowd.destroy();
      }
    };
  }, [isDesktop, skipGPU, sound]);

  return (
    <>
      {isDesktop && skipGPU && <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 size-full bg-[radial-gradient(50%_45%_at_72%_42%,color-mix(in_srgb,var(--primary)_16%,transparent),transparent_70%),radial-gradient(35%_30%_at_70%_45%,color-mix(in_srgb,var(--light)_5%,transparent),transparent_70%)]"
      />}
      {isDesktop && !skipGPU && createPortal(<canvas ref={canvasRef} className="pointer-events-none fixed inset-0 -z-2 size-full opacity-0 transition-opacity duration-[1400ms] ease-out" aria-hidden="true" />, document.body)}
      {/* The prototype's toast (a full hold explodes the wordmark) */}
      <div
        role="status"
        aria-live="polite"
        className={`type-small fixed bottom-[calc(var(--spacing)*6+env(safe-area-inset-bottom,0px))] left-1/2 z-130 max-w-[calc(100vw-var(--spacing)*8)] -translate-x-1/2 bg-grey px-4 py-3 text-foreground shadow-2xl ring-1 ring-inset ring-foreground/10 transition-transform duration-1000 ease-[cubic-bezier(.16,1,.3,1)] ${toast.on ? "translate-y-0" : "translate-y-[240%]"}`}
      >
        {toast.msg}
      </div>
    </>
  );
}
