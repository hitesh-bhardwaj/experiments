// Built using Hyperiux Vault: https://vault.hyperiux.com

"use client";

import { useEffect, useRef, type ReactNode } from "react";
import gsap from "gsap";
import { SplitText } from "gsap/SplitText";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(SplitText, ScrollTrigger);

const REDUCED_MOTION_FADE_DURATION = 0.8;
const REDUCED_MOTION_Y_OFFSET = 24;

interface SlideTextRevealProps {
  children?: ReactNode;
  animateOnScroll?: boolean;
  delay?: number;
  duration?: number;
  speed?: number;
  stagger?: number;
  variant?: "left" | "right";
  className?: string;
}

export default function SlideTextReveal({
  children,
  animateOnScroll = true,
  delay = 0,
  duration = 0.5,
  speed = 20,
  stagger = 0.03,
  variant = "right",
  className = "",
}: SlideTextRevealProps) {
  const containerRef = useRef<any>(null);
  const splitRefs = useRef<any[]>([]);
  const charsRef = useRef<any[]>([]);

  useEffect(() => {
    if (!containerRef.current) return;

    splitRefs.current = [];
    charsRef.current = [];

    const elements = containerRef.current.hasAttribute("data-copy-wrapper")
      ? Array.from(containerRef.current.children)
      : [containerRef.current];

    const prefersReduced =
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let ctx: ReturnType<typeof gsap.context> | undefined;

    const init = async () => {
      await document.fonts.ready;

      ctx = gsap.context(() => {
        elements.forEach((element) => {
          const split = SplitText.create(element, {
            type: "lines,chars",
            charsClass: "char++",
            reduceWhiteSpace: false,
          });

          splitRefs.current.push(split);
          charsRef.current.push(...split.chars);
        });

        if (prefersReduced) {
          gsap.set(charsRef.current, { x: 0, opacity: 1 });
          gsap.set(containerRef.current, { opacity: 0, y: REDUCED_MOTION_Y_OFFSET });

          const fadeUpProps = {
            opacity: 1,
            y: 0,
            duration: REDUCED_MOTION_FADE_DURATION,
            ease: "power2.out",
            delay,
          };

          if (animateOnScroll) {
            gsap.to(containerRef.current, {
              ...fadeUpProps,
              scrollTrigger: {
                trigger: containerRef.current,
                start: "top 80%",
                scrub: true,
              },
            });
          } else {
            gsap.to(containerRef.current, fadeUpProps);
          }

          return;
        }

        gsap.set(containerRef.current, {
          opacity: 1,
        });

        const xFrom = variant === "left" ? -Math.abs(speed) : Math.abs(speed);

        gsap.set(charsRef.current, {
          x: xFrom,
          opacity: 0,
          willChange: "transform",
        });

        const animationProps = {
          x: 0,
          opacity: 1,
          duration,
          stagger,
          ease: "power3.out",
          delay,
        };

        if (animateOnScroll) {
          gsap.to(charsRef.current, {
            ...animationProps,
            scrollTrigger: {
              trigger: containerRef.current,
              start: "top 80%",
              scrub: false,
              // markers: true,
            },
          });
        } else {
          gsap.to(charsRef.current, animationProps);
        }
      }, containerRef);
    };

    init();

    return () => {
      if (ctx) ctx.revert();
      splitRefs.current.forEach((split) => split?.revert());
    };
  }, [animateOnScroll, delay, duration, speed, stagger, variant]);

  return (
    <div
      ref={containerRef}
      data-copy-wrapper="true"
      className={`opacity-0 ${className}`}
    >
      {children}
    </div>
  );
}
