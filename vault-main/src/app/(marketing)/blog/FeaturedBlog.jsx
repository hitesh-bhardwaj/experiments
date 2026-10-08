"use client";

import { useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import Button from "@/homepage/components/Button";
import LineWipe from "@/components/Animations/LineWipe";
import { useFadeUp } from "@/components/Animations/gsapAnimations";

// The featured block sets its date in mono and zero-pads the day, with no
// space after the comma - "September 09,2026".
function formatFeaturedDate(value) {
  if (!value) return "";

  const date = new Date(value);
  const month = date.toLocaleDateString("en-US", { month: "long" });
  const day = String(date.getDate()).padStart(2, "0");

  return `${month} ${day},${date.getFullYear()}`;
}

function FeaturedBlogContent({ featuredPost }) {
  const sectionRef = useRef(null);

  // Scoped to this section so it claims only its own `.fadeup` elements -
  // useFadeUp falls back to scanning the whole document when the ref is
  // empty, which would otherwise steal the listing's cards.
  useFadeUp(sectionRef);

  return (
    <section ref={sectionRef} className="space-y-[8vw] max-md:px-[7vw] max-md:mt-[6vw]">
      <div className="space-y-[2vw]">
        <LineWipe>
          <h2 className="t96 max-lg:text-[6.5vw] font-avenir text-center max-md:text-[9.5vw]">Latest From The Vault</h2>
        </LineWipe>
        <LineWipe delay={0.5}>
          <p className="text24 max-lg:text-[3vw] text-center text-white font-avenir max-md:mt-[4vw] max-md:text-[2.4vw] max-sm:text-[4vw]">
            Fresh notes on the effects, systems, and decisions behind Hyperiux Vault.
          </p>
        </LineWipe>
      </div>

      <div className="mt-[5vw] flex items-start gap-[4vw] max-lg:flex-col max-md:mt-[10vw] max-md:gap-[6vw]">
        {featuredPost.coverImage?.url && (
          <Link
            href={`/blog/${featuredPost.slug}`}
            className="fadeup group block  shrink-0 h-[80vh] w-[55%] bg-[#1a1a1a] p-[1.8vw] max-lg:h-[50vh] max-md:h-[40vh]  max-lg:w-full max-md:p-[4vw]"
          >
            <div className="relative h-full w-full overflow-hidden bg-grey">
              <Image
                src={featuredPost.coverImage.url}
                alt={featuredPost.coverImage.alt || featuredPost.title}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
            </div>
          </Link>
        )}

        <div className="flex w-[45%] grow flex-col gap-2 items-start justify-start my-4 max-lg:w-full">
          <LineWipe>
            <p className="text-[1vw] font-mono text-light-grey max-lg:text-[2.5vw] max-md:text-[4vw]">
              {formatFeaturedDate(featuredPost.publishedAt)}
            </p>
          </LineWipe>

          <Link href={`/blog/${featuredPost.slug}`}>
            <LineWipe className='w-[85%]'>
              <h3 className="text64 font-avenir mt-[1.2vw]  max-md:mt-[4vw] max-sm:text-[7.5vw]!">
                {featuredPost.title}
              </h3>
            </LineWipe>
          </Link>

          {featuredPost.summary && (
            <LineWipe delay={0.5}>
              <p className="text24 font-avenir mt-[1.8vw] text-white w-[85%] max-md:mt-[4vw] max-lg:text-[2.5vw] max-md:text-[4vw]">
                {featuredPost.summary}
              </p>
            </LineWipe>
          )}

          <Button
            text="Read More"
            href={`/blog/${featuredPost.slug}`}
            variant="orange"
            className="fadeup mt-[2.5vw] w-fit max-md:mt-[6vw]"
          />
        </div>
      </div>
    </section>
  );
}

export default function FeaturedBlog({ featuredPost = null }) {
  if (!featuredPost) return null;

  return <FeaturedBlogContent featuredPost={featuredPost} />;
}
