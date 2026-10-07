"use client";

import React, { useRef, useEffect } from "react";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import VaultBox from "../WebsiteComps/VaultBoxes";
import { prefersReducedMotion } from "@/lib/motion";
import LineReveal from "../Animations/LineReveal";
import SplitLineNoMask from "./SplitLineNoMask";

if (typeof window !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger, SplitText);
}

const IMAGES = [
    "/img/spiral/1.webp",
    "/img/spiral/2.webp",
    "/img/spiral/3.webp",
    "/img/spiral/4.webp",
    "/img/spiral/5.webp",
    "/img/spiral/6.webp",
    "/img/spiral/7.webp",
    "/img/spiral/8.webp",
    "/img/spiral/9.webp",
];

const TOTAL = IMAGES.length;

const RADIUS_X = 600;
const RADIUS_Y = 400;

// Config: how much the orbit radius expands in Phase 3 (e.g. 0.70 = 70% expansion)
const EXPAND_RADIUS_FACTOR = 0.67;

// Fraction of spiral phase (t) before card blur begins - keeps early fly-out sharp
const SPIRAL_BLUR_DELAY = 0.35;

// NO ease: linear mapping from 0 to 1
function linear(t) {
    return Math.min(Math.max(t, 0), 1);
}

// Deterministic pseudo-random
function seededRand(seed, min, max) {
    const x = Math.sin(seed * 9301 + 49297) * 233280;
    return min + (x - Math.floor(x)) * (max - min);
}

const CARD_CONFIGS = IMAGES.map((src) => ({ src }));

const CARD_META = IMAGES.map((_, i) => {
    const category = Math.floor(seededRand(i + 2157, 0, 3));
    let scale = 1;
    let blur = 0;

    if (category === 0) {
        scale = seededRand(i + 45, 0.3, 0.35);
        blur = 0;
    } else if (category === 1) {
        scale = seededRand(i + 45, 0.45, 0.55);
        blur = 1.0;
    } else {
        scale = seededRand(i + 45, 1.1, 1.35);
        blur = 2.5;
    }

    return { scale, blur };
});

// Pre-computed per-card stagger fractions - these are pure constants of i and TOTAL,
// computing them inside the onUpdate loop was wasting CPU every scroll tick.
const CARD_STAGGER_FRAC = IMAGES.map((_, i) => {
    const staggerFrac = 0.82;
    const reverseIdx = TOTAL - 1 - i;
    return (reverseIdx / TOTAL) * staggerFrac;
});


const BOXES = [
    {
        id: "block-top-layer-1",
        styles: "w-[37.5%]",
        img: 'https://h1r7ltksnzlh2a5c.public.blob.vercel-storage.com/videos/1.mp4',
        number: "01",
        label: "Scroll Effects",
        title: "Scroll Stack",
        paragraph: "For layered storytelling sections that need depth and progression.",
        containerLink: "/demo/scroll-stack",
        labelLink:"/effects/scroll-effects"
    },
    {
        id: "block-top-layer-2",
        styles: "w-[25%]",
        img: 'https://h1r7ltksnzlh2a5c.public.blob.vercel-storage.com/videos/2.mp4',
        number: "02",
        label: "Text Animations",
        title: "Blur Text",
        paragraph: "For hero headlines, launch copy, and key messages that should reveal with control.",
        containerLink: "/demo/blur-text",
        labelLink:"/effects/text-animations"
    },
    {
        id: "block-top-layer-3",
        styles: "w-[37.5%]",
        img: 'https://h1r7ltksnzlh2a5c.public.blob.vercel-storage.com/videos/3.mp4',
        number: "03",
        label: "WebGL",
        title: "WebGL Slider",
        paragraph: "For immersive product, portfolio, or campaign visuals.",
        textColor: "text-black",
        containerLink: "/demo/webgl-slider",
        labelLink: "/effects/webgl"
    }
];

