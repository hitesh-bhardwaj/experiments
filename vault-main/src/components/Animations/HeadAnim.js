"use client";

import React, { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { SplitText } from "gsap/dist/SplitText";
import { ScrollTrigger } from "gsap/dist/ScrollTrigger";
import { shouldSkipSidebarDocsAnimation } from "@/lib/sidebar-navigation";
import { prefersReducedMotion } from "@/lib/motion";

if (typeof window !== "undefined") {
  gsap.registerPlugin(SplitText, ScrollTrigger);
}

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : () => {};

function waitForFontsAndLayout() {
  return new Promise(async (resolve) => {
    if (typeof document !== "undefined" && document.fonts?.ready) {
      try {
        await document.fonts.ready;
      } catch {}
    }

    requestAnimationFrame(() => {
      requestAnimationFrame(resolve);
    });
  });
}

// Where each char of each whitespace-separated word sits in the plain text (with
// kerning), plus the word's right edge - measured before splitting, for
// matchNaturalCharPositions.
function measureNaturalChars(element) {
  const words = [];
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  const range = document.createRange();

  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    for (const match of node.textContent.matchAll(/\S+/g)) {
      const lefts = [];
      let offset = match.index;

      for (const char of match[0]) {
        range.setStart(node, offset);
        range.setEnd(node, offset + char.length);
        lefts.push(range.getBoundingClientRect().left);
        offset += char.length;
      }

      range.setStart(node, match.index);
      range.setEnd(node, offset);
      words.push({ lefts, right: range.getBoundingClientRect().right });
    }
  }

  return words;
}

// Split chars lose their kerning and the mask wrappers add a little room, so split
// text drifts from the plain layout - and visibly snaps back when the split is
// reverted at the end of the entrance. Put every char back on its kerned position
// (and each word back to its natural width) with small margins between the chars.
function matchNaturalCharPositions(split, naturalWords) {
  if (split.words.length !== naturalWords.length) return;

  split.words.forEach((word, index) => {
    const natural = naturalWords[index];
    const chars = split.chars.filter((char) => word.contains(char));
    if (chars.length !== natural.lefts.length) return;

    // A char's own mask box (if SplitText made one) is what gets spaced; positions
    // are measured on the chars themselves.
    const boxes = chars.map((char) => (char.parentElement !== word ? char.parentElement : char));
    const start = chars[0].getBoundingClientRect().left;

    for (let i = 1; i <= chars.length; i += 1) {
      const target = i < chars.length ? natural.lefts[i] - natural.lefts[0] : natural.right - natural.lefts[0];
      const current =
        (i < chars.length ? chars[i].getBoundingClientRect().left : chars[i - 1].getBoundingClientRect().right) - start;
      const diff = target - current;
      if (Math.abs(diff) >= 0.05) {
        const base = parseFloat(boxes[i - 1].style.marginRight) || 0;
        boxes[i - 1].style.marginRight = `${base + diff}px`;
      }
    }
  });
}

// SplitText's masks (here: one per line, overflow: clip) are exactly one line-height
// tall - with a heading's tight line-height that clips descenders (g, j, p, y), tall
// letters and side overhangs, which then pop into place when the split is reverted.
// Swap each mask's overflow clip for a clip-path that reaches past its box on every
// side (negative insets) - more room for the glyphs, no change to layout. Returns,
// per char, the extra distance its start offset must clear (the extra clip room
// below the line, plus as much again for ink above the char's box).
const MASK_PAD_EM = 0.15;
const MASK_PAD_Y_EM = 0.3;
const GRADIENT_PAD_Y_EM = 0.5;

function padMasks(split) {
  const pads = new Map();

  (split.masks || []).forEach((mask) => {
    const fontSize = parseFloat(getComputedStyle(mask).fontSize);
    const padX = fontSize * MASK_PAD_EM;
    const padY = fontSize * MASK_PAD_Y_EM;
    mask.style.overflow = "visible";
    mask.style.clipPath = `inset(${-padY}px ${-padX}px)`;
    split.chars.forEach((char) => {
      if (mask.contains(char)) pads.set(char, padY * 2);
    });
  });

  return pads;
}

