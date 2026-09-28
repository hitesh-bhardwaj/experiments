// Built using Hyperiux Vault: https://vault.hyperiux.com

"use client";

import { useEffect, useRef, useState, useCallback, type ComponentPropsWithoutRef, type ComponentType, type MouseEvent, type MouseEventHandler, type ReactNode } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

const DEFAULT_HREF = "#";
const DEFAULT_TEXT = "Hover me";
const DEFAULT_STAGGER_STEP = 0.006;
const DEFAULT_HOVER_COLOR = "#ff6b00";
const CHAR_TRANSLATE_Y = "1.3em";

export interface CharStaggerPrimaryButtonOwnProps {
  text?: string;
  href?: string;
  className?: string;
  textClassName?: string;
  linkProps?: Partial<ComponentPropsWithoutRef<typeof Link>>;
  children?: ReactNode;
  staggerStep?: number;
  showLine?: boolean;
  lineClassName?: string;
  hoverColor?: string;
  showArrow?: boolean;
  icon?: ComponentType<{ className?: string }>;
  iconVariant?: 'stacked' | 'single';
  iconClassName?: string;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
}

export type CharStaggerPrimaryButtonProps = CharStaggerPrimaryButtonOwnProps & Omit<ComponentPropsWithoutRef<typeof Link>, 'href' | 'onClick' | keyof CharStaggerPrimaryButtonOwnProps>;

export default function CharStaggerPrimaryButton({
  text = DEFAULT_TEXT,
  href = DEFAULT_HREF,
  className = "",
  textClassName = "",
  linkProps = {},
  children,
  staggerStep = DEFAULT_STAGGER_STEP,
  showLine = false,
  lineClassName = "",
  hoverColor = DEFAULT_HOVER_COLOR,
  showArrow = false,
  icon: Icon = ArrowRight,
  iconVariant = "stacked",
  iconClassName = "",
  onClick,
  ...props
}: CharStaggerPrimaryButtonProps) {
  const textRef = useRef<HTMLSpanElement | null>(null);
  const lineRef = useRef<HTMLSpanElement | null>(null);
  const isTouchRef = useRef(false);
  const hasMountedRef = useRef(false);

  const [isActive, setIsActive] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

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

    return () => {
      mediaQuery?.removeEventListener("change", syncReducedMotion);
    };
  }, []);

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }
    const line = lineRef.current;
    if (!line || isActive || prefersReducedMotion) return;
    line.style.transformOrigin = "right center";
    const onEnd = () => {
      line.style.transformOrigin = "left center";
      line.removeEventListener("transitionend", onEnd);
    };
    line.addEventListener("transitionend", onEnd);
  }, [isActive, prefersReducedMotion]);

  useEffect(() => {
    const textElement = textRef.current;
    if (!textElement) return;

    const sourceText = text || textElement.getAttribute("data-text") || "";
    textElement.innerHTML = "";

    [...sourceText].forEach((char, index) => {
      const span = document.createElement("span");
      span.textContent = char;
      span.style.display = "inline-block";
      span.style.position = "relative";
      span.style.textShadow = `0px ${CHAR_TRANSLATE_Y} currentColor`;
      span.style.transform = "translateY(0em) rotate(0.001deg)";
      span.style.transition = prefersReducedMotion
        ? "none"
        : "transform 0.6s cubic-bezier(0.625, 0.05, 0, 1)";
      span.style.willChange = "transform";
      span.style.transitionDelay = prefersReducedMotion ? "0s" : `${index * staggerStep}s`;
      if (char === " ") span.style.whiteSpace = "pre";
      textElement.appendChild(span);
    });
  }, [text, staggerStep, prefersReducedMotion]);

  useEffect(() => {
    const textElement = textRef.current;
    if (!textElement) return;
    Array.from(textElement.children).forEach((span) => {
      const spanEl = span as HTMLElement;
      spanEl.style.transform = isActive && !prefersReducedMotion
        ? `translateY(-${CHAR_TRANSLATE_Y}) rotate(0.001deg)`
        : "translateY(0em) rotate(0.001deg)";
    });
  }, [isActive, prefersReducedMotion]);

  const onMouseEnter = useCallback(() => {
    if (isTouchRef.current) return;
    setIsActive(true);
  }, []);

  const onMouseLeave = useCallback(() => {
    if (isTouchRef.current) return;
    setIsActive(false);
  }, []);

  const onTouchStart = useCallback(() => {
    isTouchRef.current = true;
    setIsActive((prev) => !prev);
  }, []);

  const onMouseDown = useCallback((e: MouseEvent<HTMLAnchorElement>) => {
    if (isTouchRef.current) e.preventDefault();
  }, []);

  const sourceText = typeof children === "string" ? children : text;
  const mergedStyle = {
    ...props.style,
    color: isActive ? hoverColor : props.style?.color,
  };

  return (
    <Link
      href={href}
      {...linkProps}
      {...props}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onTouchStart={onTouchStart}
      onMouseDown={onMouseDown}
      style={mergedStyle}
      className={`inline-flex items-center cursor-pointer gap-2 no-underline transition-colors duration-500 ease-[cubic-bezier(0.625,0.05,0,1)] motion-reduce:transition-none max-[1025px]:motion-reduce:transition-none max-md:motion-reduce:transition-none ${className}`.trim()}
    >
      <div className="mt-[0.3vw]">
        <span className={["inline-block relative", showLine && "w-fit", lineClassName].filter(Boolean).join(" ")}>
          <span ref={textRef} data-text={sourceText} className={`overflow-hidden relative inline-block leading-[1.2] max-[1025px]:text-[3vw]  ${textClassName}`.trim()}>
            {sourceText}
          </span>

          {showLine && (
            <span
              ref={lineRef}
              aria-hidden="true"
              className="absolute left-0 bottom-[15%] w-full bg-current"
              style={{
                height: "1.5px",
                transform: `scaleX(${isActive && !prefersReducedMotion ? 1 : 0})`,
                transformOrigin: "left center",
                transition: prefersReducedMotion
                  ? "none"
                  : "transform 0.5s cubic-bezier(0.625, 0.05, 0, 1)",
              }}
            />
          )}
        </span>
      </div>

      {showArrow && Icon && (
        <div className={`flex size-[1.18em] items-center justify-start overflow-hidden ${iconClassName}`.trim()}>
          {iconVariant === "single" ? (
            <Icon className="size-[1.18em] shrink-0 motion-reduce:transition-none max-[1025px]:motion-reduce:transition-none max-md:motion-reduce:transition-none" />
          ) : (
            <div
              className="flex h-full w-max"
              style={{
                transform:
                  isActive && !prefersReducedMotion
                    ? "translateX(5%)"
                    : "translateX(-100%)",
                transition: prefersReducedMotion
                  ? "none"
                  : "transform 0.5s cubic-bezier(0.625, 0.05, 0, 1)",
                willChange: "transform",
              }}
            >
              <Icon className="h-full w-full flex-none" />
              <Icon className="h-full w-full flex-none" />
            </div>
          )}
        </div>
      )}
    </Link>
  );
}
