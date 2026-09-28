"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const SCRAMBLE_GLYPHS = "$#&*@!_-./|<>0123456789";
const PRE_HOLD_MS = 40;
const REVEAL_DURATION_MS = 350;
const SCRAMBLE_TAIL = 6;
const FLASH_MS = 90;
const GLYPH_SWAP_MS = 50;

const randomGlyph = () =>
  SCRAMBLE_GLYPHS[Math.floor(Math.random() * SCRAMBLE_GLYPHS.length)];

// Exported so other sections can play the navbar's exact write-on. `run` is an
// object rather than a boolean on purpose - see the effect's dependency note.
export function ScrambleText({ text, run }) {
  const charsRef = useRef([]);
  const active = run.active;

  useEffect(() => {
    const chars = charsRef.current.slice(0, text.length).filter(Boolean);
    if (!chars.length) return;

    const settle = () => {
      chars.forEach((node, index) => {
        node.textContent = text[index];
        node.style.color = "";
        node.style.opacity = "";
        node.style.width = "";
        node.style.textAlign = "";
        node.style.overflow = "";
      });
    };

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (!active || prefersReducedMotion) {
      settle();
      return;
    }

    // The tail is what makes the label read as written rather than decoded in
    // place, so it has to stay short relative to the label - on "Docs" a fixed
    // six characters would cover the whole word and scramble it all at once.
    const tail = Math.max(
      1,
      Math.min(SCRAMBLE_TAIL, Math.ceil(chars.length / 2))
    );
    const tailMs = (tail / chars.length) * REVEAL_DURATION_MS;
    const phases = new Array(chars.length).fill(0);

    chars.forEach((node, index) => {
      node.textContent = text[index];
      node.style.color = "";
      node.style.opacity = "0";
    });

    // Pin every character's box to its own natural width before any
    // scrambling starts - the tick loop below mutates textContent to
    // random glyphs of varying intrinsic width every ~50ms, and an
    // unconstrained inline-block reflows itself and every character after
    // it on each swap. A fixed width + centered glyph means swapping the
    // character shown never changes box size, so there's nothing left to
    // reflow (same fix as ButtonV3.jsx's ScrambleLabel).
    chars.forEach((node) => {
      const charWidth = node.offsetWidth;

      node.style.width = `${charWidth}px`;
      node.style.textAlign = "center";
      node.style.overflow = "hidden";
    });

    const start = performance.now();
    let previous = start;
    let frame = 0;

    const tick = (now) => {
      const elapsed = now - start;
      const swapChance = (now - previous) / GLYPH_SWAP_MS;

      previous = now;

      let running = false;

      chars.forEach((node, index) => {
        const revealAt =
          PRE_HOLD_MS + ((index + 1) / chars.length) * REVEAL_DURATION_MS;
        const final = text[index];

        // Not written yet - stays blank so the label builds up left to right.
        if (elapsed < revealAt - tailMs) {
          running = true;
          return;
        }

        if (elapsed < revealAt) {
          running = true;

          if (phases[index] === 0) {
            phases[index] = 1;
            node.style.opacity = "1";
            node.style.color = "var(--link-pre)";
            if (final !== " ") node.textContent = randomGlyph();
            return;
          }

          if (final !== " " && Math.random() < swapChance) {
            node.textContent = randomGlyph();
          }

          return;
        }

        if (phases[index] !== 2) {
          phases[index] = 2;
          node.style.opacity = "1";
          node.textContent = final;
        }

        if (elapsed - revealAt < FLASH_MS) {
          running = true;
          node.style.color = "var(--link-flash)";
        } else {
          node.style.color = "";
        }
      });

      if (running) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frame);
    // `run` identity changes on every hover start, so each hover replays the
    // scramble even if the previous pointerleave was never delivered.
  }, [run, text, active]);

  return (
    <span className="relative block">
      <span aria-hidden="true" className="invisible whitespace-pre">
        {text}
      </span>
      <span aria-hidden="true" className="absolute inset-0 whitespace-pre">
        {Array.from(text).map((character, index) => (
          <span
            key={index}
            ref={(node) => {
              charsRef.current[index] = node;
            }}
            className="inline-block transition-colors duration-200 ease-out motion-reduce:transition-none"
          >
            {character}
          </span>
        ))}
      </span>
      <span className="sr-only">{text}</span>
    </span>
  );
}

export default function HoverLinkV3({
  text,
  href = "#",
  className = "",
  target_blank = false,
  onClick,
  ariaLabel,
  leading,
  children,
}) {
  const [run, setRun] = useState({ active: false, id: 0 });
  const activeRef = useRef(false);

  // A new object identity per start guarantees a replay; stopping while already
  // stopped keeps the same object so it costs no render.
  const start = () => {
    activeRef.current = true;
    setRun((current) => ({ active: true, id: current.id + 1 }));
  };
  const stop = () => {
    activeRef.current = false;
    setRun((current) =>
      current.active ? { active: false, id: current.id } : current
    );
  };

  return (
    <Link
      prefetch={false}
      href={href}
      onClick={onClick}
      onPointerEnter={start}
      onPointerLeave={stop}
      onPointerMove={() => {
        // Recovers the hover when the element moved under a stationary cursor
        // (the navbar hides/reveals on scroll) and no pointerenter was fired.
        if (!activeRef.current) start();
      }}
      onFocus={start}
      onBlur={stop}
      target={target_blank ? "_blank" : undefined}
      rel={target_blank ? "noopener noreferrer" : undefined}
      aria-label={ariaLabel}
      className={`group flex items-center gap-[0.8vw] text-nowrap transition-colors duration-300 motion-reduce:transition-none [--link-flash:var(--primary)] [--link-pre:var(--primary)] ${className}`}
    >
      {leading}
      <ScrambleText text={text} run={run} />
      {children}
    </Link>
  );
}
