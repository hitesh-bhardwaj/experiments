/* eslint-disable react-hooks/refs -- React Compiler / legacy-pattern rules: fixing risks changing animation timing (see eslint.config.mjs, issue #16); <img> kept for dynamic user-supplied sources. */
// Built using Hyperiux Vault: https://vault.hyperiux.com
'use client';
import Link from "next/link";
import gsap from "gsap";
import { CustomEase } from "gsap/CustomEase";
import { ArrowUpRight, Minus, Plus } from "lucide-react";
import React, { type AnchorHTMLAttributes, type CSSProperties, type ReactNode, type RefObject, useEffect, useRef, useState } from "react";

// ---- HoverFillLink.tsx ----

interface HoverFillLinkOwnProps {
  href: string;
  children?: ReactNode;
  className?: string;
  isActive?: boolean;
  activeColor?: string;
}

type HoverFillLinkProps = HoverFillLinkOwnProps & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof HoverFillLinkOwnProps>;

export function HoverFillLink({ href, children, className = "", isActive, activeColor = "#ff5f00", style, ...props }: HoverFillLinkProps) {
  const text = typeof children === "string" ? children : "";

  return (
    <>
      <Link
        href={href}
        data-content={text}
        data-active={isActive ? "true" : undefined}
        className={`relative inline-block overflow-hidden text-[rgba(255,255,255,0.92)] no-underline before:absolute before:inset-0 before:content-[attr(data-content)] before:text-[var(--hover-fill-color)] before:[clip-path:polygon(0_0,0_0,0_100%,0_100%)] before:transition-[clip-path] before:duration-300 before:ease-[ease] hover:before:[clip-path:polygon(0_0,100%_0,100%_100%,0_100%)] focus-visible:before:[clip-path:polygon(0_0,100%_0,100%_100%,0_100%)] data-[active=true]:before:[clip-path:polygon(0_0,100%_0,100%_100%,0_100%)] ${className}`}
        style={{ "--hover-fill-color": activeColor, ...style } as CSSProperties}
        {...props}
      >
        {children}
      </Link>

      <style jsx global>{`
        @media (prefers-reduced-motion: reduce) {
          [data-content]::before {
            transition: none;
          }
        }
      `}</style>
    </>
  );
}


// ---- data.ts ----
export interface ExpandingNavNestedLink {
    name: string;
    href: string;
}

export interface ExpandingNavSublink {
    name: string;
    href: string;
    nestedLinks?: ExpandingNavNestedLink[];
}

export interface ExpandingNavItem {
    name: string;
    href: string;
    sublinks?: ExpandingNavSublink[];
}

export const navigationData: ExpandingNavItem[] = [
    {
        name: "About", href: "#",
    },
    { name: "Work", href: "#" },
    {
        name: "Expertise",
        href: "#",
        sublinks: [
            {
                name: "Solutions", href: "#", nestedLinks: [
                    { name: "Design", href: "#" },
                    { name: "Development", href: "#" },
                    { name: "Marketing", href: "#" },
                    { name: "Strategy", href: "#" }
                ]
            },
            {
                name: "Industry", href: "#", nestedLinks: [
                    { name: "Fintech", href: "#" },
                    { name: "HealthCare", href: "#" },
                    { name: "Education", href: "#" },
                    { name: "Electronics", href: "#" }
                ]
            },
            {
                name: "Services",
                href: "#",

            }
        ]
    },
    { name: "Career", href: "#" },
    {
        name: "Resources", href: "#", sublinks: [
            { name: "Codepen", href: "#" },
            { name: "Greensock", href: "#" },
            {
                name: "Webflow",
                href: "#",
            }
        ]
    },
    { name: "Contact", href: "#" },
];


// ---- useFocusTrap.ts ----

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

const isVisible = (element?: HTMLElement | null): boolean => {
  if (!element || element.hidden) {
    return false;
  }

  const style = window.getComputedStyle(element);

  if (style.visibility === "hidden" || style.visibility === "collapse") {
    return false;
  }

  return element.getClientRects().length > 0;
};

const getFocusableElements = (container?: HTMLElement | null): HTMLElement[] => {
  if (!container) {
    return [];
  }

  return (
    Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR)) as HTMLElement[]
  ).filter(isVisible);
};

interface UseFocusTrapParams {
  active: boolean;
  containerRef: RefObject<HTMLElement | null>;
  initialFocusRef?: RefObject<HTMLElement | null>;
  onEscape?: () => void;
}


