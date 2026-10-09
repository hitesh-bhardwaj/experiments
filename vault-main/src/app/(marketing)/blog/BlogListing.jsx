"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import BlogCard from "./BlogCard";
import { useFadeIn, useFadeUp } from "@/components/Animations/gsapAnimations";

// Same chips and text sizes as the effects listing's light catalogue sheet
const T13 = "text-[0.9vw] max-[1025px]:text-[1.6vw] max-md:text-[3.3vw]";
const T20 = "text-[1.4vw] max-[1025px]:text-[2.4vw] max-md:text-[5vw]";
const CHIP = `inline-flex h-8 shrink-0 cursor-pointer items-center gap-[0.5vw] px-3 ${T13} transition-[background-color,color,box-shadow] duration-500 max-md:gap-[2vw]`;
const CHIP_OFF = "text-black/60 ring-1 ring-inset ring-black/10 hover:text-ink hover:ring-primary";
const CHIP_ON = "bg-primary text-background";
const T14 = "text-[0.97vw] max-[1025px]:text-[1.7vw] max-md:text-[3.6vw]";

// Same column switch as the effects listing: 2 or 3 cards per row on desktop
// (tablet is always 2, mobile 1). The choice is remembered.
const COLS_KEY = "hyperiux-blog-cols";
const GRID_COLS = { 2: "w-[calc((100%-2.4vw)/2)]", 3: "w-[calc((100%-4.8vw)/3)]" };
const COLUMN_ICONS = {
  2: (
    <>
      <rect x="3.5" y="4.5" width="7.5" height="15" />
      <rect x="13" y="4.5" width="7.5" height="15" />
    </>
  ),
  3: (
    <>
      <rect x="2.5" y="4.5" width="5" height="15" />
      <rect x="9.5" y="4.5" width="5" height="15" />
      <rect x="16.5" y="4.5" width="5" height="15" />
    </>
  ),
};
const COLUMN_ITEMS = [2, 3].map((n) => ({
  id: n,
  ariaLabel: `${n} cards per row`,
  label: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="size-4" aria-hidden="true">
      {COLUMN_ICONS[n]}
    </svg>
  ),
}));
// Same card layout animation as the effects grid.
const CARD_LAYOUT_TRANSITION = { layout: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } };

function readStoredCols() {
  try {
    return Number(window.localStorage.getItem(COLS_KEY)) === 2 ? 2 : 3;
  } catch {
    return 3;
  }
}

