'use client'
import { useRef, useState, useEffect, useCallback } from "react";
import Image from "next/image";
import gsap from "gsap";
import { SplitText } from "gsap/SplitText";
import NavigationButtons from "./NavigationButtons";

gsap.registerPlugin(SplitText);

/**
 * @typedef {Object} Testimonial
 * @property {string} quote
 * @property {string} name
 * @property {string} title
 * @property {string} image
 */

/**
 * @typedef {Object} TestimonialCompProps
 * @property {Testimonial[]} [testimonials]
 * @property {string} [bgColor]
 * @property {boolean} [autoplay]
 * @property {number} [autoplayDelay]
 * @property {boolean} [showNavigation]
 * @property {number} [imageSize]
 */

/** @param {TestimonialCompProps} props */
export default function TestimonialComp({
    testimonials = [],
    bgColor = "#ffffff",
    autoplay = true,
    autoplayDelay = 4500,
    showNavigation = true,
    imageSize = 1,
}: any) {
    const [current, setCurrent] = useState(0);
    const [displayItem, setDisplayItem] = useState(testimonials[0] ?? null);
    const [, setIsAnimating] = useState(false);

    const quoteRef = useRef<any>(null);
    const quoteMarkRef = useRef<any>(null);
    const nameRef = useRef<any>(null);
    const titleRef = useRef<any>(null);
    const mobileNameRef = useRef<any>(null);
    const mobileTitleRef = useRef<any>(null);
    const desktopImageRef = useRef<any>(null);
    const mobileImageRef = useRef<any>(null);
    const imageRef = useRef<any>(null);
    const splitRef = useRef<any>(null);
    const prevCurrentRef = useRef<any>(null);
    const pendingDirectionRef = useRef<"next" | "prev">("next");
    const isAnimatingRef = useRef(false);
    const reduceMotionRef = useRef(
        typeof window !== "undefined" &&
            (window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false)
    );

    const total = testimonials.length;
    /** @param {number} n */
    const pad = (n: number) => String(n).padStart(2, "0");
    const safeImageSize = Math.max(0.6, Number(imageSize) || 1);

    useEffect(() => {
        const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
        if (!mq) return;
        const onChange = (event: MediaQueryListEvent) => {
            reduceMotionRef.current = event.matches;
        };
        reduceMotionRef.current = mq.matches;
        mq.addEventListener?.("change", onChange);
        return () => mq.removeEventListener?.("change", onChange);
    }, []);

    const animateIn = useCallback((direction: "next" | "prev") => {
        if (splitRef.current) {
            splitRef.current.revert();
            splitRef.current = null;
        }

        const meta = [
            desktopImageRef.current,
            mobileImageRef.current,
            nameRef.current,
            titleRef.current,
            mobileNameRef.current,
            mobileTitleRef.current,
            quoteMarkRef.current,
        ];

        const onDone = () => {
            setIsAnimating(false);
            isAnimatingRef.current = false;
        };

        // Reduced-motion: skip SplitText / Y slides - opacity fade only.
        if (reduceMotionRef.current) {
            gsap.set(quoteRef.current, { autoAlpha: 0 });
            gsap.set(meta, { autoAlpha: 0 });

            const tl = gsap.timeline({ onComplete: onDone });
            tl.to(quoteRef.current, {
                autoAlpha: 1,
                duration: 0.5,
                ease: "power2.out",
            }).to(
                meta,
                {
                    autoAlpha: 1,
                    duration: 0.5,
                    ease: "power2.out",
                    stagger: 0.08,
                },
                "<0.15"
            );
            return;
        }

        const yFrom = direction === "next" ? 110 : -110;

        gsap.set(quoteRef.current, { autoAlpha: 1 });

        splitRef.current = new SplitText(quoteRef.current, {
            type: "lines",
            linesClass: "split-line",
        });

        const lines = splitRef.current.lines;

        lines.forEach((line: any) => {
            const wrapper = document.createElement("div");
            wrapper.style.overflow = "hidden";
            wrapper.style.display = "block";
            line.parentNode.insertBefore(wrapper, line);
            wrapper.appendChild(line);
        });

        gsap.set(lines, { yPercent: yFrom });
        gsap.set(meta, {
            autoAlpha: 0,
        });

        const tl = gsap.timeline({ onComplete: onDone });

        tl.to(lines, {
            yPercent: 0,
            duration: 0.85,
            ease: "power2.out",
            stagger: {
                each: 0.15,
                from: direction === "next" ? "start" : "end",
            },
        }).to(
            meta,
            {
                autoAlpha: 1,
                y: 0,
                duration: 1,
                ease: "power2.out",
                stagger: 0.15,
            },
            "<0.5"
        );
    }, []);

    const fadeOutCurrent = useCallback(() => {
        return new Promise((resolve) => {
            const targets = [
                quoteRef.current,
                imageRef.current,
                nameRef.current,
                titleRef.current,
                mobileNameRef.current,
                mobileTitleRef.current,
                quoteMarkRef.current,
            ];
            gsap.killTweensOf(targets);
            gsap.to(targets, {
                autoAlpha: 0,
                duration: 0.2,
                ease: "power1.in",
                onComplete: resolve,
            });
        });
    }, []);

    const handlePrev = useCallback(async () => {
        if (isAnimatingRef.current || total === 0) return;
        isAnimatingRef.current = true;
        setIsAnimating(true);

        await fadeOutCurrent();

        const nextIndex = (current - 1 + total) % total;
        pendingDirectionRef.current = "prev";

        if (splitRef.current) {
            splitRef.current.revert();
            splitRef.current = null;
        }

        setDisplayItem(testimonials[nextIndex]);
        setCurrent(nextIndex);
    }, [total, current, testimonials, fadeOutCurrent]);

    const handleNext = useCallback(async () => {
        if (isAnimatingRef.current || total === 0) return;
        isAnimatingRef.current = true;
        setIsAnimating(true);

        await fadeOutCurrent();

        const nextIndex = (current + 1) % total;
        pendingDirectionRef.current = "next";

        if (splitRef.current) {
            splitRef.current.revert();
            splitRef.current = null;
        }

        setDisplayItem(testimonials[nextIndex]);
        setCurrent(nextIndex);
    }, [total, current, testimonials, fadeOutCurrent]);

    useEffect(() => {
        if (!autoplay || reduceMotionRef.current || total <= 1) return;

        const delay = Math.max(1000, Number(autoplayDelay) || 4500);
        const interval = window.setInterval(() => {
            if (!isAnimatingRef.current) {
                handleNext();
            }
        }, delay);

        return () => window.clearInterval(interval);
    }, [autoplay, autoplayDelay, total, handleNext]);

    useEffect(() => {
        if (!quoteRef.current) return;
        animateIn("next");
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (prevCurrentRef.current === null) {
            prevCurrentRef.current = current;
            return;
        }
        if (prevCurrentRef.current !== current) {
            prevCurrentRef.current = current;
            animateIn(pendingDirectionRef.current);
        }
    }, [current, animateIn]);

    if (!testimonials.length || !displayItem) return null;

    return (
        <section className="relative w-full min-h-screen max-md:min-h-screen bg-white flex flex-col justify-between max-md:justify-start overflow-hidden text-black pt-22 pb-5 max-[1025px]:pt-28 max-[1025px]:px-6 max-md:pt-24 max-md:px-2"
            style={{ backgroundColor: bgColor }}
        >
            {/* Header */}
            <div className="flex items-start justify-between px-8 pr-24 py-5 max-[1025px]:px-6 max-[1025px]:py-4 max-md:px-5 max-md:py-3">
                <div className="flex max-md:flex-row justify-between items-center max-md:items-center w-[30%] max-[1025px]:w-full max-md:w-full max-md:justify-between">
                    <div className="flex items-center gap-2 text-[0.8vw] max-[1025px]:text-[1.8vw] max-md:text-[4vw] font-semibold tracking-[0.12em] uppercase">
                        <span className="text-[9px] max-[1025px]:text-[12px] max-md:text-[15px] text-black">◆</span>
                        <span>Client Stories</span>
                    </div>
                    <span className="text-[13px] max-[1025px]:text-[12px] max-md:pl-4 text-black tabular-nums">
                        {pad(current + 1)}&nbsp;/&nbsp;{pad(total)}
                    </span>
                </div>

                {showNavigation && (
                    <NavigationButtons
                        className="max-md:hidden"
                        onPrev={handlePrev}
                        onNext={handleNext}
                    />
                )}
            </div>

            {/* Body */}
            <div className="flex-1 flex items-start gap-32 px-18 py-5 max-[1025px]:flex-col max-[1025px]:items-start max-[1025px]:gap-10 max-[1025px]:px-6 max-[1025px]:py-10 max-md:px-5 max-md:py-4 max-md:gap-6">

                <div className="shrink-0 max-[1025px]:hidden max-md:hidden">
                    <div
                        ref={desktopImageRef}
                        className="relative w-40 h-50"
                        style={{
                            width: `${10 * safeImageSize}rem`,
                            height: `${12.5 * safeImageSize}rem`,
                        }}
                    >
                        <Image
                            fill
                            sizes="200px"
                            src={displayItem.image}
                            alt={displayItem.name}
                            className="object-cover object-top grayscale"
                        />
                    </div>
                </div>

                {/* Quote area */}
                <div className="flex-1 flex flex-col relative">
                    <span
                        className="absolute -top-1 font-serif font-bold leading-none max-[1025px]:top-[-2vw] text-[42px] max-[1025px]:text-[4.5vw] max-md:text-[34px] max-md:relative max-md:top-0 max-md:left-0 max-md:mb-1 text-black"
                        style={{ left: 0 }}
                        ref={quoteMarkRef}
                    >
                        &quot;
                    </span>

                    <div className="flex flex-col pl-13 w-[95%] max-[1025px]:pl-0 max-[1025px]:w-full max-md:pl-0 max-md:w-full">
                        <blockquote
                            ref={quoteRef}
                            className="m-0 mb-7 p-0 text-[3.35vw] max-md:min-h-0 max-[1025px]:min-h-[24vh] leading-[1.18] max-[1025px]:mb-6 max-[1025px]:w-full max-[1025px]:max-w-full max-[1025px]:text-[clamp(2rem,4.4vw,3.1rem)] max-[1025px]:leading-[1.16] max-md:max-w-full max-md:text-[6.2vw] max-md:leading-[1.18] max-md:mb-3"
                        >
                            {displayItem.quote}
                        </blockquote>

                        <div className="hidden max-[1025px]:flex items-center gap-4 mt-6 max-[1025px]:gap-5 max-md:mt-3 max-md:gap-6">
                            <div
                                ref={mobileImageRef}
                                className="relative max-[1025px]:w-30 max-[1025px]:h-36 max-md:w-22 max-md:h-26 shrink-0"
                                style={{
                                    width: `${7.5 * safeImageSize}rem`,
                                    height: `${9 * safeImageSize}rem`,
                                }}
                            >
                                <Image
                                    fill
                                    sizes="150px"
                                    src={displayItem.image}
                                    alt={displayItem.name}
                                    className="object-cover object-top grayscale"
                                />
                            </div>
                            <div className="flex flex-col gap-1">
                                <p ref={mobileNameRef} className="m-0 text-xl font-normal">
                                    {displayItem.name}
                                </p>
                                <p
                                    ref={mobileTitleRef}
                                    className="m-0 text-[11px] font-semibold tracking-[0.12em] uppercase text-[#888]"
                                >
                                    {displayItem.title}
                                </p>
                            </div>
                        </div>

                        {/* Desktop: name/title */}
                        <div className="flex flex-col gap-1 mt-2 max-[1025px]:hidden max-md:hidden">
                            <p ref={nameRef} className="m-0 text-xl max-[1025px]:text-lg font-normal">
                                {displayItem.name}
                            </p>
                            <p
                                ref={titleRef}
                                className="m-0 text-[11px] max-[1025px]:text-[10px] font-semibold tracking-[0.12em] uppercase text-[#888]"
                            >
                                {displayItem.title}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
