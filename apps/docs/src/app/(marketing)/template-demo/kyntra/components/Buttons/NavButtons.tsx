// Built using Hyperiux Vault: https://vault.hyperiux.com

"use client";

import {
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
} from "react";

const KYNTRA_PRIMARY = "#134BD6";

export interface NavButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children?: ReactNode;
  className?: string;
  innerClassName?: string;
  /** Fill colour on hover */
  fillColor?: string;
  /** Icon colour at rest */
  restColor?: string;
  ariaLabel?: string;
  style?: CSSProperties;
}

/** Circular nav button, radial hover fill */
export function NavButton({
  type = "button",
  children,
  className = "",
  innerClassName = "",
  fillColor = KYNTRA_PRIMARY,
  restColor = KYNTRA_PRIMARY,
  ariaLabel,
  style,
  disabled = false,
  ...rest
}: NavButtonProps) {
  const spanRef = useRef<HTMLSpanElement | null>(null);
  const [isHovered, setIsHovered] = useState(false);

  const positionFill = (e: MouseEvent<HTMLElement>, scale: number) => {
    // No fill while disabled
    if (disabled) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    if (spanRef.current) {
      spanRef.current.style.left = `${x}px`;
      spanRef.current.style.top = `${y}px`;
      spanRef.current.style.transform = `translate(-50%, -50%) scale(${scale})`;
    }
  };

  // Reset hover before committing a newly disabled button.
  if (disabled && isHovered) {
    setIsHovered(false);
  }

  // Disabled mid-hover never gets mouseleave
  useEffect(() => {
    if (!disabled) return;
    if (spanRef.current) {
      spanRef.current.style.transform = "translate(-50%, -50%) scale(0)";
    }
  }, [disabled]);

  return (
    <button
      type={type}
      aria-label={ariaLabel}
      disabled={disabled}
      aria-disabled={disabled || undefined}
      onMouseEnter={(e) => {
        if (disabled) return;
        setIsHovered(true);
        positionFill(e, 1);
      }}
      onMouseLeave={(e) => {
        setIsHovered(false);
        positionFill(e, 0);
      }}
      className={`group relative inline-flex size-[3.2vw] min-h-11 min-w-11 items-center justify-center overflow-hidden rounded-full border transition-opacity duration-300 select-none max-[1025px]:size-18 max-md:size-12 ${
        disabled
          ? "pointer-events-none cursor-default opacity-40"
          : "cursor-pointer"
      } ${className}`}
      style={{
        borderColor: KYNTRA_PRIMARY,
        // White while disabled; no tint left
        ...(disabled ? { backgroundColor: "#ffffff" } : null),
        ...style,
      }}
      {...rest}
    >
      <span
        ref={spanRef}
        aria-hidden
        className="pointer-events-none absolute aspect-square rounded-full"
        style={{
          width: "350%",
          backgroundColor: fillColor,
          transform: "translate(-50%, -50%) scale(0)",
          transition: "transform 0.8s cubic-bezier(0.25, 1, 0.5, 1)",
        }}
      />
      <span
        className={`relative z-10 flex items-center justify-center transition-colors duration-300 ${innerClassName}`}
        style={{ color: isHovered ? "#ffffff" : restColor }}
      >
        {children}
      </span>
    </button>
  );
}

function PrevArrow() {
  return (
    <svg
      className="size-4"
      width="21"
      height="18"
      viewBox="0 0 21 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M0.000108719 9.05508C0.0665569 9.10795 0.141867 9.15202 0.199457 9.21371C3.08335 12.0778 5.96282 14.942 8.84229 17.8061C8.90431 17.8678 8.95304 17.9427 9.00177 18C9.54223 17.4536 10.0561 16.9337 10.5611 16.4225C8.50562 14.378 6.41468 12.2982 4.32374 10.2228C4.33703 10.2007 4.34589 10.1743 4.35918 10.1523C10.4415 10.1523 14.4645 10.1523 20.5557 10.1523C20.5557 9.38115 20.5557 8.64529 20.5557 7.88739C14.4645 7.88739 10.4459 7.88739 4.33703 7.88739C6.45455 5.78556 8.54548 3.70575 10.6187 1.64357C10.0738 1.09278 9.55552 0.577234 8.97519 0C8.94861 0.04847 8.9176 0.136597 8.85558 0.198286C5.97169 3.07124 3.08335 5.93978 0.199457 8.80832C0.141867 8.86561 0.0665569 8.91408 0.000108719 8.96695C0.000108719 8.99339 0.000108719 9.02423 0.000108719 9.05508Z"
        fill="currentColor"
      />
    </svg>
  );
}

function NextArrow() {
  return (
    <svg
      className="size-4"
      width="21"
      height="18"
      viewBox="0 0 21 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M20.5556 9.05508C20.4891 9.10795 20.4138 9.15202 20.3562 9.21371C17.4723 12.0778 14.5928 14.942 11.7134 17.8061C11.6514 17.8678 11.6026 17.9427 11.5539 18C11.0134 17.4536 10.4996 16.9337 9.99455 16.4225C12.05 14.378 14.141 12.2982 16.2319 10.2228C16.2186 10.2007 16.2098 10.1743 16.1965 10.1523C10.1142 10.1523 6.09118 10.1523 0 10.1523C0 9.38115 0 8.64529 0 7.88739C6.09118 7.88739 10.1097 7.88739 16.2186 7.88739C14.1011 5.78556 12.0102 3.70575 9.93696 1.64357C10.4818 1.09278 11.0001 0.577234 11.5805 0C11.6071 0.04847 11.6381 0.136597 11.7001 0.198286C14.584 3.07124 17.4723 5.93978 20.3562 8.80832C20.4138 8.86561 20.4891 8.91408 20.5556 8.96695C20.5556 8.99339 20.5556 9.02423 20.5556 9.05508Z"
        fill="currentColor"
      />
    </svg>
  );
}

export interface CarouselNavButtonsProps {
  onPrev: () => void;
  onNext: () => void;
  className?: string;
  /** Icon colour at rest */
  restColor?: string;
  fillColor?: string;
  /** Disables the prev button */
  prevDisabled?: boolean;
  /** Disables the next button */
  nextDisabled?: boolean;
}

/** Prev/Next pair for the carousel */
export default function CarouselNavButtons({
  onPrev,
  onNext,
  className = "",
  restColor = KYNTRA_PRIMARY,
  fillColor = KYNTRA_PRIMARY,
  prevDisabled = false,
  nextDisabled = false,
}: CarouselNavButtonsProps) {
  return (
    <div
      className={`flex items-center gap-[0.8vw] max-[1025px]:gap-3 ${className}`}
    >
      <NavButton
        onClick={onPrev}
        ariaLabel="Previous slide"
        restColor={restColor}
        fillColor={fillColor}
        disabled={prevDisabled}
      >
        <PrevArrow />
      </NavButton>
      <NavButton
        onClick={onNext}
        ariaLabel="Next slide"
        restColor={restColor}
        fillColor={fillColor}
        disabled={nextDisabled}
      >
        <NextArrow />
      </NavButton>
    </div>
  );
}
