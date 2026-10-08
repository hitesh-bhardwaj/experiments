"use client";

import { useEffect } from "react";
import { useLenis } from "lenis/react";
import { GridDots } from "@/components/grid-dots";

/**
 * The page-change loading screen (the orange dot grid). The page can't scroll
 * while it shows, so a wheel or touch during the change doesn't carry into the
 * new page; scrolling comes back when the new page replaces it.
 *
 * Lenis lives in the effects/templates layouts, which this screen replaces
 * during a change, so there's often no Lenis left to stop - the page would
 * just scroll natively. Scrolling is therefore locked on <html> itself, and
 * Lenis is stopped too when one is still mounted.
 */
export function RouteLoading() {
  const lenis = useLenis();

  useEffect(() => {
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = "hidden";
    const block = (event) => event.preventDefault();
    window.addEventListener("wheel", block, { passive: false });
    window.addEventListener("touchmove", block, { passive: false });
    return () => {
      root.style.overflow = previous;
      window.removeEventListener("wheel", block);
      window.removeEventListener("touchmove", block);
    };
  }, []);

  useEffect(() => {
    if (!lenis) return undefined;
    lenis.stop();
    return () => lenis.start();
  }, [lenis]);

  return (
    <div className="sticky top-0 flex h-screen w-full items-center justify-center">
      <GridDots size={56} squareSize={8} className="text-primary" />
    </div>
  );
}
