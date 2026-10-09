"use client";

import { useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import Button from "@/homepage/components/Button";
import LineWipe from "@/components/Animations/LineWipe";
import { useFadeUp } from "@/components/Animations/gsapAnimations";

const INK = "var(--ink)";

function formatFeaturedDate(value) {
  if (!value) return "";

  const date = new Date(value);
  const month = date.toLocaleDateString("en-US", { month: "long" });
  const day = String(date.getDate()).padStart(2, "0");

  return `${month} ${day},${date.getFullYear()}`;
}

// The latest post, at the top of the light sheet (styled like the listing pages' light sections)
function FeaturedBlogContent({ featuredPost }) {
  const sectionRef = useRef(null);

  useFadeUp(sectionRef);

  return (
    <section ref={sectionRef} id="featured-blog" className="mx-auto flex w-full max-w-[1536px] flex-col gap-[5vw] px-[4.5vw] py-[7%] max-md:gap-[8vw] max-md:px-[6vw] max-md:pt-[15%]">
      <div className="flex items-end justify-between gap-4 max-md:flex-col max-md:items-start">
        <LineWipe lit={INK}>
          <h2 className="text64 font-aeonik">Latest From The Vault</h2>
        </LineWipe>
        <LineWipe delay={0.5} lit={INK}>
          <p className="text22 w-[35%] text-black/60 max-md:w-full">
            Fresh notes on the effects, systems, and decisions behind Hyperiux Vault.
          </p>
        </LineWipe>
      </div>

      <div className="flex items-center gap-[4vw] bg-light px-[2vw] py-[3.5vw] max-[1025px]:flex-col max-[1025px]:items-start max-md:gap-[6vw] max-md:px-[4vw] max-md:py-[8vw]">
        {featuredPost.coverImage?.url && (
          <Link
            href={`/blog/${featuredPost.slug}`}
            className="fadeup group block h-[34vw] w-[55%] shrink-0 max-[1025px]:h-[50vw] max-[1025px]:w-full max-md:h-[60vw]"
          >
            <div className="relative h-full w-full overflow-hidden bg-grey">
              <Image
                src={featuredPost.coverImage.url}
                alt={featuredPost.coverImage.alt || featuredPost.title}
                fill
                sizes="(max-width: 1025px) 100vw, 50vw"
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
            </div>
          </Link>
        )}

        <div className="flex grow flex-col items-start gap-[1.2vw] max-[1025px]:w-full max-md:gap-[4vw]">
          <LineWipe lit={INK}>
            <p className="font-avenir text-[1vw] text-black/60 max-[1025px]:text-[2.5vw] max-md:text-[4vw]">
              {formatFeaturedDate(featuredPost.publishedAt)}
            </p>
          </LineWipe>

          <Link href={`/blog/${featuredPost.slug}`} className="w-[90%]  max-[1025px]:w-full">
            <LineWipe lit={INK}>
              <h3 className="text64 font-aeonik leading-[1.1]! ">{featuredPost.title}</h3>
            </LineWipe>
          </Link>

          {featuredPost.summary && (
            <LineWipe delay={0.5} lit={INK}>
              <p className="text22 w-[90%] leading-[1.3] mt-4 text-black/60 max-[1025px]:w-full">
                {featuredPost.summary}
              </p>
            </LineWipe>
          )}

          <Button
            text="Read More"
            href={`/blog/${featuredPost.slug}`}
            variant="orange"
            className="fadeup w-fit mt-3"
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
