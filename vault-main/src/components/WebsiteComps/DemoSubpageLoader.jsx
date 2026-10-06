"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useLenis } from "lenis/react";
import ShimmerText from "@/components/WebsiteComps/ShimmerText";

const MIN_VISIBLE_MS = 500;
const MAX_WAIT_MS = 8000;
const POLL_INTERVAL_MS = 100;
const QUIET_MS = 250;
const FADE_MS = 500;

// Pages with their own custom page-transition effect double up with this
// overlay, so they opt out.
const EXCLUDED_PATHS = new Set([
  "/demo/block-transition",
  "/demo/block-transition/page2",
  "/demo/chess-grid-transition",
  "/demo/chess-grid-transition/page2",
  "/demo/page-flip-transition",
  "/demo/page-flip-transition/page2",
  "/demo/pixel-transition",
  "/demo/pixel-transition/page2",
  "/demo/radial-slice-transition",
  "/demo/radial-slice-transition/page2",
  "/demo/svg-brush-transition",
  "/demo/svg-brush-transition/page2",
  "/demo/lines-loader",
  // Text animation demos - excluded as a category.
  "/demo/blur-text",
  // "/demo/circle-text-reveal",
  // "/demo/glitchy-text",
  "/demo/mask-text-reveal",
  "/demo/number-counter",
  "/demo/overflow-text-reveal",
  "/demo/perspective-text-reveal",
  "/demo/rectangular-text-reveal",
  "/demo/scramble-text",
  "/demo/slide-text-reveal",
  "/demo/spotlight-text",
  "/demo/text-cloning",
  // "/demo/text-fill-animation",
  "/demo/text-hover",
  "/demo/text-stream",
  "/demo/depth-shift-transition/page2",
  "/demo/variable-text-proximity",
  "/demo/depth-shift-transition",
  "/demo/clippath-transition",
  "/demo/clippath-transition/page2",
  "/demo/ascend-transition",
  "/demo/ascend-transition/page2",
  "/demo/aperture-transition",
  "/demo/aperture-transition/page2",
  "/demo/sweep-lift-transition",
  "/demo/sweep-lift-transition/page2",
  "/demo/pixel-random",
  "/demo/pixel-random/page2",
  "/demo/depth-flip-text",
  "/demo/drop-text",
  "/demo/glowing-text",
  "/demo/focus-text",
  "/demo/pixel-text-fill",
  "/demo/typing-text",
  "/demo/flickering-text",
  "/demo/rolling-text",
  "/demo/dot-transition",

  
]);

function formatLabel(pathname) {
  const slug = pathname.split("/").filter(Boolean).pop() || "effect";

  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function isDomReady() {
  if (document.fonts && document.fonts.status !== "loaded") return false;

  return Array.from(document.images || []).every((img) => img.complete);
}

/**
 * Textures/models loaded by three.js don't show up in `document.images` or
 * fire any React-visible event - TextureLoader creates off-DOM `Image()`
 * objects, GLTFLoader/FileLoader fetch via XHR. Patching these while the
 * loader is mounted lets it track real in-flight requests for whatever a
 * given demo happens to load, without every demo page needing to opt in.
 */
function createNetworkIdleTracker() {
  const originalFetch = typeof window.fetch === "function" ? window.fetch.bind(window) : null;
  const OriginalXHR = window.XMLHttpRequest;
  const OriginalImage = window.Image;

  let pending = 0;
  let lastActivityAt = Date.now();
  const bump = () => {
    lastActivityAt = Date.now();
  };

  if (originalFetch) {
    window.fetch = (...args) => {
      pending += 1;
      bump();

      return originalFetch(...args).finally(() => {
        pending -= 1;
        bump();
      });
    };
  }

  if (OriginalXHR) {
    function PatchedXHR(...args) {
      const xhr = new OriginalXHR(...args);
      let counted = false;

      const onStart = () => {
        if (counted) return;
        counted = true;
        pending += 1;
        bump();
      };

      const onDone = () => {
        if (!counted) return;
        counted = false;
        pending -= 1;
        bump();
      };

      xhr.addEventListener("loadstart", onStart);
      xhr.addEventListener("loadend", onDone);

      return xhr;
    }

    PatchedXHR.prototype = OriginalXHR.prototype;
    window.XMLHttpRequest = PatchedXHR;
  }

  if (OriginalImage) {
    window.Image = new Proxy(OriginalImage, {
      construct(target, args) {
        const img = new target(...args);
        let counted = true;
        pending += 1;
        bump();

        const settle = () => {
          if (!counted) return;
          counted = false;
          pending -= 1;
          bump();
          img.removeEventListener("load", settle);
          img.removeEventListener("error", settle);
        };

        img.addEventListener("load", settle);
        img.addEventListener("error", settle);

        return img;
      },
    });
  }

  let restored = false;

  return {
    isIdle: () => pending <= 0 && Date.now() - lastActivityAt >= QUIET_MS,
    restore: () => {
      if (restored) return;
      restored = true;

      if (originalFetch) window.fetch = originalFetch;
      if (OriginalXHR) window.XMLHttpRequest = OriginalXHR;
      if (OriginalImage) window.Image = OriginalImage;
    },
  };
}

// Keyed by pathname in the parent so each navigation remounts this (and
// resets visible/fadingOut) instead of the effect setting state synchronously.
function DemoSubpageOverlay({ pathname }) {
  const [visible, setVisible] = useState(true);
  const [fadingOut, setFadingOut] = useState(false);
  const lenis = useLenis();

  useEffect(() => {
    if (!visible) return;
    lenis?.stop?.();

    return () => {
      lenis?.start?.();
    };
  }, [visible, lenis]);
  

  useEffect(() => {
    const startedAt = Date.now();
    const tracker = createNetworkIdleTracker();
    let cancelled = false;
    let pollId;

    const finish = () => {
      if (cancelled) return;

      tracker.restore();

      const remaining = Math.max(MIN_VISIBLE_MS - (Date.now() - startedAt), 0);

      window.setTimeout(() => {
        if (cancelled) return;

        setFadingOut(true);

        window.setTimeout(() => {
          if (!cancelled) setVisible(false);
        }, FADE_MS);
      }, remaining);
    };

    const check = () => {
      if (cancelled) return;

      const ready = isDomReady() && tracker.isIdle();

      if (ready || Date.now() - startedAt > MAX_WAIT_MS) {
        finish();
        return;
      }

      pollId = window.setTimeout(check, POLL_INTERVAL_MS);
    };

    // Two rAFs so the new page has actually painted (and kicked off its
    // loaders) before we start checking.
    requestAnimationFrame(() => requestAnimationFrame(check));

    return () => {
      cancelled = true;
      window.clearTimeout(pollId);
      tracker.restore();
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      aria-hidden="true"
      className={`fixed inset-0 z-99999 flex items-center justify-center bg-[#0e0e0e] transition-opacity duration-500 ease-out ${
        fadingOut ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
    >
      <ShimmerText
        as="p"
        baseColor="#939393" shimmerColor="#ffffff"
        className="text-[1.4vw] font-medium tracking-tight max-[1025px]:text-[4.5vw] text-[#939393]"
      >
        Loading {formatLabel(pathname)}
      </ShimmerText>
    </div>
  );
}

export default function DemoSubpageLoader({ children }) {
  const pathname = usePathname();

  if (EXCLUDED_PATHS.has(pathname)) {
    return children;
  }

  return (
    <>
      {children}
      <DemoSubpageOverlay key={pathname} pathname={pathname} />
    </>
  );
}
