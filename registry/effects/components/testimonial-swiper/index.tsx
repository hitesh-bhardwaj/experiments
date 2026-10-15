// Built using Hyperiux Vault: https://vault.hyperiux.com
"use client";

import gsap from "gsap";
import { SplitText } from "gsap/SplitText";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

function NavigationButtons({
    onPrev,
    onNext,
    isAnimating,
    className = "",
}: any) {
    return (
        <nav className={`flex mt-5 gap-1.5 ${className}`}>
            <button
                aria-label="Previous testimonial"
                onClick={onPrev}
                disabled={isAnimating}
                className="w-11 h-11 relative flex items-center group justify-center overflow-hidden border border-[#00000066] bg-transparent text-[#000000] text-base cursor-pointer transition-colors duration-500 ease-in-out hover:bg-[#000000] hover:text-[#ffffff] hover:border-[#000000] disabled:cursor-not-allowed disabled:pointer-events-none disabled:opacity-30"
            >
                <ArrowLeft
                    size={16}
                    className="absolute top-1/2 -translate-y-1/2 transition-transform duration-200 ease-in-out group-hover:scale-[0.9]"
                />
            </button>

            <button
                aria-label="Next testimonial"
                onClick={onNext}
                disabled={isAnimating}
                className="w-11 h-11 flex overflow-hidden relative group items-center justify-center border border-[#00000066] bg-transparent text-[#000000] text-base cursor-pointer transition-colors duration-500 ease-in-out hover:bg-[#000000] hover:text-[#ffffff] hover:border-[#000000] disabled:cursor-not-allowed disabled:pointer-events-none disabled:opacity-30"
            >
                <ArrowRight
                    size={16}
                    className="absolute top-1/2 -translate-y-1/2 transition-transform duration-200 ease-in-out group-hover:scale-[0.9]"
                />
            </button>
        </nav>
    );
}

gsap.registerPlugin(SplitText);



