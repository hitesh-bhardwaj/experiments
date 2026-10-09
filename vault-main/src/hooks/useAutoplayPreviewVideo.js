"use client";

import { useEffect, useId, useRef, useState } from "react";
import { usePrefersReducedMotion } from "@/lib/motion";

// Caps how many preview videos can be decoding/playing at once, shared by
// every card using this hook ACROSS THE WHOLE PAGE - the effects grid
// (EffectCardNew) and the Trending carousel (TrendingRightNow) can both be
// on screen at once (the /effects listing page renders both), so this is
// intentionally one shared budget rather than one pool per component - two
// independent caps would still let 2x this many heavy videos play at once on
// that page. A dense grid can put a dozen+ cards within the viewport-autoplay
// trigger simultaneously; cards past the cap just keep showing their static
// cover until a slot frees up (another card scrolls out of view) rather
// than competing for slots or never playing. Some preview clips are tens of
// MB and each concurrent one competes for the same bandwidth (see the
// onWaiting stall fallback below), so this is still short of the browser's
// real per-tab decoder limit even at 12.
const MAX_CONCURRENT_PREVIEW_VIDEOS = 12;
const playingCardIds = new Set();
const waitingForSlot = new Map(); // cardId -> retry callback

function claimVideoSlot(id, retry) {
  if (playingCardIds.has(id)) return true;
  if (playingCardIds.size >= MAX_CONCURRENT_PREVIEW_VIDEOS) {
    waitingForSlot.set(id, retry);
    return false;
  }
  playingCardIds.add(id);
  return true;
}

// Safe to call whether `id` currently holds a slot, is only queued, or is
// neither - each branch is a harmless no-op when it doesn't apply.
function releaseVideoSlot(id) {
  waitingForSlot.delete(id);
  if (!playingCardIds.delete(id)) return;

  const next = waitingForSlot.entries().next().value;
  if (next) {
    const [nextId, retry] = next;
    waitingForSlot.delete(nextId);
    retry();
  }
}

// One page-wide listener (not one per card) - pauses every currently-playing
// preview when the tab is backgrounded, so autoplaying videos don't keep
// decoding/burning battery while nobody can see them, and resumes only the
// ones this same listener paused when the tab is foregrounded again. Guarded
// on `document` (not a module-scope boolean) so Fast Refresh re-evaluating
// this module in dev can't bind a second listener.
if (typeof document !== "undefined" && !document.__effectPreviewVisibilityBound) {
  document.__effectPreviewVisibilityBound = true;

  document.addEventListener("visibilitychange", () => {
    const videos = document.querySelectorAll("[data-effect-preview]");

    if (document.hidden) {
      videos.forEach((video) => {
        if (!video.paused) {
          video.dataset.pausedForVisibility = "1";
          video.pause();
        }
      });
    } else {
      videos.forEach((video) => {
        if (video.dataset.pausedForVisibility) {
          delete video.dataset.pausedForVisibility;
          video.play().catch(() => {});
        }
      });
    }
  });
}

// Preview clips are several MB each. Hold them until the page has loaded and the
// browser is idle, so they don't compete with the page's own CSS, JS and images on
// first load, and don't autoplay at all when the visitor asked to save data.
let pageSettled = null;
function whenPageSettled() {
  if (!pageSettled) {
    pageSettled = new Promise((resolve) => {
      const idle = () =>
        window.requestIdleCallback ? window.requestIdleCallback(() => resolve(), { timeout: 2000 }) : setTimeout(resolve, 300);
      if (document.readyState === "complete") idle();
      else window.addEventListener("load", idle, { once: true });
    });
  }
  return pageSettled;
}

function prefersSavingData() {
  const connection = typeof navigator !== "undefined" ? navigator.connection : null;
  return Boolean(connection?.saveData || /2g$/.test(connection?.effectiveType || ""));
}

const STALL_FALLBACK_DELAY = 1500;
const OBSERVER_ROOT_MARGIN = "200px 0px";
const OBSERVER_THRESHOLD = 0.1;

