"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { getEffectHref } from "@/lib/categories";
import { resolveEffectVideoUrl, resolveMediaUrl, resizeR2ImageUrl } from "@/lib/media";
import { useAutoplayPreviewVideo } from "@/hooks/useAutoplayPreviewVideo";
import { ArrowIcon } from "@/components/WebsiteComps/Icons";
import { horizontalLoop } from "./horizontalLoop";

const CARD_SIZES = "(max-width: 768px) 80vw, (max-width: 1025px) 40vw, 22vw";
const COVER_WIDTH = 640;
const COVER_HEIGHT = 480;

// pixelsPerSecond inside horizontalLoop is 100 * this - drives both the
// continuous marquee speed and the base duration of each card's own
// wrap-around tween. ~0.35 roughly matches the old rAF-lerp marquee's
// visual pace (was 0.6px/frame at ~60fps, ~36px/s).
const LOOP_SPEED = 0.35;
// How long a manual prev/next step takes, and how long autoplay stays
// paused after one before resuming - mirrors the old manualPauseUntilRef
// cooldown (900ms) so clicking through doesn't feel like it's immediately
// yanked back into the marquee mid-look.
const NAV_STEP_DURATION = 0.4;
const REDUCED_MOTION_NAV_DURATION = 0.15;
const AUTOPLAY_RESUME_DELAY = 500;

