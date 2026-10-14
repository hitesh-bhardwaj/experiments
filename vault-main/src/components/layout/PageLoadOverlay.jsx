"use client";

import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { GridDots } from "@/components/grid-dots";

// Longest a vault page waits for its sidebar before the cover lifts anyway - generous,
// since a slow first load (a dev compile) can take a few seconds to hydrate
const SIDEBAR_WAIT_MS = 3000;

/**
 * A full-screen background-coloured cover on top of everything, server-rendered so it
 * is there from the first paint of every load / reload, and hidden (gsap.set, no
 * animation) once the page is ready - so nothing shows half-styled or half-initialised.
 * pointer-events: none, so it never blocks input. It lives in the root layout, which
 * stays mounted on client navigation, so it only ever covers a full page load.
 *
 * Styled inline, not with classes: the stylesheet can arrive after the first paint (dev
 * especially), and the cover has to be there before it.
 *
 * On vault pages (the sidebar is in the HTML) it waits for VaultLayout's
 * "vault:sidebar-ready" - the stored open / closed sidebar state applied - so the
 * layout never visibly shifts; anywhere else it lifts at hydration.
 */
export function PageLoadOverlay() {
  const ref = useRef(null);

  useLayoutEffect(() => {
    const hide = () => gsap.set(ref.current, { opacity: 0 });
    if (!document.querySelector("[data-vault-sidebar]") || window.__vaultSidebarReady) {
      hide();
      return undefined;
    }
    const fallback = setTimeout(hide, SIDEBAR_WAIT_MS);
    const onReady = () => {
      clearTimeout(fallback);
      hide();
    };
    window.addEventListener("vault:sidebar-ready", onReady, { once: true });
    return () => {
      clearTimeout(fallback);
      window.removeEventListener("vault:sidebar-ready", onReady);
    };
  }, []);

  return (
    <>
      <div
        ref={ref}
        data-page-load-overlay
        aria-hidden="true"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 2147483647,
          pointerEvents: "none",
          background: "var(--background, #111111)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <GridDots
          size={56}
          squareSize={8}
          color="var(--primary, #ff5f00)"
          style={{
            display: "inline-grid",
            gap: 4,
            alignItems: "center",
            justifyContent: "center",
          }}
        />
      </div>
      {/* No JavaScript, no hydration: never leave the page covered */}
      <noscript>
        <style>{"[data-page-load-overlay]{display:none}"}</style>
      </noscript>
    </>
  );
}
