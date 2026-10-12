"use client";

import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";

/**
 * A full-screen background-coloured cover on top of everything, server-rendered so it
 * is there from the first paint of every load / reload, and hidden (gsap.set, no
 * animation) as soon as the page hydrates - so nothing shows half-styled or
 * half-initialised before React is in. pointer-events: none, so it never blocks input.
 * It lives in the root layout, which stays mounted on client navigation, so it only
 * ever covers a full page load.
 */
export function PageLoadOverlay() {
  const ref = useRef(null);

  useLayoutEffect(() => {
    gsap.set(ref.current, { opacity: 0 });
  }, []);

  return (
    <>
      <div
        ref={ref}
        data-page-load-overlay
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-[2147483647] bg-background"
      />
      {/* No JavaScript, no hydration: never leave the page covered */}
      <noscript>
        <style>{"[data-page-load-overlay]{display:none}"}</style>
      </noscript>
    </>
  );
}
