"use client";
import React, { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/dist/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import EffectBox from "@/homepage-v3/components/EffectBox";
import LineReveal from "@/components/Animations/LineReveal";
import SplitLine from "@/components/WebsiteComps/SplitLine";
import { resolveEffectVideoUrl, resolveMediaUrl, resizeR2ImageUrl } from "@/lib/media";

if (typeof window !== "undefined") {
    gsap.registerPlugin(ScrollTrigger, useGSAP);
}

function effectMedia(slug, categorySlug) {
    const image =
        resolveMediaUrl(slug, {
            defaultDirectory: "vault-listing-images",
            defaultExtension: "png",
        }) || `/homepage-v3/imgs/${slug}.webp`;
    const poster = image.startsWith("/")
        ? image
        : resizeR2ImageUrl(image, { width: 800, height: 533 });

    return {
        video: true,
        media: resolveEffectVideoUrl({
            videoUrl: `${slug}.mp4`,
            categorySlug,
            effectSlug: slug,
        }),
        poster,
    };
}

const COLUMNS = [
    [
        {
            title: "Cursor Effects",
            tag: "Cursor Effects",
            action: "Cursor Effects",
            href: "/effects/cursor-effects",
            ...effectMedia("character-trail", "cursor-effects"),
        },
        {
            title: "WebGL",
            tag: "WebGL",
            action: "WebGL",
            href: "/effects/webgl-effects",
            ...effectMedia("webgl-slider", "carousels"),
          
        },
    ],
    [
        {
            title: "Text Animations",
            tag: "Text Animations",
            action: "Text Animations",
            href: "/effects/text-animations",
            ...effectMedia("rolling-text", "text-animations"),
        },
        {
            title: "Page Transitions",
            tag: "Page Transitions",
            action: "Page Transitions",
            href: "/effects/page-transitions",
            ...effectMedia("depth-shift-transition", "page-transitions"),
        },
    ],
    [
        {
            title: "Scroll Effects",
            tag: "Scroll Effects",
            action: "Scroll Effects",
            href: "/effects/scroll-effects",
            ...effectMedia("grid-tunnel", "webgl-effects"),
        },
        {
            title: "Navigations",
            tag: "Navigations",
            action: "Navigations",
            href: "/effects/navigation",
            ...effectMedia("side-navbar", "navigation"),
        },
    ],
];

const PARALLAX_SPEED = [0.05, -0.2, 0.05];

export default function ExploreTheEffects() {
    const container = useRef(null);

    useGSAP(
        () => {
            const mm = gsap.matchMedia();

            mm.add("(min-width: 768px)", () => {
                const columns = gsap.utils.toArray(".explore-effects-column");

                columns.forEach((column, index) => {
                    const speed = PARALLAX_SPEED[index] ?? 0;
                    if (!speed) return;

                    const distance = () => window.innerWidth * speed;

                    gsap.fromTo(
                        column,
                        { y: () => -distance() / 2 },
                        {
                            y: () => distance() / 2,
                            ease: "none",
                            scrollTrigger: {
                                trigger: container.current,
                                start: "top bottom",
                                end: "bottom top",
                                scrub: 1,
                                invalidateOnRefresh: true,
                            },
                        },
                    );
                });
            });

            return () => mm.revert();
        },
        { scope: container },
    );

    return (
        <section
            ref={container}
            id="explore-the-effects"
            className="w-full  mb-[13vw] mt-[-24vw] px-[3.5vw] max-[1025px]:my-[18vw] max-[1025px]:px-[5vw] max-[1025px]:mt-[-85vw]!  max-md:px-[6vw] max-sm:px-[7vw]"
        >
            <div className="space-y-[4vw] relative z-200 max-[1025px]:space-y-[4vw] max-[1025px]:mb-[12vw] max-md:space-y-[8vw] mb-[15vw] ">
                <LineReveal as='h2' className="t96 font-neue-haas w-[55vw] mx-auto text-center max-[1025px]:w-full max-md:w-full">
                    Explore the Moments Your Website is{" "}
                    <span className="gradient-text-animate">Missing.</span>
                </LineReveal>
                <SplitLine as='p' delay={.25} className="text22 w-[52vw] mx-auto text-center max-[1025px]:w-[85%] max-md:w-full max-md:text-[2.4vw] max-sm:text-[4vw]">
                    Vault is easiest to understand when you feel it. Preview a few
                    high-impact effects below, then open the full catalog when you are
                    ready.
                </SplitLine>
            </div>
            <div className="mt-[8vw] flex items-start gap-[1.6vw] max-[1025px]:mt-[10vw] max-[1025px]:gap-[2.5vw] max-md:mt-16 max-md:flex-wrap  max-sm:flex-col max-sm:gap-8">
                {COLUMNS.map((column, columnIndex) => (
                    <div
                        key={columnIndex}
                        className="explore-effects-column flex flex-1 max-[1025px]:min-w-0 flex-col gap-[3vw] max-[1025px]:gap-[4vw] max-md:min-w-[45%] max-md:gap-8 max-sm:w-full max-sm:gap-10"
                    >
                        {column.map((effect, effectIndex) => (
                            <EffectBox
                                key={`${columnIndex}-${effectIndex}-${effect.media}`}
                                title={effect.title}
                                tag={effect.tag}
                                action={effect.action}
                                href={effect.href}
                                media={effect.media}
                                poster={effect.poster}
                                video={effect.video}
                            />
                        ))}
                    </div>
                ))}
            </div>
        </section>
    );
}
