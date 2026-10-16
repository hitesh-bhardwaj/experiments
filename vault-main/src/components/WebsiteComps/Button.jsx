"use client";

import { prefetchFor } from "@/lib/prefetch";
import Link from "next/link";
import { useLenis } from "lenis/react";
import { BtnArrow } from "../WebsiteComps/Icons";
import { tv } from "tailwind-variants";

const buttonTv = tv({
  base: "group flex overflow-hidden items-center gap-[calc(var(--hx-vw,1vw)*1)] max-lg:gap-5 max-md:gap-8 px-[calc(var(--hx-vw,1vw)*1.5)] py-[calc(var(--hx-vw,1vw)*.8)]  max-lg:px-6 max-lg:py-4 text-nowrap max-md:px-8 max-md:py-4 relative text-[calc(var(--hx-vw,1vw)*1.15)] font-medium tracking-wide max-md:text-[4vw] max-lg:text-[2.2vw] max-md:font-normal transition-all duration-500 motion-reduce:transition-none",
  variants: {
    variant: {
      orange: "bg-primary text-white ",
      black: "bg-dark-card text-white border border-background",
      white: "bg-white text-black border border-foreground",
      outline: "bg-transparent text-background border border-background",
      outline2: "bg-transparent text-foreground border border-foregound",
    },
  },
  defaultVariants: {
    variant: "orange",
  },
  slots: {
    circle: [
      "duration-500 transition-all rounded-full inline-block motion-reduce:transition-none motion-reduce:scale-100",
      "size-[calc(var(--hx-vw,1vw)*.5)] max-lg:size-2 max-md:size-2",
    ],
    text: [
      "relative z-10 duration-500 transition-all group-hover:-translate-x-[calc(var(--hx-vw,1vw)*1.5)] max-lg:group-hover:-translate-x-1.5 max-md:group-hover:-translate-x-1.5 motion-reduce:translate-x-0 motion-reduce:transition-none",
    ],
    arrow: [
      "size-[calc(var(--hx-vw,1vw)*1.6)] max-lg:size-4 max-md:size-4 absolute mt-[calc(var(--hx-vw,1vw)*-0.1)] right-[calc(var(--hx-vw,1vw)*0.7)] max-lg:right-4 max-md:right-4 opacity-0 group-hover:opacity-100 duration-500 transition-all inline-block motion-reduce:translate-x-[calc(var(--hx-vw,1vw)*2)] motion-reduce:opacity-0 motion-reduce:transition-none",
    ],
  },
});

/**
 * @param {{
 *   text?: string,
 *   href?: string,
 *   variant?: string,
 *   className?: string,
 *   target_blank?: boolean,
 *   preventDefault?: boolean,
 *   disabled?: boolean,
 *   onClick?: (event: import('react').MouseEvent<HTMLAnchorElement>) => void,
 *   scaleClass?: string,
 *   hoverTextClassName?: string,
 *   innerClassName?: string,
 *   circleClassName?: string,
 *   arrowClassName?: string,
 *   children?: import('react').ReactNode,
 *   ariaLabel?: string,
 *   scrollOffset?: number,
 *   id?: string,
 * }} props
 */
export default function Button({
  text = "Install CLI",
  href = "#",
  variant = "orange",
  className = "",
  target_blank = false,
  preventDefault = false,
  disabled = false,
  onClick,
  scaleClass = "group-hover:scale-[70]",
  hoverTextClassName,
  innerClassName = "",
  circleClassName = "",
  arrowClassName = "",
  children,
  ariaLabel,
  scrollOffset = 0,
  id,
}) {
  const lenis = useLenis();
  const styles = buttonTv({ variant, className });

  const label = children ?? text;
  const autoId = !id && typeof label === "string"
    ? label.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")
    : undefined;

  const circleColorClass = variant === "outline" ? "bg-background" : (variant === "white" ? "bg-black" : "bg-white");

  const hoverTextClass =
    hoverTextClassName ||
    (variant === "white" || variant === "outline"
      ? "group-hover:text-white motion-reduce:text-inherit"
      : "group-hover:text-black motion-reduce:text-inherit");

  const handleClick = (event) => {
    if (preventDefault || disabled) {
      event.preventDefault();
    }

    if (disabled) return;

    if (typeof window !== "undefined") {
      const targetUrl = new URL(href, window.location.href);
      const currentUrl = new URL(window.location.href);
      const isSamePageHash =
        targetUrl.origin === currentUrl.origin &&
        targetUrl.pathname === currentUrl.pathname &&
        targetUrl.hash;

      if (isSamePageHash) {
        const target = document.getElementById(
          decodeURIComponent(targetUrl.hash.slice(1))
        );

        if (target) {
          event.preventDefault();
          const resolvedScrollOffset =
            typeof scrollOffset === "function"
              ? scrollOffset(event)
              : scrollOffset;

          const targetTop =
            target.getBoundingClientRect().top +
            window.scrollY -
            resolvedScrollOffset;

          if (lenis) {
            lenis.scrollTo(targetTop, {
              force: true,
            });
          } else {
            window.scrollTo({
              top: targetTop,
              left: 0,
              behavior: "smooth",
            });
          }

          window.history.pushState(null, "", targetUrl.hash);
        }
      }
    }

    onClick?.(event);
  };

  return (
    <Link
      id={id ?? autoId}
      prefetch={prefetchFor(href)}
      href={href}
      onClick={handleClick}
      target={target_blank ? "_blank" : undefined}
      rel={target_blank ? "noopener noreferrer" : undefined}
      aria-label={ariaLabel}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : undefined}
      className={`${className} ${styles.base()} ${
        disabled ? "pointer-events-none opacity-60" : ""
      }`}
    >
      <span
        className={`${styles.circle()} ${circleColorClass} ${scaleClass} motion-reduce:scale-100 ${circleClassName}`}
      />

      <p className={`${styles.text()} ${hoverTextClass} ${innerClassName}`}>
        {children ?? text}
      </p>

      <span className={`${styles.arrow()} ${hoverTextClass} ${arrowClassName} group-hover:translate-x-0 translate-x-[calc(var(--hx-vw,1vw)*2)] motion-reduce:translate-x-[calc(var(--hx-vw,1vw)*2)]`}>
        <BtnArrow />
      </span>
    </Link>
  );
}
