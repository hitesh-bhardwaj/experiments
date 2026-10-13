/**
 * The one scene the loader and the hero share.
 *
 * The hero's rings (HeroRibbons) are on screen from the first frame: the
 * loader is only the UI drawn over them. Both read this object instead of
 * passing props, because the loader writes it from a GSAP ticker and the rings
 * read it from their own render loop - neither should re-render React to move
 * a scalar.
 *
 * - `progress` 0 → 1: the rings ripple out from the centre as the page loads.
 * - `settle`   0 → 1: the rings swing into the hero's pose. Linear; the scene
 *   eases each part of it on its own.
 * - `ready`: the rings have drawn their first frame, so the loader can drop its
 *   backdrop without revealing an empty canvas.
 */
export const loaderScene = {
  progress: 0,
  settle: 0,
  ready: false,
};

export const SCENE_READY_EVENT = "hyperiux-v3:scene-ready";

/** Back to an empty, centred ring - the loader is about to play. */
export function resetLoaderScene() {
  loaderScene.progress = 0;
  loaderScene.settle = 0;
}

/** Straight to the hero pose - the loader is skipped. */
export function settleLoaderScene() {
  loaderScene.progress = 1;
  loaderScene.settle = 1;
}

export function markSceneReady() {
  if (loaderScene.ready || typeof window === "undefined") return;
  loaderScene.ready = true;
  window.dispatchEvent(new CustomEvent(SCENE_READY_EVENT));
}
