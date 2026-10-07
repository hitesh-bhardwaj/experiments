"use client";

import React, { useRef } from "react";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/dist/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { prefersReducedMotion } from "@/lib/motion";
import AsciiMorph from "@/homepage-v3/components/AsciiMorph";
import LineReveal from "@/components/Animations/LineReveal";
import useIsMobile from "@/hooks/useIsMobile";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, useGSAP);
}

const STEPS = [
  {
    id: "preview",
    title: "Preview",
    number: "/homepage-v3/svgs/1.svg",
    icon: "/homepage-v3/svgs/eye.svg",
    text: "Browse by the moment you need: a sharper scroll, a cursor with presence, a cleaner transition. See exactly what it does before it touches your project.",
  },
  {
    id: "install",
    title: "Install",
    number: "/homepage-v3/svgs/2.svg",
    icon: "/homepage-v3/svgs/install.svg",
    text: "Use the Hyperiux CLI to add only the effect you need. Vault adds only the files that effect needs, not a full interaction ocean. You can inspect and own the implementation.",
  },
  {
    id: "tune",
    title: "Tune",
    number: "/homepage-v3/svgs/3.svg",
    icon: "/homepage-v3/svgs/tune.svg",
    text: "Edit copy, layout, timing, easing, breakpoints, hover states, mobile fallbacks and reduced-motion behavior to match your brand and product.",
  },
  {
    id: "ship",
    title: "Ship",
    number: "/homepage-v3/svgs/4.svg",
    icon: "/homepage-v3/svgs/ship.svg",
    text: "Deploy a website that feels abstract, more noticeable, and more memorable, without rebuilding every interaction from scratch.",
  },
];

const mark =
  "preview-mark pointer-events-none absolute size-[0.5vw] border-primary max-lg:size-2 max-md:size-2 max-sm:size-1.5";