const BOXES_BOTTOM = [
    {
        id: "block-bottom-layer-1",
        styles: "w-[20%]",
        img: 'https://h1r7ltksnzlh2a5c.public.blob.vercel-storage.com/videos/4.mp4',
        number: "04",
        label: "Page Transitions",
        title: "Page Flip Transition",
        paragraph: "For portfolios and editorial experiences where route changes should feel authored.",
        containerLink: "/demo/page-flip-transition",
        labelLink: "/effects/page-transitions"
    },
    {
        id: "block-bottom-layer-2",
        styles: "w-[50%]",
        img: 'https://h1r7ltksnzlh2a5c.public.blob.vercel-storage.com/videos/5.mp4',
        number: "05",
        label: "Cursor Effects",
        title: "Liquid Glass Cursor",
        paragraph: "For desktop experiences that need tactile interaction and premium feedback.",
        textColor: "text-black",
        containerLink: "/demo/liquid-glass-cursor",
        labelLink: "/effects/cursor-effects"
    },
    {
        id: "block-bottom-layer-3",
        styles: "w-[30%]",
        img: 'https://h1r7ltksnzlh2a5c.public.blob.vercel-storage.com/videos/6.mp4',
        number: "06",
        label: "Components",
        title: "Animated FAQ",
        paragraph: "Dogfood your own product in the objection-handling section.",
        containerLink: "/demo/animated-faq",
        labelLink:  "/effects/components"
    }
];

