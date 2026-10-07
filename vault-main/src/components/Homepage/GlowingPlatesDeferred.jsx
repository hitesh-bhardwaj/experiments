"use client";

import dynamic from "next/dynamic";
import useIsMobile from "@/hooks/useIsMobile";
import DeferredMount from "@/components/WebsiteComps/DeferredMount";

// The dark placeholder matches --background (#0e0e0e) exactly, so it stands in
// for the scene's own backdrop with no white flash. `max-lg:hidden` mirrors the
// scene container, so nothing shows below the md breakpoint.
const BACKDROP = (
  <div className="absolute inset-0 z-10 h-[140vh] max-lg:hidden w-full bg-background" />
);

// Keep the three.js / @react-three bundle out of the initial page chunk - it
// only downloads/parses once DeferredMount mounts the scene (after load + idle).
const GlowingPlates = dynamic(() => import("./GlowingPlates"), {
  ssr: false,
  loading: () => BACKDROP,
});

// Single entry point for the hero scene: dynamic import + idle mount + mobile
// skip. Props (e.g. waitForLoader) pass straight through to GlowingPlates.
export default function GlowingPlatesDeferred(props) {
  const { isMounted, isMobile } = useIsMobile();

  // The scene container is `max-lg:hidden`, so it is never visible below the md
  // (1025px) breakpoint. Skipping the mount there means phones/tablets never
  // download or parse the three.js bundle at all - visually identical (nothing
  // was ever shown), just without the wasted JS. Guard on isMounted so SSR and
  // the first client paint still emit the backdrop.
  if (isMounted && isMobile) return null;

  return (
    <DeferredMount strategy="idle" fallback={BACKDROP}>
      {/* Wait for Loader2's loaderComplete before fading the canvas in -
          otherwise the scene pops/glitches when the orange wipe exits. */}
      <GlowingPlates waitForLoader {...props} />
    </DeferredMount>
  );
}
