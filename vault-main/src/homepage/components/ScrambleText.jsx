"use client";

import { Fragment, memo, useEffect, useRef } from "react";

const SCRAMBLE_GLYPHS = "$#&*@!_-./|<>0123456789";
const PRE_HOLD_MS = 60;
const REVEAL_DURATION_MS = 700;
const SCRAMBLE_TAIL = 10;
const FLASH_MS = 90;
const GLYPH_SWAP_MS = 40;
const COLOR_MS = 200;
const FADE_OUT_MS = 450;

const randomGlyph = () =>
  SCRAMBLE_GLYPHS[Math.floor(Math.random() * SCRAMBLE_GLYPHS.length)];

// The scramble from Button/HoverLink, reworked so the line is typed out
// rather than revealed in place: a character is invisible until the write head
// reaches it, churns through glyphs while the head passes over it, then locks
// to its final letter. Characters render inline inside per-word boxes (instead
// of Button's absolute overlay) so the text can still wrap between words -
// widths hold steady because this renders in a monospace face.
function ScrambleText({ text, active, armed = false, className = "" }) {
  const charsRef = useRef([]);
  const wasActiveRef = useRef(false);

  useEffect(() => {
    const letters = Array.from(text).filter((character) => character !== " ");
    const chars = charsRef.current.slice(0, letters.length).filter(Boolean);
    if (!chars.length) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    // Opacity is driven per character, so its transition lives inline rather
    // than in a class: the write head needs each glyph to land on its own
    // frame, while a line that goes inactive fades out over `FADE_OUT_MS`.
    const transition = (opacityMs) =>
      prefersReducedMotion
        ? "none"
        : `color ${COLOR_MS}ms ease-out, opacity ${opacityMs}ms ease-out`;

    const settle = () => {
      chars.forEach((node, index) => {
        node.textContent = letters[index];
        node.style.transition = transition(0);
        node.style.color = "";
        node.style.opacity = "";
      });
    };

    const clear = (opacityMs = 0) => {
      chars.forEach((node, index) => {
        node.textContent = letters[index];
        node.style.transition = transition(opacityMs);
        node.style.color = "";
        node.style.opacity = "0";
      });
    };

    if (!active) {
      // Blank only once the section's timeline is live, so the copy stays
      // readable if the scroll animation never mounts.
      if (!armed) settle();
      // A line that was already revealed is being scrolled back past, so it
      // fades out instead of snapping to blank in a single frame. Arming the
      // section for the first time still blanks instantly.
      else clear(wasActiveRef.current ? FADE_OUT_MS : 0);

      wasActiveRef.current = false;

      return;
    }

    wasActiveRef.current = true;

    if (prefersReducedMotion) {
      settle();
      return;
    }

    const tailMs = (SCRAMBLE_TAIL / chars.length) * REVEAL_DURATION_MS;
    const phases = new Array(chars.length).fill(0);

    clear();

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

        // Not written yet - stays blank so the line builds up instead of
        // scrambling in full from the first frame.
        if (elapsed < revealAt - tailMs) {
          running = true;
          return;
        }

        if (elapsed < revealAt) {
          running = true;

          if (phases[index] === 0) {
            phases[index] = 1;
            node.style.opacity = "1";
            node.style.color = "var(--scramble-pre, #4a4a4a)";
            node.textContent = randomGlyph();
            return;
          }

          if (Math.random() < swapChance) {
            node.textContent = randomGlyph();
          }

          return;
        }

        if (phases[index] !== 2) {
          phases[index] = 2;
          node.style.opacity = "1";
          node.textContent = letters[index];
        }

        if (elapsed - revealAt < FLASH_MS) {
          running = true;
          node.style.color = "var(--scramble-flash, #ffffff)";
        } else {
          node.style.color = "";
        }
      });

      if (running) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frame);
  }, [active, armed, text]);

  let letterIndex = -1;

  return (
    <span className={className}>
      <span aria-hidden="true">
        {text.split(" ").map((word, wordIndex) => (
          <Fragment key={wordIndex}>
            {wordIndex > 0 ? " " : null}
            <span className="inline-block whitespace-pre">
              {Array.from(word).map((character) => {
                letterIndex += 1;
                const index = letterIndex;

                return (
                  <span
                    key={index}
                    ref={(node) => {
                      charsRef.current[index] = node;
                    }}
                    className="inline-block"
                  >
                    {character}
                  </span>
                );
              })}
            </span>
          </Fragment>
        ))}
      </span>
      <span className="sr-only">{text}</span>
    </span>
  );
}

// A scrubbed timeline flips one row's `active` at a time; without this the
// state change reconciles every character span in every row mid-scroll.
export default memo(ScrambleText);
