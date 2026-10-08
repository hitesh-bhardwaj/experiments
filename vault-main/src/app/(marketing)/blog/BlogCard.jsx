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

// `light`: for the white area on the blog detail page (the listing is dark)
export default function BlogCard({ post, priority = false, light = false }) {
  return (
    <div className="fadeup group/card relative h-full w-full">
      <div className={`flex h-full min-h-[32vw] flex-col gap-[1.2vw] ${light ? "bg-light text-ink" : "bg-dark-card"} p-[1.8vw] max-md:min-h-[45vh] max-lg:min-h-[45vh]  max-lg:gap-[3vw] max-md:gap-[5vw] max-md:p-[4vw] pb-9 max-md:pb-12`}>
        <div className="h-[18vw] w-full shrink-0 overflow-hidden bg-grey max-lg:h-[32vw] max-md:h-[30vh]">
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
              <span className={`${light ? "bg-black/5 text-ink" : "bg-grey text-foreground/90"} px-2 py-0.5 text-[0.9vw] max-lg:px-3 max-lg:py-1.5 max-lg:text-[2vw] max-md:px-3 max-md:py-1 max-md:text-[3vw]!`}>
                {post.categories[0].title}
              </span>
            )}
          </div>
          <span className={`shrink-0 text18 font-avenir ${light ? "text-black/60" : "text-foreground/70"} max-lg:text-[1.8vw] max-md:text-[3vw]!`}>
            {formatCardDate(post.publishedAt)}
          </span>
        </div>

        <LineWipe lit={light ? "var(--ink)" : undefined}>
          <h3 className={`shrink-0 text32 font-avenir font-medium leading-[1.2]! ${light ? "text-ink" : "text-foreground"} max-lg:text-[2.8vw] max-md:text-[3vw] max-sm:text-[4.5vw]`}>
            {post.title}
          </h3>
        </LineWipe>

        <LineWipe delay={0.15} lit={light ? "var(--ink)" : undefined}>
          <p className={`grow text20 max-lg:text-[2vw] leading-[1.2] ${light ? "text-black/60" : "text-foreground"} max-md:text-[3.5vw]!`}>
            {post.summary}
          </p>
        </LineWipe>

        <div className="fadein" data-fadein-delay="0.3">
          <LinkButton
            href={`/blog/${post.slug}`}
            text="Read More"
            tilted={false}
            underline={true}
            className={`relative text20 max-md:text-sm z-10 mt-5 max-md:mt-0! max-md:text34 ${light ? "text-ink!" : ""}`}
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
