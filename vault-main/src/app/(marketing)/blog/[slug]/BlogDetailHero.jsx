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
    <div ref={heroRef} className="flex flex-col gap-[calc(var(--cvw)*3.5)] max-md:gap-0">
      <section id="blog-hero" className="site-container section-x flex flex-col gap-10 max-md:pb-[12%]">
        <Breadcrumb maxWords={3} />

        <div className="flex flex-col gap-6">
          <LineWipe>
            <h1 className="type-h1 w-[80%] leading-[1.2] text-[calc(var(--cvw)*3.2)] max-md:text-[8vw] text-foreground max-lg:w-full">
              {post.title}
            </h1>
          </LineWipe>

          {post.summary && (
            <LineWipe delay={0.5}>
              <p className="type-body-lg w-[60%] text-foreground/80 max-lg:w-full">
                {post.summary}
              </p>
            </LineWipe>
          )}
        </div>
      </section>

      {post.coverImage?.url && (
        <section id="blog-cover" className="fadeup site-container section-x max-md:py-[12%] max-md:pt-4">
          <div className="group relative h-[calc(var(--cvw)*48)] w-full overflow-hidden max-md:h-[60vw]">
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
