"use client";

import { useRef } from "react";
import Link from "next/link";
import BlogCard from "./BlogCard";
import { useFadeIn, useFadeUp } from "@/components/Animations/gsapAnimations";

// Same chips and text sizes as the effects listing's light catalogue sheet
const T13 = "text-[0.9vw] max-[1025px]:text-[1.6vw] max-md:text-[3.3vw]";
const T20 = "text-[1.4vw] max-[1025px]:text-[2.4vw] max-md:text-[5vw]";
const CHIP = `inline-flex h-8 shrink-0 cursor-pointer items-center gap-[0.5vw] px-3 ${T13} transition-[background-color,color,box-shadow] duration-500 max-md:gap-[2vw]`;
const CHIP_OFF = "text-black/60 ring-1 ring-inset ring-black/10 hover:text-ink hover:ring-primary";
const CHIP_ON = "bg-primary text-background";

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

  useFadeUp(sectionRef, [activeCategory, page]);
  useFadeIn(sectionRef, [activeCategory, page]);

  const activeTitle = categories.find((c) => c.slug === activeCategory)?.title;

  return (
    <section ref={sectionRef} id="blog-grid" className="relative flex flex-col">
      {/* summary + category filters, sticky like the effects listing's controls bar */}
      <div className="sticky top-[-2%] z-5 h-fit border-b border-black/8 bg-foreground max-[1025px]:static max-[1025px]:border-b-0">
        <div className="mx-auto flex w-full max-w-[1536px] flex-wrap items-end justify-between gap-[1vw] px-[4.5vw] pt-10 pb-4 max-md:gap-[4vw] max-md:px-[6vw] max-md:pt-8">
          <p aria-live="polite" className={`${T20} flex flex-wrap items-baseline gap-x-[0.4vw] font-aeonik tracking-tight max-md:gap-x-[1.5vw]`}>
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
      </div>

      <div className="mx-auto flex w-full max-w-[1536px] flex-col gap-[2.8vw] px-[4.5vw] pt-6 pb-24 max-md:gap-[10vw] max-md:px-[6vw] max-md:pb-16">
        {posts.length === 0 ? (
          <div className="flex flex-col items-center gap-3.5 px-4 py-20 text-center">
            <b className="text32 font-aeonik font-normal tracking-tight">Nothing here, yet.</b>
            <p className="text22 text-black/60">New posts land in the vault regularly.</p>
            {activeCategory !== "all" && (
              <Link href={buildHref({ category: "all" })} scroll={false} className={chip(false)}>
                See all posts
              </Link>
            )}
          </div>
        ) : (
          <div className="flex flex-wrap gap-x-[1.4vw] gap-y-[2.8vw] max-md:gap-y-[10vw]">
            {posts.map((post, index) => (
              <div key={post.slug} className="w-[calc((100%-2.8vw)/3)] max-[1025px]:w-[calc((100%-1.4vw)/2)] max-md:w-full">
                <BlogCard post={post} priority={index < 3} light />
              </div>
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
