"use client";

import { useEffect } from "react";
import { useLenis } from "lenis/react";
import { GridDots } from "@/components/grid-dots";

/**
 * The page-change loading screen (the orange dot grid) - used by every place
 * that shows it: the workspace and effect loading.js files, and VaultLayout
 * while a sidebar link is navigating. The page can't scroll while it shows,
 * so a wheel or touch during the change doesn't carry into the new page;
 * scrolling comes back once no loader is left on screen.
 *
 * Scrolling is locked on <html> and the (workspace-wide) Lenis is stopped.
 * Two loaders can overlap during one change (VaultLayout's, then
 * loading.js's), so the lock is counted: it goes on with the first loader and
 * comes off with the last, rather than each one restoring what it saw.
 */
let activeLoaders = 0;
const blockScroll = (event) => event.preventDefault();

/**
 * True while a page-change loader is on screen. Code that force-starts Lenis
 * on a route change (VaultLayout, SearchBar) checks this and leaves it stopped;
 * the last loader to go starts it again.
 */
export const isRouteLoading = () => activeLoaders > 0;

export function RouteLoading({ className = "sticky top-0 flex h-screen w-full items-center justify-center" }) {
  const lenis = useLenis();

  useEffect(() => {
    activeLoaders += 1;
    if (activeLoaders === 1) {
      document.documentElement.style.overflow = "hidden";
      window.addEventListener("wheel", blockScroll, { passive: false });
      window.addEventListener("touchmove", blockScroll, { passive: false });
    }
    lenis?.stop();
    return () => {
      activeLoaders -= 1;
      if (activeLoaders > 0) return;
      document.documentElement.style.overflow = "";
      window.removeEventListener("wheel", blockScroll);
      window.removeEventListener("touchmove", blockScroll);
      lenis?.start();
    };
  }, [lenis]);

  return (
    <div className={className}>
      <GridDots size={56} squareSize={8} className="text-primary" />
    </div>
  );
}
