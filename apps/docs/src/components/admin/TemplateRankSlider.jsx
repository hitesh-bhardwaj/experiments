"use client";

import { useEffect, useRef, useState } from "react";
import { TemplateCard } from "@/components/ui/TemplateCard";
import { ArrowIcon } from "@/components/WebsiteComps/Icons";

const CARD_GAP_PX = 24; // matches gap-6 below
const CARD_SIZES = "(max-width: 767px) 70vw, (max-width: 1279px) 38vw, 26vw";

// Sibling to EffectRankSlider (same drag-scroll/snap/arrow-button shell,
// same "No data yet" empty state) for the admin Activity overview's "Top
// viewed templates" ranking - reuses TemplateCard itself rather than a
// bespoke read-only card, since templates already have a real, polished
// card (cover image, tier badge, Eye-icon view count) with nothing
// effects-specific (R2 cover resizing, hover-video preview) to strip out.
export function TemplateRankSlider({ title, templates, height = 260 }) {
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

  useEffect(() => {
    if (!sliderRef.current) return;
    queueMicrotask(updateScrollState);
  }, [templates]);

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

  const showControls = templates?.length > 2;

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

      {!templates?.length ? (
        <div className="flex items-center justify-center text-sm text-white/40" style={{ height }}>
          No views recorded in this window yet
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
          className="template-rank-slider flex cursor-grab snap-x snap-mandatory select-none gap-6 overflow-x-auto scroll-smooth pb-6 active:cursor-grabbing"
        >
          {templates.map((template) => (
            // Fixed width, not min-width - see EffectRankSlider's identical
            // fix for why min-width alone let cards render at inconsistent,
            // content-driven sizes instead of a uniform one. Mobile is one
            // card per view - full width of this slider's own container (%,
            // not vw, for the same reason documented there: DashboardShell's
            // max-md:px-[7vw] inset makes a raw vw width ignore how much
            // space is actually available on a phone-width screen).
            <div key={template.slug} className="w-[26vw] max-xl:w-[38vw] max-md:w-full shrink-0 snap-start">
              <TemplateCard template={template} sizes={CARD_SIZES} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
