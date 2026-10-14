"use client";

import { useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import LineReveal from "@/components/Animations/LineReveal";
import { useFadeUp } from "@/components/Animations/gsapAnimations";
import LazyVideo from "@/components/WebsiteComps/LazyVideo";
import LinkButton from "@/components/WebsiteComps/LinkButton";
import { useInteraction } from "@/homepage/components/InteractionProvider";
import { prefersReducedMotion } from "@/lib/motion";
import Image from "next/image";
import { resolveEffectVideoUrl, resolveMediaUrl } from "@/lib/media";

gsap.registerPlugin(useGSAP);

// Listing images whose R2 filename differs from the effect slug
const POSTER_NAME = { "milky-way": "milkyway" };

function effectMedia(slug, categorySlug) {
    const image =
        resolveMediaUrl(POSTER_NAME[slug] || slug, { defaultDirectory: "vault-listing-images", defaultExtension: "png" }) ||
        `/homepage-v3/imgs/${slug}.webp`;
    return {
        video: resolveEffectVideoUrl({ videoUrl: `${slug}.mp4`, categorySlug, effectSlug: slug }),
        // R2 serves the original full-size PNG (2-4MB) and ignores size params, so the
        // poster is rendered with next/image: resized, WebP/AVIF, cached a year
        poster: image,
        href: `/effects/${categorySlug}/${slug}`,
    };
}

const effect = (slug, categorySlug, title, text) => ({ slug, title, text, ...effectMedia(slug, categorySlug) });

// Theremin's "moments": five categories, four real Vault effects each
const CATEGORIES = [
    {
        label: "Scroll",
        effects: [
            effect("horizontal-feature-reveal", "scroll-effects", "Horizontal Feature Reveal", "Vertical scroll turned into a panoramic gallery track."),
            effect("rotation-slider", "scroll-effects", "Rotation Slider", "A pinned slider with 3D card rotation and caption reveals."),
            effect("parallax-slider", "scroll-effects", "Parallax Slider", "A pinned gallery with clip-path reveals and image parallax."),
            effect("ribbon-drift", "scroll-effects", "Ribbon Drift", "Image strips that drift at alternating speeds as you scroll."),
        ],
    },
    {
        label: "Cursor",
        effects: [
            effect("character-trail", "cursor-effects", "Character Trail", "A snake of character tiles that follows the pointer."),
            effect("butterfly-trail-cursor", "cursor-effects", "Butterfly Trail Cursor", "A 3D butterfly swarm that spawns around the pointer."),
            effect("phantom-image-trail", "cursor-effects", "Phantom Image Trail", "Stacked visuals that spawn and fade as you move."),
            effect("liquid-glass-cursor", "cursor-effects", "Liquid Glass Cursor", "A magnifying lens with chromatic refraction."),
        ],
    },
    {
        label: "Text",
        effects: [
            effect("rolling-text", "text-animations", "Rolling Text", "Each character spins up a reel of itself before landing."),
            effect("scramble-text", "text-animations", "Scramble Text", "Type that resolves out of noise, character by character."),
            effect("chromatic-text", "text-animations", "Chromatic Text", "Three scroll-reactive colour layers with real depth."),
            effect("pixel-text-fill", "text-animations", "Pixel Text Fill", "A scroll-scrubbed fill with an ordered-dither edge."),
        ],
    },
    {
        label: "Transitions",
        effects: [
            effect("depth-shift-transition", "page-transitions", "Depth Shift Transition", "Pages that fall back in space as the next arrives."),
            effect("chess-grid-transition", "page-transitions", "Chess Grid Transition", "A tiled wipe that turns route changes into a moment."),
            effect("block-transition", "page-transitions", "Block Transition", "Split blocks with row-based stagger between routes."),
            effect("svg-brush-transition", "page-transitions", "SVG Brush Transition", "A brush stroke that paints across the viewport."),
        ],
    },
    {
        label: "WebGL",
        effects: [
            effect("grid-tunnel", "webgl-effects", "Grid Tunnel", "An infinite 3D image tunnel driven by scroll."),
            effect("fractal-glass", "webgl-effects", "Fractal Glass", "Glass-strip refraction with pointer-reactive parallax."),
            effect("milky-way", "webgl-effects", "Milky Way", "A GPU particle galaxy with spiral arms and nebula smoke."),
            effect("webgl-slider", "carousels", "WebGL Slider", "An image slider with fold distortion and snap."),
        ],
    },
];

const SLIDE_PX = 80;
const SLIDE_IN_S = 1.1;
const SLIDE_STAGGER = 0.06;
const EASE = "cubic-bezier(.16,1,.3,1)";

export default function ExploreTheEffects() {
    const container = useRef(null);
    const tabsRef = useRef(null);
    const pillRef = useRef(null);
    const inkRef = useRef(null);
    const gridRef = useRef(null);

    useFadeUp(container);
    const directionRef = useRef(1);
    const { sound } = useInteraction();
    const [tab, setTab] = useState(0); // the selected tab (drives the pill)
    const [shown, setShown] = useState(0); // the cards on screen (lags during the slide-out)

    useLayoutEffect(() => {
        const tabs = tabsRef.current;
        const place = () => {
            const active = tabs.querySelector('[aria-selected="true"]');
            if (!active) return;
            pillRef.current.style.width = `${active.offsetWidth}px`;
            pillRef.current.style.transform = `translateX(${active.offsetLeft}px)`;
            // Dark label copy, clipped to exactly where the pill is (and moving with it)
            const ink = inkRef.current;
            if (ink) {
                const right = ink.offsetWidth - active.offsetLeft - active.offsetWidth;
                ink.style.clipPath = `inset(0 ${right}px 0 ${active.offsetLeft}px)`;
            }
        };
        place();
        const ro = new ResizeObserver(place);
        ro.observe(tabs);
        return () => ro.disconnect();
    }, [tab]);

    useGSAP(() => {
        const cards = gridRef.current.children;
        if (prefersReducedMotion()) {
            gsap.set(cards, { opacity: 1, x: 0 });
            return;
        }
        gsap.fromTo(
            cards,
            { opacity: 0, x: SLIDE_PX * directionRef.current },
            { opacity: 1, x: 0, duration: SLIDE_IN_S, stagger: SLIDE_STAGGER, ease: "expo.out" },
        );
    }, { scope: container, dependencies: [shown] });

    // Instant: the tab and its cards switch on click, and the new cards slide in
    const choose = (i) => {
        if (i === tab) return;
        directionRef.current = i > tab ? 1 : -1;
        gsap.killTweensOf(gridRef.current.children);
        setTab(i);
        setShown(i);
        sound?.note?.(i);
    };

    return (
        <section
            ref={container}
            id="explore-the-effects"
            className="section-x relative overflow-x-clip py-[15%] text-center max-md:py-[12%]"
        >
            <div className="site-container flex flex-col gap-[calc(var(--cvw)*3)] max-md:gap-[calc(var(--cvw)*10)]">
            <div className="flex flex-col gap-[calc(var(--cvw)*4.2)] max-md:gap-[calc(var(--cvw)*10)]">
            <LineReveal as="h2" className="type-h1 mx-auto w-[calc(var(--cvw)*60)] max-md:w-full">
                Explore the Moments Your Website Is <span className="gradient-text-animate">Missing.</span>
            </LineReveal>

            <div
                ref={tabsRef}
                role="tablist"
                aria-label="Effect categories"
                data-sound-hover="off"
                data-fadeup-delay="0.1"
                className="fadeup relative inline-flex max-w-full gap-0.5 self-center border border-white/20 bg-black/30 p-0.5 [scrollbar-width:none] max-md:overflow-x-auto [&::-webkit-scrollbar]:hidden"
            >
                <span
                    ref={pillRef}
                    aria-hidden="true"
                    className="absolute inset-y-0.5 left-0 border border-primary bg-primary transition-[transform,width] duration-[600ms] motion-reduce:transition-none"
                    style={{ transitionTimingFunction: EASE }}
                />
                <span
                    ref={inkRef}
                    aria-hidden="true"
                    className="pointer-events-none absolute top-0 left-0 z-2 flex h-full w-max gap-0.5 p-0.5 transition-[clip-path] duration-600 motion-reduce:transition-none"
                    style={{ transitionTimingFunction: EASE }}
                >
                    {CATEGORIES.map((category) => (
                        <span key={category.label} className="flex h-[calc(var(--cvw)*2.6)] max-lg:h-[calc(var(--cvw)*5.5)] max-md:h-[calc(var(--cvw)*9)] shrink-0 items-center px-[calc(var(--cvw)*1.2)] max-lg:px-[calc(var(--cvw)*2.5)] max-md:px-[calc(var(--cvw)*3.5)] type-label text-background">
                            {category.label}
                        </span>
                    ))}
                </span>
                {CATEGORIES.map((category, i) => (
                    <button
                        key={category.label}
                        type="button"
                        role="tab"
                        aria-selected={tab === i}
                        aria-controls="explore-the-effects-panel"
                        onClick={() => choose(i)}
                        className="relative z-1 h-[calc(var(--cvw)*2.6)] max-lg:h-[calc(var(--cvw)*5.5)] max-md:h-[calc(var(--cvw)*9)] shrink-0 px-[calc(var(--cvw)*1.2)] max-lg:px-[calc(var(--cvw)*2.5)] max-md:px-[calc(var(--cvw)*3.5)] type-label text-white/50 transition-colors duration-300 hover:text-white/80"
                    >
                        {category.label}
                    </button>
                ))}
            </div>
            </div>

            <div
                ref={gridRef}
                id="explore-the-effects-panel"
                role="tabpanel"
                data-fadeup-delay="0.2"
                className="fadeup mx-auto grid grid-cols-2 gap-4 text-left max-md:grid-cols-1 max-md:gap-6"
            >
                {CATEGORIES[shown].effects.map((item) => (
                    <article
                        // Keyed per tab, so a card that appears in two tabs is replaced, not
                        // reused (a reused card was knocked to opacity 0 and back: the blink).
                        // Starts hidden; the slide-in brings it up.
                        key={`${shown}-${item.slug}`}
                        style={{ opacity: 0 }}
                        className="relative grid grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] gap-6 border border-white/20 bg-black/30 backdrop-blur-lg p-4 text-white max-md:grid-cols-1 max-md:gap-4"
                    >
                        <div className="relative aspect-16/10 overflow-hidden bg-white/5">
                            {/* Poster sits under the video and shows until the video has a frame */}
                            <Image src={item.poster} alt="" fill sizes="(max-width: 767px) 90vw, 30vw" className="object-cover" />
                            <LazyVideo src={item.video} loop muted playsInline className="relative size-full object-cover" />
                        </div>
                        <div className="flex flex-col justify-between gap-4 py-1">
                            <div className="flex flex-col gap-[calc(var(--cvw)*1.6)]">
                                <h3 className="type-h3">{item.title}</h3>
                                <p className="type-body text-white/60">{item.text}</p>
                            </div>
                            <LinkButton href={item.href} text="Explore" underline tilted={false} underlineClassName="mt-0" className="type-small text-foreground hover:text-primary transition-colors duration-300" />
                        </div>
                    </article>
                ))}
            </div>
            </div>
        </section>
    );
}
