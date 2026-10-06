import Link from "next/link";
import Image from "next/image";
import LinkButton from "@/components/WebsiteComps/LinkButton";
import LineWipe from "@/components/Animations/LineWipe";

function formatCardDate(value) {
  if (!value) return "";

  const date = new Date(value);
  const month = date.toLocaleDateString("en-US", { month: "long" });
  const day = String(date.getDate()).padStart(2, "0");

  return `${month} ${day},${date.getFullYear()}`;
}

export default function BlogCard({ post, priority = false }) {
  return (
    <div className="fadeup group/card relative h-full w-full">
      <div className="flex h-full min-h-[32vw] flex-col gap-[1.2vw] bg-[#161616] p-[1.8vw] max-md:min-h-[45vh] max-[1025px]:min-h-[45vh]  max-[1025px]:gap-[3vw] max-md:gap-[5vw] max-md:p-[4vw] pb-9 max-md:pb-12">
        <div className="h-[18vw] w-full shrink-0 overflow-hidden bg-[#202020] max-[1025px]:h-[32vw] max-md:h-[30vh]">
          {post.coverImage?.url && (
            <Image
              src={post.coverImage.url}
              alt={post.coverImage.alt || post.title}
              width={560}
              height={315}
              quality={75}
              priority={priority}
              loading={priority ? undefined : "lazy"}
              className="h-full w-full object-cover transition-transform duration-500 group-hover/card:scale-105"
            />
          )}
        </div>

        <div className="mt-2 flex items-center justify-between gap-3 pb-3 font-mono">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            {post.categories?.length > 0 && (
              <span className="bg-[#2B2B2B] px-2 py-0.5 text-[0.9vw] text-white/90 max-[1025px]:px-3 max-[1025px]:py-1.5 max-[1025px]:text-[2vw] max-md:px-3 max-md:py-1 max-md:text-[3vw]!">
                {post.categories[0].title}
              </span>
            )}
          </div>
          <span className="shrink-0 text18 font-avenir text-[#AEAEAE] max-[1025px]:text-[1.8vw] max-md:text-[3vw]!">
            {formatCardDate(post.publishedAt)}
          </span>
        </div>

        <LineWipe>
          <h3 className="shrink-0 text32 font-avenir font-medium leading-[1.2]! text-white max-[1025px]:text-[2.8vw] max-md:text-[3vw] max-sm:text-[4.5vw]">
            {post.title}
          </h3>
        </LineWipe>

        <LineWipe delay={0.15}>
          <p className="grow text20 max-[1025px]:text-[2vw] leading-[1.2] text-white max-md:text-[3.5vw]!">
            {post.summary}
          </p>
        </LineWipe>

        <div className="fadein" data-fadein-delay="0.3">
          <LinkButton
            href={`/blog/${post.slug}`}
            text="Read More"
            tilted={false}
            underline={true}
            className="relative text20 max-md:text-sm z-10 mt-5 max-md:mt-0! max-md:text34"
          />
        </div>
      </div>

      <Link
        href={`/blog/${post.slug}`}
        aria-label={post.title}
        className="absolute inset-0 z-0"
      />
    </div>
  );
}