export function useFocusTrap({
  active,
  containerRef,
  initialFocusRef,
  onEscape,
}: UseFocusTrapParams) {
  const onEscapeRef = useRef(onEscape);
  onEscapeRef.current = onEscape;

  useEffect(() => {
    if (!active) {
      return;
    }

    const container = containerRef.current;

    if (!container) {
      return;
    }

    const previouslyFocused =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    const focusInitial = () => {
      const target =
        initialFocusRef?.current ??
        getFocusableElements(container)[0] ??
        container;

      if (!(target instanceof HTMLElement)) {
        return;
      }

      if (target === container && !container.hasAttribute("tabindex")) {
        container.setAttribute("tabindex", "-1");
      }

      target.focus();
    };

    // Defer focus so it lands after the menu has mounted / started animating in.
    const focusFrame = requestAnimationFrame(focusInitial);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onEscapeRef.current?.();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const focusable = getFocusableElements(container);

      if (!focusable.length) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const activeElement = document.activeElement;

      if (event.shiftKey) {
        if (activeElement === first || !container.contains(activeElement)) {
          event.preventDefault();
          last.focus();
        }

        return;
      }

      if (activeElement === last || !container.contains(activeElement)) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);

    return () => {
      cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", onKeyDown);

      if (previouslyFocused && document.contains(previouslyFocused)) {
        previouslyFocused.focus();
      }
    };
  }, [active, containerRef, initialFocusRef]);
}


// ---- ExpandingNavbarDesktop.tsx ----



gsap.registerPlugin(CustomEase);

const prefersReducedMotion = () =>
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true;

// Read through matchMedia (not only the CSS media query) so the docs
// reduced-motion preview, which overrides matchMedia, is honored too.
function useReduceMotionFlag() {
    const [reduce, setReduce] = useState(false);

    useEffect(() => {
        const mediaQuery = window.matchMedia?.("(prefers-reduced-motion: reduce)");
        if (!mediaQuery) return undefined;
        const update = () => setReduce(mediaQuery.matches === true);
        update();
        mediaQuery.addEventListener?.("change", update);
        return () => mediaQuery.removeEventListener?.("change", update);
    }, []);

    return reduce;
}

function animateColumnIn(colRef: RefObject<HTMLElement | null>, duration: number, ease: string) {
    if (!colRef.current) return;
    const items = Array.from(colRef.current.children).slice(1);
    // Rows are keyed by index, so React reuses these nodes when the column's
    // contents change and they arrive still carrying the previous list's
    // proximity offset. This kill would also cancel the hide branch's own
    // `x: 0` tween, so clear the offset here rather than relying on it.
    gsap.killTweensOf(items);
    gsap.fromTo(
        items,
        { opacity: 0, y: -14, x: 0 },
        { opacity: 1, y: 0, x: 0, duration: 0.6 * duration, stagger: 0.05 * duration, ease }
    );
}

interface ExpandingNavbarDesktopProps {
    activeColor?: string;
    menuBackgroundColor?: string;
    duration?: number;
    ease?: string;
    expandedWidth?: number;
}

export function ExpandingNavbarDesktop({
    activeColor = "#ff5f00",
    menuBackgroundColor = "#111111",
    duration = 1,
    ease = "cubic-bezier(0.625, 0.05, 0, 1)",
    expandedWidth = 98,
}: ExpandingNavbarDesktopProps) {
    const reduceMotionFlag = useReduceMotionFlag();
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
        <div ref={containerRef} className="max-lg:hidden">
            <div
                onClick={closeMenu}
                ref={backgroundOverlayRef}
                className="fixed h-screen w-screen z-800 opacity-0 bg-black/50 top-0 left-0 pointer-events-none"
            />
            <div
                ref={menuWrapperRef}
                className="fixed z-999 px-[2vw] py-[1vw] text-white bottom-[1vw] left-1/2 -translate-x-1/2 w-[55vw] h-fit rounded-md"
                style={{ backgroundColor: menuBackgroundColor }}
            >
                {/* FLOATING CONTENT PANEL */}
                <div
                    ref={menuContentRef}
                    className="absolute pb-[3vw] opacity-0 p-[1vw] bottom-[2vw] mb-[0.5vw] left-0 w-full h-[75vh] flex items-center justify-center gap-[1vw] rounded-md origin-bottom overflow-hidden"
                    style={{ backgroundColor: menuBackgroundColor }}
                >
                    <div
                        className="bg-white/4 flex items-start p-[2vw] rounded-md overflow-hidden h-full gap-[2vw] w-[70vw]"
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
                                            setActiveNestedIndex(null);
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
                                                onMouseEnter={() => {
                                                    setActiveSubIndex(subIndex);
                                                    setActiveNestedIndex(null);
                                                }}
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
                                    src="https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/showreel.mp4"
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
                    <Link href="https://vault.hyperiux.com/" target="_blank" className="flex items-center gap-2">
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
                            <span className={`absolute block w-full h-px bg-white ${reduceMotionFlag ? "transition-none" : "transition-all duration-300"} ${isMenuOpen ? "rotate-45" : "translate-y-[-0.3vw]"}`}></span>
                            <span className={`absolute block w-full h-px bg-white ${reduceMotionFlag ? "transition-none" : "transition-all duration-300"} ${isMenuOpen ? "-rotate-45" : "translate-y-[0.3vw]"}`}></span>
                        </div>
                    </button>
                </header>
            </div>
        </div>
    );
}


// ---- ExpandingNavbarMobile.tsx ----



