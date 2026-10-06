// Built using Hyperiux Vault: https://vault.hyperiux.com

"use client";

import { useEffect, useRef, useState, type ComponentPropsWithoutRef, type CSSProperties, type PointerEvent } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

const DEFAULT_HREF = "#";
const COMPACT_LAYOUT_BREAKPOINT = 1025;
const ANIMATION_DURATION_MS = 450;

export interface AnimatedFillButtonOwnProps {
  btnText?: string;
  href?: string;
  link?: string;
  className?: string;
  bgColor?: string;
  textColor?: string;
  borderColor?: string;
  fillBgColor?: string;
  fillTextColor?: string;
  hoverFillBgColor?: string;
  hoverFillTextColor?: string;
  arrowColor?: string;
  hoverArrowColor?: string;
  animationDuration?: number;
  fillOnHover?: boolean;
  /** Renders the `border` utility + `--btn-border` var (BlackButton variant). */
  showBorder?: boolean;
  /** vw size of the arrow icon at desktop breakpoint (BlackButton: 1.5, PrimaryButton: 1.3). */
  arrowIconSizeVw?: number;
}

export type AnimatedFillButtonProps = AnimatedFillButtonOwnProps &
  Omit<ComponentPropsWithoutRef<typeof Link>, keyof AnimatedFillButtonOwnProps>;

