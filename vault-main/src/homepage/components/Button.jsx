"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useLenis } from "lenis/react";

const SCRAMBLE_GLYPHS = "$#&*@!_-./|<>0123456789";
const PRE_HOLD_MS = 60;
const REVEAL_DURATION_MS = 350;
const GLYPH_SWAP_MS = 50;
// Per-character timings, measured in reveal steps (1 step = one character).
const FADE_STEPS = 0.9;
const HOLD_STEPS = 2.2;
const FLASH_STEPS = 0.7;

function ScrambleLabel({ text, active }) {
  const charsRef = useRef([]);
  const lineRef = useRef(null);

  useEffect(() => {
    const chars = charsRef.current.slice(0, text.length).filter(Boolean);
    const line = lineRef.current;
    if (!chars.length || !line) return;

    const settle = () => {
      chars.forEach((node, index) => {
        node.textContent = text[index];
        node.style.color = "";
        node.style.opacity = "";
        node.style.width = "";
        node.style.textAlign = "";
        node.style.overflow = "";
      });
      line.style.transform = "";
    };

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    settle();

    if (!active || prefersReducedMotion) return;

    // Measured on the settled text, so the centring stays smooth even while the
    // trailing characters are swapping between glyphs of different widths.
    const origin = chars[0].offsetLeft;
    const edges = chars.map(
      (node) => node.offsetLeft + node.offsetWidth - origin
    );
    const fullWidth = edges[edges.length - 1];
    const span = chars.length + HOLD_STEPS + FLASH_STEPS;

    const widthAt = (position) => {
      if (position <= 0) return 0;
      if (position >= chars.length) return fullWidth;

      const index = Math.floor(position);
      const from = index === 0 ? 0 : edges[index - 1];

      return from + (edges[index] - from) * (position - index);
    };

    const center = (position) =>
      `translate3d(${(fullWidth - widthAt(position)) / 2}px, 0, 0)`;

    // Pin every character's box to its own settled (final-glyph) width
    // before any scrambling starts - the swap below mutates textContent to
    // random glyphs of varying intrinsic width every ~50ms, and an
    // unconstrained inline-block reflows (self and every char after it)
    // each time, which is exactly what shows up as a stream of Layout
    // Shift entries in a performance trace even though each one's visual
    // score rounds to ~0. A fixed width + centered glyph means swapping
    // the character shown never changes box size, so there's nothing left
    // to reflow.
    chars.forEach((node, index) => {
      const charWidth = edges[index] - (index === 0 ? 0 : edges[index - 1]);

      node.style.opacity = "0";
      node.style.width = `${charWidth}px`;
      node.style.textAlign = "center";
      node.style.overflow = "hidden";
    });
    line.style.transform = center(0);

    const start = performance.now();
    let previous = start;
    let frame = 0;

    const tick = (now) => {
      const elapsed = now - start;
      const swapChance = (now - previous) / GLYPH_SWAP_MS;

      previous = now;

      const progress = Math.min(
        Math.max((elapsed - PRE_HOLD_MS) / REVEAL_DURATION_MS, 0),
        1
      );
      const position = (1 - (1 - progress) ** 2) * span;

      line.style.transform = center(position);

      chars.forEach((node, index) => {
        const local = position - index;
        const final = text[index];

        if (local <= 0) {
          node.style.opacity = "0";

          return;
        }

        node.style.opacity = `${Math.min(local / FADE_STEPS, 1)}`;

        if (local < HOLD_STEPS) {
          node.style.color = "var(--btn-pre)";

          if (final !== " " && Math.random() < swapChance) {
            node.textContent =
              SCRAMBLE_GLYPHS[
                Math.floor(Math.random() * SCRAMBLE_GLYPHS.length)
              ];
          }

          return;
        }

        node.textContent = final;
        node.style.color =
          local < HOLD_STEPS + FLASH_STEPS ? "var(--btn-flash)" : "";
      });

      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      } else {
        settle();
      }
    };

    frame = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frame);
  }, [active, text]);

  return (
    <span className="relative block">
      <span aria-hidden="true" className="invisible whitespace-pre">
        {text}
      </span>
      <span
        ref={lineRef}
        aria-hidden="true"
        className="absolute inset-0 whitespace-pre will-change-transform"
      >
        {Array.from(text).map((character, index) => (
          <span
            key={index}
            ref={(node) => {
              charsRef.current[index] = node;
            }}
            className="inline-block transition-colors duration-300 ease-out motion-reduce:transition-none"
          >
            {character}
          </span>
        ))}
      </span>
      <span className="sr-only">{text}</span>
    </span>
  );
}

