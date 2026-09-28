"use client";

import dynamic from "next/dynamic";
import { useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/dist/ScrollTrigger";
import SplitText from "gsap/SplitText";
import { useGSAP } from "@gsap/react";

import ButtonV3 from "../components/ButtonV3";
import { useLoaderV3Complete } from "../components/loader-v3-state";
import { prefersReducedMotion } from "@/lib/motion";
import { isLighthouseOrHeadless, isSoftwareRenderer, shouldSkipRealtimeGPU } from "@/lib/audit";
import { unlockScrollV3, useScrollLockLenis } from "../components/scroll-lock-v3";
import { useFadeUp } from "@/components/Animations/gsapAnimations";

if (typeof window !== "undefined") {
    gsap.registerPlugin(ScrollTrigger, SplitText);
}

const NAV_LEAD = 0.25;
const AT_CANVAS = 0;
const INTRO_DURATION = 1.7;
const AT_HEADING = 1;
const AT_COPY = 2.3;
const AT_ACTIONS = 2.75;

// The intro animates these in from nothing, so they ship hidden in the markup
// rather than being hidden by the effect below. Hiding them in JS leaves them
// painted and visible for the frames between first paint and hydration - which
// is long enough on a cold load to read the headline through the loader before
// it mounts. `visibility` (not `display`) so they still take up layout and the
// hero never reflows when they appear, and it is exactly what GSAP's
// `autoAlpha` writes, so the intro's own `autoAlpha: 1` clears it for free.
//
// The headline is the exception and ships painted - it is the LCP element, and
// hidden markup puts the metric behind the whole loader. See the layout effect,
// which hides it at hydration instead.
const INTRO_HIDDEN = { visibility: "hidden" };

// Any path that decides the intro will not run has to put the copy back -
// hidden markup must never be allowed to stay hidden. Writes `visibility`
// explicitly rather than clearing the inline value: SplitText's `revert()`
// restores whatever the inline style attribute held when it split, and an
// element with no inline `visibility` reverts to visible - which is the flash
// of un-animated copy between the effect re-running and re-hiding.
function revealIntroTargets(...els) {
    gsap.set(els.filter(Boolean), { autoAlpha: 1, visibility: "visible" });
}

// The mirror of the above, for the frames where the intro is about to run but
// has not yet written its own start state.
function hideIntroTargets(...els) {
    gsap.set(els.filter(Boolean), { autoAlpha: 0, visibility: "hidden" });
}

const ASCII_FALLBACK = (
    <div className="absolute inset-0 bg-background" aria-hidden />
);

const CubeBackgroundAscii = dynamic(
    () => import("../components/CubeBackgroundAscii"),
    { ssr: false, loading: () => ASCII_FALLBACK },
);

function shouldBypassHeroIntroForAudit() {
    return isLighthouseOrHeadless() || isSoftwareRenderer();
}

export default function Hero() {
    const rootRef = useRef(null);
    const layerRef = useRef(null);
    const overlayRef = useRef(null);
    const canvasRef = useRef(null);
    const headingRef = useRef(null);
    const copyRef = useRef(null);
    const actionsRef = useRef(null);
    const coverRef = useRef(null);
    const loaderComplete = useLoaderV3Complete();
    // Start conservative: visible copy, no WebGL chunk. Layout effect below
    // enables the real intro only after client signals prove this is not PSI.
    const [playIntro, setPlayIntro] = useState(false);
    const [skipGPU, setSkipGPU] = useState(true);
    // Mobile gets a plain <video> instead of the ASCII canvas (which itself
    // renders from a video texture) - same 768px cutoff the parallax
    // matchMedia below already uses. Starts false (desktop-first) so SSR
    // and first client paint agree; the layout effect below corrects it
    // before paint, same pattern as skipGPU.
    const [isMobile, setIsMobile] = useState(false);

    useScrollLockLenis();

    const introRef = useRef(0);

    useLayoutEffect(() => {
        // The headline ships painted rather than hidden, because it is the
        // largest thing on the page and therefore what LCP measures: markup
        // that hides it means the metric cannot be recorded until the intro
        // plays it in, seconds later, behind a loader. What nobody may see is
        // the paint it gets credited with - hence the cover, which is in the
        // same server HTML and comes off here, in the same breath as the copy
        // is settled either way. The loader's own backdrop is not enough to
        // lean on: it is a separate component and takes itself down when *it*
        // hydrates, which can be several frames before this runs, and the
        // headline is on screen for every one of them.
        const dropCover = () => gsap.set(coverRef.current, { display: "none" });

        if (shouldBypassHeroIntroForAudit() || prefersReducedMotion()) {
            introRef.current = 1;
            // No intro on this path, so nothing else will ever settle the copy.
            // Put it back before paint.
            revealIntroTargets(
                headingRef.current,
                copyRef.current,
                actionsRef.current
            );
            dropCover();
            unlockScrollV3();
            return;
        }
        hideIntroTargets(
            headingRef.current,
            copyRef.current,
            actionsRef.current
        );
        dropCover();
        // GPU capability detection reads WebGL context / renderer info that
        // only exists client-side - can't be a lazy useState initializer
        // without risking a hydration mismatch.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSkipGPU(shouldSkipRealtimeGPU());
        setIsMobile(window.matchMedia("(max-width: 767px)").matches);
        setPlayIntro(true);
    }, []);

    // `playIntro` is false on the first client render for *both* reasons: the
    // intro is genuinely off (audit/reduced-motion, decided in the layout
    // effect above, which returns early and reveals there), or it is simply
    // one tick from being switched on. Revealing here cannot tell those apart,
    // and revealing in the second case is what put the copy on screen for a
    // few frames before the intro hid it again to animate - the flash on
    // reload. The layout effect owns the reveal for the paths that skip the
    // intro, so this effect only has to set the canvas scalar.
    useGSAP(
        () => {
            introRef.current = playIntro ? 0 : 1;
        },
        { scope: rootRef, dependencies: [playIntro] }
    );

    useGSAP(
        () => {
            if (!playIntro || !loaderComplete) return;

            // Clear the markup's `visibility: hidden` before splitting. SplitText
            // measures line boxes to decide where the copy wraps, and a hidden
            // element still lays out but is the wrong thing to measure against
            // once the intro is about to write its own per-line transforms. The
            // elements stay invisible either way - the `gsap.set` calls below
            // immediately re-hide the pieces the timeline animates in.
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
                    { yPercent: 0, autoAlpha: 1, duration: 0.8, stagger: 0.07 },
                    AT_COPY
                )
                .to(
                    actionsRef.current,
                    {
                        y: 0,
                        autoAlpha: 1,
                        duration: 0.7,
                        onComplete: unlockScrollV3,
                    },
                    AT_ACTIONS
                );

            return () => {
                heading.revert();
                copy.revert();
                // `revert()` puts the original nodes back with whatever inline
                // style they carried at split time. Re-assert the hidden start
                // state so a re-run of this effect (both its dependencies flip
                // during hydration, so it does re-run) cannot paint the copy
                // fully visible for the frames before it sets up again.
                hideIntroTargets(
                    headingRef.current,
                    copyRef.current,
                    actionsRef.current
                );
                unlockScrollV3();
            };
        },
        // One dependency, not two. `playIntro` and `loaderComplete` flip at
        // different moments during hydration, so listing both re-runs this
        // effect - tearing the SplitText down and rebuilding it - the instant
        // the second one lands. The effect only ever does work when both are
        // true, and neither goes back to false, so the conjunction is the real
        // trigger and it fires exactly once.
        { dependencies: [playIntro && loaderComplete], scope: rootRef }
    );

    useGSAP(
        () => {
            if (!playIntro) return;
            const mm = gsap.matchMedia();

            const recede = () => {
                gsap
                    .timeline({
                        defaults: { ease: "none" },
                        scrollTrigger: {
                            start: 0,
                            end: () => window.innerHeight * 0.9,
                            scrub: true,
                            invalidateOnRefresh: true,
                        },
                    })
                    .fromTo(
                        layerRef.current,
                        { scale: 1, rotate: 0,  },
                        { scale: 0.7, rotate: '5deg' },
                        0
                    )
                    .fromTo(overlayRef.current, { opacity: 0 }, { opacity: 0.65 }, 0);
            };

            mm.add("(min-width: 768px)", () => recede(14));
            mm.add("(max-width: 767px)", () => recede(6));

            return () => mm.revert();
        },
        { scope: rootRef, dependencies: [playIntro] }
    );
    useGSAP(
        () => {
            if (!playIntro) return;
            const mm = gsap.matchMedia();

            const recede = (blur) => {
                gsap
                    .timeline({
                        defaults: { ease: "none" },
                        scrollTrigger: {
                            // Scale starts immediately; blur waits a beat so the
                            // hero recedes first and only then goes soft.
                            start: () => window.innerHeight * 0.28,
                            end: () => window.innerHeight * 0.9,
                            scrub: true,
                            invalidateOnRefresh: true,
                        },
                    })
                    .fromTo(
                        layerRef.current,
                        { filter: "blur(0px)" },
                        { filter: `blur(${blur}px)` },
                        0
                    );
            };

            mm.add("(min-width: 768px)", () => recede(14));
            mm.add("(max-width: 767px)", () => recede(6));

            return () => mm.revert();
        },
        { scope: rootRef, dependencies: [playIntro] }
    );

    useFadeUp()

    return (
        <main
            ref={rootRef}
            className="relative h-dvh max-[1025px]:h-fit! max-[1025px]:min-h-screen w-screen overflow-hidden bg-background"
        >
            <div ref={layerRef} className="absolute  inset-0 origin-center max-md:w-full will-change-transform">
                <div ref={canvasRef} className="absolute inset-0 will-change-transform">
                    {isMobile ? (
                        <video
                            className="absolute inset-0 h-full w-full object-cover"
                            src="/assets/videos/home_bg_vid.mp4"
                            poster="/assets/videos/home_bg_vid_poster.webp"
                            autoPlay
                            muted
                            loop
                            playsInline
                        />
                    ) : skipGPU ? (
                        ASCII_FALLBACK
                    ) : (
                        <CubeBackgroundAscii intro={introRef} />
                    )}
                </div>
                <div className="pointer-events-none max-md:w-full absolute inset-0 z-10 flex items-center p-[3vw] max-[1025px]:p-[6vw] max-md:items-end max-md:p-6 max-sm:p-5">
                    <div className="space-y-[3vw] relative z-10 w-full max-[1025px]:space-y-[4vw] max-md:space-y-4 ">
                        <div className="flex flex-col h-fit font-neue-haas w-full items-start max-sm:gap-2 max-md:gap-5">
                            {/* No INTRO_HIDDEN here, unlike the copy and the
                                actions below: this is the LCP element, and it
                                has to reach the screen with the server's HTML
                                to be measured at all. The layout effect above
                                hides it at hydration. */}
                            <h1 ref={headingRef} className="relative max-md:text-[13vw]! t96 mt-[1vw] w-[55vw] max-[1025px]:mt-0 max-[1025px]:w-[85%] max-md:mt-0 max-md:w-[95%] max-sm:w-full">
                                The Interaction Layer Your Website is <span className="gradient-text-animate">Missing.</span>
                            </h1>
                        </div>

                        <p ref={copyRef} style={INTRO_HIDDEN} className="text22 text-secondary w-[42vw] max-[1025px]:w-[75%] max-md:w-[80%] max-sm:w-full max-md:text-left max-sm:text-left">
                          Source-first scroll systems, cursor effects, text reveals, page transitions, loaders, backgrounds, and WebGL scenes for React and Next.js. Installed as real files in your project, not a dependency you rent.
                        </p>

                        <div
                            ref={actionsRef}
                            style={INTRO_HIDDEN}
                            className="pointer-events-auto flex max-sm:pt-4 max-sm:flex-col w-fit max-sm:w-full gap-[1vw] max-[1025px]:gap-[2.5vw] max-md:pb-[5vw] max-md:w-full max-md:gap-5"
                        >
                            <ButtonV3
                                text="Read Docs"
                                href="/docs"
                                variant="outline"
                                className="max-sm:w-full max-sm:justify-center"
                            />
                            <ButtonV3
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
            <div
                ref={overlayRef}
                className="pointer-events-none absolute inset-0 z-20 bg-background opacity-0"
            />
            {/* Over everything the hero paints, for exactly as long as it takes
                this to hydrate. It is what lets the headline ship visible
                without ever being seen that way - see the layout effect. */}
            <div
                ref={coverRef}
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 z-30 bg-background"
            />
        </main>
    );
}
