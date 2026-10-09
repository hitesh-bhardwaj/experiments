"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import BlogCard from "../BlogCard";
import { ArrowIcon } from "@/components/WebsiteComps/Icons";
import Button from "@/homepage/components/Button";
import { useFadeIn } from "@/components/Animations/gsapAnimations";
import LineWipe from "@/components/Animations/LineWipe";

const RELATED_BLOGS_HEADING_LINE_STYLE = { lineHeight: "1.5" };

function SliderButton({ direction, disabled, onClick, activeOrange = false }) {
  const isNext = direction === "next";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={isNext ? "Show next related blogs" : "Show previous related blogs"}
      className={`group relative flex size-[3vw] items-center justify-center overflow-hidden text-ink transition-colors duration-300 max-[1025px]:size-10 ${
        disabled
          ? "cursor-not-allowed bg-black/5 opacity-40"
          : activeOrange
            ? "cursor-pointer bg-primary text-background"
            : "cursor-pointer bg-black/5 hover:bg-primary hover:text-background"
      }`}
    >
      <ArrowIcon
        className={`h-4.5 w-4.5 max-md:size-4 ${isNext ? "rotate-45" : "-rotate-135"} ${
          disabled
            ? ""
            : isNext
              ? "duration-300 ease-in-out group-hover:translate-x-[180%]"
              : "duration-300 ease-in-out group-hover:translate-x-[-180%]"
        }`}
      />
      <ArrowIcon
        className={`absolute h-4.5 w-4.5 max-md:size-4 ${isNext ? "rotate-45 translate-x-[-180%]" : "-rotate-135 translate-x-[180%]"} ${
          disabled ? "" : "duration-300 ease-in-out group-hover:translate-x-0"
        }`}
      />
    </button>
  );
}

export default function RelatedBlogsSlider({ posts = [] }) {
  const sectionRef = useRef(null);
  const sliderRef = useRef(null);
  const dragRef = useRef({
    isPointerDown: false,
    isDragging: false,
    startX: 0,
    startY: 0,
    scrollLeft: 0,
  });
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  useFadeIn(sectionRef, [posts.length]);

  const updateScrollState = useCallback(() => {
    const slider = sliderRef.current;

    if (!slider) return;

    setCanScrollPrev(slider.scrollLeft > 8);
    setCanScrollNext(slider.scrollLeft + slider.clientWidth < slider.scrollWidth - 8);
  }, []);

  const scrollRelatedBlogs = useCallback(
    (direction) => {
      const slider = sliderRef.current;

      if (!slider) return;

      const firstCard = slider.firstElementChild;
      const cardWidth = firstCard?.getBoundingClientRect().width || slider.clientWidth;
      const gap = parseFloat(window.getComputedStyle(slider).columnGap || "0") || 0;

      slider.scrollBy({
        left: direction === "next" ? cardWidth + gap : -(cardWidth + gap),
        behavior: "smooth",
      });

      requestAnimationFrame(updateScrollState);
      window.setTimeout(updateScrollState, 250);
    },
    [updateScrollState]
  );

  useEffect(() => {
    const slider = sliderRef.current;

    if (!slider) return;

    queueMicrotask(updateScrollState);
    slider.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);

    return () => {
      slider.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, [posts.length, updateScrollState]);

  const handlePointerDown = (event) => {
    const slider = sliderRef.current;

    if (!slider) return;

    dragRef.current = {
      isPointerDown: true,
      isDragging: false,
      startX: event.clientX,
      startY: event.clientY,
      scrollLeft: slider.scrollLeft,
    };
  };

  const handlePointerMove = (event) => {
    const slider = sliderRef.current;
    const dragState = dragRef.current;

    if (!slider || !dragState.isPointerDown) return;

    const deltaX = event.clientX - dragState.startX;
    const deltaY = event.clientY - dragState.startY;
    const isHorizontalDrag =
      Math.abs(deltaX) > 10 && Math.abs(deltaX) > Math.abs(deltaY);

    if (!isHorizontalDrag && !dragState.isDragging) return;

    dragState.isDragging = true;
    event.preventDefault();
    slider.scrollLeft = dragState.scrollLeft - deltaX;
  };

  const handlePointerEnd = () => {
    dragRef.current.isPointerDown = false;

    window.setTimeout(() => {
      dragRef.current.isDragging = false;
    }, 0);
  };

  const handleCardClick = (event) => {
    if (!dragRef.current.isDragging) return;

    event.preventDefault();
    event.stopPropagation();
  };

  if (!posts.length) return null;

  // Desktop/tablet only need the buttons once more than 3 cards overflow the
  // row - but mobile shows one full-width card at a time, so any post beyond
  // the first always needs a way to advance, regardless of total count.
  const showControls = posts.length > 3;
  const showMobileControls = posts.length > 1;

  return (
    <section ref={sectionRef} id="related-blogs" className="relative mx-auto flex w-full max-w-[1536px] flex-col gap-[2.8vw] px-[4.5vw] py-[7%] max-md:gap-[10vw] max-md:px-[6vw] max-md:py-[12%]">
      <div className="flex items-center justify-between gap-[1.4vw] max-[1025px]:flex-col max-[1025px]:gap-[5vw] max-md:gap-[10vw]">
        <LineWipe lineStyle={RELATED_BLOGS_HEADING_LINE_STYLE} lit="var(--ink)">
          <h2
            className="type-h1 text-center text-background"
            style={RELATED_BLOGS_HEADING_LINE_STYLE}
          >
            Related Blogs
          </h2>
        </LineWipe>

        <div className="flex items-center gap-[0.5vw] max-[1025px]:hidden">
          <Button text="Explore all blogs" href="/blog" variant="orange" className="shrink-0" />
        {showControls && (
          <div className="flex items-center justify-end gap-[0.5vw]">
            <SliderButton
              direction="previous"
              disabled={!canScrollPrev}
              onClick={() => scrollRelatedBlogs("previous")}
            />
            <SliderButton
              direction="next"
              disabled={!canScrollNext}
              onClick={() => scrollRelatedBlogs("next")}
            />
          </div>
        )}
        </div>
      </div>

      <div
        ref={sliderRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerLeave={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        onDragStart={(event) => event.preventDefault()}
        className="flex cursor-grab snap-x snap-mandatory select-none gap-[1.5vw] overflow-x-auto scroll-smooth pb-4 active:cursor-grabbing max-[1025px]:gap-[2vw] max-md:gap-[4vw]"
      >
        {posts.map((post, index) => (
          <div
            key={post.slug}
            onClick={handleCardClick}
            className="w-[32%] flex-none snap-start max-[1025px]:w-[60%] max-md:w-full"
          >
            <BlogCard post={post} priority={index === 0} light />
          </div>
        ))}
      </div>

      {showMobileControls && (
        <div className="hidden items-center justify-center gap-2 max-md:flex">
          <SliderButton
            direction="previous"
            disabled={!canScrollPrev}
            onClick={() => scrollRelatedBlogs("previous")}
            activeOrange
          />
          <SliderButton
            direction="next"
            disabled={!canScrollNext}
            onClick={() => scrollRelatedBlogs("next")}
            activeOrange
          />
        </div>
      )}
    </section>
  );
}
