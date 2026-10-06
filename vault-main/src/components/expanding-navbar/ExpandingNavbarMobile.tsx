"use client";
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { Minus, Plus } from "lucide-react";
import { navigationData } from "./data";
import Link from "next/link";
import { useFocusTrap } from "./useFocusTrap";

const prefersReducedMotion = () =>
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true;

interface ExpandToggleProps {
    expanded: boolean;
    size?: number;
    boxClassName?: string;
}

function ExpandToggle({ expanded, size = 22, boxClassName = "size-8 text-white/50" }: ExpandToggleProps) {
    return (
        <span
            className={`relative inline-flex shrink-0 items-center justify-center ${boxClassName}`}
            aria-hidden
        >
            <Plus
                size={size}
                strokeWidth={2}
                className={`absolute transition-all duration-300 ease-[cubic-bezier(0.625,0.05,0,1)] ${
                    expanded ? "scale-50 opacity-0 rotate-90" : "scale-100 opacity-100 rotate-0"
                }`}
            />
            <Minus
                size={size}
                strokeWidth={2}
                className={`absolute transition-all duration-300 ease-[cubic-bezier(0.625,0.05,0,1)] ${
                    expanded ? "scale-100 opacity-100 rotate-0" : "scale-50 opacity-0 -rotate-90"
                }`}
            />
        </span>
    );
}

interface ExpandingNavbarMobileProps {
    activeColor?: string;
    duration?: number;
    ease?: string;
}

