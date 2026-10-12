"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import BlogCard from "../BlogCard";
import { SliderArrowButton, SliderNav } from "@/components/ui/SliderArrowButton";
import { useFadeIn } from "@/components/Animations/gsapAnimations";
import LineWipe from "@/components/Animations/LineWipe";

const RELATED_BLOGS_HEADING_LINE_STYLE = { lineHeight: "1.5" };

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

        <SliderNav
          className="max-lg:hidden"
          exploreText="Explore all blogs"
          exploreHref="/blog"
          showArrows={showControls}
          onPrev={() => scrollRelatedBlogs("previous")}
          onNext={() => scrollRelatedBlogs("next")}
          canPrev={canScrollPrev}
          canNext={canScrollNext}
          prevLabel="Show previous related blogs"
          nextLabel="Show next related blogs"
        />
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
          <SliderArrowButton
            direction="prev"
            tone="light"
            disabled={!canScrollPrev}
            onClick={() => scrollRelatedBlogs("previous")}
            ariaLabel="Show previous related blogs"
          />
          <SliderArrowButton
            direction="next"
            tone="light"
            disabled={!canScrollNext}
            onClick={() => scrollRelatedBlogs("next")}
            ariaLabel="Show next related blogs"
          />
        </div>
      )}
    </section>
  );
}
