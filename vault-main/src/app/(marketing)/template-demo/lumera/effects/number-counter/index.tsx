// Built using Hyperiux Vault: https://vault.hyperiux.com

"use client";

import { memo, useEffect, useRef, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { usePrefersReducedMotion } from "../../reducedMotion";

gsap.registerPlugin(ScrollTrigger);

const DIGITS = [...Array(10).keys()];

interface DigitScrollerProps {
  digit: string;
  index: number;
  duration?: number;
  stagger?: number;
  triggerRef: React.RefObject<HTMLSpanElement | null>;
  reducedMotion?: boolean;
  className?: string;
}

const DigitScroller = memo(
  ({
    digit,
    index,
    duration = 1.5,
    stagger = 0.1,
    triggerRef,
    reducedMotion = false,
    className = "",
  }: DigitScrollerProps) => {
    const digitRef = useRef<HTMLSpanElement | null>(null);

    useEffect(() => {
      if (reducedMotion || window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) return;
      if (!digitRef.current || !triggerRef.current) return;

      const digitIndex = parseInt(digit, 10);
      if (Number.isNaN(digitIndex)) return;

      const ctx = gsap.context(() => {
        gsap.fromTo(
          digitRef.current,
          { yPercent: 0 },
          {
            yPercent: -(digitIndex * 100),
            duration,
            ease: "power2.out",
            delay: index * stagger,
            scrollTrigger: {
              trigger: triggerRef.current,
              start: "top 80%",
              toggleActions: "play none none none",
              once: true,
            },
          }
        );
      }, triggerRef);

      return () => ctx.revert();
    }, [digit, duration, index, reducedMotion, stagger, triggerRef]);

    if (reducedMotion) {
      return (
        <span className={`inline-flex h-[1em] w-[0.64em] items-center justify-center leading-none ${className}`}>
          {digit}
        </span>
      );
    }

    return (
      <span className={`relative inline-flex h-[1em] w-[0.64em] overflow-hidden align-baseline leading-none ${className}`}>
        <span ref={digitRef} className="flex flex-col will-change-transform">
          {DIGITS.map((num) => (
            <span key={num} className="flex h-[1em] items-center justify-center leading-none">
              {num}
            </span>
          ))}
        </span>
      </span>
    );
  }
);

DigitScroller.displayName = "DigitScroller";

interface NumberCounterProps {
  value: string;
  className?: string;
  duration?: number;
  stagger?: number;
  children?: ReactNode;
}

const NumberCounter = ({
  value,
  className = "",
  duration = 1.5,
  stagger = 0.08,
  children,
}: NumberCounterProps) => {
  const reducedMotion = usePrefersReducedMotion();
  const containerRef = useRef<HTMLSpanElement | null>(null);

  return (
    <span ref={containerRef} className={`inline-flex items-end ${className}`}>
      {value.split("").map((char, index) =>
        /\d/.test(char) ? (
          <DigitScroller
            key={`${char}-${index}`}
            digit={char}
            index={index}
            duration={duration}
            stagger={stagger}
            triggerRef={containerRef}
            reducedMotion={reducedMotion}
          />
        ) : (
          <span key={`${char}-${index}`} className="leading-none">
            {char}
          </span>
        )
      )}
      {children}
    </span>
  );
};

export default NumberCounter;
