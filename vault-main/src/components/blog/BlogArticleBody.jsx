"use client";

import { useRef } from "react";
import { TableOfContents } from "@/components/ui/TableOfContents";
import { useFadeUp } from "@/components/Animations/gsapAnimations";
import BlogAuthor from "./BlogAuthor";
import BlogSharePopover from "./BlogSharePopover";


// "September 06,2026" - the zero-padded format the listing cards use.
function formatRailDate(value) {
  if (!value) return "";

  const date = new Date(value);
  const month = date.toLocaleDateString("en-US", { month: "long" });
  const day = String(date.getDate()).padStart(2, "0");

  return `${month} ${day},${date.getFullYear()}`;
}

export default function BlogArticleBody({
  slug,
  author,
  publishedAt,
  categories = [],
  readingMinutes,
  shareUrl,
  shareTitle,
  children,
  afterContent,
}) {
  const contentRef = useRef(null);
  const stopRef = useRef(null);
  const articleRef = useRef(null);

  // Scoped to the article: useFadeUp falls back to scanning the whole
  // document when the ref is empty, which would claim the hero's elements.
  useFadeUp(articleRef, [slug]);

  return (
    <div ref={articleRef} className="relative flex justify-between">
      {/* No `items-start` on the row above: that shrink-wraps each column to
          its own content height, leaving the sticky rail no distance to
          travel. Stretching gives it the article's full height.

          Author, share button and TOC share the one sticky container and all
          stay visible for the article's full height. */}
      <div className="w-[30%] shrink-0 max-[1025px]:hidden">
      
        <div className="sticky top-[15vh] flex flex-col gap-[1.6vw]">
          <BlogAuthor author={author} />

      
          <div className="flex flex-col gap-[0.8vw] text-[1vw] text-ink max-[1025px]:text-[2.4vw] max-md:text-[3.4vw]">
            {(publishedAt || readingMinutes) && (
              <div className="flex items-center gap-[1.2vw] text-[0.9vw] text-black/60">
                {publishedAt && (
                  <time dateTime={publishedAt}>Featured: {formatRailDate(publishedAt)}</time>
                )}

                {publishedAt && readingMinutes ? (
                  <span aria-hidden="true" className="h-[1.6vw] w-px bg-black/20" />
                ) : null}

                {readingMinutes ? <span>Read Time: {readingMinutes} mins</span> : null}
              </div>
            )}

            {categories.length > 0 && (
              <p className="text-[0.9vw] text-black/60">Category: {categories.map((category) => category.title).join(", ")}</p>
            )}
          </div>

          <div className="flex items-center gap-[0.6vw] text-[0.9vw] text-black/60 max-[1025px]:text-[2.4vw] max-md:text-[3.4vw]">
            <span>Share this Article:</span>
            <BlogSharePopover url={shareUrl} title={shareTitle} />
          </div>

          <hr className="h-0.5 w-[85%] border-0 bg-black/10" />

          <div className="w-fit pt-[5vh]">
            <TableOfContents
              containerRef={contentRef}
              stopRef={stopRef}
              watchKey={slug}
              side="left"
              alwaysVisible
            />
          </div>
        </div>
      </div>

      <div className="flex w-[66%] min-w-0 flex-col gap-[6vw] max-[1025px]:w-full max-md:gap-[8vw]">
        <div className="hidden flex-col gap-[3vw] max-[1025px]:flex max-md:gap-[4vw]">
          <BlogAuthor author={author} />

          <div className="flex flex-wrap items-center gap-x-[3vw] gap-y-2 text-black/60 max-[1025px]:text-[2.4vw] max-md:text-[3.4vw]">
            {publishedAt && (
              <time dateTime={publishedAt}>Featured: {formatRailDate(publishedAt)}</time>
            )}
            {readingMinutes ? <span>Read Time: {readingMinutes} mins</span> : null}
            {categories.length > 0 && (
              <span>Category: {categories.map((category) => category.title).join(", ")}</span>
            )}
          </div>
        </div>

        <div ref={contentRef} className="blog-content">
          {children}
        </div>
        <div ref={stopRef}>{afterContent}</div>
      </div>
    </div>
  );
}
