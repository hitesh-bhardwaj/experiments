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
    <div ref={heroRef} className="pt-[5vw]">
      <header className="flex flex-col gap-[1.5vw] max-lg:gap-[6vw] max-md:gap-[8vw]">
        <Breadcrumb maxWords={3} />

        <LineWipe>
          <h1 className="text-[3.2vw] max-lg:text-[6vw] max-md:text-[9vw] font-avenir leading-[1.2]! text-foreground w-[80%] max-lg:w-full">
            {post.title}
          </h1>
        </LineWipe>

        {post.summary && (
          <LineWipe delay={0.5}>
            <p className="text-[1.25vw] leading-relaxed max-lg:leading-[1.2] w-[60%] max-lg:w-full text-white max-lg:text-[2.8vw] max-sm:text-[4vw]">
              {post.summary}
            </p>
          </LineWipe>
        )}

      </header>

      {post.coverImage?.url && (
        <div className="fadeup group relative mt-[5vw] h-[48vw] w-full overflow-hidden max-md:mt-[8vw] max-lg:mt-[6vh] max-md:h-[60vw] ">
          <Image
            src={post.coverImage.url}
            alt={post.coverImage.alt || post.title}
            width={1600}
            height={900}
            priority
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        </div>
      )}

    </div>
  );
}
