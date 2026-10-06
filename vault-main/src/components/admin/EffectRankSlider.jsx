"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { getEffectHref } from "@/lib/categories";
import { resolveMediaUrl, resizeR2ImageUrl, resolveEffectVideoUrl } from "@/lib/media";
import { ArrowIcon } from "@/components/WebsiteComps/Icons";

const COVER_WIDTH = 900;
const COVER_HEIGHT = 600;
const CARD_SIZES = "(max-width: 767px) 70vw, (max-width: 1279px) 38vw, 26vw";
const CARD_GAP_PX = 24; // matches the slider's gap-6

function resolveCoverImage(effect) {
  const resolved = resolveMediaUrl(effect?.coverImage, {
    defaultDirectory: "vault-listing-images",
    defaultExtension: "png",
  });
  if (!resolved) return null;
  return resizeR2ImageUrl(resolved, { width: COVER_WIDTH, height: COVER_HEIGHT });
}

// Purpose-built for the admin Activity page's "Top saved/copied effects"
// ranking - a lighter sibling of components/ui/EffectCardNew.jsx (wishlist
// toggle, registry-dependency pills - none of it relevant to a read-only
// ranking), but keeping the same hover-video preview since that's the one
// piece of EffectCardNew's interactivity this ranking is actually missing
// without it: a still cover image only, no motion.
function RankCard({ effect, valueLabel, renderValue }) {
  const [imageError, setImageError] = useState(false);
  const [active, setActive] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const videoRef = useRef(null);

  const coverImage = resolveCoverImage(effect);
  const videoPreviewUrl = useMemo(() => resolveEffectVideoUrl(effect), [effect]);
  const title = effect.title || effect.slug;

  // Same imperative src attach/detach as EffectCardNew.jsx - keeps a source
  // element playing only while hovered, so a full slider of cards never
  // holds more than one attached video decoder at a time.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoPreviewUrl) return;

    if (active) {
      if (video.getAttribute("src") !== videoPreviewUrl) {
        video.src = videoPreviewUrl;
        video.load();
      }
      video.play().catch(() => {});
    } else if (video.getAttribute("src")) {
      video.pause();
      video.removeAttribute("src");
      video.load();
    }
  }, [active, videoPreviewUrl]);

  const showVideo = active && videoReady;

  return (
    <Link
      href={getEffectHref(effect)}
      // A fixed width (not min-width): as a flex item with no flex-grow set,
      // min-width alone only floors the size - a card whose title is wider
      // than 26vw would render at its own content width instead, which is
      // exactly why cards used to come out visibly different sizes.
      //
      // Mobile is one card per view - full width of this slider's own scroll
      // container (%, not vw: DashboardShell's max-md:px-[7vw] inset means a
      // vw-based width ignores how much space is actually available on a
      // phone screen, throwing card-to-container alignment off in a way
      // that's only visible once that padding is a meaningful fraction of
      // the screen, i.e. on phones, not desktop/tablet's fixed px-14).
      className="group block w-[26vw] max-xl:w-[38vw] max-md:w-full shrink-0 snap-start"
      onMouseEnter={() => setActive(true)}
      onMouseLeave={() => setActive(false)}
    >
      <div className="relative overflow-hidden bg-[#1c1c1c] aspect-video">
        {coverImage && !imageError ? (
          <Image
            src={coverImage}
            alt={title}
            fill
            sizes={CARD_SIZES}
            className={`object-cover  ${showVideo ? "opacity-0" : "opacity-100"}`}
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="h-full w-full bg-[#1c1c1c]" />
        )}
        {videoPreviewUrl && (
          <video
            ref={videoRef}
            muted
            loop
            playsInline
            preload="none"
            onLoadedData={() => setVideoReady(true)}
            onEmptied={() => setVideoReady(false)}
            onError={() => setVideoReady(false)}
            className={`absolute inset-0 h-full w-full object-cover  ${showVideo ? "opacity-100" : "opacity-0"}`}
          />
        )}
        {effect.tier === "pro" && (
          <span className="absolute top-3 left-3 bg-primary px-2.5 py-1 text-xs font-medium uppercase text-white">
            Pro
          </span>
        )}
      </div>

      <div className="mt-4 flex items-start justify-between gap-3">
        {/* min-w-0: a flex item's min-width defaults to its content's
            intrinsic width, which overrides truncate's overflow-hidden and
            lets a long title push this row (and the fixed-width card above)
            wider than intended - resetting it is what actually makes the
            ellipsis kick in instead. */}
        <p className="min-w-0 truncate text-lg text-white/85 group-hover:text-white" title={title}>
          {title}
        </p>
        <span className="shrink-0 text-lg font-medium text-white">
          {renderValue ? (
            renderValue(effect)
          ) : (
            <>
              {effect.count}
              {valueLabel ? <span className="ml-1.5 text-sm text-white/80">{valueLabel}</span> : null}
            </>
          )}
        </span>
      </div>
    </Link>
  );
}

