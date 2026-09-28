"use client";

import { useEffect } from "react";
import { useLenis } from "lenis/react";

/**
 * Starts the page at the top on every load, including reloads.
 *
 * Browsers restore the previous scroll offset on a reload, which drops the
 * visitor mid-page behind a loader that is still covering the screen - and the
 * hero's recede is scrubbed off scroll position, so it comes back already
 * halfway through. Two parts, because neither is enough on its own:
 *
 *  - `history.scrollRestoration = "manual"`, set from an inline script so it is
 *    in effect from the moment the markup is parsed. Restoration happens during
 *    load, well before this component hydrates, so an effect alone would be
 *    told after the fact. Same reason the loader ships its scroll lock as
 *    markup rather than waiting for JS.
 *  - An explicit reset once hydrated, repeated across the next few frames and
 *    again on `load`. Anything that changes page height while assets are still
 *    coming in can nudge the offset back, and Lenis has to be moved through its
 *    own API or it keeps integrating from the position it last recorded.
 *
 * A hash in the url is left alone - that is a request for a specific section.
 */

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
      // `force` because the loader holds Lenis stopped for the whole intro, and
      // a stopped instance ignores plain `scrollTo`.
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