// A segmented control whose dark active block slides to the chosen option.
function SlidingSegment({ label, items, value, onChange, itemClassName, className = "" }) {
  const index = Math.max(0, items.findIndex((item) => item.id === value));
  return (
    <div role="group" aria-label={label} className={`relative flex gap-0.5 bg-black/10 p-0.75 ${className}`}>
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute top-0.75 bottom-0.75 left-0.75 bg-ink transition-transform duration-500 ease-[cubic-bezier(.16,1,.3,1)] ${itemClassName}`}
        style={{ transform: `translateX(calc(${index} * (100% + 2px)))` }}
      />
      {items.map((item) => {
        const active = item.id === value;
        return (
          <button
            key={item.id}
            type="button"
            aria-pressed={active}
            aria-label={item.ariaLabel}
            onClick={() => onChange(item.id)}
            className={`relative z-1 flex h-8 cursor-pointer items-center justify-center ${T14} transition-colors duration-500 ${itemClassName} ${
              active ? "text-light" : "text-black/60 hover:text-ink"
            }`}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

function buildHref({ category, page }) {
  const query = new URLSearchParams();

  if (category && category !== "all") query.set("category", category);
  if (page && page > 1) query.set("page", String(page));

  const qs = query.toString();

  return qs ? `/blog?${qs}` : "/blog";
}

const chip = (on) => `${CHIP} ${on ? CHIP_ON : CHIP_OFF}`;

export default function BlogListing({
  posts = [],
  total = 0,
  categories = [],
  activeCategory = "all",
  page = 1,
  pageCount = 1,
}) {
  const sectionRef = useRef(null);
  const [cols, setCols] = useState(3);

  useEffect(() => {
    setCols(readStoredCols());
  }, []);

  const chooseCols = (n) => {
    setCols(n);
    try {
      window.localStorage.setItem(COLS_KEY, String(n));
    } catch {}
  };

  useFadeUp(sectionRef, [activeCategory, page]);
  useFadeIn(sectionRef, [activeCategory, page]);

  const activeTitle = categories.find((c) => c.slug === activeCategory)?.title;

  return (
    <section ref={sectionRef} id="blog-grid" className="relative flex flex-col">
      {/* summary + category filters, sticky like the effects listing's controls bar */}
      <div className="sticky top-[-2%] z-5 h-fit border-b border-black/8 bg-foreground max-[1025px]:static max-[1025px]:border-b-0">
        <div className="mx-auto flex w-full max-w-[1536px] flex-wrap items-end justify-between gap-[1vw] px-[4.5vw] pt-10 pb-4 max-md:gap-[4vw] max-md:px-[6vw] max-md:pt-8">
          <div className="flex flex-wrap items-end gap-x-[2vw] gap-y-[1vw] max-md:gap-[4vw]">
            <p aria-live="polite" className={`${T20} flex flex-wrap items-baseline gap-x-[0.4vw] font-avenir tracking-tight max-md:gap-x-[1.5vw]`}>
              <span className="font-medium tabular-nums">{total}</span>
              <span className="text-black/60">{total === 1 ? "post" : "posts"}</span>
              {activeTitle && <span className="pl-[0.3vw] text-black/60">· {activeTitle}</span>}
            </p>

            {categories.length > 0 && (
              <div className="flex flex-wrap gap-[0.4vw] max-md:gap-[1.5vw]">
                <Link href={buildHref({ category: "all" })} scroll={false} className={chip(activeCategory === "all")}>
                  All
                </Link>
                {categories.map((category) => (
                  <Link
                    key={category.slug}
                    href={buildHref({ category: category.slug })}
                    scroll={false}
                    className={chip(activeCategory === category.slug)}
                  >
                    {category.title}
                  </Link>
                ))}
              </div>
            )}
          </div>

          <SlidingSegment
            label="Columns"
            items={COLUMN_ITEMS}
            value={cols}
            onChange={chooseCols}
            itemClassName="w-8.5"
            className="max-[1025px]:hidden"
          />
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-[1536px] flex-col gap-[2.8vw] px-[4.5vw] pt-6 pb-24 max-md:gap-[10vw] max-md:px-[6vw] max-md:pb-16">
        {posts.length === 0 ? (
          <div className="flex flex-col items-center gap-3.5 px-4 py-20 text-center">
            <b className="text32 font-avenir font-normal tracking-tight">Nothing here, yet.</b>
            <p className="text22 text-black/60">New posts land in the vault regularly.</p>
            {activeCategory !== "all" && (
              <Link href={buildHref({ category: "all" })} scroll={false} className={chip(false)}>
                See all posts
              </Link>
            )}
          </div>
        ) : (
          <div className="flex flex-wrap gap-x-[2.4vw] gap-y-[3.6vw] max-md:gap-y-[10vw]">
            {posts.map((post, index) => (
              <motion.div
                key={post.slug}
                layout
                transition={CARD_LAYOUT_TRANSITION}
                className={`${GRID_COLS[cols]} max-[1025px]:w-[calc((100%-2.4vw)/2)] max-md:w-full`}
              >
                {/* keyed by the column count so the title/summary line splits re-measure at the new width */}
                <BlogCard key={cols} post={post} priority={index < 3} light />
              </motion.div>
            ))}
          </div>
        )}

        {pageCount > 1 && (
          <nav aria-label="Blog pages" className="flex items-center justify-center gap-[0.4vw] max-md:gap-[1.5vw]">
            <Link
              href={buildHref({ category: activeCategory, page: page - 1 })}
              aria-disabled={page === 1}
              className={`${chip(false)} ${page === 1 ? "pointer-events-none opacity-30" : ""}`}
            >
              Prev
            </Link>
            {Array.from({ length: pageCount }, (_, index) => index + 1).map((pageNumber) => (
              <Link
                key={pageNumber}
                href={buildHref({ category: activeCategory, page: pageNumber })}
                aria-current={page === pageNumber ? "page" : undefined}
                className={chip(page === pageNumber)}
              >
                {pageNumber}
              </Link>
            ))}
            <Link
              href={buildHref({ category: activeCategory, page: page + 1 })}
              aria-disabled={page === pageCount}
              className={`${chip(false)} ${page === pageCount ? "pointer-events-none opacity-30" : ""}`}
            >
              Next
            </Link>
          </nav>
        )}
      </div>
    </section>
  );
}