/**
 * Viewport-driven autoplay for a muted preview <video>: plays as soon as the
 * card is on screen and pauses/releases the moment it scrolls away, with no
 * hover required. Shared concurrency cap, page-wide tab-visibility pause,
 * and prefers-reduced-motion opt-out are all module-level and shared across
 * every card using this hook, regardless of which component renders it.
 *
 * A stall mid-playback (buffer starved by a large/slow-loading source)
 * would otherwise freeze on whatever frame it ran out of data on, reading
 * as a glitched/broken card - onWaiting below falls back to the static
 * cover after a short grace period instead, and onPlaying brings the video
 * back the moment it actually resumes.
 *
 * Usage: `const card = useAutoplayPreviewVideo(videoUrl)`, then spread
 * `card.videoProps` onto the <video> element, attach `card.cardRef` to the
 * hoverable/observed container, and use `card.hasAppeared` / `card.showVideo`
 * to drive the cover-image/video crossfade and whether to mount the
 * <video> element at all (`card.shouldRenderVideo`).
 */
export function useAutoplayPreviewVideo(videoUrl) {
  const [active, setActive] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [hasAppeared, setHasAppeared] = useState(false);

  const cardRef = useRef(null);
  const videoRef = useRef(null);
  const isIntersectingRef = useRef(false);
  const stallTimerRef = useRef(null);
  const cardId = useId();
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const card = cardRef.current;
    if (!card || reducedMotion || prefersSavingData()) return;
    let cancelled = false;

    function attemptPlay() {
      if (!isIntersectingRef.current) return;
      whenPageSettled().then(() => {
        if (cancelled || !isIntersectingRef.current) return;
        if (claimVideoSlot(cardId, attemptPlay)) setActive(true);
      });
    }

    function release() {
      setActive(false);
      releaseVideoSlot(cardId);
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        isIntersectingRef.current = entry.isIntersecting;

        if (entry.isIntersecting) {
          setHasAppeared(true);
          attemptPlay();
        } else {
          release();
        }
      },
      { rootMargin: OBSERVER_ROOT_MARGIN, threshold: OBSERVER_THRESHOLD }
    );

    observer.observe(card);
    return () => {
      cancelled = true;
      observer.disconnect();
      release();
    };
  }, [cardId, reducedMotion]);

  // hasAppeared (the fade-in trigger) still needs to fire even when
  // playback itself is skipped for reduced motion - a lighter-weight
  // observer than the one above, since it only ever needs to fire once.
  useEffect(() => {
    const card = cardRef.current;
    if (!card || (!reducedMotion && !prefersSavingData())) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setHasAppeared(true);
      },
      { rootMargin: OBSERVER_ROOT_MARGIN, threshold: OBSERVER_THRESHOLD }
    );

    observer.observe(card);
    return () => observer.disconnect();
  }, [reducedMotion]);

  // Drive the <video> imperatively so React never owns `src`. Activating
  // attaches the source and plays; deactivating detaches it, releasing the
  // WebMediaPlayer (crbug.com/1144736). An empty <video> holds no decoder,
  // so the element stays mounted without accumulating toward Chrome's ~75-
  // player limit.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoUrl) return;

    if (active) {
      if (video.getAttribute("src") !== videoUrl) {
        video.src = videoUrl;
        video.load();
      }
      video.play().catch(() => {});
    } else if (video.getAttribute("src")) {
      video.pause();
      video.removeAttribute("src");
      video.load();
    }
  }, [active, videoUrl]);

  useEffect(() => () => clearTimeout(stallTimerRef.current), []);

  const videoProps = {
    ref: videoRef,
    "data-effect-preview": true,
    muted: true,
    loop: true,
    playsInline: true,
    preload: "none",
    onLoadedData: () => setVideoReady(true),
    onPlaying: () => {
      clearTimeout(stallTimerRef.current);
      setVideoReady(true);
    },
    onWaiting: () => {
      clearTimeout(stallTimerRef.current);
      stallTimerRef.current = setTimeout(() => setVideoReady(false), STALL_FALLBACK_DELAY);
    },
    onEmptied: () => setVideoReady(false),
    onError: () => setVideoReady(false),
  };

  return {
    cardRef,
    hasAppeared,
    showVideo: active && videoReady,
    shouldRenderVideo: hasAppeared && Boolean(videoUrl) && !reducedMotion,
    videoProps,
  };
}
