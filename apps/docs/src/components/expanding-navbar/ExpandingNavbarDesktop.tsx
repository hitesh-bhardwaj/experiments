"use client";
import React, { useEffect, useRef, useState, type RefObject } from "react";
import gsap from "gsap";
import { CustomEase } from "gsap/CustomEase";
import { HoverFillLink } from "./HoverFillLink";
import { navigationData, type ExpandingNavSublink, type ExpandingNavNestedLink } from "./data";
import Link from "next/link";
import { useFocusTrap } from "./useFocusTrap";

gsap.registerPlugin(CustomEase);

const prefersReducedMotion = () =>
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true;

function animateColumnIn(colRef: RefObject<HTMLElement | null>, duration: number, ease: string) {
    if (!colRef.current) return;
    const items = Array.from(colRef.current.children).slice(1);
    gsap.killTweensOf(items);
    gsap.fromTo(
        items,
        { opacity: 0, y: -14 },
        { opacity: 1, y: 0, duration: 0.6 * duration, stagger: 0.05 * duration, ease }
    );
}

interface ExpandingNavbarDesktopProps {
    activeColor?: string;
    duration?: number;
    ease?: string;
    expandedWidth?: number;
}

export function ExpandingNavbarDesktop({
    activeColor = "#ff5f00",
    duration = 1,
    ease = "cubic-bezier(0.625, 0.05, 0, 1)",
    expandedWidth = 98,
}: ExpandingNavbarDesktopProps) {
    const backgroundOverlayRef = useRef<HTMLDivElement | null>(null);
    const menuWrapperRef = useRef<HTMLDivElement | null>(null);
    const headerRef = useRef<HTMLElement | null>(null);
    const menuContentRef = useRef<HTMLDivElement | null>(null);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState<number | null>(0);
    const [selectedSubIndex, setSelectedSubIndex] = useState<number | null>(null);
    const [selectedNestedIndex, setSelectedNestedIndex] = useState<number | null>(null);
    const [activeMainIndex, setActiveMainIndex] = useState<number | null>(0);
    const [activeSubIndex, setActiveSubIndex] = useState<number | null>(null);
    const [activeNestedIndex, setActiveNestedIndex] = useState<number | null>(null);
    const seprationLineRef = useRef<HTMLSpanElement | null>(null);
    const menuTimeline = useRef<gsap.core.Timeline | null>(null);
    const col2Ref = useRef<HTMLDivElement | null>(null);
    const col3Ref = useRef<HTMLDivElement | null>(null);
    const mainSquareRef = useRef<HTMLDivElement | null>(null);
    const mainItemRefs = useRef<(HTMLDivElement | null)[]>([]);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const toggleButtonRef = useRef<HTMLButtonElement | null>(null);

    const motionDuration = Math.max(0.05, Number(duration) || 1);
    const menuEasing = ease;
    const expandedMenuWidth = `${Math.min(100, Math.max(55, Number(expandedWidth) || 98))}vw`;

    useEffect(() => {
        const square = mainSquareRef.current;
        const items = mainItemRefs.current.filter(Boolean) as HTMLDivElement[];
        if (!square || !items.length) return;

        if (activeMainIndex === null) {
            if (prefersReducedMotion()) {
                gsap.set(square, { scale: 0, opacity: 0 });
                return;
            }
            gsap.to(square, { scale: 0, opacity: 0, duration: 0.3 * motionDuration, overwrite: "auto", ease: menuEasing });
            gsap.to(items, { x: 0, duration: 0.4 * motionDuration, ease: menuEasing, overwrite: "auto" });
            return;
        }

        if (prefersReducedMotion()) {
            gsap.set(square, { scale: 0, opacity: 0 });
            return;
        }

        gsap.to(square, { scale: 1, opacity: 1, duration: 0.3 * motionDuration, overwrite: "auto", ease: menuEasing });

        const targetItem = items[activeMainIndex];
        if (!targetItem) return;

        const targetY = targetItem.offsetTop + (targetItem.offsetHeight / 2) - (square.offsetHeight / 2);

        gsap.to(square, {
            y: targetY,
            rotation: activeMainIndex * 90,
            duration: 0.4 * motionDuration,
            ease: menuEasing,
            overwrite: "auto"
        });

        const totalTranslateImpact = 2;
        const translateValue = window.innerWidth * 0.015;

        items.forEach((item, index) => {
            const distance = Math.min(Math.abs(index - activeMainIndex) / totalTranslateImpact, 1);
            gsap.to(item, {
                x: translateValue * (1 - distance),
                duration: 0.4 * motionDuration,
                ease: menuEasing,
                overwrite: "auto"
            });
        });
    }, [activeMainIndex, menuEasing, motionDuration]);

    useEffect(() => {
        if (!col2Ref.current) return;
        const children = Array.from(col2Ref.current.children) as HTMLElement[];
        if (children.length < 2) return;
        const square = children[0];
        const items = children.slice(1);

        if (activeSubIndex === null) {
            if (prefersReducedMotion()) {
                gsap.set(square, { scale: 0, opacity: 0 });
                return;
            }
            gsap.to(square, { scale: 0, opacity: 0, duration: 0.3 * motionDuration, overwrite: "auto", ease: menuEasing });
            gsap.to(items, { x: 0, duration: 0.4 * motionDuration, ease: menuEasing, overwrite: "auto" });
            return;
        }

        if (prefersReducedMotion()) {
            gsap.set(square, { scale: 0, opacity: 0 });
            return;
        }

        gsap.to(square, { scale: 1, opacity: 1, duration: 0.3 * motionDuration, overwrite: "auto", ease: menuEasing });

        const targetItem = items[activeSubIndex];
        if (!targetItem) return;

        const targetY = targetItem.offsetTop + (targetItem.offsetHeight / 2) - (square.offsetHeight / 2);

        gsap.to(square, {
            y: targetY,
            rotation: activeSubIndex * 90,
            duration: 0.4 * motionDuration,
            ease: menuEasing,
            overwrite: "auto"
        });

        const totalTranslateImpact = 2;
        const translateValue = window.innerWidth * 0.01;

        items.forEach((item, index) => {
            const distance = Math.min(Math.abs(index - activeSubIndex) / totalTranslateImpact, 1);
            gsap.to(item, {
                x: translateValue * (1 - distance),
                duration: 0.4 * motionDuration,
                ease: menuEasing,
                overwrite: "auto"
            });
        });
    }, [activeSubIndex, activeMainIndex, menuEasing, motionDuration]);

    useEffect(() => {
        if (!col3Ref.current) return;
        const children = Array.from(col3Ref.current.children) as HTMLElement[];
        if (children.length < 2) return;
        const square = children[0];
        const items = children.slice(1);

        if (activeNestedIndex === null) {
            if (prefersReducedMotion()) {
                gsap.set(square, { scale: 0, opacity: 0 });
                return;
            }
            gsap.to(square, { scale: 0, opacity: 0, duration: 0.3 * motionDuration, overwrite: "auto", ease: menuEasing });
            gsap.to(items, { x: 0, duration: 0.4 * motionDuration, ease: menuEasing, overwrite: "auto" });
            return;
        }

        if (prefersReducedMotion()) {
            gsap.set(square, { scale: 0, opacity: 0 });
            return;
        }

        gsap.to(square, { scale: 1, opacity: 1, duration: 0.3 * motionDuration, overwrite: "auto", ease: menuEasing });

        const targetItem = items[activeNestedIndex];
        if (!targetItem) return;

        const targetY = targetItem.offsetTop + (targetItem.offsetHeight / 2) - (square.offsetHeight / 2);

        gsap.to(square, {
            y: targetY,
            rotation: activeNestedIndex * 90,
            duration: 0.4 * motionDuration,
            ease: menuEasing,
            overwrite: "auto"
        });

        const totalTranslateImpact = 2;
        const translateValue = window.innerWidth * 0.01;

        items.forEach((item, index) => {
            const distance = Math.min(Math.abs(index - activeNestedIndex) / totalTranslateImpact, 1);
            gsap.to(item, {
                x: translateValue * (1 - distance),
                duration: 0.4 * motionDuration,
                ease: menuEasing,
                overwrite: "auto"
            });
        });
    }, [activeNestedIndex, activeSubIndex, menuEasing, motionDuration]);

    useEffect(() => {
        if (activeMainIndex !== null) animateColumnIn(col2Ref, motionDuration, menuEasing);
    }, [activeMainIndex, menuEasing, motionDuration]);

    useEffect(() => {
        if (activeSubIndex !== null) animateColumnIn(col3Ref, motionDuration, menuEasing);
    }, [activeMainIndex, activeSubIndex, menuEasing, motionDuration]);

    useEffect(() => {
        CustomEase.create("menuEase", "0.625,0.05,0,1");
        const tl = gsap.timeline({ paused: true });

        const menuDuration = prefersReducedMotion() ? 0.5 : motionDuration;
        const lineDuration = prefersReducedMotion() ? 0.25 : 0.5 * motionDuration;

        gsap.set(backgroundOverlayRef.current, { opacity: 0 });
        gsap.set(menuWrapperRef.current, { width: "55vw" });
        gsap.set(menuContentRef.current, {
            clipPath: "inset(100% 0% 0% 0%)",
            WebkitClipPath: "inset(100% 0% 0% 0%)",
            pointerEvents: "none",
            opacity:1,
        });
        gsap.set(seprationLineRef.current, { opacity: 0 });

        tl.to(
            backgroundOverlayRef.current,
            {
                opacity: 1,
                duration: menuDuration,
                ease: "menuEase",
                pointerEvents: "auto",
            },
            0,
        );

        tl.to(
            menuWrapperRef.current,
            {
                width: expandedMenuWidth,
                duration: menuDuration,
                ease: "menuEase",
            },
            0.1,
        );

        tl.to(menuContentRef.current, {
            clipPath: "inset(0% 0% 0% 0%)",
            WebkitClipPath: "inset(0% 0% 0% 0%)",
            duration: menuDuration,
            ease: "menuEase",
        },"<+.35");

        tl.to(
            seprationLineRef.current,
            {
                opacity: 1,
                duration: lineDuration,
                ease: "menuEase",
            },
            "<",
        );

        tl.eventCallback("onStart", () => {
            if (menuContentRef.current) menuContentRef.current.style.pointerEvents = "auto";
        });
        tl.eventCallback("onReverseComplete", () => {
            if (menuContentRef.current) menuContentRef.current.style.pointerEvents = "none";
            gsap.set(backgroundOverlayRef.current, { pointerEvents: "none" });
        });

        menuTimeline.current = tl;
    }, [expandedMenuWidth, menuEasing, motionDuration]);

    const toggleMenu = () => {
        if (!menuTimeline.current) return;
        if (menuTimeline.current.reversed() || !isMenuOpen) {
            menuTimeline.current.play();
            setIsMenuOpen(true);
        } else {
            menuTimeline.current.reverse();
            setIsMenuOpen(false);
        }
    };

    const closeMenu = () => {
        if (!menuTimeline.current || !isMenuOpen) return;
        menuTimeline.current.reverse();
        setIsMenuOpen(false);
    };

    // Trap focus across the toggle + panel while open, restore it on close.
    useFocusTrap({
        active: isMenuOpen,
        containerRef,
        initialFocusRef: toggleButtonRef,
        onEscape: closeMenu,
    });

    return (
        <div ref={containerRef} className="max-[1025px]:hidden">
            <div
                onClick={closeMenu}
                ref={backgroundOverlayRef}
                className="fixed h-screen w-screen z-800 opacity-0 bg-black/50 top-0 left-0 pointer-events-none"
            />
            <div
                ref={menuWrapperRef}
                className="fixed z-999 px-[2vw] py-[1vw] text-white bg-[#111111] bottom-[1vw] left-1/2 -translate-x-1/2 w-[55vw] h-fit rounded-md"
            >
                {/* FLOATING CONTENT PANEL */}
                <div
                    ref={menuContentRef}
                    className="absolute pb-[3vw] opacity-0 p-[1vw] bottom-[2vw] mb-[0.5vw] left-0 w-full h-[75vh] bg-[#111111] flex items-center justify-center gap-[1vw] rounded-md origin-bottom overflow-hidden"
                >
                    <div
                        className="bg-[#1A1A1A] flex items-start p-[2vw] rounded-md overflow-hidden h-full gap-[2vw] w-[70vw]"
                        onMouseLeave={() => {
                            setActiveMainIndex(selectedIndex);
                            setActiveSubIndex(selectedSubIndex);
                            setActiveNestedIndex(selectedNestedIndex);
                        }}
                    >
                        {/* COLUMN 1: MAIN LINKS */}
                        <div className="w-full h-full flex flex-col relative">
                            <div
                                ref={mainSquareRef}
                                className="absolute top-0 left-[-1vw] w-[0.8vw] h-[0.8vw] scale-0 opacity-0 pointer-events-none z-10"
                                style={{ backgroundColor: activeColor }}
                            />
                            {navigationData.map((item, index) => (
                                <div
                                    key={index}
                                    ref={(el) => {
                                        mainItemRefs.current[index] = el;
                                    }}
                                >
                                    <HoverFillLink
                                        href={item.href}
                                        onClick={() => {
                                            setSelectedIndex(index);
                                            setSelectedSubIndex(null);
                                            setSelectedNestedIndex(null);
                                        }}
                                        onMouseEnter={() => {
                                            setActiveMainIndex(index);
                                            setActiveSubIndex(null);
                                        }}
                                        isActive={activeMainIndex === index}
                                        activeColor={activeColor}
                                        className={`text-[3.5vw] text-left transition-colors duration-300 `}
                                    >
                                        {item.name}
                                    </HoverFillLink>
                                </div>
                            ))}
                        </div>

                        {/* COLUMN 2: SUBLINKS */}
                        <div className="w-full h-full relative">
                            {activeMainIndex !== null && navigationData[activeMainIndex].sublinks && (
                                <div ref={col2Ref} className="p-[2vw] h-fit rounded-md flex flex-col relative">
                                    <div className="absolute top-0 left-[1vw] w-[0.6vw] h-[0.6vw] scale-0 opacity-0 pointer-events-none z-10" style={{ backgroundColor: activeColor }} />
                                    {navigationData[activeMainIndex].sublinks!.map((subItem, subIndex) => (
                                        <div key={subIndex} className="opacity-0">
                                            <HoverFillLink
                                                href={subItem.href}
                                                onClick={() => {
                                                    setSelectedIndex(activeMainIndex);
                                                    setSelectedSubIndex(subIndex);
                                                    setSelectedNestedIndex(null);
                                                }}
                                                onMouseEnter={() => setActiveSubIndex(subIndex)}
                                                isActive={
                                                    activeSubIndex === subIndex ||
                                                    (activeSubIndex === null && activeMainIndex === selectedIndex && selectedSubIndex === subIndex)
                                                }
                                                activeColor={activeColor}
                                                className={`text-[2vw] text-left`}
                                            >
                                                {subItem.name}
                                            </HoverFillLink>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* COLUMN 3: NESTED LINKS */}
                        <div className="w-full h-full relative">
                            {activeMainIndex !== null &&
                                activeSubIndex !== null &&
                                (navigationData[activeMainIndex].sublinks as ExpandingNavSublink[])[activeSubIndex]?.nestedLinks && (
                                    <div ref={col3Ref} className="p-[2vw] w-full h-fit rounded-md flex flex-col relative">
                                        <div className="absolute top-0 left-[1vw] w-[0.6vw] h-[0.6vw] scale-0 opacity-0 pointer-events-none z-10" style={{ backgroundColor: activeColor }} />
                                        {((navigationData[activeMainIndex].sublinks as ExpandingNavSublink[])[activeSubIndex].nestedLinks as ExpandingNavNestedLink[]).map((nestedItem, nestedIndex) => (
                                            <div key={nestedIndex} className="opacity-0">
                                                <HoverFillLink
                                                    href={nestedItem.href}
                                                    onClick={() => {
                                                        setSelectedIndex(activeMainIndex);
                                                        setSelectedSubIndex(activeSubIndex);
                                                        setSelectedNestedIndex(nestedIndex);
                                                    }}
                                                    onMouseEnter={() => setActiveNestedIndex(nestedIndex)}
                                                    isActive={
                                                        activeMainIndex === selectedIndex &&
                                                        activeSubIndex === selectedSubIndex &&
                                                        selectedNestedIndex === nestedIndex
                                                    }
                                                    activeColor={activeColor}
                                                    className="text-[2vw] block"
                                                >
                                                    {nestedItem.name}
                                                </HoverFillLink>
                                            </div>
                                        ))}
                                    </div>
                                )}
                        </div>
                    </div>

                    {/* SHOWREEL CONTAINER */}
                    <div className="h-full flex flex-col justify-between w-[30vw]">
                        <div className="space-y-[.5vw]">
                            <div className="aspect-video h-auto w-full overflow-hidden rounded-md">
                                <video
                                    className="h-full w-full object-contain"
                                    autoPlay
                                    loop
                                    muted
                                    src="/api/media-proxy?url=https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/showreel.mp4"
                                />
                            </div>
                            <p>Show Reel</p>
                        </div>
                        <div className="flex flex-col pb-[.2vw] gap-[.1vw]">
                            <HoverFillLink href="#" className="text-[1vw]" activeColor={activeColor}>
                                LABS
                            </HoverFillLink>
                            <HoverFillLink href="#" className="text-[1vw]" activeColor={activeColor}>
                                VAULT
                            </HoverFillLink>
                        </div>
                    </div>
                </div>

                <header
                    ref={headerRef}
                    className="flex items-center justify-between relative"
                >
                    <span
                        ref={seprationLineRef}
                        className="block w-full h-0.5 absolute top-[-.5vw] left-1/2 -translate-x-1/2 bg-[#1A1A1A] transition-all duration-300 opacity-0"
                    />
                    <Link prefetch={false} href="https://vault.hyperiux.com/" target="_blank" className="flex items-center gap-2">
                        <svg className="w-[8vw] h-auto" viewBox="0 0 351 43" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Hyperiux">
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
                    </Link>

                    <button
                        ref={toggleButtonRef}
                        type="button"
                        onClick={toggleMenu}
                        aria-expanded={isMenuOpen}
                        aria-label={isMenuOpen ? "Close menu" : "Open menu"}
                        className="flex cursor-pointer duration-300 transition-all hover:bg-[#2E2A2A] motion-reduce:bg-transparent motion-reduce:transition-none p-[1vw] rounded-md items-center justify-center bg-transparent border-0"
                    >
                        <div className="w-[1.5vw] h-[1vw] relative flex items-center justify-center">
                            <span className={`absolute block w-full h-px bg-white transition-all duration-300 motion-reduce:transition-none ${isMenuOpen ? "rotate-45" : "translate-y-[-0.3vw]"}`}></span>
                            <span className={`absolute block w-full h-px bg-white transition-all duration-300 motion-reduce:transition-none ${isMenuOpen ? "-rotate-45" : "translate-y-[0.3vw]"}`}></span>
                        </div>
                    </button>
                </header>
            </div>
        </div>
    );
}