function formatLabel(value = "") {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function resolveCoverImage(effect) {
  const raw = effect?.coverImage || effect?.imageSrc;
  if (!raw || raw === "/assets/img/image01.webp" || raw === "image01") return null;

  const resolved = resolveMediaUrl(raw, {
    defaultDirectory: "vault-listing-images",
    defaultExtension: "png",
  });

  if (!resolved || resolved === "/assets/img/image01.webp") return null;
  if (resolved.startsWith("/")) return resolved;

  return resizeR2ImageUrl(resolved, { width: COVER_WIDTH, height: COVER_HEIGHT });
}

function TrendingEffectCard({ effect, priority = false }) {
  const [imageError, setImageError] = useState(false);

  const coverImage = useMemo(() => resolveCoverImage(effect), [effect]);
  const videoPreviewUrl = useMemo(() => resolveEffectVideoUrl(effect), [effect]);
  const { cardRef, showVideo, shouldRenderVideo, videoProps } =
    useAutoplayPreviewVideo(videoPreviewUrl);
  const categoryLabel = formatLabel(
    (effect.categories?.length ? effect.categories[0] : effect.category) ||
    "components",
  );

  // Video playback (viewport-driven autoplay, shared concurrency cap - the
  // same pool EffectCardNew's grid draws from, since both can be on screen
  // at once on /effects - tab-visibility pause, stall fallback) is handled
  // entirely by useAutoplayPreviewVideo. No hover handlers needed here.
  return (
    <Link
      href={getEffectHref(effect)}
      prefetch={false}
      draggable={false}
      ref={cardRef}
      className="group relative block h-full w-full overflow-hidden bg-[#161616]/40"
    >
      <span className="absolute left-5 top-3 z-10 bg-[#2B2B2B] px-3 py-[0.1vw] text-[0.8vw]  tracking-[0.06em] text-white max-md:text-[3vw] max-lg:text-[2vw] max-md:px-4 max-md:py-1.5 ">
        {categoryLabel}
      </span>

      <div className="absolute inset-x-3  h-[64%]  overflow-hidden bg-[#202020] md:inset-x-5 top-[17.5%] max-md:top-[20%] max-md:inset-x-5 ">
        {coverImage && !imageError ? (
          <Image
            src={coverImage}
            alt={effect.title || effect.name}
            fill
            sizes={CARD_SIZES}
            priority={priority}
            loading={priority ? undefined : "lazy"}
            draggable={false}
            onError={() => setImageError(true)}
            className={`object-cover object-center select-none ${
              showVideo ? "opacity-0" : "opacity-100"
            }`}
          />
        ) : (
          <div className="h-full w-full bg-[#202020]" />
        )}
        {shouldRenderVideo && (
          <video
            {...videoProps}
            className={`absolute inset-0 h-full w-full object-cover ${
              showVideo ? "opacity-100" : "opacity-0"
            }`}
          />
        )}
      </div>

      <div className="pointer-events-none absolute inset-x-4 bottom-3 z-10 max-md:inset-x-5  ">
        <p className="truncate px-0.5 pb-1.5  text-[1.15vw] font-medium leading-none text-white max-md:text-[3.5vw] max-lg:text-[2vw]">
          {effect.title || effect.name}
        </p>
      </div>
    </Link>
  );
}

export default function TrendingRightNow({ effects = [] }) {
  const trackRef = useRef(null);
  const cardRefs = useRef([]);
  const loopRef = useRef(null);
  const isHoveredRef = useRef(false);
  const reduceMotionRef = useRef(false);
  const attemptsRef = useRef(0);
  // Purely passive tracking (never preventDefault/stopPropagation itself)
  // of whether the current pointer gesture crossed the move threshold -
  // used only to decide whether the eventual click should be suppressed.
  // horizontalLoop's own native pointer listeners on the same element
  // handle the actual drag-to-scroll independently; this never touches them.
  const dragTrackingRef = useRef({ isPointerDown: false, startX: 0, startY: 0, moved: false });

  useEffect(() => {
    cardRefs.current = cardRefs.current.slice(0, effects.length);
  }, [effects.length]);

  useEffect(() => {
    reduceMotionRef.current =
      window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true;
  }, []);

  useEffect(() => {
    if (!trackRef.current || !effects.length) return;

    attemptsRef.current = 0;

    function tryInit() {
      const items = cardRefs.current.filter(Boolean);
      if (!items.length || !trackRef.current) return;

      // horizontalLoop's getTotalWidth() measures out to the last card's own
      // right edge - it has no way to know about the trailing gap that
      // would exist between the last card and a wrapped-around first card,
      // since spacing here comes from the track's CSS `gap` (gap-6/gap-4),
      // not margin. Without paddingRight to account for it, the wrap
      // distance comes up one gap short, so the last card re-enters slightly
      // early and visibly overlaps whatever's currently at the front - the
      // "first and last card overlapping" glitch. Read the track's actual
      // computed gap rather than hardcoding 24px/16px so it's still correct
      // whichever breakpoint's gap-* class is active at init time.
      const trackGap = parseFloat(getComputedStyle(trackRef.current).columnGap) || 0;

      const loop = horizontalLoop(items, {
        repeat: -1,
        draggable: true,
        wrapperEl: trackRef.current,
        speed: LOOP_SPEED,
        pauseOnHover: true,
        isHoveredRef,
        reduceMotion: reduceMotionRef.current,
        paddingRight: trackGap,
      });

      if (!loop) {
        // Items not measurable yet (e.g. images/layout not settled) - retry
        // next frame, same as SmoothInfiniteCarousel's own init.
        if (attemptsRef.current < 10) {
          attemptsRef.current += 1;
          requestAnimationFrame(tryInit);
        }
        return;
      }

      loopRef.current = loop;
      // The marquee: horizontalLoop's timeline is paused by default (it's
      // meant to be driven by drag/nav/wheel) - repeat:-1 + play() is what
      // turns it into continuous automatic movement, at LOOP_SPEED.
      if (!reduceMotionRef.current) {
        loop.play();
      }
    }

    const raf = requestAnimationFrame(tryInit);

    return () => {
      cancelAnimationFrame(raf);
      loopRef.current?.draggable?.kill();
      loopRef.current?.kill();
      loopRef.current = null;
      attemptsRef.current = 0;
    };
  }, [effects.length]);

  const resumeAutoplaySoon = () => {
    window.setTimeout(() => {
      if (!isHoveredRef.current && !dragTrackingRef.current.isPointerDown && !reduceMotionRef.current) {
        loopRef.current?.play();
      }
    }, AUTOPLAY_RESUME_DELAY);
  };

  const step = (direction) => {
    const loop = loopRef.current;
    if (!loop) return;

    loop.pause();

    const vars = {
      duration: reduceMotionRef.current ? REDUCED_MOTION_NAV_DURATION : NAV_STEP_DURATION,
      ease: reduceMotionRef.current ? "power2.out" : "power1.inOut",
      onComplete: resumeAutoplaySoon,
    };

    if (direction > 0) loop.next(vars);
    else loop.previous(vars);
  };

  // Paused unconditionally on pointerdown (before knowing whether this
  // becomes a real drag or just a click) - horizontalLoop's own draggable
  // module takes over tl.progress() the same way regardless, and letting
  // the continuous-autoplay ticker keep advancing tl.time() at the same
  // time would fight it.
  const handleTrackPointerDown = (event) => {
    dragTrackingRef.current = {
      isPointerDown: true,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
    };
    loopRef.current?.pause();
  };

  const handleTrackPointerMove = (event) => {
    const state = dragTrackingRef.current;
    if (!state.isPointerDown) return;

    const deltaX = event.clientX - state.startX;
    const deltaY = event.clientY - state.startY;
    if (Math.abs(deltaX) > 10 && Math.abs(deltaX) > Math.abs(deltaY)) {
      state.moved = true;
    }
  };

  const handleTrackPointerUp = () => {
    dragTrackingRef.current.isPointerDown = false;
    resumeAutoplaySoon();
    // Deferred so the click event this pointerup produces (if any) still
    // sees `moved: true` and gets suppressed by handleTrackClickCapture.
    window.setTimeout(() => {
      dragTrackingRef.current.moved = false;
    }, 0);
  };

  // Capture-phase so it runs before the card <Link>'s own click handling -
  // stopPropagation here keeps a drag-release from also being read as a
  // click-through to the effect page.
  const handleTrackClickCapture = (event) => {
    if (dragTrackingRef.current.moved) {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  if (!effects.length) return null;

  return (
    <section className="relative w-full overflow-hidden  px-14 pt-16 pb-4 max-md:px-0 max-md:pt-12">
      <div className="mb-7 flex items-center max-md:px-5 justify-between max-md:mb-5">
        <h2 className=" text-2xl font-medium text-foreground">
          Trending
        </h2>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => step(-1)}
            aria-label="Previous"
            className="group relative flex size-9 cursor-pointer items-center justify-center overflow-hidden hover:text-black bg-[#161616] text-white transition-colors duration-300 hover:bg-[#ff5f00]"
          >
            <ArrowIcon className="h-4.5 w-4.5 max-md:h-3.5 max-md:w-3.5 -rotate-135 group-hover:translate-x-[-180%] duration-300 ease-in-out" />
            <ArrowIcon className="h-4.5 w-4.5 max-md:h-3.5 max-md:w-3.5 -rotate-135 absolute translate-x-[180%] group-hover:translate-x-0 duration-300 ease-in-out" />
          </button>

          <button
            type="button"
            onClick={() => step(1)}
            aria-label="Next"
            className="group relative flex size-9 cursor-pointer items-center justify-center overflow-hidden hover:text-black bg-[#161616] text-white transition-colors duration-300 hover:bg-[#ff5f00]"
          >
            <ArrowIcon className="h-4.5 w-4.5 max-md:h-3.5 max-md:w-3.5 rotate-45 group-hover:translate-x-[180%] duration-300 ease-in-out" />
            <ArrowIcon className="h-4.5 w-4.5 max-md:h-3.5 max-md:w-3.5 rotate-45 absolute translate-x-[-180%] group-hover:translate-x-0 duration-300 ease-in-out" />
          </button>
        </div>
      </div>

      <div className="w-full bg-black/20 backdrop-blur-lg backd py-12 mt-8 relative overflow-hidden">
        <div
          ref={trackRef}
          onPointerEnter={() => {
            isHoveredRef.current = true;
            loopRef.current?.pause();
          }}
          onPointerLeave={() => {
            // Not clearing drag tracking here: setPointerCapture (inside
            // horizontalLoop's own draggable module) keeps move/up events
            // targeting this element even once the cursor visually leaves
            // its bounds, so an active drag should keep tracking rather
            // than cut off at the edge.
            isHoveredRef.current = false;
            resumeAutoplaySoon();
          }}
          onPointerDown={handleTrackPointerDown}
          onPointerMove={handleTrackPointerMove}
          onPointerUp={handleTrackPointerUp}
          onClickCapture={handleTrackClickCapture}
          className="flex w-fit gap-6 overflow-hidden select-none max-md:gap-4 cursor-grab active:cursor-grabbing touch-pan-y"
        >
          {effects.map((effect, index) => (
            <div
              key={effect.name}
              ref={(el) => {
                cardRefs.current[index] = el;
              }}
              className="h-70 w-90 shrink-0"
            >
              <TrendingEffectCard effect={effect} priority={index < 4} />
            </div>
          ))}
        </div>
        {/* <div className="absolute top-0 left-0 w-[10vw] h-full pointer-events-none bg-gradient-to-r from-[#050505] to-transparent z-20 " />
        <div className="absolute top-0 right-0 w-[10vw] h-full pointer-events-none bg-gradient-to-l from-[#050505] to-transparent z-20" /> */}
      </div>
    </section>
  );
}
