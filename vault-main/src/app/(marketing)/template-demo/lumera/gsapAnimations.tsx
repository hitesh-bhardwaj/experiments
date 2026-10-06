// Built using Hyperiux Vault: https://vault.hyperiux.com

"use client";

import { useRef, type ComponentPropsWithoutRef, type ElementType, type ReactNode } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { prefersReducedMotion } from "./reducedMotion";

gsap.registerPlugin(useGSAP, ScrollTrigger);

type FadeUpProps<T extends ElementType> = {
  as?: T;
  children?: ReactNode;
  className?: string;
  delay?: number;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "children" | "className">;


export function FadeUp<T extends ElementType = "div">({
  as,
  children,
  className = "",
  delay = 0,
  ...props
}: FadeUpProps<T>) {

  const Tag = (as ?? "div") as any;
  const ref = useRef<any>(null);

  useGSAP(() => {
    const el = ref.current;
    if (!el) return;

    gsap.set(el, { opacity: 0, y: 24 });

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        gsap.to(el, { opacity: 1, y: 0, duration: 0.8, delay, ease: "power2.out" });
        observer.disconnect();
      },
      { rootMargin: "0px 0px -15% 0px" }
    );
    observer.observe(el);

    return () => observer.disconnect();
  }, []);

  return (
    <Tag ref={ref} className={className} {...props}>
      {children}
    </Tag>
  );
}


export function lineDraw() {
  /* eslint-disable-next-line react-hooks/rules-of-hooks */
  useGSAP(() => {
    const elements = document.querySelectorAll("[data-line-draw]");
    const reducedMotion = prefersReducedMotion();

    elements.forEach((element) => {
      if (reducedMotion) {
        gsap.from(element, {
          scrollTrigger: {
            trigger: element,
            start: "top 65%",
            // markers:true,
          },
          opacity: 0,
          duration: 0.8,
          ease: "power2.out",
   
        });
        return;
      }

      gsap.from(element, {
        scrollTrigger: {
          trigger: element,
          start: "top 75%",
          // markers:true,
        },
        scaleX: 0,
        transformOrigin: "left",
        duration: 0.8,
        ease: "power2.out",
      });
    });


    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        ScrollTrigger.refresh();
      });
    });
  });
}
