"use client";

import { useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import LineReveal from "@/components/Animations/LineReveal";
import LazyVideo from "@/components/WebsiteComps/LazyVideo";
import LinkButton from "@/components/WebsiteComps/LinkButton";
import CornerMarks from "@/homepage-v3/components/CornerMarks";
import { useInteraction } from "@/homepage-v3/components/InteractionProvider";
import { prefersReducedMotion } from "@/lib/motion";
import { resolveEffectVideoUrl, resolveMediaUrl, resizeR2ImageUrl } from "@/lib/media";

gsap.registerPlugin(useGSAP);

const POSTER_SIZE = { width: 480, height: 320 };

function effectMedia(slug, categorySlug) {
    const image =
        resolveMediaUrl(slug, { defaultDirectory: "vault-listing-images", defaultExtension: "png" }) ||
        `/homepage-v3/imgs/${slug}.webp`;
    return {
        video: resolveEffectVideoUrl({ videoUrl: `${slug}.mp4`, categorySlug, effectSlug: slug }),
        poster: image.startsWith("/") ? image : resizeR2ImageUrl(image, POSTER_SIZE),
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

// Card slide on a category change: out toward the side you're leaving, in
// from the side you're heading to
const SLIDE_PX = 80;
const SLIDE_OUT_S = 0.35;
const SLIDE_IN_S = 1.1;
const SLIDE_STAGGER = 0.06;
const EASE = "cubic-bezier(.16,1,.3,1)";

// "Explore the moments your website is missing": category tabs with a
// sliding pill over four real Vault effects, each card a preview video on the
// left and its title, copy and link on the right
export default function ExploreTheEffects() {
    const container = useRef(null);
    const tabsRef = useRef(null);
    const pillRef = useRef(null);
    const gridRef = useRef(null);
    const directionRef = useRef(1);
    const busyRef = useRef(false);
    const { sound } = useInteraction();
    const [tab, setTab] = useState(0); // the selected tab (drives the pill)
    const [shown, setShown] = useState(0); // the cards on screen (lags during the slide-out)

    // The pill sits under the selected tab and follows it on resize
    useLayoutEffect(() => {
        const tabs = tabsRef.current;
        const place = () => {
            const active = tabs.querySelector('[aria-selected="true"]');
            if (!active) return;
            pillRef.current.style.width = `${active.offsetWidth}px`;
            pillRef.current.style.transform = `translateX(${active.offsetLeft}px)`;
        };
        place();
        const ro = new ResizeObserver(place);
        ro.observe(tabs);
        return () => ro.disconnect();
    }, [tab]);

    // New cards slide in from the side we're heading to
    useGSAP(() => {
        const cards = gridRef.current.children;
        if (prefersReducedMotion()) {
            gsap.set(cards, { opacity: 1, x: 0 });
            return;
        }
        gsap.fromTo(
            cards,
            { opacity: 0, x: SLIDE_PX * directionRef.current },
            { opacity: 1, x: 0, duration: SLIDE_IN_S, stagger: SLIDE_STAGGER, ease: "expo.out", onComplete: () => { busyRef.current = false; } },
        );
    }, { scope: container, dependencies: [shown] });

    const choose = (i) => {
        if (i === tab || busyRef.current) return;
        directionRef.current = i > tab ? 1 : -1;
        setTab(i);
        sound?.note?.(i);
        if (prefersReducedMotion()) {
            setShown(i);
            return;
        }
        // Current cards slide out first, then the new set takes their place
        busyRef.current = true;
        gsap.to(gridRef.current.children, {
            opacity: 0,
            x: -SLIDE_PX * directionRef.current,
            duration: SLIDE_OUT_S,
            stagger: SLIDE_STAGGER,
            ease: "power2.in",
            onComplete: () => setShown(i),
        });
    };

    return (
        <section
            ref={container}
            id="explore-the-effects"
            className="relative w-full overflow-x-clip px-[3.5vw] py-[7vw] pt-[20vw] text-center max-[1025px]:px-[5vw] max-md:px-[6vw] max-sm:px-[7vw] space-y-[3vw]"
        >
            <LineReveal as="h2" className="mx-auto w-[60vw]  font-aeonik text-[3.85vw] max-[1025px]:w-full">
                Explore the Moments Your Website is <span className="gradient-text-animate">Missing.</span>
            </LineReveal>

            <div
                ref={tabsRef}
                role="tablist"
                aria-label="Effect categories"
                className="relative mt-[34px] inline-flex max-w-full gap-0.5 border border-grey bg-black/30 p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
                {/* <CornerMarks /> */}
                {/* Sliding active pill, framed like the cards */}
                <span
                    ref={pillRef}
                    aria-hidden="true"
                    className="absolute top-1 bottom-1 left-0 border border-grey bg-white/10 transition-[transform,width] duration-[600ms] motion-reduce:transition-none"
                    style={{ transitionTimingFunction: EASE }}
                >
                    {/* <CornerMarks /> */}
                </span>
                {CATEGORIES.map((category, i) => (
                    <button
                        key={category.label}
                        type="button"
                        role="tab"
                        aria-selected={tab === i}
                        aria-controls="explore-the-effects-panel"
                        onClick={() => choose(i)}
                        className={`relative z-1 h-10 shrink-0 px-5 font-avenir text-[13px] font-semibold tracking-[.14em] uppercase transition-colors duration-[600ms] ${tab === i ? "text-[#F4F4F4]" : "text-white/50 hover:text-white/80"}`}
                    >
                        {category.label}
                    </button>
                ))}
            </div>

            <div
                ref={gridRef}
                id="explore-the-effects-panel"
                role="tabpanel"
                aria-live="polite"
                className="mx-auto mt-12 grid max-w-[1280px] grid-cols-2 gap-4 text-left max-[1025px]:grid-cols-1"
            >
                {CATEGORIES[shown].effects.map((item) => (
                    <article
                        key={item.slug}
                        className="relative grid grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] gap-6 border border-grey bg-black/30 p-4 text-[#F4F4F4] max-sm:grid-cols-1 max-sm:gap-4"
                    >
                        {/* <CornerMarks /> */}
                        <div className="aspect-[16/10] overflow-hidden bg-white/5">
                            <LazyVideo src={item.video} poster={item.poster} loop muted playsInline className="size-full object-cover" />
                        </div>
                        <div className="flex flex-col justify-between gap-4 py-1">
                            <div>
                                <h3 className="font-avenir text-[clamp(1.25rem,1.6vw,1.6rem)] font-normal tracking-[-.02em]">{item.title}</h3>
                                <p className="mt-2 text-[15px] leading-normal text-white/60">{item.text}</p>
                            </div>
                            <LinkButton href={item.href} text="Try now" underline className="text18 text-white" />
                        </div>
                    </article>
                ))}
            </div>
        </section>
    );
}
