"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { isAuditUserAgent } from "@/lib/audit";
import { prefersReducedMotion } from "@/lib/motion";
import { restoreJoined, setCrowd } from "./community-store";
import { createPortal } from "react-dom";
import { mountCrowd } from "./src/crowd";
import { useInteraction } from "@/homepage/components/InteractionProvider";
import { getSiteFluid } from "@/homepage/components/SiteBackground";

const SMALL_SCREEN = "(max-width: 760px)";
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

  useEffect(() => {
    restoreJoined();
    // WebGL capability is only knowable on the client, after hydration
    // As in the prototype: run wherever WebGL works. Only crawler / audit user agents
    // skip it (mountCrowd itself falls back to the glow if WebGL can't start).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSkipGPU(isAuditUserAgent(navigator.userAgent));
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (skipGPU || !canvas) return undefined;
    const zoneRoot = document.querySelector(".cm-x");
    const small = window.matchMedia(SMALL_SCREEN).matches || (navigator.hardwareConcurrency || 8) <= LOW_CORE_COUNT;
    // Prototype: showToast, 3.4s
    const onToast = (msg) => {
      setToast({ msg, on: true });
      clearTimeout(toastT.current);
      toastT.current = setTimeout(() => setToast((t) => ({ ...t, on: false })), 3400);
    };
    const crowd = mountCrowd(canvas, { THREE, zoneRoot, small, reducedMotion: prefersReducedMotion(), sound, getFluid: getSiteFluid, onToast });
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
  }, [skipGPU, sound]);

  return (
    <>
      {skipGPU && <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 size-full bg-[radial-gradient(50%_45%_at_72%_42%,rgba(255,107,0,.16),transparent_70%),radial-gradient(35%_30%_at_70%_45%,rgba(244,244,244,.05),transparent_70%)]"
      />}
      {!skipGPU && createPortal(<canvas ref={canvasRef} className="pointer-events-none fixed inset-0 -z-2 size-full" aria-hidden="true" />, document.body)}
      {/* The prototype's toast (a full hold explodes the wordmark) */}
      <div
        role="status"
        aria-live="polite"
        className="fixed bottom-[calc(24px+env(safe-area-inset-bottom,0px))] left-1/2 z-130 max-w-[calc(100vw-2rem)] bg-[#1f1f1f] px-[18px] py-3 text-sm text-[#F4F4F4] shadow-[inset_0_0_0_1px_rgba(244,244,244,.1),0_20px_40px_-12px_#000]"
        style={{ transform: `translate(-50%, ${toast.on ? "0" : "240%"})`, transition: "transform 1s cubic-bezier(.16,1,.3,1)" }}
      >
        {toast.msg}
      </div>
    </>
  );
}
