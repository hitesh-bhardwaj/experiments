// Built using Hyperiux Vault: https://vault.hyperiux.com

"use client";

import { useEffect, useRef, useState, type ComponentPropsWithoutRef, type PointerEvent } from "react";

const MOBILE_BREAKPOINT = 640;
const MOBILE_HOLD_MS = 1000;
const DEFAULT_HREF = "#";
const STAGGER_STEP = 0.01;

export type DotFillBtnProps = {
 btnText?: string;
 href?: string;
 className?: string;
 textClassName?: string;
 staggerStep?: number;
 bgColor?: string;
 textColor?: string;
 fillColor?: string;
 hoverTextColor?: string;
 dotColor?: string;
} & Omit<ComponentPropsWithoutRef<'a'>, 'href'>;

const DotFillBtn = ({
 btnText ="Try demo",
 href = DEFAULT_HREF,
 className ="",
 textClassName ="",
 bgColor ="#ff6b00",
 textColor ="#ffffff",
 hoverTextColor ="#ff6b00",
 dotColor ="#ffffff",
 ...props
}: DotFillBtnProps) => {
 const textRef = useRef<HTMLSpanElement | null>(null);
 const [hovered, setHovered] = useState(false);
 const [isMobile, setIsMobile] = useState(false);
 const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
 const releaseTimeoutRef = useRef<number | null>(null);

 useEffect(() => {
 const el = textRef.current;
 if (!el) return;

 const sourceText = btnText ||"";
 el.innerHTML ="";

 [...sourceText].forEach((char, index) => {
 const span = document.createElement("span");
 span.textContent = char;
 span.style.transitionDelay = prefersReducedMotion ? "0s" : `${index * STAGGER_STEP}s`;

 if (char ===" ") {
 span.style.whiteSpace ="pre";
 }

 el.appendChild(span);
 });
 }, [btnText, prefersReducedMotion]);

	useEffect(() => {
		const el = textRef.current;
		if (!el) return;

		const spans = Array.from(el.children || []);
		spans.forEach((span) => {
			const spanEl = span as HTMLElement;
			spanEl.style.display = "inline-block";
			spanEl.style.position = "relative";
			spanEl.style.textShadow = "0px 1.3em currentColor";
			spanEl.style.transform = "translateY(0em) rotate(0.001deg)";
			spanEl.style.transition = prefersReducedMotion
				? "none"
				: "transform 0.6s cubic-bezier(0.625, 0.05, 0, 1), color 0.6s cubic-bezier(0.625, 0.05, 0, 1)";
			spanEl.style.willChange = "transform";
		});
	}, [btnText, prefersReducedMotion]);

	useEffect(() => {
		const mediaQuery = window.matchMedia?.("(prefers-reduced-motion: reduce)");

		const syncReducedMotion = (event: MediaQueryList | MediaQueryListEvent) => {
			const matches = "matches" in event ? event.matches : ((event as any).currentTarget as MediaQueryList).matches;
			setPrefersReducedMotion(matches);
		};

		if (mediaQuery) {
			syncReducedMotion(mediaQuery);
			mediaQuery.addEventListener("change", syncReducedMotion);
		}

		return () => mediaQuery?.removeEventListener("change", syncReducedMotion);
	}, []);

	useEffect(() => {
		const mediaQuery = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);

		const syncIsMobile = (event: MediaQueryList | MediaQueryListEvent) => {
			const matches = "matches" in event ? event.matches : ((event as any).currentTarget as MediaQueryList).matches;
			setIsMobile(matches);
		};

		syncIsMobile(mediaQuery);
		mediaQuery.addEventListener("change", syncIsMobile);

		return () => mediaQuery.removeEventListener("change", syncIsMobile);
	}, []);

	useEffect(() => {
		return () => {
			if (releaseTimeoutRef.current) {
				window.clearTimeout(releaseTimeoutRef.current);
			}
		};
	}, []);

	const handleMouseEnter = () => {
		if (isMobile) return;
		const el = textRef.current;
		if (el) {
			Array.from(el.children).forEach((span) => {
				const spanEl = span as HTMLElement;
				spanEl.style.transform = "translateY(-1.3em) rotate(0.001deg)";
			});
		}
		setHovered(true);
	};

	const handleMouseLeave = () => {
		if (isMobile) return;
		const el = textRef.current;
		if (el) {
			Array.from(el.children).forEach((span) => {
				const spanEl = span as HTMLElement;
				spanEl.style.transform = "translateY(0em) rotate(0.001deg)";
			});
		}
		setHovered(false);
	};

	const handlePointerDown = (event: PointerEvent<HTMLAnchorElement>) => {
		props.onPointerDown?.(event);

		if (!isMobile || event.pointerType === "mouse") {
			return;
		}

		if (releaseTimeoutRef.current) {
			window.clearTimeout(releaseTimeoutRef.current);
		}

		const el = textRef.current;
		if (el) {
			Array.from(el.children).forEach((span) => {
				const spanEl = span as HTMLElement;
				spanEl.style.transform = "translateY(-1.3em) rotate(0.001deg)";
			});
		}
		setHovered(true);

		releaseTimeoutRef.current = window.setTimeout(() => {
			const currentEl = textRef.current;
			if (currentEl) {
				Array.from(currentEl.children).forEach((span) => {
					const spanEl = span as HTMLElement;
					spanEl.style.transform = "translateY(0em) rotate(0.001deg)";
				});
			}
			setHovered(false);
			releaseTimeoutRef.current = null;
		}, MOBILE_HOLD_MS);
	};

	return (
		<a
			href={href}
			{...props}
			onMouseEnter={handleMouseEnter}
			onMouseLeave={handleMouseLeave}
			onPointerDown={handlePointerDown}
			className={`group relative flex w-fit mx-auto items-center justify-center h-[4.2vw] pl-[3.1vw] pr-[2vw] rounded-full overflow-hidden whitespace-nowrap no-underline font-medium text-[1.5vw] transition-colors duration-500 motion-reduce:transition-none max-[1025px]:h-[9vw] max-[1025px]:pl-[7.6vw] max-[1025px]:pr-[4vw] max-[1025px]:text-[3vw] max-[1025px]:font-normal max-[1025px]:motion-reduce:transition-none max-md:h-[15vw] max-md:pl-[11.8vw] max-md:pr-[6vw] max-md:text-[4.2vw] max-md:motion-reduce:transition-none ${className}`}
			style={{
				background: bgColor,
				color: hovered ? hoverTextColor : textColor,
			}}
		>
			<span
				aria-hidden
				className={`absolute left-[1.7vw] top-[55%] max-[1025px]:top-[57%] w-[0.5vw] h-[0.5vw] rounded-full z-10 transform -translate-y-1/2 transition-transform duration-500 motion-reduce:transition-none max-[1025px]:left-[3.5vw] max-[1025px]:w-[1.5vw] max-[1025px]:h-[1.5vw] max-[1025px]:motion-reduce:transition-none max-md:left-[6vw] max-md:w-[2.3vw] max-md:h-[2.3vw] max-md:motion-reduce:transition-none`}
				style={{
					background: dotColor,
					transform:
						hovered
							? "translateY(-50%) scale(120)"
							: "translateY(-50%) scale(1)",
					transitionTimingFunction: "cubic-bezier(0.785, 0.135, 0.15, 0.86)",
				}}
			/>

			<span className="relative z-20 flex h-full items-center">
				<span
					ref={textRef}
					className={`relative flex items-center overflow-hidden leading-[1.2] ${textClassName}`}
					aria-hidden={false}
				>
					{btnText}
				</span>
			</span>
		</a>
	);
};

export default DotFillBtn;
