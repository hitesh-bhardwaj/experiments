"use client";

import React, { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/dist/ScrollTrigger";
import { useFadeUp } from "../Animations/gsapAnimations";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

function WindowDots() {
  return (
    <div className="flex items-center gap-2">
      <span className="size-2.5 rounded-full bg-white/70" />
      <span className="size-2.5 rounded-full bg-white/70" />
      <span className="size-2.5 rounded-full bg-white/70" />
    </div>
  );
}

function TerminalTick({ dataKey }) {
  return (
    <svg
      data-tick-key={dataKey}
      viewBox="0 0 18 18"
      className="h-[1.05vw] w-[1.05vw] shrink-0 text-[#5AC382] opacity-0 max-[1025px]:h-4 max-[1025px]:w-4"
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
      className={`overflow-hidden rounded-[1.6vw] border border-white/8 bg-[#161616] shadow-[0_20px_80px_rgba(0,0,0,0.35)] max-[1025px]:rounded-[1.6vw] max-md:rounded-[4vw] ${className}`}
    >
      <div className="flex h-[3vw] items-center max-md:gap-[4vw] gap-[1vw] bg-[#272727] px-[1.4vw] max-[1025px]:h-12 max-[1025px]:px-5">
        <WindowDots />
        <p className="font-mono text-[1.02vw] text-white/72 max-[1025px]:text-sm">
          {title}
        </p>
      </div>
      <div className="p-[1.6vw] max-[1025px]:p-5">{children}</div>
    </div>
  );
}

function TreeFolder({ label, depth = 0 }) {
  return (
    <div
      className="flex items-center gap-3 text-white/80"
      style={{ paddingLeft: `${depth * 1.35}vw` }}
    >
      <svg
        viewBox="0 0 24 24"
        className="h-[1.1vw] w-[1.1vw] shrink-0 text-[#3b82f6] max-[1025px]:h-4 max-[1025px]:w-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
      >
        <path d="M3 7.5A1.5 1.5 0 0 1 4.5 6H10l2 2h7.5A1.5 1.5 0 0 1 21 9.5v8A1.5 1.5 0 0 1 19.5 19h-15A1.5 1.5 0 0 1 3 17.5z" />
      </svg>
      <span className="font-mono text-[1.05vw] max-[1025px]:text-[15px]">{label}</span>
    </div>
  );
}

function TreeFile({ label, depth = 0, className = "", right = null, dataKey }) {
  return (
    <div
      data-file-key={dataKey}
      className={`flex items-center justify-between rounded-[0.3vw] px-[0.55vw] py-[0.35vw] opacity-0 max-[1025px]:rounded-md max-[1025px]:px-2 max-[1025px]:py-1.5 ${className}`}
      style={{ paddingLeft: `calc(${depth * 1.35}vw + 0.55vw)` }}
    >
      <div className="flex min-w-0 items-center gap-3">
        <svg
          viewBox="0 0 24 24"
          className="h-[1.05vw] w-[1.05vw] shrink-0 text-[#c084fc] max-[1025px]:h-4 max-[1025px]:w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
        >
          <path d="M7 3.75h6l4 4v12.5H7A1.25 1.25 0 0 1 5.75 19V5A1.25 1.25 0 0 1 7 3.75z" />
          <path d="M13 3.75V8h4.25" />
        </svg>
        <span className="truncate font-mono text-[1.05vw] text-[#ff7a1a] max-[1025px]:text-[15px]">
          {label}
        </span>
      </div>
      {right}
    </div>
  );
}

export default function CodeBlockWorkflow() {
  const sectionRef = useRef(null);

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

      const typeText = (timeline, element, text, duration = null, position) => {
        if (!element) return;
        const chars = text.length;
        const state = { count: 0 };
        const finalDuration = duration ?? Math.max(0.2, chars * 0.012);

        timeline.set(element, { textContent: "", opacity: 1 }, position);
        timeline.to(
          state,
          {
            count: chars,
            duration: finalDuration,
            ease: "none",
            snap: { count: 1 },
            onUpdate: () => { element.textContent = text.slice(0, state.count); },
          },
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
          { opacity: 0, y: 10, backgroundColor: "rgba(34,197,94,0)" },
          { opacity: 1, y: 0, backgroundColor: "rgba(34,197,94,0.24)", duration: 0.2, ease: "power2.out" },
          position
        );
        timeline.to(rowEl, { backgroundColor: "rgba(255,255,255,0)", duration: 0.3, ease: "power2.out" }, ">-0.02");
      };

      const escHtml = (s) =>
        s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

      const typeColoredLine = (timeline, lineEl, tokens, position) => {
        if (!lineEl) return;
        const fullText = tokens.map((t) => t.text).join("");
        if (!fullText) {
          timeline.set(lineEl, { innerHTML: "", opacity: 1 }, position);
          return;
        }
        let cumulative = 0;
        const ranges = tokens.map((t) => {
          const start = cumulative;
          cumulative += t.text.length;
          return { color: t.color, text: t.text, start };
        });
        const state = { count: 0 };
        const duration = Math.max(0.25, fullText.length * 0.014);

        timeline.set(lineEl, { innerHTML: "", opacity: 1 }, position);
        timeline.to(
          state,
          {
            count: fullText.length,
            duration,
            ease: "none",
            snap: { count: 1 },
            onUpdate: () => {
              const n = Math.round(state.count);
              let html = "";
              for (const tok of ranges) {
                if (tok.start >= n) break;
                const slice = escHtml(tok.text.slice(0, n - tok.start));
                html += `<span style="color:${tok.color}">${slice}</span>`;
              }
              lineEl.innerHTML = html;
            },
          },
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
        const W = "rgba(255,255,255,0.7)";
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
        masterTlRef.current.play(0);
      };

      resetState();

      const trigger = ScrollTrigger.create({
        trigger: section,
        start: "top 68%",
        once: true,
        onEnter: () => { playSequence(); },
      });

      return () => { trigger.kill(); };
    }, section);

    return () => {
      masterTlRef.current?.kill();
      ctx.revert();
    };
  }, []);

  return (
    <section
      id="code-block"
      ref={sectionRef}
      className="relative w-full overflow-hidden text-white max-[1025px]:px-0 max-[1025px]:py-20 max-md:py-0 max-md:pb-8"
    >
      <div className="mx-auto w-full max-w-450">
        <div className="grid grid-cols-[0.92fr_1.08fr] gap-[1.4vw] max-[1025px]:grid-cols-1 max-[1025px]:gap-5">
          {/* LEFT COLUMN - terminal + code */}
          <div className="flex flex-col gap-[1.4vw] max-[1025px]:contents">
            <Panel title="amazing_project" className="fadeup min-h-[25vw] max-md:min-h-[40vh] max-[1025px]:min-h-[30vh] ">
              <div className="space-y-[0.8vw] font-mono text-[1.02vw] leading-[1.9] max-[1025px]:space-y-2 max-[1025px]:text-[14px]">
                <div className="flex items-center gap-2">
                  <span data-terminal-key="dollar1" className="text-[#ff9f43]">$</span>
                  <span data-terminal-key="init" className="text-white/90" />
                </div>

                <div className="flex items-center gap-2">
                  <TerminalTick dataKey="created" />
                  <span data-terminal-key="created" className="text-[#5AC382]" />
                </div>

                <div className="flex items-center gap-2">
                  <span data-terminal-key="dollar2" className="text-[#ff9f43]">$</span>
                  <span data-terminal-key="add" className="text-white/90" />
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-white/0">•</span>
                  <span data-terminal-key="resolving" className="text-white/45" />
                </div>

                <div className="flex items-center gap-2">
                  <TerminalTick dataKey="added" />
                  <span data-terminal-key="added" className="text-[#5AC382]" />
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-white/0">•</span>
                  <span data-terminal-key="reduced" className="text-white/45" />
                </div>

                <div className="flex items-center gap-2">
                  <TerminalTick dataKey="done" />
                  <span data-terminal-key="done" className="text-[#5AC382]" />
                  <span
                    data-terminal-key="doneCursor"
                    className="inline-block h-[1.15em] w-[0.45em] bg-[#ff7a1a] opacity-0"
                  />
                </div>
              </div>
            </Panel>

            <Panel title="app/page.jsx" className="fadeup min-h-[20vw] max-[1025px]:min-h-[20vh] max-md:min-h-[25vh] max-[1025px]:order-last">
              <div className="space-y-[0.55vw] font-mono text-[1vw] leading-[1.95] text-white/78 max-[1025px]:space-y-1 max-[1025px]:text-[13px]">
                <div data-code-key="line1" />
                <div data-code-key="line2" />
                <div data-code-key="line3" />
                <div data-code-key="line4" />
                <div data-code-key="line5" />
              </div>
            </Panel>
          </div>

          {/* RIGHT COLUMN - file tree */}
          <div className="flex flex-col gap-[1.15vw]">
            <Panel title="amazing_project / Components" className="fadeup h-full max-[1025px]:min-h-[25vh] max-md:min-h-[25vh]">
              <div className="space-y-[0.9vw] max-[1025px]:space-y-3">

                {/* app/ */}
                <TreeFolder label="app" depth={0} />
                <div>
                  <div className="relative ml-[0.38vw] border-l border-white/10 pl-[1.2vw] max-[1025px]:ml-1.5 max-[1025px]:pl-3">
                    <div className="flex items-center gap-3 text-white/80">
                      <svg viewBox="0 0 24 24" className="h-[1.05vw] w-[1.05vw] shrink-0 text-[#c084fc] max-[1025px]:h-4 max-[1025px]:w-4" fill="none" stroke="currentColor" strokeWidth="1.7">
                        <path d="M7 3.75h6l4 4v12.5H7A1.25 1.25 0 0 1 5.75 19V5A1.25 1.25 0 0 1 7 3.75z" />
                        <path d="M13 3.75V8h4.25" />
                      </svg>
                      <span className="font-mono text-[1.05vw] text-white/76 max-[1025px]:text-[15px]">page.jsx</span>
                    </div>
                  </div>
                </div>

                {/* components/ */}
                <TreeFolder label="components" depth={0} />
                <div>
                  <div className="relative ml-[0.38vw] border-l border-white/10 pl-[1.1vw] max-[1025px]:ml-1.5 max-[1025px]:pl-4">

                    {/* effects/ - hidden until animation */}
                    <div data-file-key="effectsFolder">
                      <TreeFolder label="effects" depth={0} />
                    </div>
                    <div className=" pt-[0.45vw]  max-[1025px]:pt-1.5">
                      <div className="relative ml-[0.38vw] border-l border-white/10 pl-[1.1vw] max-[1025px]:ml-1.5 max-[1025px]:pl-4">

                        {/* split-canvas/ - hidden until animation */}
                        <div data-file-key="splitCanvasFolder">
                          <TreeFolder label="split-canvas" depth={0} />
                        </div>
                        <div className="space-y-[0.35vw]  pt-[0.45vw] max-[1025px]:space-y-1.5 max-[1025px]:pl-3 max-[1025px]:pt-1.5">

                          <TreeFile
                            label="index.jsx"
                            dataKey="indexRow"
                            right={
                              <span
                                data-file-key="addedBadge1"
                                className="rounded-full  px-3 py-1 font-mono text-[0.95vw] text-[#5AC382] opacity-0 max-[1025px]:text-xs"
                              >
                                + Added
                              </span>
                            }
                            className="bg-[linear-gradient(90deg,rgba(255,122,26,0.01),rgba(34,197,94,0.2))]"
                          />

                          <TreeFile
                            label="SplitCanvasComp.jsx"
                            dataKey="splitCanvasCompRow"
                            right={
                              <span
                                data-file-key="addedBadge2"
                                className="rounded-full  px-3 py-1 max-md:text-nowrap font-mono text-[0.95vw] text-[#5AC382] opacity-0 max-[1025px]:text-xs"
                              >
                                + Added
                              </span>
                            }
                            className="bg-[linear-gradient(90deg,rgba(255,122,26,0.01),rgba(34,197,94,0.2))]"
                          />

                          <TreeFile
                            label="content.js"
                            dataKey="contentRow"
                            right={
                              <span
                                data-file-key="addedBadge3"
                                className="rounded-full  px-3 py-1 font-mono text-[0.95vw] text-[#5AC382] opacity-0 max-[1025px]:text-xs"
                              >
                                + Added
                              </span>
                            }
                            className="bg-[linear-gradient(90deg,rgba(255,122,26,0.01),rgba(34,197,94,0.2))]"
                          />

                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-[1vw] max-[1025px]:pt-3">
                  <p className="font-mono text-[1.02vw] text-white/42 max-[1025px]:text-sm">ui</p>
                </div>
              </div>
            </Panel>
          </div>
        </div>
      </div>
    </section>
  );
}