// Same drag-scroll/snap/arrow-button mechanics (and the same arrow-button
// markup, down to the group-hover double-arrow slide) as the "Related
// Effects" slider on the effect detail page
// (effects/[slug]/effect-detail.jsx) - this is that same slider, sized for
// a full-width admin panel instead of the main site's grid.
export function EffectRankSlider({ title, effects, valueLabel, height = 260, renderValue }) {
  const sliderRef = useRef(null);
  const dragRef = useRef({ isPointerDown: false, isDragging: false, startX: 0, scrollLeft: 0 });
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const updateScrollState = () => {
    const slider = sliderRef.current;
    if (!slider) return;
    setCanScrollPrev(slider.scrollLeft > 8);
    setCanScrollNext(slider.scrollLeft + slider.clientWidth < slider.scrollWidth - 8);
  };

  // canScrollPrev/canScrollNext only ever got set from the slider's own
  // onScroll/drag handlers below, so on a fresh load (or a reload) both sat
  // at their useState(false) default - "Prev" correctly disabled, but
  // "Next" wrongly disabled too, until something scrolled the slider once.
  // Same fix as the Related Effects slider on the effect detail page
  // (effect-detail.jsx) - run it once on mount, and again whenever the
  // effect list itself changes (a different dataset changes scrollWidth).
  useEffect(() => {
    if (!sliderRef.current) return;

    queueMicrotask(updateScrollState);
  }, [effects]);

  // One card per click, not a full clientWidth "page" (which at this card
  // size covers 3+ cards in one jump) - measured off the actual rendered
  // card rather than assumed from the vw class, so it stays correct across
  // breakpoints.
  const scrollByDirection = (direction) => {
    const slider = sliderRef.current;
    if (!slider) return;
    const firstCard = slider.firstElementChild;
    const step = firstCard ? firstCard.getBoundingClientRect().width + CARD_GAP_PX : slider.clientWidth;
    slider.scrollBy({ left: direction * step, behavior: "smooth" });
  };

  const handlePointerDown = (event) => {
    const slider = sliderRef.current;
    if (!slider) return;
    dragRef.current = {
      isPointerDown: true,
      isDragging: false,
      startX: event.clientX,
      scrollLeft: slider.scrollLeft,
    };
  };

  const handlePointerMove = (event) => {
    const slider = sliderRef.current;
    const drag = dragRef.current;
    if (!slider || !drag.isPointerDown) return;

    const delta = event.clientX - drag.startX;
    if (!drag.isDragging && Math.abs(delta) < 10) return;

    if (!drag.isDragging) drag.isDragging = true;
    event.preventDefault();
    slider.scrollLeft = drag.scrollLeft - delta;
  };

  const endDrag = () => {
    dragRef.current.isPointerDown = false;
    setTimeout(() => {
      dragRef.current.isDragging = false;
    }, 0);
    updateScrollState();
  };

  const handleCardClickCapture = (event) => {
    if (dragRef.current.isDragging) {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  const showControls = effects?.length > 3;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        {title && <p className="text-white text-xl">{title}</p>}

        {showControls && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => scrollByDirection(-1)}
              disabled={!canScrollPrev}
              aria-label="Scroll left"
              className={`group relative flex size-10 items-center justify-center overflow-hidden bg-[#161616] text-white transition-colors duration-300 ${!canScrollPrev ? "cursor-not-allowed opacity-40" : "cursor-pointer hover:bg-[#ff5f00]"}`}
            >
              <ArrowIcon className={`h-4.5 w-4.5 -rotate-135 ${!canScrollPrev ? "" : "group-hover:translate-x-[-180%] duration-300 ease-in-out"}`} />
              <ArrowIcon className={`h-4.5 w-4.5 -rotate-135 absolute translate-x-[180%] ${!canScrollPrev ? "" : "group-hover:translate-x-0 duration-300 ease-in-out"}`} />
            </button>

            <button
              type="button"
              onClick={() => scrollByDirection(1)}
              disabled={!canScrollNext}
              aria-label="Scroll right"
              className={`group relative flex size-10 items-center justify-center overflow-hidden bg-[#161616] text-white transition-colors duration-300 ${!canScrollNext ? "cursor-not-allowed opacity-40" : "cursor-pointer hover:bg-[#ff5f00]"}`}
            >
              <ArrowIcon className={`h-4.5 w-4.5 rotate-45 ${!canScrollNext ? "" : "group-hover:translate-x-[180%] duration-300 ease-in-out"}`} />
              <ArrowIcon className={`h-4.5 w-4.5 rotate-45 absolute translate-x-[-180%] ${!canScrollNext ? "" : "group-hover:translate-x-0 duration-300 ease-in-out"}`} />
            </button>
          </div>
        )}
      </div>

      {!effects?.length ? (
        <div className="flex items-center justify-center text-sm text-white/40" style={{ height }}>
          No data yet
        </div>
      ) : (
        <div
          ref={sliderRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endDrag}
          onPointerLeave={endDrag}
          onPointerCancel={endDrag}
          onDragStart={(event) => event.preventDefault()}
          onClickCapture={handleCardClickCapture}
          onScroll={updateScrollState}
          className="effect-rank-slider flex cursor-grab snap-x snap-mandatory select-none gap-6 overflow-x-auto scroll-smooth pb-6 active:cursor-grabbing"
        >
          {effects.map((effect) => (
            <RankCard key={effect.slug} effect={effect} valueLabel={valueLabel} renderValue={renderValue} />
          ))}
        </div>
      )}
    </div>
  );
}