function TestimonialComp({
    testimonials = [],
    bgColor = "#ffffff",
    autoplay = true,
    autoplayDelay = 4500,
    showNavigation = true,
    imageSize = 1,
}: any) {
    const [current, setCurrent] = useState(0);
    const [displayItem, setDisplayItem] = useState(testimonials[0] ?? null);
    const [isAnimating, setIsAnimating] = useState(false);

    const quoteRef = useRef<any>(null);
    const quoteMarkRef = useRef<any>(null);
    const nameRef = useRef<any>(null);
    const titleRef = useRef<any>(null);
    const mobileNameRef = useRef<any>(null);
    const mobileTitleRef = useRef<any>(null);
    const desktopImageRef = useRef<any>(null);
    const mobileImageRef = useRef<any>(null);
    const splitRef = useRef<any>(null);
    const prevCurrentRef = useRef<any>(null);
    const pendingDirectionRef = useRef<"next" | "prev">("next");
    const isAnimatingRef = useRef(false);
    const reduceMotionRef = useRef(
        typeof window !== "undefined" &&
            (window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false)
    );

    const total = testimonials.length;
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

        const images = [desktopImageRef.current, mobileImageRef.current];
        const meta = [
            nameRef.current,
            titleRef.current,
            mobileNameRef.current,
            mobileTitleRef.current,
        ];

        const onDone = () => {
            setIsAnimating(false);
            isAnimatingRef.current = false;
        };

        if (reduceMotionRef.current) {
            gsap.set([quoteRef.current, quoteMarkRef.current], { autoAlpha: 0 });
            gsap.set([...images, ...meta], { autoAlpha: 0 });

            const tl = gsap.timeline({ onComplete: onDone });
            tl.to(quoteRef.current, {
                autoAlpha: 1,
                duration: 0.5,
                ease: "power2.out",
            }).to(
                quoteMarkRef.current,
                {
                    autoAlpha: 1,
                    duration: 0.9,
                    ease: "power2.out",
                },
                "<"
            ).to(
                images,
                {
                    autoAlpha: 1,
                    duration: 0.5,
                    ease: "power2.out",
                },
                0
            ).to(
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
        gsap.set(quoteMarkRef.current, { autoAlpha: 0 });
        gsap.set([...images, ...meta], {
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
            quoteMarkRef.current,
            {
                autoAlpha: 1,
                duration: 1.1,
                ease: "power2.out",
            },
            "<"
        ).to(
            images,
            {
                autoAlpha: 1,
                duration: 0.85,
                ease: "power2.out",
            },
            0
        ).to(
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
                desktopImageRef.current,
                mobileImageRef.current,
                nameRef.current,
                titleRef.current,
                mobileNameRef.current,
                mobileTitleRef.current,
            ];
            gsap.killTweensOf([...targets, quoteMarkRef.current]);
            gsap.to(targets, {
                autoAlpha: 0,
                duration: 0.2,
                ease: "power1.in",
            });
            gsap.to(quoteMarkRef.current, {
                autoAlpha: 0,
                duration: 0.5,
                ease: "power1.in",
                onComplete: resolve,
            });
        });
    }, []);

    const handlePrev = useCallback(async () => {
        if (isAnimatingRef.current || total <= 1) return;
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
        if (isAnimatingRef.current || total <= 1) return;
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
        <section className="relative w-full min-h-screen max-md:min-h-screen bg-white flex flex-col justify-between max-md:justify-start overflow-hidden text-black pt-22 pb-5 max-lg:pt-0 max-lg:px-6 max-md:pt-0 max-md:px-2"
            style={{ backgroundColor: bgColor }}
        >
            {showNavigation && (
                <NavigationButtons
                    className="hidden max-lg:flex max-lg:mt-0 max-lg:pb-5 max-lg:w-full max-lg:justify-center"
                    onPrev={handlePrev}
                    onNext={handleNext}
                    isAnimating={isAnimating}
                />
            )}

            <div className="flex items-start justify-between px-8 py-5 max-lg:px-6 max-lg:py-4 max-md:px-5 max-md:py-3">
                <div className="flex max-md:flex-row justify-between items-center max-md:items-center w-[30%] max-lg:w-full max-md:w-full max-md:justify-between">
                    <div className="flex items-center gap-2 text-[0.8vw] max-lg:text-[1.8vw] max-md:text-[4vw] font-semibold tracking-[0.12em] uppercase">
                        <span className="text-[9px] max-lg:text-[12px] max-md:text-[15px] text-black">◆</span>
                        <span>Client Stories</span>
                    </div>
                    <span className="text-[13px] max-lg:text-[12px] max-md:pl-4 text-black tabular-nums">
                        {pad(current + 1)}&nbsp;/&nbsp;{pad(total)}
                    </span>
                </div>
            </div>

            <div className="flex-1 flex items-start gap-32 px-18 py-5 max-lg:flex-col max-lg:items-start max-lg:gap-10 max-lg:px-6 max-lg:py-10 max-md:px-5 max-md:py-4 max-md:gap-6">

                <div className="shrink-0 flex flex-col gap-5 max-lg:hidden max-md:hidden">
                    <div
                        ref={desktopImageRef}
                        className="relative w-40 h-50"
                        style={{
                            width: `${10 * safeImageSize}rem`,
                            height: `${12.5 * safeImageSize}rem`,
                        }}
                    >
                        <img
                            src={displayItem.image}
                            alt={displayItem.name}
                            className="absolute inset-0 h-full w-full object-cover object-top grayscale"
                        />
                    </div>

                    {showNavigation && (
                        <NavigationButtons
                            onPrev={handlePrev}
                            onNext={handleNext}
                            isAnimating={isAnimating}
                        />
                    )}
                </div>

                <div className="flex-1 flex flex-col relative">
                    <span
                        className="absolute -top-1 font-serif font-bold leading-none max-lg:top-[-2vw] text-[42px] max-lg:text-[4.5vw] max-md:text-[34px] max-md:relative max-md:top-0 max-md:left-0 max-md:mb-1 text-black"
                        style={{ left: 0 }}
                        ref={quoteMarkRef}
                    >
                        &quot;
                    </span>

                    <div className="flex flex-col pl-13 w-[95%] max-lg:pl-0 max-lg:w-full max-md:pl-0 max-md:w-full">
                        <blockquote
                            ref={quoteRef}
                            className="m-0 mb-7 p-0 text-[3.35vw] max-md:min-h-0 max-lg:min-h-[24vh] leading-[1.18] max-lg:mb-6 max-lg:w-full max-lg:max-w-full max-lg:text-[clamp(2rem,4.4vw,3.1rem)] max-lg:leading-[1.16] max-md:max-w-full max-md:text-[6.2vw] max-md:leading-[1.18] max-md:mb-3"
                        >
                            {displayItem.quote}
                        </blockquote>

                        <div className="hidden max-lg:flex items-start gap-4  max-lg:gap-5 max-md:mt-3 max-md:gap-6">
                            <div className="flex flex-col gap-5 shrink-0">
                                <div
                                    ref={mobileImageRef}
                                    className="relative max-lg:w-30 max-lg:h-36 max-md:w-22 max-md:h-26 shrink-0"
                                    style={{
                                        width: `${7.5 * safeImageSize}rem`,
                                        height: `${9 * safeImageSize}rem`,
                                    }}
                                >
                                    <img
                                        src={displayItem.image}
                                        alt={displayItem.name}
                                        className="absolute inset-0 h-full w-full object-cover object-top grayscale"
                                    />
                                </div>
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

                        <div className="flex flex-col gap-1 mt-2 max-lg:hidden max-md:hidden">
                            <p ref={nameRef} className="m-0 text-xl max-lg:text-lg font-normal">
                                {displayItem.name}
                            </p>
                            <p
                                ref={titleRef}
                                className="m-0 text-[11px] max-lg:text-[10px] font-semibold tracking-[0.12em] uppercase text-[#888]"
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

const data = [
  {
    quote:
      "Design that feels completely effortless, yet performs like it's been engineered with precision. Every interaction flows naturally, every detail feels intentional, and the entire experience just makes sense without the user ever needing to think about it.",
    name: "Aarav Mehta",
    title: "Product Lead, InnovateX",
    image:
      "https://picsum.photos/seed/1/800/600",
  },
  {
    quote:
      "Hyperiux didn't just improve our UI - it transformed the way users interact with our product. It pushed us to rethink our entire approach to design, making every screen more intuitive, more fluid, and far more engaging than we thought possible.",
    name: "Sofia Patel",
    title: "Frontend Developer",
    image:
      "https://picsum.photos/seed/2/800/600",
  },
  {
    quote:
      "Everything feels intentional. Every hover, every transition, every detail - it's crafted, not just built.",
    name: "Rohan Kapoor",
    title: "UX Designer, PixelCraft",
    image:
      "https://picsum.photos/seed/3/800/600",
  },
  {
    quote:
      "We didn't just ship faster - we shipped something we're genuinely proud of. The design quality improved, the development flow became smoother, and for the first time, everything felt aligned between vision and execution.",
    name: "Ananya Sharma",
    title: "Founder, Buildspace Studio",
    image:
      "https://picsum.photos/seed/4/800/600",
  },
  {
    quote:
      "It's rare to find a UI system that's both aesthetic and brutally practical. This one just gets it.",
    name: "Dev Malhotra",
    title: "Full Stack Engineer",
    image:
      "https://picsum.photos/seed/5/800/600",
  },
];

const TestimonialSwiper = ({
  bgColor = "#edeae2",
  autoplay = true,
  autoplayDelay = 4500,
  showNavigation = true,
  imageSize = 1,
}) => {
  return (
    <div className="h-screen bg-white max-md:h-fit">
      <TestimonialComp
        testimonials={data}
        bgColor={bgColor}
        autoplay={autoplay}
        autoplayDelay={autoplayDelay}
        showNavigation={showNavigation}
        imageSize={imageSize}
      />
    </div>
  );
};

export default TestimonialSwiper;
