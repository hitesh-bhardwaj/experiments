"use client";

import { useRef, useEffect } from "react";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { prefersReducedMotion } from "@/lib/motion";

if (typeof window !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger, SplitText);
}

const IMAGES = [
    "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/h-01.jpg",
    "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/h-02.jpg",
    "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/h-03.jpg",
    "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/h-05.jpg",
    "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/h-06.jpg",
    "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/h-07.jpg",
    "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/h-08.jpg",
    "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/h-09.jpg",
    "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/h-10.jpg",
    "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/h-11.jpg",
    "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/h-12.jpg",
    "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/h-13.jpg",  
    "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/h-14.jpg",  
    "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/h-15.jpg",  
    
];

const TOTAL = IMAGES.length;

const RADIUS_X = 600;
const RADIUS_Y = 400;

// Config: how much the orbit radius expands in Phase 3 (e.g. 0.70 = 70% expansion)
const EXPAND_RADIUS_FACTOR = 0.67;

// Fraction of spiral phase (t) before card blur begins - keeps early fly-out sharp
const SPIRAL_BLUR_DELAY = 0.35;
const SECTION_HEIGHT = "420vh";
const REDUCED_MOTION_SECTION_HEIGHT = "260vh";

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


export default function SpiralGallery() {
    const sectionRef = useRef(null);
    const cardRefs = useRef([]);
    const cardsContainerRef = useRef(null);

    // Refs from SpiralInformation
    const infoTextRef = useRef(null);

    const animationActiveRef = useRef(false);

    useEffect(() => {
        const section = sectionRef.current;
        const cards = cardRefs.current;
        const reduceMotion = prefersReducedMotion();

        animationActiveRef.current = true;

        const finalAngles = cards.map(
            (_, i) => -(i / TOTAL) * 2 * Math.PI - Math.PI / 6,
        );

        // --- Reduced motion ---
        // The spiral never travels: it is laid out at rest on mount. What still
        // animates is opacity and blur, which carry the same beats as the full
        // version (cards settle in, copy reads, cards clear) without moving
        // anything across the screen.
        if (reduceMotion) {
            section.style.height = REDUCED_MOTION_SECTION_HEIGHT;

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
                tl.to(infoTextRef.current, { opacity: 1, filter: "blur(0px)", duration: 1.0, ease: "power2.out" }, 1.9);
                tl.to(cardsContainerRef.current, { opacity: 0, duration: 0.8, ease: "power2.inOut" }, 4.2);
                tl.set(cardsContainerRef.current, { pointerEvents: "none" }, 5.0);
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

            // 3a. Spiral Cards Path Animation
            const spiralProxy = { progress: 0 };
            masterTL.to(spiralProxy, {
                progress: 1,
                duration: 5.2,
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

            // 3b. Spiral Information Reveal
            masterTL.fromTo(
                splittedParagraph.lines,
                { yPercent: 100 },
                { yPercent: 0, ease: "power2.out", stagger: 0.04, duration: 1.2 },
                2.8
            );

            // Cards Fade Out
            masterTL.to(
                cardsContainerRef.current,
                { opacity: 0, duration: 0.8, ease: "power2.inOut" },
                4.6
            );
            masterTL.set(cardsContainerRef.current, { pointerEvents: "none" }, 5.4);
        }, section);

        // This section mounts LATE (gated behind isMounted in the parent) and is
        // tall. Every ScrollTrigger built by the components below it
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
            className="relative w-full max-[1025px]:hidden  z-50"
            style={{ height: SECTION_HEIGHT }}
        >
            <div
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

            </div>
        </section>
    );
}