// Shared with any non-Link trigger that wants Button's exact look/feel
// (e.g. TemplatePaywallModal's Razorpay buttons, which are real <button>s
// with payment logic, not navigation) - keeps the className string (all the
// --btn-* custom properties driving the square/arrow/label geometry) in one
// place instead of copy-pasted.
// Sizes use --hx-vw (default 1vw); homepage sections set it to --cvw so their
// buttons stop growing with the 1536px container, while the header's don't.
export function buttonClassName({ variant = "orange", disabled = false, className = "" } = {}) {
  return `group relative flex cursor-pointer font-avenir shrink-0 items-center overflow-hidden text-nowrap max-md:justify-between max-md:gap-(--btn-gap) max-md:px-[calc(var(--hx-vw,1vw)*10)] px-(--btn-pad) py-2 text-[calc(var(--hx-vw,1vw)*1.15)] tracking-wide transition-colors duration-300 max-md:py-3 max-md:text-[calc(var(--hx-vw,1vw)*2.2)] max-sm:py-3 max-sm:text-[calc(var(--hx-vw,1vw)*4)] motion-reduce:transition-none [--btn-pad:calc(var(--hx-vw,1vw)*1.2)] [--btn-gap:calc(var(--hx-vw,1vw)*.5)] [--btn-square:0.5rem] [--btn-arrow:calc(var(--hx-vw,1vw)*1)] max-md:[--btn-pad:20px] max-md:[--btn-gap:12px] max-md:[--btn-square:8px] max-md:[--btn-arrow:16px] max-sm:[--btn-pad:24px] max-sm:[--btn-gap:14px] max-sm:[--btn-square:8px] max-sm:[--btn-arrow:18px] [--btn-slot:calc(var(--btn-square)+var(--btn-gap))] [--btn-room:max(0px,var(--btn-arrow)+var(--btn-gap)-var(--btn-slot))] [--btn-inset:calc((var(--btn-pad)*1.8+var(--btn-slot)+var(--btn-room)-var(--btn-arrow)-var(--btn-gap))*.5)] [--btn-shift:calc(var(--btn-pad)+var(--btn-slot)-var(--btn-inset))] ${variant === "outline" ? "border border-current/60 bg-background text-foreground [--btn-flash:var(--primary)] [--btn-pre:#6f6f6f] [--btn-square-scale:.85]" : "bg-primary text-black [--btn-flash:#ffffff] [--btn-pre:#ffffff]"} ${disabled ? "pointer-events-none opacity-60" : ""} ${className}`;
}

// The label/square/arrow markup that lives inside Button's <Link> below -
// pulled out so a plain <button> (see buttonClassName's comment) can
// render the identical chrome around its own click handler. `hovered` must
// be tracked by the caller (pointer enter/leave) since this has no <Link>
// of its own to attach that to.
export function ButtonChrome({ label, hovered = false, innerClassName = "" }) {
  return (
    <>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-(--btn-pad) flex items-center max-md:static!"
      >
        {/* Light-on-dark reads larger than dark-on-orange, so the outline variant
            scales its square down a touch (--btn-square-scale) to look the same size. */}
        <span className="block size-(--btn-square) scale-[var(--btn-square-scale,1)] bg-current transition-transform duration-300 md:motion-safe:group-hover:-rotate-90 md:motion-safe:group-hover:translate-x-[calc((100%+var(--btn-pad))*-1.2)]" />
      </span>
      <span
        className={`relative z-10 pl-(--btn-slot) pr-(--btn-room) max-md:pl-0! max-md:pr-0! transition-transform duration-300 md:motion-safe:group-hover:-translate-x-(--btn-shift) ${innerClassName}`}
      >
        {typeof label === "string" ? (
          <ScrambleLabel text={label} active={hovered} />
        ) : (
          label
        )}
      </span>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-(--btn-inset) -translate-y-1/2 size-(--btn-arrow) bg-current [mask-image:url(/svgs/pixelated-arrow.svg)] mask-center mask-no-repeat mask-contain translate-x-[calc(var(--btn-inset)+100%)] opacity-0 transition-all duration-300 group-hover:opacity-100 motion-safe:group-hover:translate-x-0 motion-reduce:translate-x-0 motion-reduce:transition-none max-md:static! max-md:shrink-0 max-md:translate-x-0! max-md:translate-y-0! max-md:opacity-100!"
      />
    </>
  );
}

export default function Button({
  id = "",
  text = "Install CLI",
  href = "#",
  variant = "orange",
  className = "",
  target_blank = false,
  preventDefault = false,
  disabled = false,
  onClick,
  innerClassName = "",
  children,
  ariaLabel,
  scrollOffset = 0,
}) {
  const lenis = useLenis();
  const [hovered, setHovered] = useState(false);

  const label = children ?? text;

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
      prefetch={false}
      href={href}
      id={id}
      onClick={handleClick}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      target={target_blank ? "_blank" : undefined}
      rel={target_blank ? "noopener noreferrer" : undefined}
      aria-label={ariaLabel}
      aria-disabled={disabled}
      data-sound-kind={variant === "outline" ? "secondary" : "primary"}
      tabIndex={disabled ? -1 : undefined}
      className={buttonClassName({ variant, disabled, className })}
    >
      <ButtonChrome label={label} hovered={hovered} innerClassName={innerClassName} />
    </Link>
  );
}
