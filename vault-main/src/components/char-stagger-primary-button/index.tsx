"use client";

import { useEffect, useRef, useState, type ComponentPropsWithoutRef, type ComponentType, type CSSProperties, type MouseEvent, type MouseEventHandler, type ReactNode } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export interface CharStaggerPrimaryButtonOwnProps {
    text?: string;
    href?: string;
    btnClassName?: string;
    textClassName?: string;
    linkProps?: Partial<ComponentPropsWithoutRef<typeof Link>>;
    children?: ReactNode;
    staggerStep?: number;
    lineClassName?: string;
    hoverColor?: string;
    showArrow?: boolean;
    icon?: ComponentType<{ className?: string }>;
    iconClassName?: string;
    bgClassName?: string;
    onClick?: MouseEventHandler<HTMLAnchorElement>;
}

export type CharStaggerPrimaryButtonProps = CharStaggerPrimaryButtonOwnProps & Omit<ComponentPropsWithoutRef<typeof Link>, 'href' | 'onClick' | keyof CharStaggerPrimaryButtonOwnProps>;

const CharStaggerPrimaryButton = ({
 text ="Hover me",
 href ="#",
 btnClassName ="",
 textClassName ="",
 linkProps = {},
 children,
 staggerStep = 0.01,
 lineClassName ="",
 hoverColor ="",
 showArrow = false,
 icon: Icon = ArrowRight,
 iconClassName ="",
 bgClassName = "",
 onClick,
 ...props
}: CharStaggerPrimaryButtonProps) => {
 const linkRef = useRef<HTMLAnchorElement | null>(null);
 const [isTouchHovered, setIsTouchHovered] = useState(false);
 const [supportsTouchHover, setSupportsTouchHover] = useState(false);
 const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
 const sourceText = typeof children ==="string" ? children : text;

 useEffect(() => {
 if (typeof window ==="undefined") return undefined;

 const mediaQuery = window.matchMedia("(hover: none), (pointer: coarse)");
 const updateTouchSupport = () => {
 setSupportsTouchHover(mediaQuery.matches);
 };

 updateTouchSupport();
 mediaQuery.addEventListener("change", updateTouchSupport);

 return () => {
 mediaQuery.removeEventListener("change", updateTouchSupport);
 };
 }, []);

 useEffect(() => {
 if (typeof window ==="undefined") return undefined;

 const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
 const updateReducedMotion = () => {
 setPrefersReducedMotion(mediaQuery.matches);
 };

 updateReducedMotion();
 mediaQuery.addEventListener("change", updateReducedMotion);

 return () => {
 mediaQuery.removeEventListener("change", updateReducedMotion);
 };
 }, []);

 useEffect(() => {
 if (!isTouchHovered) return undefined;

 const handlePointerDown = (event: PointerEvent) => {
 if (linkRef.current?.contains(event.target as Node | null)) return;
 setIsTouchHovered(false);
 };

 document.addEventListener("pointerdown", handlePointerDown);

 return () => {
 document.removeEventListener("pointerdown", handlePointerDown);
 };
 }, [isTouchHovered]);

 const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
 if (supportsTouchHover && !isTouchHovered) {
 event.preventDefault();
 setIsTouchHovered(true);
 return;
 }

 onClick?.(event);
 };

 const hoverStateClass =
 !prefersReducedMotion && isTouchHovered ?"text-[var(--char-hover-color)]" :"";
 const bgHoverClass = !prefersReducedMotion && isTouchHovered ?"scale-[0.95]" :"";
 const iconHoverClass =
 !prefersReducedMotion && isTouchHovered ?"translate-x-[5%]" :"";

 return (
 <Link
 ref={linkRef}
 href={href}
 {...linkProps}
 {...props}
 onClick={handleClick}
 className={`group relative inline-flex h-[4.2vw] items-center justify-center gap-2 px-10 py-3 text-inherit no-underline transition-colors duration-500 ease-[cubic-bezier(0.625,0.05,0,1)] motion-reduce:transition-none motion-safe:hover:text-(--char-hover-color) motion-safe:focus-visible:text-(--char-hover-color) max-[1025px]:h-[9vw] max-[1025px]:text-[3vw] max-[1025px]:font-normal max-[1025px]:motion-reduce:transition-none max-md:h-[15vw] max-md:text-[4.2vw] max-md:motion-reduce:transition-none ${hoverStateClass} ${btnClassName}`}
 style={{"--char-hover-color": hoverColor } as CSSProperties & Record<string, string>}
 >
 <div className="relative z-2">
 <span
 className="relative  flex items-center justify-center"
 >
 <span
 className={`relative inline-block overflow-hidden leading-[1.2] ${textClassName}`}
 >
 {[...sourceText].map((char, index) => (
 <span
 key={`${char}-${index}`}
 className="relative inline-block translate-y-0 rotate-[0.001deg] transition-transform duration-600 ease-[cubic-bezier(0.625,0.05,0,1)] will-change-transform motion-reduce:transition-none motion-safe:group-hover:translate-y-[-1.3em] motion-safe:group-focus-visible:translate-y-[-1.3em]"
 style={{
 transitionDelay: prefersReducedMotion ? "0s" : `${index * staggerStep}s`,
 transform:
 isTouchHovered && !prefersReducedMotion
 ? "translateY(-1.3em) rotate(0.001deg)"
 : undefined,
 textShadow:"0px 1.3em currentColor",
 whiteSpace: char ===" " ?"pre" :"normal",
 }}
 >
 {char}
 </span>
 ))}
 </span>
 </span>
 </div>
 <div className={`absolute h-full w-full duration-500 motion-reduce:transition-none motion-safe:group-hover:scale-[0.95] motion-safe:group-focus-visible:scale-[0.95] ${bgHoverClass} ${bgClassName}`}/>


 {showArrow && Icon && (
 <div className={`flex size-[1em] items-center justify-start overflow-hidden ${iconClassName}`}>
 <div className={`flex h-full w-max -translate-x-full transition-transform duration-500 ease-[cubic-bezier(0.625,0.05,0,1)] will-change-transform motion-reduce:transition-none motion-safe:group-hover:translate-x-[5%] motion-safe:group-focus-visible:translate-x-[5%] ${iconHoverClass}`}>
 <Icon className="h-full w-full flex-none" />
 <Icon className="h-full w-full flex-none" />
 </div>
 </div>
 )}
 </Link>
 );
};

export default CharStaggerPrimaryButton;