export function ExpandingNavbarMobile({
    activeColor = "#ff5f00",
    duration = 1,
    ease = "cubic-bezier(0.625, 0.05, 0, 1)",
}: ExpandingNavbarMobileProps) {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [expandedMain, setExpandedMain] = useState<number | null>(null);
    const [expandedSub, setExpandedSub] = useState<number | null>(null);

    const overlayRef = useRef<HTMLDivElement | null>(null);
    const contentRef = useRef<HTMLDivElement | null>(null);
    const menuTimeline = useRef<gsap.core.Timeline | null>(null);
    const mainItemRefs = useRef<(HTMLDivElement | null)[]>([]);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const toggleButtonRef = useRef<HTMLButtonElement | null>(null);
    const motionDuration = Math.max(0.05, Number(duration) || 1);
    const menuEase = ease;

    useEffect(() => {
        const tl = gsap.timeline({ paused: true });

        const overlayDuration = prefersReducedMotion() ? 0.3 : 0.6 * motionDuration;
        const contentDuration = prefersReducedMotion() ? 0.35 : 0.7 * motionDuration;

        gsap.set(overlayRef.current, { opacity: 0, pointerEvents: "none" });
        gsap.set(contentRef.current, {
            clipPath: "inset(100% 0% 0% 0%)",
            WebkitClipPath: "inset(100% 0% 0% 0%)",
            pointerEvents: "none",
            visibility: "hidden",
            opacity:1,
        });

        tl.to(overlayRef.current, {
            opacity: 1,
            pointerEvents: "auto",
            duration: overlayDuration,
            ease: menuEase,
        }, 0);

        tl.to(contentRef.current, {
            visibility: "visible",
            clipPath: "inset(0% 0% 0% 0%)",
            WebkitClipPath: "inset(0% 0% 0% 0%)",
            pointerEvents: "auto",
            duration: contentDuration,
            ease: menuEase,
        }, 0.1);

        tl.eventCallback("onReverseComplete", () => {
            if (contentRef.current) {
                contentRef.current.style.visibility = "hidden";
                contentRef.current.style.pointerEvents = "none";
            }
            if (overlayRef.current) {
                overlayRef.current.style.pointerEvents = "none";
            }
        });

        menuTimeline.current = tl;
    }, [menuEase, motionDuration]);

    useEffect(() => {
        const items = mainItemRefs.current.filter(Boolean);
        if (!items.length) return;

        if (isMenuOpen) {
            gsap.fromTo(items,
                { opacity: 0, y: 20 },
                { opacity: 1, y: 0, duration: prefersReducedMotion() ? 0.25 : 0.5 * motionDuration, stagger: 0.06 * motionDuration, ease: menuEase, delay: prefersReducedMotion() ? 0.15 : 0.3 * motionDuration }
            );
        }
    }, [isMenuOpen, menuEase, motionDuration]);

    const toggleMenu = () => {
        if (!menuTimeline.current) return;
        if (!isMenuOpen) {
            menuTimeline.current.play();
            setIsMenuOpen(true);
        } else {
            menuTimeline.current.reverse();
            setIsMenuOpen(false);
            setExpandedMain(null);
            setExpandedSub(null);
        }
    };

    const closeMenu = () => {
        if (!menuTimeline.current) return;
        menuTimeline.current.reverse();
        setIsMenuOpen(false);
        setExpandedMain(null);
        setExpandedSub(null);
    };

    // Trap focus across the toggle + panel while open, restore it on close.
    useFocusTrap({
        active: isMenuOpen,
        containerRef,
        initialFocusRef: toggleButtonRef,
        onEscape: closeMenu,
    });

    const toggleMain = (index: number) => {
        if (expandedMain === index) {
            setExpandedMain(null);
            setExpandedSub(null);
        } else {
            setExpandedMain(index);
            setExpandedSub(null);
        }
    };

    const toggleSub = (index: number) => {
        setExpandedSub(expandedSub === index ? null : index);
    };

    return (
        <div ref={containerRef} className="hidden max-[1025px]:block">
            {/* Background Overlay */}
            <div
                ref={overlayRef}
                onClick={closeMenu}
                className="fixed inset-0 z-800 bg-black/60 backdrop-blur-sm opacity-0"
            />

            {/* Bottom Menu Bar */}
            <div className="fixed z-999 bottom-4 left-4 right-4 text-white">
                {/* Content Panel with clip-path */}
                <div
                    ref={contentRef}
                    className="bg-[#111111] opacity-0 rounded-md p-6 mb-4 h-[75vh] flex flex-col overflow-hidden shadow-2xl relative invisible"
                >
                    <div className="flex-1 overflow-y-auto space-y-1 pb-10" style={{ scrollbarWidth: "none" }}>
                        {navigationData.map((item, mainIndex) => (
                            <div
                                key={mainIndex}
                                ref={(el) => { mainItemRefs.current[mainIndex] = el; }}
                                className="border-b border-white/10 pb-4 pt-3 opacity-0"
                            >
                                <div
                                    className="flex items-center justify-between cursor-pointer active:opacity-70 transition-opacity"
                                    onClick={() => item.sublinks ? toggleMain(mainIndex) : null}
                                >
                                    <Link
                                        href={item.href}
                                        className="text-3xl max-md:text-3xl max-[1025px]:text-4xl font-medium tracking-tight text-white"
                                    >
                                        {item.name}
                                    </Link>
                                    {item.sublinks && <ExpandToggle expanded={expandedMain === mainIndex} />}
                                </div>

                                {/* Sublinks - grid 0fr→1fr for smooth height */}
                                {item.sublinks && (
                                    <div
                                        className={`grid transition-[grid-template-rows] motion-reduce:duration-150 ${
                                            expandedMain === mainIndex ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                                        }`}
                                        style={{ transitionDuration: `${0.5 * motionDuration}s`, transitionTimingFunction: menuEase }}
                                    >
                                        <div
                                            className={`min-h-0 overflow-hidden ${
                                                expandedMain === mainIndex ? "pointer-events-auto" : "pointer-events-none"
                                            }`}
                                        >
                                            <div className="pl-4 mt-4 space-y-3">
                                                {item.sublinks.map((sub, subIndex) => (
                                                    <div key={subIndex}>
                                                        <div
                                                            className="flex items-center justify-between cursor-pointer active:opacity-70 transition-opacity"
                                                            onClick={() => sub.nestedLinks ? toggleSub(subIndex) : null}
                                                        >
                                                            <Link
                                                                href={sub.href}
                                                                className="max-md:text-xl text-2xl text-white/80"
                                                            >
                                                                {sub.name}
                                                            </Link>
                                                            {sub.nestedLinks && (
                                                                <ExpandToggle
                                                                    expanded={expandedSub === subIndex}
                                                                    size={18}
                                                                    boxClassName="size-7 text-white/40"
                                                                />
                                                            )}
                                                        </div>

                                                        {sub.nestedLinks && (
                                                            <div
                                                                className={`grid transition-[grid-template-rows] motion-reduce:duration-150 ${
                                                                    expandedSub === subIndex ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                                                                }`}
                                                                style={{ transitionDuration: `${0.5 * motionDuration}s`, transitionTimingFunction: menuEase }}
                                                            >
                                                                <div
                                                                    className={`min-h-0 overflow-hidden ${
                                                                        expandedSub === subIndex ? "pointer-events-auto" : "pointer-events-none"
                                                                    }`}
                                                                >
                                                                    <div className="pl-4 mt-2 space-y-2">
                                                                        {sub.nestedLinks.map((nested, nIndex) => (
                                                                            <div key={nIndex}>
                                                                                <Link
                                                                                    href={nested.href}
                                                                                    className="text-lg text-white/60 block active:text-white transition-colors"
                                                                                >
                                                                                    {nested.name}
                                                                                </Link>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Header Bar */}
                <div className="bg-[#111111] rounded-md px-6 max-[1025px]:py-6 max-md:py-3 flex items-center justify-between shadow-2xl border border-white/5">
                    <svg className="max-md:w-24 w-40 h-auto" viewBox="0 0 351 43" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Hyperiux">
                        <path d="M315.441 6.10352e-05H306.862L320.055 15.9603L324.019 21.0695L306.862 42.139H315.591L332.597 21.0695L328.555 15.9603L315.441 6.10352e-05Z" fill="white"/>
                        <path d="M350.055 6.10352e-05H341.326L332.598 10.6853L336.962 15.9527L350.055 6.10352e-05Z" fill="white"/>
                        <path d="M349.905 42.139L341.176 42.139L332.598 31.7548L336.962 26.3369L349.905 42.139Z" fill="white"/>
                        <path d="M264.874 6.10352e-05H258.252V34.0122L269.088 42.139H289.555L300.391 34.0122V6.10352e-05H293.769V29.9349C293.769 30.4164 293.539 30.8688 293.149 31.152L287.543 35.2293C287.286 35.4164 286.976 35.5172 286.658 35.5172H271.985C271.667 35.5172 271.357 35.4164 271.1 35.2293L265.494 31.152C265.104 30.8688 264.874 30.4164 264.874 29.9349V6.10352e-05Z" fill="white"/>
                        <rect x="244.406" y="6.10352e-05" width="6.62183" height="42.1389" fill="white"/>
                        <path d="M195.043 0.000183105H228.002V6.62202H201.665V42.2896H195.043V0.000183105Z" fill="white"/>
                        <path d="M233.269 24.0796L237.182 18.1404V6.62202V0.000183105H195.043V6.62202H230.56V15.8023L225.594 24.0796H233.269Z" fill="white"/>
                        <path d="M221.078 17.7586H201.664V24.3804H217.466L229.205 42.139H237.163L221.078 17.7586Z" fill="white"/>
                        <path d="M182.401 24.3804V17.7585H162.235L153.205 27.9923H162.084L165.245 24.3804H182.401Z" fill="white"/>
                        <path d="M158.322 0H188.421V6.62183H161.031L152.904 15.9526V35.5171H188.421V42.1389H146.282V12.0397L158.322 0Z" fill="white"/>
                        <rect x="97.5234" y="17.7585" width="6.62183" height="24.3804" fill="white"/>
                        <path d="M139.662 0H97.5234V6.62183H133.041V17.7586H111.15L104.534 24.3804H133.643L139.662 18.0595V0Z" fill="white"/>
                        <path d="M55.3826 10.8357L55.3826 0H48.7607L48.7607 14.8991L66.5754 24.2299L66.5193 42.1389H73.1411V24.2299L90.8997 14.7486V0H84.2779V10.8357L69.8302 18.4786L55.3826 10.8357Z" fill="white"/>
                        <rect width="6.62183" height="42.1389" fill="white"/>
                        <rect x="35.5166" width="6.62183" height="42.1389" fill="white"/>
                        <rect x="6.62305" y="17.7585" width="28.8953" height="6.62183" fill="white"/>
                    </svg>

                    <button
                        ref={toggleButtonRef}
                        type="button"
                        onClick={toggleMenu}
                        aria-expanded={isMenuOpen}
                        aria-label={isMenuOpen ? "Close menu" : "Open menu"}
                        className="flex cursor-pointer items-center justify-center max-md:rounded-md max-sm:rounded-sm max-sm:p-2.5 max-md:p-3 text-white transition-all duration-300"
                        style={{ backgroundColor: isMenuOpen ? activeColor : "#2E2A2A" }}
                    >
                        <div className="relative max-md:h-3 max-md:w-4 max-[1025px]:w-7 max-[1025px]:h-5">
                            <span
                                className={`absolute left-0 block h-px w-full origin-center bg-white transition-all duration-300 ${
                                    isMenuOpen
                                        ? "top-1/2 -translate-y-1/2 rotate-45"
                                        : "top-[calc(50%-3px)]"
                                }`}
                            />
                            <span
                                className={`absolute left-0 block h-px w-full origin-center bg-white transition-all duration-300 ${
                                    isMenuOpen
                                        ? "top-1/2 -translate-y-1/2 -rotate-45"
                                        : "top-[calc(50%+3px)]"
                                }`}
                            />
                        </div>
                    </button>
                </div>
            </div>
        </div>
    );
}
