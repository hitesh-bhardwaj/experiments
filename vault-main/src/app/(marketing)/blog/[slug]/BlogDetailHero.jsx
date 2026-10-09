"use client";

import { useRef } from "react";
import Image from "next/image";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import LineWipe from "@/components/Animations/LineWipe";
import { useFadeUp } from "@/components/Animations/gsapAnimations";

// Client component so the heading/copy/fadeup animations can run - the page
// itself is an async server component and can't call hooks.
export default function BlogDetailHero({ post }) {
  const heroRef = useRef(null);

  // Scoped to this header: useFadeUp falls back to scanning the whole
  // document when the ref is empty, which would claim the article body's
  // own .fadeup blocks too.
  useFadeUp(heroRef);

  return (
    <div ref={heroRef} className="flex flex-col gap-[3.5vw] max-md:gap-[8vw]">
      <section id="blog-hero" className="mx-auto flex w-full max-w-[1536px] flex-col gap-[2vw] px-[4.5vw] max-md:gap-[5vw] max-md:px-[6vw]">
        <Breadcrumb maxWords={3} />

        <LineWipe>
          <h1 className="type-h1 w-[80%]  leading-[1.2] text-[3.2vw] text-foreground max-[1025px]:w-full">
            {post.title}
          </h1>
        </LineWipe>

        {post.summary && (
          <LineWipe delay={0.5}>
            <p className="type-body-lg w-[60%] text-foreground/90 max-[1025px]:w-full">
              {post.summary}
            </p>
          </LineWipe>
        )}
      </section>

      {post.coverImage?.url && (
        <section id="blog-cover" className="fadeup mx-auto w-full max-w-[1536px] px-[4.5vw] max-md:px-[6vw]">
          <div className="group relative h-[48vw] w-full overflow-hidden max-md:h-[60vw]">
            <Image
              src={post.coverImage.url}
              alt={post.coverImage.alt || post.title}
              width={1600}
              height={900}
              priority
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          </div>
        </section>
      )}
    </div>
  );
}
