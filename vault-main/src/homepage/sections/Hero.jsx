"use client";

import dynamic from "next/dynamic";
import { useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/dist/ScrollTrigger";
import HeroToolsStrip from "../components/HeroToolsStrip";
import SplitText from "gsap/SplitText";
import { useGSAP } from "@gsap/react";

import Button from "../components/Button";
import { useLoaderComplete } from "../components/loader-state";
import { prefersReducedMotion } from "@/lib/motion";
import { isLighthouseOrHeadless, isSoftwareRenderer, shouldSkipRealtimeGPU } from "@/lib/audit";
import { unlockScroll, useScrollLockLenis } from "../components/scroll-lock";
import { useFadeUp } from "@/components/Animations/gsapAnimations";
import { EasterEggDot } from "../components/easter-egg/EasterEgg";

if (typeof window !== "undefined") {
    gsap.registerPlugin(ScrollTrigger, SplitText);
}

const NAV_LEAD = 0.25;
const AT_CANVAS = 0;
const INTRO_DURATION = 1.7;
const AT_HEADING = 1;
const AT_COPY = 2.3;
const AT_ACTIONS = 2.75;
// Scroll unlocks ~2s after the loader (timeline position + NAV_LEAD)
const AT_UNLOCK = 1.75;

const INTRO_HIDDEN = { visibility: "hidden" };
function revealIntroTargets(...els) {
    gsap.set(els.filter(Boolean), { autoAlpha: 1, visibility: "visible" });
}

function hideIntroTargets(...els) {
    gsap.set(els.filter(Boolean), { autoAlpha: 0, visibility: "hidden" });
}


const BACKGROUND_FALLBACK = (
    <div className="absolute inset-0" aria-hidden />
);

const HeroRibbons = dynamic(
    () => import("../components/HeroRibbons"),
    { ssr: false, loading: () => BACKGROUND_FALLBACK },
);

function shouldBypassHeroIntroForAudit() {
    return isLighthouseOrHeadless() || isSoftwareRenderer();
}

export default function Hero() {
    const rootRef = useRef(null);
    const canvasRef = useRef(null);
    const headingRef = useRef(null);
    const copyRef = useRef(null);
    const actionsRef = useRef(null);
    const coverRef = useRef(null);
    const loaderComplete = useLoaderComplete();
    const [playIntro, setPlayIntro] = useState(false);
    const [skipGPU, setSkipGPU] = useState(true);

    useScrollLockLenis();

    const introRef = useRef(0);

    useLayoutEffect(() => {
        const dropCover = () => gsap.set(coverRef.current, { display: "none" });

        if (shouldBypassHeroIntroForAudit() || prefersReducedMotion()) {
            introRef.current = 1;
            revealIntroTargets(
                headingRef.current,
                copyRef.current,
                actionsRef.current
            );
            dropCover();
            unlockScroll();
            return;
        }
        hideIntroTargets(
            headingRef.current,
            copyRef.current,
            actionsRef.current
        );
        dropCover();
        // Intentional: the intro can only start after this mount-time setup (cover dropped, targets hidden)
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSkipGPU(shouldSkipRealtimeGPU());
        setPlayIntro(true);
    }, []);
    useGSAP(
        () => {
            introRef.current = playIntro ? 0 : 1;
        },
        { scope: rootRef, dependencies: [playIntro] }
    );

    useGSAP(
        () => {
            if (!playIntro || !loaderComplete) return;

            revealIntroTargets(
                headingRef.current,
                copyRef.current,
                actionsRef.current
            );

            const heading = SplitText.create(headingRef.current, {
                type: "words",
                mask: "words",
            });
            const copy = SplitText.create(copyRef.current, { type: "lines" });

            headingRef.current
                ?.querySelectorAll(".gradient-text-animate")
                .forEach((el) => {
                    const nested = heading.words.filter((word) => el.contains(word));
                    if (!nested.length) return;
                    nested.forEach((word) =>
                        word.classList.add("gradient-text-animate"),
                    );
                    el.classList.remove("gradient-text-animate");
                });

            gsap.set([headingRef.current, copyRef.current], { autoAlpha: 1 });
            gsap.set(heading.words, { yPercent: 110 });
            gsap.set(copy.lines, { yPercent: 40, autoAlpha: 0 });
            gsap.set(actionsRef.current, { y: 28, autoAlpha: 0 });

            const tl = gsap.timeline({
                delay: NAV_LEAD,
                defaults: { ease: "power2.out" },
            });

            tl.to(
                introRef,
                { current: 1, duration: INTRO_DURATION, ease: "power1.inOut" },
                AT_CANVAS
            )
                .to(
                    heading.words,
                    { yPercent: 0, duration: 1.1, stagger: 0.08 },
                    AT_HEADING
                )
                .to(
                    copy.lines,
                    {
                        yPercent: 0,
                        autoAlpha: 1,
                        duration: 0.8,
                        stagger: 0.07,
                    },
                    AT_COPY
                )
                .to(
                    actionsRef.current,
                    {
                        y: 0,
                        autoAlpha: 1,
                        duration: 0.7,
                    },
                    AT_ACTIONS
                );

            tl.call(unlockScroll, null, AT_UNLOCK);

            return () => {
                heading.revert();
                copy.revert();
                hideIntroTargets(
                    headingRef.current,
                    copyRef.current,
                    actionsRef.current
                );
                unlockScroll();
            };
        },
        { dependencies: [playIntro && loaderComplete], scope: rootRef }
    );

    useFadeUp()

    return (
        <main ref={rootRef} id="hero-v3" className="relative w-full overflow-x-clip">
            <div ref={canvasRef} className="pointer-events-auto sticky top-0 -mb-[100dvh] h-dvh w-full">
                {skipGPU ? (
                    BACKGROUND_FALLBACK
                ) : (
                    <HeroRibbons play={playIntro && loaderComplete} />
                )}
            </div>
            <div className="pointer-events-none relative z-10 mx-auto flex min-h-dvh w-full max-w-[1536px] flex-col justify-end px-[calc(var(--cvw)*4.5)] max-md: pt-[calc(var(--cvw)*8)] max-md:px-[calc(var(--cvw)*7)]! pb-[calc(var(--cvw)*5)]  max-md:pt-32 max-md:pb-10 max-sm:px-5">
                <div className="flex items-end justify-between gap-[calc(var(--cvw)*3)] max-md:flex-col max-md:items-stretch max-md:gap-5">
                   
                    <h1 ref={headingRef} className="relative min-w-0 flex-[1.5] type-display leading-[1.15] max-w-[calc(var(--cvw)*53)] max-md:max-w-full text-[#F4F4F4]">
                        The Interaction Layer Your Website is <span className="gradient-text-animate">Missing</span><EasterEggDot className="pointer-events-auto" />
                    </h1>

                    <div className="flex min-w-0 flex-[0.7] flex-col gap-[calc(var(--cvw)*2)] pb-[calc(var(--cvw)*0.6)] max-md:pb-0 max-md:gap-5">
                        <p ref={copyRef} style={INTRO_HIDDEN} className="type-body-lg text-[#C9C9C9] max-w-[calc(var(--cvw)*40)] max-md:max-w-full max-md:w-full max-md:text-left">
                            Source-first scroll systems, cursor effects, text reveals, page transitions, loaders, backgrounds, and WebGL scenes for React and Next.js. Installed as real files in your project, not a dependency you rent.
                        </p>

                        <div
                            ref={actionsRef}
                            style={INTRO_HIDDEN}
                            className="pointer-events-auto flex max-sm:pt-4 max-sm:flex-col w-fit max-sm:w-full gap-[calc(var(--cvw)*1)] max-md:w-full max-md:gap-5"
                        >
                            <Button
                                text="Read Docs"
                                href="/docs"
                                variant="outline"
                                className="max-sm:w-full max-sm:justify-center"
                            />
                            <Button
                                text="Browse All Effects"
                                href="/effects"
                                variant="orange"
                                scrollOffset={-1000}
                                className="max-sm:w-full max-sm:justify-center"
                            />
                        </div>
                    </div>
                </div>
            </div>
            <HeroToolsStrip />
            <div
                ref={coverRef}
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 z-30 bg-background"
            />
        </main>
    );
}