function AnimatedFillButton({
  btnText = "Hover Me",
  href = DEFAULT_HREF,
  link,
  className = "",
  bgColor = "transparent",
  textColor = "#ffffff",
  borderColor,
  fillBgColor = "#ffffff",
  fillTextColor = "#1c1b1a",
  hoverFillBgColor = "#ffffff",
  hoverFillTextColor = "#1c1b1a",
  arrowColor,
  hoverArrowColor,
  animationDuration = ANIMATION_DURATION_MS / 1000,
  showBorder = false,
  arrowIconSizeVw = 1.5,
  ...props
}: AnimatedFillButtonProps) {
  const resolvedHref = link ?? href;
  const [isReady, setIsReady] = useState(false);
  const [isCompactLayout, setIsCompactLayout] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const releaseTimeoutRef = useRef<number | null>(null);

  const usesUtilityBackground =
    className.includes("bg-") ||
    className.includes("from-") ||
    className.includes("via-") ||
    className.includes("to-");

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setIsReady(true);
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia(
      `(max-width: ${COMPACT_LAYOUT_BREAKPOINT - 1}px)`
    );

    const syncCompactLayout = (event: MediaQueryList | MediaQueryListEvent) => {
      const matches = "matches" in event ? event.matches : (event as MediaQueryListEvent).matches;
      setIsCompactLayout(matches);

      if (!matches) {
        setIsPressed(false);
      }
    };

    syncCompactLayout(mediaQuery);
    mediaQuery.addEventListener("change", syncCompactLayout);

    return () => {
      mediaQuery.removeEventListener("change", syncCompactLayout);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (releaseTimeoutRef.current) {
        window.clearTimeout(releaseTimeoutRef.current);
      }
    };
  }, []);

  const clearPressedState = () => {
    if (releaseTimeoutRef.current) {
      window.clearTimeout(releaseTimeoutRef.current);
    }

    releaseTimeoutRef.current = window.setTimeout(() => {
      setIsPressed(false);
      releaseTimeoutRef.current = null;
    }, animationDuration * 1000);
  };

  const handlePointerDown = (event: PointerEvent<HTMLAnchorElement>) => {
    props.onPointerDown?.(event);

    if (!isCompactLayout || event.pointerType === "mouse") {
      return;
    }

    if (releaseTimeoutRef.current) {
      window.clearTimeout(releaseTimeoutRef.current);
      releaseTimeoutRef.current = null;
    }

    setIsPressed(true);
  };

  const handlePointerUp = (event: PointerEvent<HTMLAnchorElement>) => {
    props.onPointerUp?.(event);

    if (!isCompactLayout || event.pointerType === "mouse") {
      return;
    }

    clearPressedState();
  };

  const handlePointerCancel = (event: PointerEvent<HTMLAnchorElement>) => {
    props.onPointerCancel?.(event);

    if (!isCompactLayout || event.pointerType === "mouse") {
      return;
    }

    clearPressedState();
  };

  return (
    <Link
      href={resolvedHref}
      {...props}
      data-pressed={isPressed ? "true" : "false"}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      className={`group/animated-fill relative inline-flex h-(--button-height) w-fit min-w-fit max-w-none cursor-pointer items-center justify-center overflow-hidden rounded-full ${
        showBorder ? "border border-(--btn-border)" : ""
      } px-[1.5vw] pr-[calc(var(--icon-circle)+var(--icon-right)+2vw)] whitespace-nowrap font-medium text-[1.15vw] leading-none [text-rendering:geometricPrecision] [--button-height:3.65vw] [--icon-circle:2.3vw] [--icon-right:0.55vw] [--circle-inset-y:calc((100%-var(--icon-circle))/2)] max-[1025px]:h-(--button-height) max-[1025px]:px-[5vw] max-[1025px]:pr-[calc(var(--icon-circle)+var(--icon-right)+4vw)] max-[1025px]:text-[3vw] max-[1025px]:font-normal max-[1025px]:[--button-height:11vw] max-[1025px]:[--icon-circle:8vw] max-[1025px]:[--icon-right:1.5vw] max-md:h-(--button-height) max-md:px-[7vw] max-md:pr-[calc(var(--icon-circle)+var(--icon-right)+5vw)] max-md:text-[4.2vw] max-md:[--button-height:15vw] max-md:[--icon-circle:11vw] max-md:[--icon-right:2vw] ${
        usesUtilityBackground ? "" : "bg-(--btn-bg)"
      } text-(--btn-text) ${className}`}
      style={{
        "--btn-bg": bgColor,
        "--btn-text": textColor,
        "--btn-border": borderColor || "transparent",
        "--btn-fill-bg": fillBgColor,
        "--btn-fill-text": fillTextColor,
        "--btn-fill-bg-hover": hoverFillBgColor,
        "--btn-fill-text-hover": hoverFillTextColor,
        "--btn-arrow": arrowColor || fillTextColor,
        "--btn-arrow-hover": hoverArrowColor || hoverFillTextColor,
        "--btn-arrow-size": `${arrowIconSizeVw}vw`,
        "--btn-arrow-size-tablet": "5vw",
        "--btn-arrow-size-mobile": "6.5vw",
        "--btn-duration": `${animationDuration}s`,
        visibility: isReady ? "visible" : "hidden",
      } as CSSProperties & Record<string, string | number>}
    >
      <span className="relative z-1 pb-px">{btnText}</span>

      <div
        aria-hidden="true"
        className={`pointer-events-none absolute z-2 rounded-full bg-(--btn-fill-bg) inset-[var(--circle-inset-y)_var(--icon-right)_var(--circle-inset-y)_calc(100%-var(--icon-right)-var(--icon-circle))] ${
          isReady
            ? "transition-all duration-450 ease-[cubic-bezier(0.785,0.135,0.15,0.86)] motion-reduce:transition-none group-hover/animated-fill:bg-(--btn-fill-bg-hover) group-hover/animated-fill:inset-0 group-data-[pressed=true]/animated-fill:bg-(--btn-fill-bg-hover) group-data-[pressed=true]/animated-fill:inset-0"
            : ""
        }`}
      />

      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 z-2 flex items-center px-[1.5vw] pr-[calc(var(--icon-circle)+var(--icon-right)+2vw)] text-(--btn-fill-text) [clip-path:inset(var(--circle-inset-y)_var(--icon-right)_var(--circle-inset-y)_calc(100%-var(--icon-right)-var(--icon-circle)))] max-[1025px]:px-[5vw] max-[1025px]:pr-[calc(var(--icon-circle)+var(--icon-right)+4vw)] max-md:px-[7vw] max-md:pr-[calc(var(--icon-circle)+var(--icon-right)+5vw)] ${
          isReady
            ? "transition-all duration-450 ease-[cubic-bezier(0.785,0.135,0.15,0.86)] motion-reduce:transition-none group-hover/animated-fill:text-(--btn-fill-text-hover) group-hover/animated-fill:[clip-path:inset(0_0_0_0)] group-data-[pressed=true]/animated-fill:text-(--btn-fill-text-hover) group-data-[pressed=true]/animated-fill:[clip-path:inset(0_0_0_0)]"
            : ""
        }`}
      >
        <span className="relative z-1 pb-px whitespace-nowrap">{btnText}</span>
      </div>

      <span
        className={`pointer-events-none absolute right-(--icon-right) top-1/2 z-3 inline-flex h-(--icon-circle) w-(--icon-circle) shrink-0 -translate-y-1/2 items-center justify-center overflow-hidden rounded-full bg-(--btn-fill-bg) text-(--btn-arrow) ${
          isReady
            ? "transition-colors duration-450 ease-[cubic-bezier(0.785,0.135,0.15,0.86)] motion-reduce:transition-none group-hover/animated-fill:bg-(--btn-fill-bg-hover) group-hover/animated-fill:text-(--btn-arrow-hover) group-data-[pressed=true]/animated-fill:bg-(--btn-fill-bg-hover) group-data-[pressed=true]/animated-fill:text-(--btn-arrow-hover)"
            : ""
        }`}
        style={{
          WebkitMaskImage: "-webkit-radial-gradient(white, black)",
          maskImage: "radial-gradient(white, black)",
        }}
        aria-hidden="true"
      >
        <ArrowRight
          className={`absolute left-1/2 top-1/2 size-(--btn-arrow-size) max-[1025px]:size-(--btn-arrow-size-tablet) max-md:size-(--btn-arrow-size-mobile) translate-x-[-170%] -translate-y-1/2 origin-center scale-0 text-current ${
            isReady
              ? "transition-transform duration-450 ease-[cubic-bezier(0.785,0.135,0.15,0.86)] motion-reduce:transition-none group-hover/animated-fill:-translate-x-1/2 group-hover/animated-fill:-translate-y-1/2 group-hover/animated-fill:scale-100 group-data-[pressed=true]/animated-fill:-translate-x-1/2 group-data-[pressed=true]/animated-fill:-translate-y-1/2 group-data-[pressed=true]/animated-fill:scale-100"
              : ""
          }`}
          strokeWidth={1.8}
        />

        <ArrowRight
          className={`absolute left-1/2 top-1/2 size-(--btn-arrow-size) max-[1025px]:size-(--btn-arrow-size-tablet) max-md:size-(--btn-arrow-size-mobile) -translate-x-1/2 -translate-y-1/2 origin-center text-current ${
            isReady
              ? "transition-transform duration-450 ease-[cubic-bezier(0.785,0.135,0.15,0.86)] motion-reduce:transition-none group-hover/animated-fill:translate-x-[70%] group-hover/animated-fill:-translate-y-1/2 group-hover/animated-fill:scale-0 group-data-[pressed=true]/animated-fill:translate-x-[70%] group-data-[pressed=true]/animated-fill:-translate-y-1/2 group-data-[pressed=true]/animated-fill:scale-0"
              : ""
          }`}
          strokeWidth={1.8}
        />
      </span>
    </Link>
  );
}

export default AnimatedFillButton;
