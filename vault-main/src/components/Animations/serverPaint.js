"use client";

import { useState, useSyncExternalStore } from "react";

const subscribeNothing = () => () => {};

/**
 * Text reveals (HeadAnim, Copy, LineWipe, LineReveal) don't hide their text in
 * the server HTML, so a full page load paints its headline straight away.
 * This tells a reveal whether its element came in that server HTML (it's
 * hydrating) or was rendered by the browser (client navigation). React hands
 * the server snapshot to hydration only, so the answer is read once, on the
 * first render.
 */
export function useFromServerHtml() {
  const isClientRender = useSyncExternalStore(subscribeNothing, () => true, () => false);
  const [fromServerHtml] = useState(!isClientRender);
  return fromServerHtml;
}

/**
 * A server-painted element already on screen at hydration keeps its first
 * paint: hiding it to play the reveal would hold back the page's largest text
 * (its LCP) until JS, fonts and the tween have all finished. Below the fold,
 * re-renders, and client navigation still reveal - a browser-rendered element
 * is hidden by the reveal's layout effect before its first paint.
 */
export function keepServerPaint({ runId, fromServerHtml, element }) {
  if (runId !== 1 || !fromServerHtml || !element) return false;
  const rect = element.getBoundingClientRect();
  return rect.top < window.innerHeight && rect.bottom > 0;
}
