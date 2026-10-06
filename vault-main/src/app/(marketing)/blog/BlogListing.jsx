"use client";

import { useRef } from "react";
import Link from "next/link";
import BlogCard from "./BlogCard";
import { useFadeIn, useFadeUp } from "@/components/Animations/gsapAnimations";


function buildHref({ category, page }) {
  const query = new URLSearchParams();

  if (category && category !== "all") query.set("category", category);
  if (page && page > 1) query.set("page", String(page));

  const qs = query.toString();

  return qs ? `/blog?${qs}` : "/blog";
}


function categoryChipClass(isSelected) {
  return `px-4 py-2.5 text-[0.9vw] max-md:text-sm max-[1025px]:text-[2.5vw] text-center relative max-md:px-7 max-md:py-3 backdrop-blur-[6px] font-mono group flex items-center cursor-pointer transition-colors duration-300 ${
    isSelected
      ? "bg-[#ff5f00] text-black hover:text-black hover:bg-[#ff5f00]"
      : "bg-[#161616] text-[#FFFFFF] hover:text-black hover:bg-[#ff5f00]"
  }`;
}

export default function BlogListing({
  posts = [],
  categories = [],
  activeCategory = "all",
  page = 1,
  pageCount = 1,
}) {
  const sectionRef = useRef(null);


  useFadeUp(sectionRef, [activeCategory, page]);
  useFadeIn(sectionRef, [activeCategory, page]);

  return (
    <section ref={sectionRef} className="flex flex-col gap-[2vw] max-md:gap-[6vw]">
      {categories.length > 0 && (
        <div className="flex flex-wrap max-md:px-[5vw] items-center gap-4 max-[1025px]:flex-nowrap max-[1025px]:overflow-x-auto">
          <Link href={buildHref({ category: "all" })} scroll={false} className={categoryChipClass(activeCategory === "all")}>
            <span className="leading-none">All</span>
          </Link>

          {categories.map((category) => (
            <Link
              key={category.slug}
              href={buildHref({ category: category.slug })}
              scroll={false}
              className={categoryChipClass(activeCategory === category.slug)}
            >
              <span className="leading-none text-[0.9vw] max-md:text-sm">{category.title}</span>
            </Link>
          ))}
        </div>
      )}

      {posts.length === 0 ? (
        <p className="t22 text-light-grey">No posts yet.</p>
      ) : (
        <div className="flex max-md:px-[7vw] flex-col gap-[3vw] pb-[4vw] max-md:gap-[6vw] max-[1025px]:pt-[4vh]">
          <div className="grid auto-rows-fr grid-cols-3 max-md:gap-y-6 items-stretch gap-x-6 gap-y-12 max-[1025px]:grid-cols-2 max-md:grid-cols-1 max-[1025px]:gap-y-8 max-[1025px]:gap-x-5 max-md:gap-16">
            {posts.map((post, index) => (
              <BlogCard key={post.slug} post={post} priority={index < 3} />
            ))}
          </div>

          {pageCount > 1 && (
            <div className="flex items-center justify-center gap-2.5">
              <Link
                href={buildHref({ category: activeCategory, page: page - 1 })}
                aria-disabled={page === 1}
                className={`${categoryChipClass(false)} ${page === 1 ? "pointer-events-none opacity-30" : ""}`}
              >
                <span className="leading-none">Prev</span>
              </Link>

              {Array.from({ length: pageCount }, (_, index) => index + 1).map((pageNumber) => (
                <Link
                  key={pageNumber}
                  href={buildHref({ category: activeCategory, page: pageNumber })}
                  className={categoryChipClass(page === pageNumber)}
                >
                  <span className="leading-none">{pageNumber}</span>
                </Link>
              ))}

              <Link
                href={buildHref({ category: activeCategory, page: page + 1 })}
                aria-disabled={page === pageCount}
                className={`${categoryChipClass(false)} ${
                  page === pageCount ? "pointer-events-none opacity-30" : ""
                }`}
              >
                <span className="leading-none">Next</span>
              </Link>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
