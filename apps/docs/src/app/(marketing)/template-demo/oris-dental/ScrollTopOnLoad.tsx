// Built using Hyperiux Vault: https://vault.hyperiux.com

"use client";

import { useEffect } from "react";
import { useLenis } from "lenis/react";


const INLINE_RESTORATION_RESET =
  "try{if(!location.hash)history.scrollRestoration='manual'}catch(e){}";

export default function ScrollTopOnLoad() {
  const lenis = useLenis();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash) return;

    const previousScrollRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";

    const scrollToTop = () => {
      lenis?.scrollTo?.(0, { immediate: true, force: true });
      window.scrollTo(0, 0);
    };

    scrollToTop();

    const rafOne = requestAnimationFrame(scrollToTop);
    const rafTwo = requestAnimationFrame(() => {
      requestAnimationFrame(scrollToTop);
    });
    const timeout = window.setTimeout(scrollToTop, 150);

    window.addEventListener("load", scrollToTop);

    return () => {
      cancelAnimationFrame(rafOne);
      cancelAnimationFrame(rafTwo);
      window.clearTimeout(timeout);
      window.removeEventListener("load", scrollToTop);
      window.history.scrollRestoration = previousScrollRestoration;
    };
  }, [lenis]);

  return (
    <script
      // Runs while the document is still parsing, ahead of hydration and ahead
      // of the browser's own restore.
      dangerouslySetInnerHTML={{ __html: INLINE_RESTORATION_RESET }}
    />
  );
}