export default function FeaturedStoryTelling() {
    const sectionRef = useRef(null);
    const cardRefs = useRef([]);
    const cardsContainerRef = useRef(null);

    // Refs from SpiralInformation
    const infoTextRef = useRef(null);

    // Refs from VaultGrid
    const vaultSecondLayoutRef = useRef(null);
    const stickyContainerRef = useRef(null);
    const animationActiveRef = useRef(false);

    useEffect(() => {
        const section = sectionRef.current;
        const cards = cardRefs.current;
        const reduceMotion = prefersReducedMotion();

        animationActiveRef.current = true;

        const TOP_LAYER = [
            { id: "block-top-layer-1", xPercent: 300 },
            { id: "block-top-layer-2", xPercent: 450 },
            { id: "block-top-layer-3", xPercent: 600 },
        ];
        const BOTTOM_LAYER = [
            { id: "block-bottom-layer-1", xPercent: 550 },
            { id: "block-bottom-layer-2", xPercent: 450 },
            { id: "block-bottom-layer-3", xPercent: 600 },
        ];

        const finalAngles = cards.map(
            (_, i) => -(i / TOTAL) * 2 * Math.PI - Math.PI / 6,
        );

        const ALL_LAYER_IDS = [...TOP_LAYER, ...BOTTOM_LAYER].map((l) => `#${l.id}`);

        // --- Reduced motion ---
        // The spiral never travels: it is laid out at rest on mount. What still
        // animates is opacity and blur, which carry the same beats as the full
        // version (cards settle in, copy reads, cards clear, grid arrives)
        // without moving anything across the screen.
        if (reduceMotion) {
            section.style.height = '300vh';

            // Per-card resting geometry, independent of radius.
            const restGeometry = finalAngles.map((angle, i) => {
                const ux = Math.cos(angle);
                const uy = Math.sin(angle);
                const { scale, blur } = CARD_META[i];
                const depthScale = scale + uy * 0.25 * scale;
                const depthBlur = blur + Math.max(0, -uy * 2.5);
                return { ux, uy, depthScale, depthBlur };
            });

            // Always a blur() endpoint, never "none": GSAP interpolates
            // blur(14px) -> blur(0px) numerically, but blur(14px) -> none is a
            // string swap that snaps at the end of the tween.
            const restFilter = (i) =>
                `blur(${Math.max(restGeometry[i].depthBlur, 0).toFixed(2)}px)`;

            // The full-motion spiral is allowed to overflow because the cards are
            // mid-flight and fade out before they settle. Here they *do* settle, so
            // the orbit has to be shrunk until every card - at its own depth scale,
            // plus the bleed its blur adds - fits inside the clipping container.
            const fitRadii = () => {
                const host = cardsContainerRef.current;
                if (!host) return { rx: RADIUS_X, ry: RADIUS_Y };

                const { width, height } = host.getBoundingClientRect();
                const cardW = window.innerWidth * 0.18;
                const cardH = window.innerWidth * 0.11;
                const EDGE_PAD = 16;

                let rx = RADIUS_X;
                let ry = RADIUS_Y;

                restGeometry.forEach(({ ux, uy, depthScale, depthBlur }) => {
                    const bleed = depthBlur * 2;
                    const halfW = (cardW * depthScale) / 2 + bleed;
                    const halfH = (cardH * depthScale) / 2 + bleed;

                    const availX = width / 2 - EDGE_PAD - halfW;
                    const availY = height / 2 - EDGE_PAD - halfH;

                    if (Math.abs(ux) > 0.01) rx = Math.min(rx, availX / Math.abs(ux));
                    if (Math.abs(uy) > 0.01) ry = Math.min(ry, availY / Math.abs(uy));
                });

                return { rx: Math.max(rx, 0), ry: Math.max(ry, 0) };
            };

            let tl;

            const placeCards = () => {
                const { rx, ry } = fitRadii();

                cards.forEach((card, i) => {
                    if (!card) return;
                    const { ux, uy, depthScale } = restGeometry[i];

                    gsap.set(card, {
                        xPercent: -50,
                        yPercent: -50,
                        x: ux * rx,
                        y: uy * ry,
                        rotation: 0,
                        scale: depthScale,
                        zIndex: TOTAL + Math.round((uy + 1) * TOTAL),
                    });
                });
            };

            const rmCtx = gsap.context(() => {
                placeCards();

                gsap.set(ALL_LAYER_IDS, { xPercent: 0, opacity: 0 });
                gsap.set(infoTextRef.current, { opacity: 0, filter: "blur(6px)" });

                tl = gsap.timeline({
                    scrollTrigger: {
                        trigger: section,
                        start: "-5% top",
                        end: "bottom bottom",
                        // Numeric scrub lets the tween catch up to the scroll
                        // position over ~0.6s instead of snapping to it, which
                        // is what smooths out wheel and trackpad stepping.
                        scrub: 0.6,
                    },
                });

                // Cards resolve out of blur, one after another. One staggered
                // tween rather than nine overlapping ones, so GSAP renders a
                // single interpolation per card per tick.
                const liveCards = cards.filter(Boolean);
                tl.fromTo(
                    liveCards,
                    { opacity: 0, filter: "blur(14px)" },
                    {
                        opacity: 1,
                        filter: (_, target) => restFilter(cards.indexOf(target)),
                        duration: 1.4,
                        ease: "power2.out",
                        stagger: 0.16,
                    },
                    0
                );

                // The last card lands at 1.28 + 1.4 = 2.68. Text starts while
                // that tail is still resolving so the two beats read as one
                // move; previously it waited until 3.85 and the section sat dead.
                tl.to(infoTextRef.current, { opacity: 1, filter: "blur(0px)", duration: 1.4, ease: "power2.out" }, 2.2);
                tl.to(infoTextRef.current, { opacity: 0, filter: "blur(6px)", duration: 1.0, ease: "power2.in" }, 6.0);
                tl.to(cardsContainerRef.current, { opacity: 0, duration: 1.2, ease: "power2.inOut" }, 7.0);
                tl.set(cardsContainerRef.current, { pointerEvents: "none" }, 8.2);
                tl.to(ALL_LAYER_IDS, { opacity: 1, duration: 1.4, stagger: 0.12, ease: "power2.out" }, 7.5);
            }, section);

            const rmRefresh = () => ScrollTrigger.refresh();
            const rmRafId = requestAnimationFrame(rmRefresh);
            window.addEventListener("load", rmRefresh);

            // Radii are pixel values derived from the viewport, so a resize has to
            // re-fit them; invalidate lets the blur tweens re-read restFilter().
            const onResize = () => {
                placeCards();
                tl?.invalidate();
                ScrollTrigger.refresh();
            };
            window.addEventListener("resize", onResize);

            return () => {
                animationActiveRef.current = false;
                cancelAnimationFrame(rmRafId);
                window.removeEventListener("load", rmRefresh);
                window.removeEventListener("resize", onResize);
                rmCtx.revert();
            };
        }

        gsap.ticker.lagSmoothing(500, 33);

        // --- 1. Initial State Setup ---
        gsap.set(cards, {
            x: 0,
            y: 0,
            xPercent: -50,
            yPercent: -50,
            rotation: 0,
            scale: 1,
            zIndex: (i) => i,
            opacity: 1,
        });

        TOP_LAYER.forEach(layer =>
            gsap.set(`#${layer.id}`, {
                xPercent: layer.xPercent,
            })
        );
        BOTTOM_LAYER.forEach(layer =>
            gsap.set(`#${layer.id}`, {
                xPercent: layer.xPercent,
            })
        );

        const xSet = cards.map((c) =>
            c ? gsap.quickSetter(c, "x", "px") : () => {},
        );
        const ySet = cards.map((c) =>
            c ? gsap.quickSetter(c, "y", "px") : () => {},
        );
        const blurSet = cards.map(
            (c) => (v) => {
                if (!c) return;
                c.style.filter = v > 0.05 ? `blur(${v.toFixed(2)}px)` : "none";
            },
        );
        const scaleSet = cards.map((c) => {
            if (!c) return () => {};
            const setX = gsap.quickSetter(c, "scaleX");
            const setY = gsap.quickSetter(c, "scaleY");
            return (val) => {
                setX(val);
                setY(val);
            };
        });

        const previousZ = Array(TOTAL).fill(-1);

        // --- 2. SplitText Initialization ---
        const splittedParagraph = SplitText.create(infoTextRef.current, {
            type: "lines",
            mask: "lines",
            aria: "none",
        });

        // --- 3. Master Scroll Sequence Timeline ---
        const ctx = gsap.context(() => {
            const masterTL = gsap.timeline({
                scrollTrigger: {
                    trigger: section,
                    start: "-5% top",
                    end: "bottom bottom",
                    scrub: true,
                    markers: false,
                },
            });

            // 3a. Spiral Cards Path Animation (Duration: 0 to 8)
            const spiralProxy = { progress: 0 };
            masterTL.to(spiralProxy, {
                progress: 1,
                duration: 8,
                ease: "none",
                onUpdate: () => {
                    if (!animationActiveRef.current) return;

                    const prog = spiralProxy.progress;
                    const p1 = Math.min(prog / 0.1, 1);
                    const t = Math.min(Math.max((prog - 0.1) / 0.9, 0), 1); // Single phase from 0.1 to 1.0

                    // flyProgress goes from 0 to 1 as t goes from 0 to 0.5
                    const flyProgress = Math.min(t / 0.5, 1);

                    // orbitProgress goes from 0 to 1 as t goes from 0 to 1.0
                    const orbitProgress = Math.pow(t, 2);

                    // expandProgress goes from 0 to 1 as t goes from 0 to 1.0
                    const expandProgress = Math.pow(t, 2.2);

                    cards.forEach((card, i) => {
                        if (!card) return;

                        const nextZ = p1 >= i / TOTAL ? TOTAL + i : i;
                        const startFrac = CARD_STAGGER_FRAC[i];

                        // flyout progress staggered within flyProgress
                        const cardP2 = linear(
                            (flyProgress - startFrac) / (1 - startFrac),
                        );

                        if (cardP2 > 0) {
                            const easedCardP2 = 1 - Math.pow(1 - cardP2, 2);

                            // Angle incorporates continuous global rotation
                            const maxOrbitRotation = Math.PI * 2 * 0.55;
                            let currentAngle = easedCardP2 * finalAngles[i] - orbitProgress * maxOrbitRotation;

                            const radiusP = easedCardP2;
                            const radiusExpand = 1.0 + expandProgress * EXPAND_RADIUS_FACTOR;

                            xSet[i](Math.cos(currentAngle) * radiusP * radiusExpand * RADIUS_X);
                            ySet[i](Math.sin(currentAngle) * radiusP * radiusExpand * RADIUS_Y);

                            const yVal = Math.sin(currentAngle);

                            // Retrieve precomputed size/blur levels
                            const { scale: cardBaseScale, blur: cardBaseBlur } = CARD_META[i];

                            // Interpolate scale from 1.0 to base scale as card flies out
                            const finalBaseScale = 1.0 + (cardBaseScale - 1.0) * easedCardP2;
                            // Interpolate blur from 0 to base blur as card flies out
                            const blurGate = linear(
                                (t - SPIRAL_BLUR_DELAY) / (1 - SPIRAL_BLUR_DELAY),
                            );
                            const finalBaseBlur = cardBaseBlur * easedCardP2 * blurGate;

                            // Apply dynamic depth scale scaling based on single-phase t
                            const scaleRange = yVal * 0.25 * finalBaseScale;
                            const currentScale = finalBaseScale + scaleRange * t;
                            scaleSet[i](currentScale);

                            // Apply dynamic depth blur based on single-phase t
                            const depthBlur = Math.max(0, -yVal * 2.5);
                            const currentBlur = finalBaseBlur + depthBlur * t * blurGate;
                            blurSet[i](currentBlur);

                            // Calculate dynamic zIndex
                            let depthZ = nextZ;
                            const targetZ = TOTAL + Math.round((yVal + 1) * TOTAL);
                            depthZ = Math.round(nextZ + (targetZ - nextZ) * t);

                            if (depthZ !== previousZ[i]) {
                                card.style.zIndex = depthZ;
                                previousZ[i] = depthZ;
                            }
                        } else {
                            xSet[i](0);
                            ySet[i](0);
                            blurSet[i](0);
                            scaleSet[i](1);
                            if (nextZ !== previousZ[i]) {
                                card.style.zIndex = nextZ;
                                previousZ[i] = nextZ;
                            }
                        }
                    });
                }
            }, 0);

            // 3b. Spiral Information Reveal (Duration: 3.5 to 5.5)
            masterTL.fromTo(
                splittedParagraph.lines,
                { yPercent: 100 },
                { yPercent: 0, ease: "power2.out", stagger: 0.04, duration: 1.5 },
                3.85
            );

            // 3c. Spiral Information Exit (Duration: 6.0 to 7.2)
            masterTL.to(
                splittedParagraph.lines,
                { yPercent: -130, opacity: 0, ease: "power2.in", stagger: 0.02, duration: 1.0 },
                6.0
            );

            // Cards Fade Out
            masterTL.to(
                cardsContainerRef.current,
                { opacity: 0, duration: 1.2, ease: "power2.inOut" },
                7.0
            );
            masterTL.set(cardsContainerRef.current, { pointerEvents: "none" }, 8.2);

            // 3d. Vault Grid Boxes Slide in
            TOP_LAYER.forEach((layer, i) => {
                masterTL.to(
                    `#${layer.id}`,
                    { xPercent: 0, duration: 2, ease: "power1.out" },
                    7.5 + i * 0.15
                );
            });
            BOTTOM_LAYER.forEach((layer, i) => {
                masterTL.to(
                    `#${layer.id}`,
                    { xPercent: 0, duration: 2, ease: "power1.out" },
                    8 + i * 0.15
                );
            });
        }, section);

        // This section mounts LATE (gated behind isMounted in the parent) and is
        // 800vh tall. Every ScrollTrigger built by the components below it
        // (Workflow, UIKit, SmallMotion, …) computed its start/end BEFORE this
        // section existed in the layout, so once it mounts their positions are
        // stale and those animations stop firing. A global refresh recomputes
        // every trigger on the page, re-syncing everything downstream.
        const refresh = () => ScrollTrigger.refresh();
        const rafId = requestAnimationFrame(refresh);
        window.addEventListener("load", refresh);

        const imgs = section ? Array.from(section.querySelectorAll("img")) : [];
        imgs.forEach((img) => {
            if (!img.complete) img.addEventListener("load", refresh, { once: true });
        });

        return () => {
            animationActiveRef.current = false;
            cancelAnimationFrame(rafId);
            window.removeEventListener("load", refresh);
            imgs.forEach((img) => img.removeEventListener("load", refresh));
            ctx.revert();
            splittedParagraph.revert();
        };
    }, []);

    return (
        <section
            ref={sectionRef}
            id="spiral-images"
            className="relative w-full h-[600vh] max-[1025px]:hidden  z-50"
            
        >
            <LineReveal as="h2" className="text110 w-[80vw] leading-[1.2]! mx-auto text-center">
                Explore the Moments your Website is  <span className='gradient-text-animate'>Missing.</span>
            </LineReveal>
            <SplitLineNoMask as="p" className="mx-auto mt-[2vw] max-w-[65vw] text-center text24 leading-[1.55] text-white max-[1025px]:mt-5 max-[1025px]:max-w-[82vw] max-[1025px]:text-sm max-md:max-w-full">
                Hover it. Scroll it. Break it. Then copy it!
            </SplitLineNoMask>
            <div
       
                ref={stickyContainerRef}
                className="sticky top-0 flex items-center justify-center w-full h-screen overflow-hidden"
            >
                {/* 1. Spiral Images Layer */}
                <div
                    ref={cardsContainerRef}
                    className="absolute inset-0 flex items-center justify-center w-full h-full z-10 pointer-events-none"
                >
                    <div className="relative flex items-center justify-center w-full h-full">
                        {CARD_CONFIGS.map(({ src }, i) => (
                            <div
                                key={i}
                                ref={(el) => (cardRefs.current[i] = el)}
                                className="absolute overflow-hidden rounded-md"
                                style={{
                                    left: "50%",
                                    top: "50%",
                                    width: "18vw",
                                    height:"11vw",
                                    zIndex: i,
                                    willChange: "transform, filter",
                                    backfaceVisibility: "hidden",
                                }}
                            >
                                <Image
                                    src={src}
                                    alt={`spiral-card-images`}
                                    fill
                                    className="object-cover"
                                    sizes="(max-width: 1024px) 0vw, 18vw"
                                    quality={60}
                                    loading="lazy"
                                />
                            </div>
                        ))}
                    </div>
                </div>

                {/* 2. Spiral Information Layer */}
                <div className="absolute inset-0 flex items-center gap-[3.5vw] flex-col self-padd justify-center h-full z-10 pointer-events-none">
                    <p
                        ref={infoTextRef}
                        className="text34 w-[48vw] mt-[5vw] leading-[1.6]! text-center pointer-events-auto"
                    >
                       Vault is easiest to understand when you feel it. Every effect in the free tier is production-tested. No teaser previews. No locked exports. Copy the code and it&apos;s yours.
                    </p>
                   
                </div>

                {/* 3. Vault Grid Second Layout Layer */}
                <div
                    ref={vaultSecondLayoutRef}
                    className="absolute inset-0 top-[3%] flex h-screen flex-col items-center justify-center self-padd z-20 pointer-events-none"
                >
                    {/* Top Layer */}
                    <div className="w-full relative z-10 h-[40vh] gap-[1.5vw] flex items-center justify-center pointer-events-auto">
                        {BOXES.map(box => (
                            <VaultBox key={box.id} {...box} />
                        ))}
                    </div>

                    {/* Bottom Layer */}
                    <div className="w-full h-[40vh] relative z-10 gap-[1.5vw] flex items-center justify-center pointer-events-auto mt-[1.5vw]">
                        {BOXES_BOTTOM.map(box => (
                            <VaultBox key={box.id} {...box} />
                        ))}
                  
                    </div>
                </div>
            </div>
        </section>
    );
}