const prefersReducedMotionMobile = () =>
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
    menuBackgroundColor?: string;
    duration?: number;
    ease?: string;
}

export function ExpandingNavbarMobile({
    activeColor = "#ff5f00",
    menuBackgroundColor = "#111111",
    duration = 1,
    ease = "cubic-bezier(0.625, 0.05, 0, 1)",
}: ExpandingNavbarMobileProps) {
    const reduceMotionFlag = useReduceMotionFlag();
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

        const overlayDuration = prefersReducedMotionMobile() ? 0.3 : 0.6 * motionDuration;
        const contentDuration = prefersReducedMotionMobile() ? 0.35 : 0.7 * motionDuration;

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
                { opacity: 1, y: 0, duration: prefersReducedMotionMobile() ? 0.25 : 0.5 * motionDuration, stagger: 0.06 * motionDuration, ease: menuEase, delay: prefersReducedMotionMobile() ? 0.15 : 0.3 * motionDuration }
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
        <div ref={containerRef} className="hidden max-lg:block">
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
                    className="opacity-0 rounded-md p-6 mb-4 h-[75vh] flex flex-col overflow-hidden shadow-2xl relative invisible"
                    style={{ backgroundColor: menuBackgroundColor }}
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
                                        className="text-3xl max-md:text-3xl max-lg:text-4xl font-medium tracking-tight text-white"
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
                <div className="rounded-md px-6 max-lg:py-6 max-md:py-3 flex items-center justify-between shadow-2xl border border-white/5" style={{ backgroundColor: menuBackgroundColor }}>
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
                        className={`flex cursor-pointer items-center justify-center max-lg:rounded-md max-md:rounded-sm max-md:p-2.5 max-lg:p-3 text-white ${reduceMotionFlag ? "transition-none" : "transition-all duration-300"}`}
                        style={{ backgroundColor: isMenuOpen ? activeColor : "#2E2A2A" }}
                    >
                        <div className="relative max-md:h-3 max-md:w-4 max-lg:w-7 max-lg:h-5">
                            <span
                                className={`absolute left-0 block h-px w-full origin-center bg-white ${reduceMotionFlag ? "transition-none" : "transition-all duration-300"} ${
                                    isMenuOpen
                                        ? "top-1/2 -translate-y-1/2 rotate-45"
                                        : "top-[calc(50%-3px)]"
                                }`}
                            />
                            <span
                                className={`absolute left-0 block h-px w-full origin-center bg-white ${reduceMotionFlag ? "transition-none" : "transition-all duration-300"} ${
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


// ---- index.tsx ----
// Built using Hyperiux Vault: https://vault.hyperiux.com

interface ExpandingNavbarProps {
    backgroundColor?: string;
    activeColor?: string;
    menuBackgroundColor?: string;
    duration?: number;
    expandedWidth?: number;
}

const MENU_EASE = "cubic-bezier(0.625, 0.05, 0, 1)";

export default function ExpandingNavbar({
    backgroundColor = "#ffffff",
    activeColor = "#ff5f00",
    menuBackgroundColor = "#111111",
    duration = 1,
    expandedWidth = 98,
}: ExpandingNavbarProps) {
    return (
        <div className="h-screen w-full relative overflow-hidden" style={{ backgroundColor }}>
            <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center text-[#111111]">
                <h1 className="max-lg:text-[4vw] max-md:text-[5vw] text-[2.5vw] tracking-tight">
                    Watch items spring, orbit and snap into place
                    <br />
                    <span className="text-[1.5vw] max-lg:text-[2.5vw] max-md:text-[3.5vw] opacity-70">
                        [Click the menu to reveal the motion]
                    </span>
                </h1>

                <div className="mt-6 flex items-center gap-3 max-md:flex-col">
                    <Link
                        href="/effects"
                        className="w-fit mx-auto items-center flex gap-2 rounded-full text-white px-6 py-3 text-[1vw] max-lg:text-[2vw] max-md:text-[3vw] font-medium hover:opacity-90 transition-opacity"
                        style={{ backgroundColor: activeColor }}
                    >
                        Explore all Effects
                        <ArrowUpRight className="size-4" />
                    </Link>
                    <Link
                        href="/effects/navigation/expanding-navbar"
                        className="w-fit mx-auto items-center flex gap-2 rounded-full text-white px-6 py-3 text-[1vw] max-lg:text-[2vw] max-md:text-[3vw] font-medium hover:opacity-90 transition-opacity"
                        style={{ backgroundColor: activeColor }}
                    >
                        Read Article
                        <ArrowUpRight className="size-4" />
                    </Link>
                </div>
            </div>

            <ExpandingNavbarDesktop activeColor={activeColor} menuBackgroundColor={menuBackgroundColor} duration={duration} ease={MENU_EASE} expandedWidth={expandedWidth} />
            <ExpandingNavbarMobile activeColor={activeColor} menuBackgroundColor={menuBackgroundColor} duration={duration} ease={MENU_EASE} />
        </div>
    );
}