export default function Preview() {
  const gridRef = useRef(null);
  const asciiRefs = useRef([]);
  // Phones and tablets show the resolved icon as a plain <img> instead of the
  // scrubbed glyph morph, so there is no canvas to build or drive there.
  // `isMounted` gates the swap: the hook can only read the width on the
  // client, and rendering the desktop branch until it has would mount an
  // AsciiMorph on mobile for a tick just to tear it down.
  const { isMounted, isMobile } = useIsMobile();
  const morphs = isMounted && !isMobile;

  useGSAP(
    () => {
      const rows = gsap.utils.toArray(".preview-row");
      const marks = rows.map((row) =>
        gsap.utils.toArray(row.querySelectorAll(".preview-mark")),
      );
      const textWrappers = rows.map((row) =>
        row.querySelector(".preview-text-wrapper"),
      );
      // One glyph per row, each parked in its own row's second column - empty
      // on compact layouts, where the rows render the icon directly instead.
      const asciis = morphs ? asciiRefs.current : [];

      if (rows.length !== STEPS.length) return;

      if (prefersReducedMotion()) {
        gsap.set(marks.flat(), { autoAlpha: 1 });
        gsap.set(textWrappers, { x: 0 });
        // No morph to scrub: land straight on the resolved icons. On compact
        // layouts there is no AsciiMorph mounted at all, so this is a no-op.
        asciis.forEach((ascii) => ascii?.setProgress(1));
        return;
      }

      // ── Numbers → icons: scrubbed glyph morph, one per row ───────────────
      // Every row opens as its step number and its glyphs travel into the icon
      // as that row comes through. Each glyph is a real token moving from its
      // spot in the numeral to its spot in the icon - an actual morph, not a
      // dissolve. progress → t is a pure function of scroll, so scrubbing back
      // replays the journey in reverse instead of snapping. The four windows are
      // staggered and don't overlap, so the rows turn over one at a time and the
      // last lands before the section ends.
      const MORPH_START = 0.05; // progress at which row 0 begins its morph
      const MORPH_STAGGER = 0.22; // progress between one row's start and the next
      const MORPH_SPAN = 0.22; // progress a single number → icon morph takes

      const updateIcons = (progress) => {
        asciis.forEach((ascii, i) => {
          if (!ascii) return;
          const start = MORPH_START + i * MORPH_STAGGER;
          const t = gsap.utils.clamp(0, 1, (progress - start) / MORPH_SPAN);
          ascii.setProgress(t);
        });
      };

      updateIcons(0);

      // Row 0 starts active. Rows 1–3 start with marks hidden.
      gsap.set(marks.slice(1).flat(), { autoAlpha: 0 });

      // ── x translate - inverted neighbour falloff ─────────────────────────
      // Active row stays flush (closest). Distance pushes neighbours out, so
      // the farther a row is from the current step the farther it sits.
      //
      //   currentIndex  = progress * (total rows - 1)   → float 0 … 3
      //   distance      = |rowIndex - currentIndex|
      //   factor        = clamp(distance / FALLOFF, 0, 1)
      //   x             = INDENT_PX * factor
      //
      // Active row (distance = 0) → factor = 0 → flush.
      // One row away (distance = 1, FALLOFF = 1.5) → factor ≈ 0.67 → ~2vw.
      // Two rows away → factor = 1 → full indent (3vw).
      const INDENT_VW = 3;       // vw - how far inactive rows translate
      const FALLOFF    = 1.5;    // rows - how quickly the nudge grows with distance

      const updateX = (progress) => {
        const INDENT_PX = INDENT_VW * 0.01 * window.innerWidth;
        const currentIndex = progress * (STEPS.length - 1); // 0 … 3 (float)

        textWrappers.forEach((wrapper, i) => {
          const distance = Math.abs(i - currentIndex);
          const factor   = Math.min(distance / FALLOFF, 1);
          gsap.to(wrapper, {
            x: INDENT_PX * factor,
            duration: 0.4,
            ease: "power2.out",
            overwrite: true,
          });
        });
      };

      updateX(0);

      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: gridRef.current,
          start: "top 50%",
          end: "bottom 50%",
          scrub: true,
          markers: false,
          invalidateOnRefresh: true,
          onUpdate: ({ progress }) => {
            updateX(progress);
            updateIcons(progress);
          },
        },
      });

      // ── Step 0 → 1  (timeline position 0 … 1) ────────────────────────────
      // Outgoing row 0 marks fade out, incoming row 1 marks fade in.
      tl.to(marks[0], { autoAlpha: 0, duration: 0.3 }, 0.35);
      tl.to(marks[1], { autoAlpha: 1, duration: 0.3 }, 0.5);

      // ── Step 1 → 2  (timeline position 1 … 2) ────────────────────────────
      tl.to(marks[1], { autoAlpha: 0, duration: 0.3 }, 1.35);
      tl.to(marks[2], { autoAlpha: 1, duration: 0.3 }, 1.5);

      // ── Step 2 → 3  (timeline position 2 … 3) ────────────────────────────
      tl.to(marks[2], { autoAlpha: 0, duration: 0.3 }, 2.35);
      tl.to(marks[3], { autoAlpha: 1, duration: 0.3 }, 2.5);
    },
    // `morphs` flips from false to its real value one microtask after mount,
    // which is also when the AsciiMorph canvases appear or don't. Re-running
    // then is what binds the scrub to refs that actually exist.
    { scope: gridRef, dependencies: [morphs] },
  );

  return (
    <section id="preview" className="w-full mt-[16vw] ">
      <LineReveal as='h2' className="t96 max-lg:w-[85%] max-lg:mx-auto max-md:w-[70%] max-md:mx-auto max-md:text-[8vw]! font-avenir text-center">
        Preview. Install. Tune. Ship.
      </LineReveal>

      <div
        ref={gridRef}
        className="h-screen relative mt-[7vw] max-lg:mt-[8vw] max-md:mt-[12vw] border-t border-b border-grey w-full flex flex-col"
      >
        {STEPS.map((step, i) => (
          <div
            key={step.id}
            className={`preview-row relative z-10 flex flex-1 ${
              i === STEPS.length - 1 ? "" : "border-b border-grey"
            }`}
          >
            <div className="w-[15vw] max-lg:w-[6vw] max-md:w-[5vw] h-full border-r border-grey" />
            {/* This row's number, morphing in place into this row's icon. */}
            <div className="relative w-[15vw] max-lg:w-[20vw] max-md:w-[30vw] h-full border-r border-grey">
              <div className="preview-icon pointer-events-none absolute inset-0 p-[1vw] max-lg:p-[3vw]">
                {morphs ? (
                  <AsciiMorph
                    ref={(node) => {
                      asciiRefs.current[i] = node;
                    }}
                    sources={[step.number, step.icon]}
                    fit="contain"
                    cols={100}
                    numberFill={1}
                    numberBrightness={i === 0 ? 40 : 100}
                    iconFill={1} 
                    className="h-full max-lg:my-auto w-full"
                  />
                ) : (
                  <Image
                    src={step.icon}
                    alt=""
                    aria-hidden
                    width={160}
                    height={160}
                    className="h-full max-lg:my-auto w-full object-contain"
                  />
                )}
              </div>
            </div>
            <div className="flex-1 flex relative flex-col justify-center px-[4vw] gap-[1vw] max-lg:gap-[1.5vw] border-r border-grey">
              <span className={`${mark} -top-px -left-px border-t border-l`} />
              <span className={`${mark} -top-px -right-px border-t border-r`} />
              <span
                className={`${mark} -bottom-px -left-px border-b border-l`}
              />
              <span
                className={`${mark} -bottom-px -right-px border-b border-r`}
              />
              <div className="preview-text-wrapper flex flex-col max-lg:gap-[2vw] max-md:gap-[3vw] gap-[1vw] will-change-transform">
                <p className="text34">{step.title}</p>
                <p className="text-[1.2vw] max-md:text-[3vw] max-lg:text-[2.2vw] w-[80%] max-lg:w-[95%] max-md:w-[95%]">{step.text}</p>
              </div>
            </div>
            <div className="w-[15vw] max-lg:w-[6vw] max-md:w-[5vw] h-full" />
          </div>
        ))}
      </div>
    </section>
  );
}
