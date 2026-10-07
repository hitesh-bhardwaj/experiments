"use client";

import React, { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/dist/ScrollTrigger";
import { useFadeUp } from "@/components/Animations/gsapAnimations";
import { prefersReducedMotion } from "@/lib/motion";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

// Same glyph set and timings as ScrambleTextV3, so the terminal writes with the
// look the rest of the homepage uses.
const SCRAMBLE_GLYPHS = "$#&*@!_-./|<>0123456789";
const SCRAMBLE_TAIL = 8;
const GLYPH_SWAP_MS = 40;
const FLASH_MS = 90;
const SCRAMBLE_PRE = "rgba(255,255,255,0.28)";
const SCRAMBLE_FLASH = "#ffffff";

const randomGlyph = () =>
  SCRAMBLE_GLYPHS[Math.floor(Math.random() * SCRAMBLE_GLYPHS.length)];


function TerminalTick({ dataKey }) {
  return (
    <svg
      data-tick-key={dataKey}
      viewBox="0 0 18 18"
      className="size-3.5 shrink-0 text-[#63d69a] opacity-0"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M3.5 9.4L7.2 13L14.8 4.8"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Panel({ title, children, className = "" }) {
  return (
    <div
      className={`overflow-hidden bg-[rgba(20,20,20,.86)] shadow-[inset_0_0_0_1px_rgba(244,244,244,.08)] backdrop-blur-[10px] ${className}`}
    >
      <div className="flex h-[30px] items-center border-b border-white/6 px-3">
        <p className="text-[11px] text-[#8a8a8a]">
          {title}
        </p>
      </div>
      <div data-panel-body className="px-[14px] py-3">{children}</div>
    </div>
  );
}

function TreeFolder({ label, depth = 0 }) {
  return (
    <div
      className="flex items-center gap-3 text-[#bdbdbd]"
      style={{ paddingLeft: `${depth * 1.35}vw` }}
    >
      <svg
        viewBox="0 0 24 24"
        className="size-3.5 shrink-0 text-[#3b82f6]"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
      >
        <path d="M3 7.5A1.5 1.5 0 0 1 4.5 6H10l2 2h7.5A1.5 1.5 0 0 1 21 9.5v8A1.5 1.5 0 0 1 19.5 19h-15A1.5 1.5 0 0 1 3 17.5z" />
      </svg>
      <span className="font-mono text-[12px] leading-[1.9]">{label}</span>
    </div>
  );
}

function TreeFile({ label, depth = 0, className = "", right = null, dataKey }) {
  return (
    <div
      data-file-key={dataKey}
      className={`flex items-center justify-between px-[calc(var(--cvw)*0.55)] py-[calc(var(--cvw)*0.35)] opacity-0 max-md:px-2 max-md:py-1.5 ${className}`}
      style={{ paddingLeft: `calc(var(--cvw) * ${depth * 1.35 + 0.55})` }}
    >
      <div className="flex min-w-0 items-center gap-3">
        <svg
          viewBox="0 0 24 24"
          className="size-3.5 shrink-0 text-[#c084fc]"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
        >
          <path d="M7 3.75h6l4 4v12.5H7A1.25 1.25 0 0 1 5.75 19V5A1.25 1.25 0 0 1 7 3.75z" />
          <path d="M13 3.75V8h4.25" />
        </svg>
        <span className="truncate font-mono text-[12px] leading-[1.9] text-[#bdbdbd]">
          {label}
        </span>
      </div>
      {right}
    </div>
  );
}

// `play` hands the start to the parent (Why Vault starts it when its card
// becomes the active item); left undefined, the sequence starts itself on
// scroll.
export default function InstallationProcess({ id = "code-block", play }) {
  const sectionRef = useRef(null);
  const playSequenceRef = useRef(null);
  const playedRef = useRef(false);
  const parentControlled = play !== undefined;

  const terminalRefs = useRef({});
  const codeRefs = useRef({});
  const fileRefs = useRef({});
  const tickRefs = useRef({});

  const masterTlRef = useRef(null);

  useFadeUp(sectionRef);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    // Elements carry data-*-key attributes instead of callback refs, and are
    // looked up here (inside the effect, after commit) into the same
    // key -> element maps the animation code below already expects.
    const terminalEls = {};
    section.querySelectorAll("[data-terminal-key]").forEach((el) => {
      terminalEls[el.dataset.terminalKey] = el;
    });
    terminalRefs.current = terminalEls;

    const codeEls = {};
    section.querySelectorAll("[data-code-key]").forEach((el) => {
      codeEls[el.dataset.codeKey] = el;
    });
    codeRefs.current = codeEls;

    const fileEls = {};
    section.querySelectorAll("[data-file-key]").forEach((el) => {
      fileEls[el.dataset.fileKey] = el;
    });
    fileRefs.current = fileEls;

    const tickEls = {};
    section.querySelectorAll("[data-tick-key]").forEach((el) => {
      tickEls[el.dataset.tickKey] = el;
    });
    tickRefs.current = tickEls;

    const ctx = gsap.context(() => {
      const allFileRows = [
        fileRefs.current.indexRow,
        fileRefs.current.splitCanvasCompRow,
        fileRefs.current.contentRow,
      ].filter(Boolean);

      const allCodeLines = [
        codeRefs.current.line1,
        codeRefs.current.line2,
        codeRefs.current.line3,
        codeRefs.current.line4,
        codeRefs.current.line5,
      ].filter(Boolean);

      const allTicks = Object.values(tickRefs.current).filter(Boolean);

      const clearTypedContent = () => {
        ["init", "created", "add", "resolving", "added", "reduced", "done", "doneCursor"].forEach((key) => {
          const el = terminalRefs.current[key];
          if (el) el.textContent = "";
        });
        Object.values(codeRefs.current).forEach((el) => {
          if (el) el.innerHTML = "";
        });
      };

      const resetState = () => {
        clearTypedContent();

        // Hide dollar signs - they animate in with their commands
        gsap.set(
          [terminalRefs.current.dollar1, terminalRefs.current.dollar2].filter(Boolean),
          { opacity: 0 }
        );

        // Hide folder rows - they appear during installation sequence
        gsap.set(
          [fileRefs.current.effectsFolder, fileRefs.current.splitCanvasFolder].filter(Boolean),
          { opacity: 0, y: 8 }
        );

        gsap.set(allFileRows, {
          opacity: 0,
          y: 10,
          backgroundColor: "rgba(255,255,255,0)",
        });

        gsap.set(allCodeLines, { opacity: 0.22 });

        const allBadges = [
          fileRefs.current.addedBadge1,
          fileRefs.current.addedBadge2,
          fileRefs.current.addedBadge3,
        ].filter(Boolean);

        gsap.set(allBadges, { opacity: 0, x: -8 });

        gsap.set(terminalRefs.current.doneCursor, { opacity: 0 });

        allTicks.forEach((tick) => {
          const path = tick.querySelector("path");
          gsap.set(tick, { opacity: 0, scale: 0.86 });
          if (path) {
            const length = path.getTotalLength();
            gsap.set(path, { strokeDasharray: length, strokeDashoffset: length });
          }
        });
      };

      const escHtml = (s) =>
        s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

      // Writes `tokens` (text + optional colour) into `element` with a write
      // head: characters just ahead of the head churn through glyphs in the dim
      // pre-colour, lock to their real character as the head passes, flash, then
      // settle into their own colour. Rendered as one innerHTML pass per frame so
      // the timeline stays the single source of progress.
      const scrambleWrite = (timeline, element, tokens, duration, position) => {
        if (!element) return;

        let full = "";
        const ranges = tokens.map((token) => {
          const start = full.length;
          full += token.text;
          return { color: token.color, start, end: full.length };
        });

        if (!full) {
          timeline.set(element, { innerHTML: "", opacity: 1 }, position);
          return;
        }

        const colorAt = (index) =>
          ranges.find((range) => index >= range.start && index < range.end)?.color;

        const paint = (index, color) => {
          const char = escHtml(full[index]);
          return color ? `<span style="color:${color}">${char}</span>` : char;
        };

        const total = full.length;
        const state = { count: 0 };
        // How many locked characters are still inside the flash window, derived
        // from the head's speed so the flash lasts ~FLASH_MS on every line.
        const flashChars = Math.max(
          1,
          Math.round(FLASH_MS / ((duration * 1000) / total))
        );
        const glyphs = new Array(total).fill("");
        let lastSwap = 0;

        timeline.set(element, { innerHTML: "", opacity: 1 }, position);
        timeline.to(
          state,
          {
            count: total,
            duration,
            ease: "none",
            snap: { count: 1 },
            onUpdate: () => {
              const now = performance.now();
              const swap = now - lastSwap >= GLYPH_SWAP_MS;
              if (swap) lastSwap = now;

              const head = Math.round(state.count);
              const tail = Math.min(total, head + SCRAMBLE_TAIL);
              let html = "";

              for (let i = 0; i < tail; i++) {
                if (i < head) {
                  html += paint(
                    i,
                    i >= head - flashChars ? SCRAMBLE_FLASH : colorAt(i)
                  );
                  continue;
                }

                // Spaces stay blank so words keep their shape under the head.
                if (full[i] === " ") {
                  html += " ";
                  continue;
                }

                if (swap || !glyphs[i]) glyphs[i] = randomGlyph();
                html += `<span style="color:${SCRAMBLE_PRE}">${escHtml(glyphs[i])}</span>`;
              }

              element.innerHTML = html;
            },
            onComplete: () => {
              let html = "";
              for (let i = 0; i < total; i++) html += paint(i, colorAt(i));
              element.innerHTML = html;
            },
          },
          position
        );
      };

      const typeText = (timeline, element, text, duration = null, position) => {
        scrambleWrite(
          timeline,
          element,
          [{ text }],
          duration ?? Math.max(0.2, text.length * 0.012),
          position
        );
      };

      const drawTick = (timeline, tickEl, position) => {
        if (!tickEl) return;
        const path = tickEl.querySelector("path");
        if (!path) return;
        const length = path.getTotalLength();

        timeline.set(path, { strokeDasharray: length, strokeDashoffset: length }, position);
        timeline.to(tickEl, { opacity: 1, scale: 1, duration: 0.12, ease: "power2.out" }, position);
        timeline.to(path, { strokeDashoffset: 0, duration: 0.2, ease: "power2.out" }, position);
      };

      const typeSuccessLine = (timeline, tickEl, textEl, text, position, duration = null) => {
        drawTick(timeline, tickEl, position);
        typeText(timeline, textEl, text, duration, `${position}+=0.06`);
      };

      const flashAddedRow = (timeline, rowEl, position) => {
        if (!rowEl) return;
        timeline.fromTo(
          rowEl,
          { opacity: 0, y: 10, backgroundColor: "rgba(99,214,154,0)" },
          { opacity: 1, y: 0, backgroundColor: "rgba(99,214,154,0.24)", duration: 0.2, ease: "power2.out" },
          position
        );
        // Settles on Theremin's faint green for an added row
        timeline.to(rowEl, { backgroundColor: "rgba(99,214,154,0.1)", duration: 0.3, ease: "power2.out" }, ">-0.02");
      };

      const typeColoredLine = (timeline, lineEl, tokens, position) => {
        const length = tokens.reduce((sum, token) => sum + token.text.length, 0);
        scrambleWrite(
          timeline,
          lineEl,
          tokens,
          Math.max(0.25, length * 0.014),
          position
        );
      };

      const buildSequence = () => {
        resetState();

        const tl = gsap.timeline({ paused: true, timeScale: 1.6 });

        // $ sign 1 fades in, then init command types
        tl.to(terminalRefs.current.dollar1, { opacity: 1, duration: 0.15 });
        typeText(tl, terminalRefs.current.init, "npx hyperiux init");

        typeSuccessLine(
          tl,
          tickRefs.current.created,
          terminalRefs.current.created,
          "created hyperiux.config.js",
          "+=0.05"
        );

        // $ sign 2 fades in, then add command types
        tl.to(terminalRefs.current.dollar2, { opacity: 1, duration: 0.15 }, "+=0.08");
        typeText(tl, terminalRefs.current.add, "npx hyperiux add split-canvas");

        typeText(tl, terminalRefs.current.resolving, "resolving dependencies: gsap", null, "+=0.04");

        // effects/ folder slides in
        tl.to(fileRefs.current.effectsFolder, { opacity: 1, y: 0, duration: 0.18, ease: "power2.out" }, "+=0.05");

        // split-canvas/ folder slides in
        tl.to(fileRefs.current.splitCanvasFolder, { opacity: 1, y: 0, duration: 0.18, ease: "power2.out" }, "+=0.06");

        // Three files appear one by one
        flashAddedRow(tl, fileRefs.current.indexRow, "+=0.05");
        tl.to(fileRefs.current.addedBadge1, { opacity: 1, x: 0, duration: 0.15, ease: "power2.out" }, "<+0.05");

        flashAddedRow(tl, fileRefs.current.splitCanvasCompRow, "+=0.04");
        tl.to(fileRefs.current.addedBadge2, { opacity: 1, x: 0, duration: 0.15, ease: "power2.out" }, "<+0.05");

        flashAddedRow(tl, fileRefs.current.contentRow, "+=0.04");
        tl.to(fileRefs.current.addedBadge3, { opacity: 1, x: 0, duration: 0.15, ease: "power2.out" }, "<+0.05");

        typeSuccessLine(
          tl,
          tickRefs.current.added,
          terminalRefs.current.added,
          "added 3 files to /components/effects/split-canvas",
          "<+0.02"
        );

        typeText(tl, terminalRefs.current.reduced, "code is yours to own.", null, "+=0.05");

        typeSuccessLine(
          tl,
          tickRefs.current.done,
          terminalRefs.current.done,
          "done - own the code.",
          "+=0.04"
        );

        tl.to(terminalRefs.current.doneCursor, { opacity: 1, duration: 0.08 }, "<+0.05");
        tl.to(terminalRefs.current.doneCursor, {
          opacity: 0.35,
          repeat: 5,
          yoyo: true,
          duration: 0.25,
          ease: "none",
        }, ">");

        // Code block reveals - typed with per-token syntax colours
        const W = "#bdbdbd"; // Theremin's code text
        typeColoredLine(tl, codeRefs.current.line1, [
          { text: "import",                            color: "#939393" },
          { text: " ",                                 color: W },
          { text: "SplitCanvas",                       color: "#B383D3" },
          { text: " ",                                 color: W },
          { text: "from",                              color: "#939393" },
          { text: " ",                                 color: W },
          { text: '"@/components/effects/split-canvas"', color: "#DDA75A" },
          { text: ";",                                 color: W },
        ], "+=0.05");

        typeColoredLine(tl, codeRefs.current.line2, [], "+=0.02");

        typeColoredLine(tl, codeRefs.current.line3, [
          { text: "export default function", color: "#939393" },
          { text: " ",                       color: W },
          { text: "Page",                    color: "#B383D3" },
          { text: "()",                      color: W },
          { text: " {",                      color: W },
        ], "+=0.02");

        typeColoredLine(tl, codeRefs.current.line4, [
          { text: "  ",          color: W },
          { text: "return",      color: "#c084fc" },
          { text: " <",          color: W },
          { text: "SplitCanvas", color: "#4378B6" },
          { text: " />;",        color: W },
        ], "+=0.02");

        typeColoredLine(tl, codeRefs.current.line5, [
          { text: "}", color: W },
        ], "+=0.02");

        return tl;
      };

      const playSequence = () => {
        masterTlRef.current?.kill();
        masterTlRef.current = buildSequence();
        // Reduced motion: land on the finished state instead of typing it out
        if (prefersReducedMotion()) masterTlRef.current.progress(1);
        else masterTlRef.current.play(0);
      };

      resetState();
      playSequenceRef.current = playSequence;
      if (parentControlled) return undefined;

      const trigger = ScrollTrigger.create({
        trigger: section,
        start: "top 68%",
        once: true,
        onEnter: () => { playSequence(); },
      });

      return () => { trigger.kill(); };
    }, section);

    return () => {
      playSequenceRef.current = null;
      playedRef.current = false;
      masterTlRef.current?.kill();
      ctx.revert();
    };
  }, [parentControlled]);

  // Parent-controlled start: plays the first time `play` turns true, once
  useLayoutEffect(() => {
    if (!play || playedRef.current || !playSequenceRef.current) return;
    playedRef.current = true;
    playSequenceRef.current();
  }, [play]);

  return (
    <section
      id={id || undefined}
      ref={sectionRef}
      className="relative w-full overflow-hidden text-white max-md:px-0 max-md:py-20 max-sm:py-0 max-sm:pb-8"
    >
      <div className="mx-auto w-full max-w-450">
        <div className="grid grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] gap-[calc(var(--cvw)*1.4)] max-md:grid-cols-1 max-md:gap-5">
          {/* LEFT COLUMN - terminal + code */}
          <div className="flex flex-col gap-[calc(var(--cvw)*1.4)] max-md:contents">
            <Panel title="amazing_project" className="fadeup min-h-[calc(var(--cvw)*25)] max-sm:min-h-[40vh] max-md:min-h-[30vh] ">
              <div className="font-mono text-[12px] leading-[1.9] text-[#bdbdbd]">
                <div className="flex items-center gap-2">
                  <span data-terminal-key="dollar1" className="text-[#FF6B00]">$</span>
                  <span data-terminal-key="init" className="text-[#bdbdbd]" />
                </div>

                <div className="flex items-center gap-2">
                  <TerminalTick dataKey="created" />
                  <span data-terminal-key="created" className="text-[#63d69a]" />
                </div>

                <div className="flex items-center gap-2">
                  <span data-terminal-key="dollar2" className="text-[#FF6B00]">$</span>
                  <span data-terminal-key="add" className="text-[#bdbdbd]" />
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-white/0">•</span>
                  <span data-terminal-key="resolving" className="text-[#666]" />
                </div>

                <div className="flex items-center gap-2">
                  <TerminalTick dataKey="added" />
                  <span data-terminal-key="added" className="text-[#63d69a]" />
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-white/0">•</span>
                  <span data-terminal-key="reduced" className="text-[#666]" />
                </div>

                <div className="flex items-center gap-2">
                  <TerminalTick dataKey="done" />
                  <span data-terminal-key="done" className="text-[#63d69a]" />
                  <span
                    data-terminal-key="doneCursor"
                    className="inline-block h-[1.15em] w-[0.45em] bg-[#FF6B00] opacity-0"
                  />
                </div>
              </div>
            </Panel>

            <Panel title="app/page.jsx" className={`fadeup min-h-[calc(var(--cvw)*20)] max-md:min-h-[20vh] max-sm:min-h-[25vh] max-md:order-last`}>
              <div className="font-mono text-[12px] leading-[1.9] text-[#bdbdbd]">
                <div data-code-key="line1" />
                <div data-code-key="line2" />
                <div data-code-key="line3" />
                <div data-code-key="line4" />
                <div data-code-key="line5" />
              </div>
            </Panel>
          </div>

          {/* RIGHT COLUMN - file tree */}
          <div className="flex flex-col gap-[calc(var(--cvw)*1.15)] max-md:gap-5">
            <Panel title="amazing_project / Components" className="fadeup h-full max-md:min-h-[25vh] max-sm:min-h-[25vh]">
              <div className="space-y-[calc(var(--cvw)*0.9)] max-md:space-y-3">

                {/* app/ */}
                <TreeFolder label="app" depth={0} />
                <div>
                  <div className="relative ml-[calc(var(--cvw)*0.38)] border-l border-white/10 pl-[calc(var(--cvw)*1.2)] max-md:ml-1.5 max-md:pl-3">
                    <div className="flex items-center gap-3 text-[#bdbdbd]">
                      <svg viewBox="0 0 24 24" className="size-3.5 shrink-0 text-[#c084fc]" fill="none" stroke="currentColor" strokeWidth="1.7">
                        <path d="M7 3.75h6l4 4v12.5H7A1.25 1.25 0 0 1 5.75 19V5A1.25 1.25 0 0 1 7 3.75z" />
                        <path d="M13 3.75V8h4.25" />
                      </svg>
                      <span className="font-mono text-[12px] leading-[1.9]">page.jsx</span>
                    </div>
                  </div>
                </div>

                {/* components/ */}
                <TreeFolder label="components" depth={0} />
                <div>
                  <div className="relative ml-[calc(var(--cvw)*0.38)] border-l border-white/10 pl-[calc(var(--cvw)*1.1)] max-md:ml-1.5 max-md:pl-4">

                    {/* effects/ - hidden until animation */}
                    <div data-file-key="effectsFolder">
                      <TreeFolder label="effects" depth={0} />
                    </div>
                    <div className=" pt-[calc(var(--cvw)*0.45)]  max-md:pt-1.5">
                      <div className="relative ml-[calc(var(--cvw)*0.38)] border-l border-white/10 pl-[calc(var(--cvw)*1.1)] max-md:ml-1.5 max-md:pl-4">

                        {/* split-canvas/ - hidden until animation */}
                        <div data-file-key="splitCanvasFolder">
                          <TreeFolder label="split-canvas" depth={0} />
                        </div>
                        <div className="space-y-[calc(var(--cvw)*0.35)]  pt-[calc(var(--cvw)*0.45)] max-md:space-y-1.5 max-md:pl-3 max-md:pt-1.5">

                          <TreeFile
                            label="index.jsx"
                            dataKey="indexRow"
                            right={
                              <span
                                data-file-key="addedBadge1"
                                className="px-3 py-1 font-mono text-[12px] text-[#63d69a] opacity-0"
                              >
                                + Added
                              </span>
                            }
                            className="bg-[rgba(99,214,154,.1)]"
                          />

                          <TreeFile
                            label="SplitCanvasComp.jsx"
                            dataKey="splitCanvasCompRow"
                            right={
                              <span
                                data-file-key="addedBadge2"
                                className="px-3 py-1 max-sm:text-nowrap font-mono text-[12px] text-[#63d69a] opacity-0"
                              >
                                + Added
                              </span>
                            }
                            className="bg-[rgba(99,214,154,.1)]"
                          />

                          <TreeFile
                            label="content.js"
                            dataKey="contentRow"
                            right={
                              <span
                                data-file-key="addedBadge3"
                                className="px-3 py-1 font-mono text-[12px] text-[#63d69a] opacity-0"
                              >
                                + Added
                              </span>
                            }
                            className="bg-[rgba(99,214,154,.1)]"
                          />

                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-[calc(var(--cvw)*1)] max-md:pt-3">
                  <p className="font-mono text-[12px] leading-[1.9] text-[#666]">ui</p>
                </div>
              </div>
            </Panel>
          </div>
        </div>
      </div>
    </section>
  );
}