function isInViewport(element) {
  if (!element || typeof window === "undefined") return false;

  const rect = element.getBoundingClientRect();

  return rect.top < window.innerHeight * 0.9 && rect.bottom > 0;
}

export default function HeadAnim({
  children,
  animateOnScroll = true,
  delay = 0,
  animationKey = "",
  // Tilt (deg) each char starts at as it rises in; 0 = a straight rise.
  rotate = 8,
  // "chars" rises letter by letter; "words" rises whole words (same masks and timing feel).
  by = "chars",
}) {
  const containerRef = useRef(null);
  const splitRefs = useRef([]);
  const tweenRef = useRef(null);
  const triggerRef = useRef(null);
  const refreshRef = useRef(null);
  const runIdRef = useRef(0);

  useIsomorphicLayoutEffect(() => {
    const container = containerRef.current;

    if (!container) return;

    const runId = ++runIdRef.current;

    tweenRef.current?.kill();
    triggerRef.current?.kill();
    refreshRef.current?.kill();

    splitRefs.current.forEach((split) => split?.revert());
    splitRefs.current = [];

    let isKilled = false;

    gsap.set(container, {
      autoAlpha: 0,
    });

    if (shouldSkipSidebarDocsAnimation()) {
      gsap.set(container, {
        autoAlpha: 1,
        clearProps: "visibility,opacity,transform",
      });

      return;
    }

    if (prefersReducedMotion()) {
      tweenRef.current = gsap.to(container, {
        autoAlpha: 1,
        duration: 0.6,
        ease: "power2.out",
        delay,
      });

      return;
    }

    const elements = container.hasAttribute("data-copy-wrapper")
      ? Array.from(container.children)
      : [container];

    const run = async () => {
      await waitForFontsAndLayout();

      if (isKilled || runId !== runIdRef.current || !containerRef.current) {
        return;
      }

      const allChars = [];
      const allWords = [];
      const maskPads = new Map();

      elements.forEach((element) => {
        if (!element) return;

        const naturalChars = measureNaturalChars(element);

        const split = SplitText.create(element, {
          type: "lines,words,chars",
          mask: "lines",
          wordsClass: "word++",
          charsClass: "char++",
          reduceWhiteSpace: false,
          aria: "none",
        });

        splitRefs.current.push(split);

        gsap.set(split.words, {
          display: "inline-block",
          whiteSpace: "nowrap",
        });

        padMasks(split).forEach((pad, char) => maskPads.set(char, pad));
        matchNaturalCharPositions(split, naturalChars);

        allChars.push(...split.chars);
        allWords.push(...split.words);
      });

      if (!allChars.length) {
        gsap.set(container, {
          autoAlpha: 1,
        });

        return;
      }

      // background-clip: text on a parent doesn't paint transformed child chars, so a
      // gradient word (.gradient-text-animate) would vanish while it animates. Put the
      // gradient on its chars for the entrance; reverting the split afterwards restores
      // the original markup, and with it the one continuous gradient across the word.
      const gradientHosts = Array.from(
        container.querySelectorAll(".gradient-text-animate")
      );

      // Each char shows exactly its slice of the word's gradient (sized to the whole
      // word, shifted by the char's offset in it) and holds the animation's first
      // frame - which is what the word itself shows when its own gradient animation
      // restarts after the revert, so nothing changes colour at the hand-off.
      // background-clip: text only paints inside the char's own box, which is just its
      // advance x line-height - glyph edges beyond it (overhangs, tall letters under a
      // tight line-height) would be cut off. Pad gradient chars like their masks
      // (negative margins keep them in place) so the gradient covers the whole glyph.
      const charHeights = new Map(allChars.map((char) => [char, char.offsetHeight]));
      const wordHeights = new Map(allWords.map((word) => [word, word.offsetHeight]));

      gradientHosts.forEach((host) => {
        const hostBox = host.getBoundingClientRect();
        const hostChars = allChars.filter((char) => host.contains(char));

        hostChars.forEach((char) => {
          const fontSize = parseFloat(getComputedStyle(char).fontSize);
          const pad = fontSize * MASK_PAD_EM;
          // Vertically the box must clear descenders (g, j, p, y) and tall letters
          // under the heading's tight line-height - room costs nothing here, it's
          // only where the background paints.
          const padY = fontSize * GRADIENT_PAD_Y_EM;
          // Keep any kerning margin matchNaturalCharPositions put on the char itself
          // (chars without a mask box carry it directly).
          const kerning = parseFloat(char.style.marginRight) || 0;
          char.style.padding = `${padY}px ${pad}px`;
          char.style.margin = `${-padY}px ${kerning - pad}px ${-padY}px ${-pad}px`;
          // Measured after padding: the background starts at the padded box's edge.
          const offset = char.getBoundingClientRect().left - hostBox.left;
          char.classList.add("gradient-text-animate");
          char.style.animation = "none";
          char.style.backgroundSize = `${hostBox.width * 3}px 100%`;
          char.style.backgroundOrigin = "border-box";
          char.style.backgroundPosition = `${-offset}px center`;
        });
        host.classList.remove("gradient-text-animate");
      });

      // What rises: each char, or each word (its chars, gradient slices included,
      // travel inside it).
      const byWords = by === "words";
      const units = byWords ? allWords : allChars;
      const unitStart = byWords
        ? (word) => wordHeights.get(word) + (maskPads.get(allChars.find((char) => word.contains(char))) || 0)
        : (char) => charHeights.get(char) + (maskPads.get(char) || 0);

      // Start each unit fully below its padded mask (ink overhanging its box
      // included), so nothing peeks out before it rises.
      gsap.set(units, {
        y: (index, unit) => unitStart(unit),
        rotate,
        willChange: "transform",
      });

      gsap.set(container, {
        autoAlpha: 1,
      });

      tweenRef.current = gsap.to(units, {
        y: 0,
        rotate: 0,
        duration: byWords ? 0.7 : 0.5,
        stagger: byWords ? 0.08 : 0.02,
        ease: "power3.out",
        delay,
        paused: animateOnScroll,
        onComplete: () => {
          gsap.set(units, {
            clearProps: "willChange",
          });

          if (gradientHosts.length) {
            splitRefs.current.forEach((split) => split?.revert());
            splitRefs.current = [];
          }

          refreshRef.current?.kill();
          refreshRef.current = gsap.delayedCall(0.05, () => {
            ScrollTrigger.refresh(true);
          });
        },
      });

      if (!animateOnScroll) {
        tweenRef.current.play(0);
        return;
      }

      triggerRef.current = ScrollTrigger.create({
        trigger: container,
        start: "top 85%",
        once: true,
        invalidateOnRefresh: true,
        onEnter: () => {
          tweenRef.current?.play(0);
        },
      });

      refreshRef.current?.kill();

      refreshRef.current = gsap.delayedCall(0.2, () => {
        ScrollTrigger.refresh(true);

        if (isInViewport(container) && tweenRef.current?.progress() === 0) {
          tweenRef.current.play(0);
          triggerRef.current?.kill();
          triggerRef.current = null;
        }
      });
    };

    run();

    return () => {
      isKilled = true;

      tweenRef.current?.kill();
      triggerRef.current?.kill();
      refreshRef.current?.kill();

      splitRefs.current.forEach((split) => split?.revert());
      splitRefs.current = [];

      if (container) {
        gsap.set(container, {
          clearProps: "visibility,opacity,transform",
        });
      }
    };
  }, [animateOnScroll, delay, animationKey, rotate, by]);

  const child =
    React.Children.count(children) === 1
      ? React.Children.toArray(children)[0]
      : null;

  if (child && React.isValidElement(child)) {
    return React.cloneElement(child, {
      ref: (node) => {
        const childRef = child.ref;
        if (typeof childRef === "function") childRef(node);
        else if (childRef) childRef.current = node;
        containerRef.current = node;
      },
      style: {
        ...child.props.style,
        opacity: 0,
      },
    });
  }

  return (
    <div ref={containerRef} data-copy-wrapper="true" style={{ opacity: 0 }}>
      {children}
    </div>
  );
}