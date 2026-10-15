// Built using Hyperiux Vault: https://vault.hyperiux.com
"use client";

import gsap from "gsap";
import { CustomEase } from "gsap/CustomEase";
import { ArrowUpRight } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType, type MutableRefObject, type ReactNode } from "react";

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
}

gsap.registerPlugin(CustomEase);
CustomEase.create("linesLoadingEase", "0.75,-0.01,0.16,1");

const LINE_COUNT = 17;
const MOBILE_LINE_REDUCTION = 2;
const NAV_H = 55;
const ROW_H = 24;

const getLineCount = () => {
  const isMobile = typeof window !== "undefined" && window.innerWidth < 640;
  return isMobile ? LINE_COUNT - MOBILE_LINE_REDUCTION : LINE_COUNT;
};

const MORPH_STAGGER = 34;
const MORPH_DUR = 720;
const APPEAR_DUR = 260;
const CONTENT_FADE_AT = 0.32;
const CONTENT_FADE_DUR = 520;
const TEXT_REVEAL_AT = 0.44;
const HOLD_AFTER_MORPH = 120;
const WIPE_DUR = 820;
const HOLD_END = 820;
const WIPE_OVERLAP = 0.1;

type ElementListRef = MutableRefObject<(HTMLElement | null)[]>;

interface DemoContentProps {
  theme?: "dark" | "light";
  showText?: boolean;
  navRefs?: ElementListRef;
  rowRefs?: ElementListRef;
  rowHeight?: number;
  lineCount?: number;
}

interface NavItem {
  left?: ReactNode;
  center?: ReactNode;
  right?: ReactNode;
}
function DemoContent({
  theme = "dark",
  showText = true,
  navRefs,
  rowRefs,
  rowHeight = ROW_H,
  lineCount = LINE_COUNT,
}: DemoContentProps = {}) {
  const isDark = theme === "dark";

  const navItems = useMemo(
    (): NavItem[] => [
      { left: <span className="font-bold tracking-tighter max-lg:text-2xl max-md:text-2xl">Hyperiux Vault</span> },
      { left: "INDEX (22)" },
      { left: "(CONTACT)" },
      { left: "(SERVICES)" },
      { left: "(SELECTED CLIENTS)" },
      { left: "(PRESS)" },
      { right: "■" },
    ],
    [],
  );

  const rows = useMemo(
    () => [
      [
        "A futuristic UI library crafting immersive web",
        "+91 98765 43210",
        "Motion Systems",
        "GSAP",
        "Interactive Interfaces",
      ],
      [
        "experiences with animation, interaction, and depth.",
        "",
        "UI Components",
        "Framer Motion",
        "Scroll Experiences",
      ],
      ["", "Based in", "Creative Development", "React", ""],
      [
        "Built for developers and designers shaping the",
        "Delhi, India",
        "Design Systems",
        "Next.js",
        "Modern Motion UI",
      ],
      [
        "next generation of interactive digital products.",
        "",
        "WebGL Effects",
        "Three.js",
        "Animation First",
      ],
      [
        "From cinematic transitions to immersive layouts,",
        "For collaborations",
        "Page Transitions",
        "Lenis",
        "",
      ],
      [
        "Hyperiux focuses on expressive interfaces that",
        "and inquiries:",
        "Interactive Effects",
        "Tailwind CSS",
        "Fluid Interactions",
      ],
      [
        "blend performance with visually engaging motion.",
        "",
        "Creative Coding",
        "TypeScript",
        "Reusable Systems",
      ],
      [
        "Designed to help creators build faster and",
        "hello@hyperiux.com",
        "Component Architecture",
        "Aceternity UI",
        "Future-ready UI Library",
      ],
      [
        "ship visually stunning user experiences.",
        "",
        "Scroll Animations",
        "Motion One",
        "",
      ],
      ["", "", "Micro Interactions", "Spline", ""],
      ["", "", "Frontend Engineering", "WebGL", ""],
      ["", "Twitter", "", "", ""],
      ["", "GitHub", "", "", ""],
      ...Array.from({ length: Math.max(0, lineCount - 1 - 14) }, () => [
        "",
        "",
        "",
        "",
        "",
      ]),
    ],
    [lineCount],
  );

  const rowCount = lineCount - 1;

  const GRID_CLASS = "grid-cols-[1.25fr_1fr_1fr_1fr_1.25fr_.9fr_28px] max-md:flex max-md:justify-between";

  return (
    <div
      className={[
        "absolute inset-0   tracking-[-0.01em]",
        isDark ? "bg-[#0b0b0b] text-white/90" : "bg-white text-neutral-900",
      ].join(" ")}
    >
      {!showText ? null : (
        <>
          <div
            className={[
              "grid items-center px-5.5 text-[0.85vw] uppercase select-none max-sm:text-[3.5vw]",
              GRID_CLASS,
              isDark ? "text-white/55" : "text-black/55",
            ].join(" ")}
            style={{ height: NAV_H }}
          >
            {navItems.map((item, idx) => (
              <div
                key={idx}
                ref={(el) => {
                  if (!el || !navRefs) return;
                  navRefs.current[idx] = el;
                }}
                className={[
                  item.left
                    ? "justify-self-start"
                    : item.right
                      ? "justify-self-end"
                      : "justify-self-center",
                  "will-change-[filter,transform,opacity]",
                  item.left
                    ? isDark
                      ? "text-white/90"
                      : "text-neutral-900"
                    : isDark
                      ? "text-white/55"
                      : "text-black/55",
                  idx > 0 && idx < 6 ? "max-md:hidden" : "",
                ].join(" ")}
              >
                {item.left || item.center || item.right}
              </div>
            ))}
          </div>

          <div>
            {rows.slice(0, rowCount).map((cells, idx) => (
              <div
                key={idx}
                ref={(el) => {
                  if (!el || !rowRefs) return;
                  rowRefs.current[idx] = el;
                }}
                className={[
                  "grid items-center gap-4.5 px-5.5 text-[0.9vw] leading-[1.2] max-sm:text-[4vw]",
                  GRID_CLASS,
                  "will-change-[filter,transform,opacity]",
                  idx < 9
                    ? isDark
                      ? "text-white/90"
                      : "text-neutral-900"
                    : isDark
                      ? "text-white/55"
                      : "text-black/55",
                ].join(" ")}
                style={{ height: rowHeight }}
              >
                <div
                  className={[
                    "col-span-2 max-md:w-full max-md:whitespace-nowrap max-md:text-[1.5vw] max-sm:text-[4vw]",
                    isDark ? "text-white/90" : "text-neutral-900",
                  ].join(" ")}
                >
                  {cells[0]}
                </div>
                <div className={[isDark ? "text-white/90" : "text-neutral-900", "max-md:hidden"].join(" ")}>
                  {cells[1]}
                </div>
                <div className="max-md:hidden">{cells[2]}</div>
                <div className="max-md:hidden">{cells[3]}</div>
                <div className="justify-self-start max-md:hidden">{cells[4]}</div>
                <div className="max-md:hidden"></div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function __LinesLoading_clampNumber(value: unknown, min: number, max: number, fallback: number) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(max, Math.max(min, numeric));
}

interface LinesLoadingProps {
  onComplete?: () => void;
  onReplay?: () => void;
  duration?: number;
  lineHeight?: number;
  darkLineColor?: string;
  lightLineColor?: string;
  fadeOutDuration?: number;
}

function Option1({
  onComplete,
  onReplay,
  duration = 1,
  lineHeight = 1,
  darkLineColor = "#ffffff",
  lightLineColor = "#000000",
  fadeOutDuration = 0.5,
}: LinesLoadingProps = {}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const darkLineRefs = useRef<(HTMLDivElement | null)[]>([]);
  const lightLineRefs = useRef<(HTMLDivElement | null)[]>([]);
  const darkNavTextRefs = useRef<(HTMLElement | null)[]>([]);
  const darkRowTextRefs = useRef<(HTMLElement | null)[]>([]);
  const lightNavTextRefs = useRef<(HTMLElement | null)[]>([]);
  const lightRowTextRefs = useRef<(HTMLElement | null)[]>([]);
  const lightLayerRef = useRef<HTMLDivElement | null>(null);
  const darkContentRef = useRef<HTMLDivElement | null>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const layoutRef = useRef<{
    height: number;
    coneY: number[];
    flatY: number[];
    coneScale: number[];
  }>({
    height: 0,
    coneY: [],
    flatY: [],
    coneScale: [],
  });

  const [done, setDone] = useState(false);
  const [rowHeight, setRowHeight] = useState(ROW_H);
  const [lineCount, setLineCount] = useState(getLineCount);
  const lineCountRef = useRef(lineCount);
  const onReplayRef = useRef(onReplay);
  useEffect(() => {
    onReplayRef.current = onReplay;
  }, [onReplay]);
  const safeDuration = __LinesLoading_clampNumber(duration, 0.25, 3, 1);
  const safeLineHeight = __LinesLoading_clampNumber(lineHeight, 1, 12, 1);
  const safeFadeOutDuration = __LinesLoading_clampNumber(fadeOutDuration, 0.1, 3, 0.5);

  const recomputeLayout = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const { height } = el.getBoundingClientRect();
    const h = Math.max(1, Math.round(height));

    const coneY: number[] = [];
    const flatY: number[] = [];
    const coneScale: number[] = [];

    const coneTop = 56;
    const coneBottomPad = 110;
    const flatTop = NAV_H;

    const isMobile = typeof window !== "undefined" && window.innerWidth < 640;
    const rH = isMobile ? 28 : ROW_H;
    setRowHeight(rH);

    const lc = getLineCount();
    lineCountRef.current = lc;
    setLineCount(lc);

    for (let i = 0; i < lc; i++) {
      const t = lc === 1 ? 0 : i / (lc - 1);

      const yCone = lerp(coneTop, h - coneBottomPad, Math.pow(t, 1.55));
      const wPctCone = lerp(0.66, 0.035, Math.pow(t, 1.12));

      const yFlat = flatTop + i * rH;

      coneY.push(yCone);
      flatY.push(yFlat);
      coneScale.push(wPctCone);
    }

    layoutRef.current = { height: h, coneY, flatY, coneScale };
  }, []);

  const run = useCallback(() => {
    tlRef.current?.kill();
    setDone(false);
    onReplayRef.current?.();

    recomputeLayout();

    const darkLineEls = darkLineRefs.current;
    const lightLineEls = lightLineRefs.current;
    const { flatY, coneScale } = layoutRef.current;
    const darkNavTextEls = darkNavTextRefs.current.filter(Boolean);
    const darkRowTextEls = darkRowTextRefs.current.filter(Boolean);
    const lightNavTextEls = lightNavTextRefs.current.filter(Boolean);
    const lightRowTextEls = lightRowTextRefs.current.filter(Boolean);
    const allTextEls = [
      ...darkNavTextEls,
      ...darkRowTextEls,
      ...lightNavTextEls,
      ...lightRowTextEls,
    ];

    gsap.set(darkLineEls, {
      opacity: 1,
      left: "50%",
      xPercent: -50,
      y: (i: number) => flatY[i],
      scaleX: 0,
      transformOrigin: "50% 50%",
    });
    gsap.set(lightLineEls, {
      opacity: 1,
      left: "50%",
      xPercent: -50,
      y: (i: number) => flatY[i],
      scaleX: 1,
      transformOrigin: "50% 50%",
    });
    gsap.set(lightLayerRef.current, {
      clipPath: "inset(100% 0 0 0)",
      opacity: 0,
    });
    gsap.set(darkContentRef.current, { opacity: 0 });
    gsap.set(allTextEls, { opacity: 0, y: 8, filter: "blur(14px)" });

    if (prefersReducedMotion()) {
      gsap.set(darkLineEls, {
        y: (i: number) => flatY[i],
        scaleX: 1,
        opacity: 0,
      });
      gsap.set(lightLineEls, {
        y: (i: number) => flatY[i],
        scaleX: 1,
        opacity: 0,
      });
      gsap.set(lightLayerRef.current, {
        clipPath: "inset(0% 0 0 0)",
        opacity: 0,
      });
      gsap.set(darkContentRef.current, { opacity: 0 });
      gsap.set(allTextEls, { opacity: 0, y: 0, filter: "blur(0px)" });

      const tl = gsap.timeline({
        defaults: { ease: "power2.inOut" },
        onComplete: () => {
          setDone(true);
          onComplete?.();
        },
      });
      tlRef.current = tl;
      tl.timeScale(1 / safeDuration);

      tl.to(lightLayerRef.current, { opacity: 1, duration: 0.65 });
      tl.to(darkContentRef.current, { opacity: 1, duration: 0.65 }, "<");
      tl.to(
        darkLineEls,
        {
          opacity: 1,
          duration: 0.7,
          stagger: { each: 0.035, from: "start" },
        },
        "<"
      );
      tl.to(
        lightLineEls,
        {
          opacity: 1,
          duration: 0.7,
          stagger: { each: 0.035, from: "start" },
        },
        "<"
      );
      tl.to(
        allTextEls,
        { opacity: 1, duration: 0.55 },
        "-=0.3"
      );
      return;
    }

    const tl = gsap.timeline({
      defaults: { ease: "linesLoadingEase" },
      onComplete: () => {
        setDone(true);
        onComplete?.();
      },
    });
    tlRef.current = tl;
    tl.timeScale(1 / safeDuration);

    const staggerS = MORPH_STAGGER / 1000;
    const appearS = APPEAR_DUR / 1000;
    const morphS = MORPH_DUR / 1000;
    const totalS = appearS + morphS;
    const appearPct = totalS === 0 ? 1 : appearS / totalS;
    const scaleSetters = darkLineEls.map((el) =>
      el ? gsap.quickSetter(el, "scaleX") : null,
    );

    const activeLineCount = lineCountRef.current;
    for (let i = 0; i < activeLineCount; i++) {
      const startAt = i * staggerS;
      const setScaleX = scaleSetters[i];
      if (!setScaleX) continue;

      const driver = { p: 0 };
      tl.to(
        driver,
        {
          p: 1,
          duration: totalS,
          onUpdate: () => {
            const p = driver.p;
            const scaled =
              p <= appearPct
                ? coneScale[i] * (appearPct === 0 ? 1 : p / appearPct)
                : coneScale[i] +
                  (1 - coneScale[i]) * ((p - appearPct) / (1 - appearPct));
            setScaleX(scaled);
          },
        },
        startAt,
      );
    }

    const lastStart = (activeLineCount - 1) * staggerS;
    const allLinesEnd = lastStart + totalS;
    const contentAt = CONTENT_FADE_AT;
    const wipeAt = Math.max(
      0,
      allLinesEnd + HOLD_AFTER_MORPH / 1000 - WIPE_OVERLAP,
    );

    tl.to(
      darkContentRef.current,
      {
        opacity: 1,
        duration: CONTENT_FADE_DUR / 1000,
      },
      contentAt,
    );

    tl.addLabel("wipe", wipeAt);
    tl.set(lightLayerRef.current, { opacity: 1 }, "wipe");
    tl.to(
      lightLayerRef.current,
      {
        clipPath: "inset(0% 0 0 0)",
        duration: WIPE_DUR / 1000,
      },
      "wipe",
    );
    tl.to(
      darkLineEls,
      {
        opacity: 0,
        duration: safeFadeOutDuration,
      },
      "wipe",
    );

    const textAt = TEXT_REVEAL_AT;
    tl.to(
      darkNavTextEls,
      { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.45, stagger: 0.03 },
      textAt,
    );
    tl.to(
      lightNavTextEls,
      { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.45, stagger: 0.03 },
      "<",
    );
    tl.to(
      darkRowTextEls,
      { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.55, stagger: 0.05 },
      textAt + 0.08,
    );
    tl.to(
      lightRowTextEls,
      { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.55, stagger: 0.05 },
      "<",
    );
    tl.to({}, { duration: HOLD_AFTER_MORPH / 1000 });
    tl.to({}, { duration: HOLD_END / 1000 });
  }, [onComplete, recomputeLayout, safeDuration, safeFadeOutDuration]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const ro = new ResizeObserver(() => recomputeLayout());
    ro.observe(el);

    const id = setTimeout(run, 60);
    return () => {
      clearTimeout(id);
      ro.disconnect();
      tlRef.current?.kill();
    };
  }, [recomputeLayout, run]);

  return (
    <div
      ref={containerRef}
      className="relative h-screen w-full overflow-hidden bg-black"
    >
      <div className="absolute inset-0">
        <div ref={darkContentRef} className="absolute inset-0 opacity-0">
          <DemoContent
            theme="dark"
            navRefs={darkNavTextRefs}
            rowRefs={darkRowTextRefs}
            rowHeight={rowHeight}
            lineCount={lineCount}
          />
        </div>
        <div className="pointer-events-none absolute inset-0">
          {Array.from({ length: lineCount }, (_, i) => (
            <div
              key={i}
              ref={(el) => {
                darkLineRefs.current[i] = el;
              }}
              className="absolute left-1/2 top-0 w-full origin-center will-change-transform"
              style={{ height: safeLineHeight, backgroundColor: darkLineColor }}
            />
          ))}
        </div>
      </div>

      <div
        ref={lightLayerRef}
        className="absolute inset-0 opacity-0 [clip-path:inset(100%_0_0_0)] will-change-[clip-path]"
      >
        <DemoContent
          theme="light"
          navRefs={lightNavTextRefs}
          rowRefs={lightRowTextRefs}
          rowHeight={rowHeight}
          lineCount={lineCount}
        />
        <div className="pointer-events-none absolute inset-0">
          {Array.from({ length: lineCount }, (_, i) => (
            <div
              key={i}
              ref={(el) => {
                lightLineRefs.current[i] = el;
              }}
              className="absolute left-1/2 top-0 w-full origin-center will-change-transform"
              style={{ height: safeLineHeight, backgroundColor: lightLineColor }}
            />
          ))}
        </div>
      </div>

      {done && (
        <button
          onClick={run}
          className="absolute bottom-7 max-md:bottom-5 max-sm:bottom-8 left-1/2 z-10 -translate-x-1/2 cursor-pointer max-sm:text-sm max-md:text-base rounded-sm border border-black/25 bg-white/70 px-5.5 py-1.5 font-mono text-sm tracking-widest text-neutral-900 "
        >
          Replay
        </button>
      )}
    </div>
  );
}

gsap.registerPlugin(CustomEase);
CustomEase.create("centerLinesEase", "0.75,-0.01,0.16,1");

const DEFAULT_LINE_COUNT = 33;
const LINE_H = 1;
const EDGE_PAD = 12;
const DIAMOND_MAX = 0.92;
const DIAMOND_MIN = 0.06;

const STAGGER_MS = 34;
const APPEAR_MS = 260;
const MORPH_MS = 720;
const PAIR_FADE_MS = 260;
const TRANSLATE_UP_MS = 820;
const HOLD_END_MS = 260;

function __CenterLinesLoading_clampNumber(value: unknown, min: number, max: number, fallback: number) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return fallback;
    return Math.min(max, Math.max(min, numeric));
}

interface CenterLinesLoadingProps {
    lineCount?: number;
    title?: string;
    subtitle?: string;
    duration?: number;
    lineHeight?: number;
    darkLineColor?: string;
    fadeOutDuration?: number;
    onComplete?: () => void;
    onReplay?: () => void;
}

function Option2(
    {
        lineCount = DEFAULT_LINE_COUNT,
        title = "Build better interfaces",
        subtitle = "Hyperiux Vault",
        duration = 1,
        lineHeight = 1,
        darkLineColor = "#ffffff",
        fadeOutDuration = 0.5,
        onComplete,
        onReplay,
    }: CenterLinesLoadingProps = {}
) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const blackPanelRef = useRef<HTMLDivElement | null>(null);
    const revealPanelRef = useRef<HTMLDivElement | null>(null);
    const linesWrapRef = useRef<HTMLDivElement | null>(null);
    const heroWordRefs = useRef<(HTMLElement | null)[]>([]);
    const heroSubtitleRef = useRef<HTMLParagraphElement | null>(null);
    const lineRefs = useRef<(HTMLDivElement | null)[]>([]);
    const tlRef = useRef<gsap.core.Timeline | null>(null);
    const layoutRef = useRef<{ y: number[]; coneScale: number[] }>({
      y: [],
      coneScale: [],
    });
    const [done, setDone] = useState(false);
    const onReplayRef = useRef(onReplay);
    useEffect(() => {
        onReplayRef.current = onReplay;
    }, [onReplay]);
    const safeDuration = __CenterLinesLoading_clampNumber(duration, 0.25, 3, 1);
    const safeLineHeight = __CenterLinesLoading_clampNumber(lineHeight, 1, 12, 1);
    const safeFadeOutDuration = __CenterLinesLoading_clampNumber(fadeOutDuration, 0.1, 3, 0.5);

    const recomputeLayout = useCallback(
      (lineCount: number) => {
        const el = containerRef.current;
        if (!el) return;
        const { height } = el.getBoundingClientRect();
        const h = Math.max(1, Math.round(height));

        const count = Math.max(3, Math.floor(lineCount));
        const mid = (count - 1) / 2;
        const usable = Math.max(1, h - EDGE_PAD * 2);
        const spacing = usable / Math.max(1, count - 1);
        const topY = EDGE_PAD;

        const y: number[] = [];
        const coneScale: number[] = [];

        for (let i = 0; i < count; i++) {
            y.push(Math.round(topY + i * spacing));

            const t = mid === 0 ? 0 : Math.abs(i - mid) / mid;
            const wPct = lerp(DIAMOND_MAX, DIAMOND_MIN, t);
            coneScale.push(wPct);
        }

        layoutRef.current = { y, coneScale };
    }, []);

    const heroWords = title.split("").filter((c) => c !== " ");
    const words = title.split(" ");

    const run = useCallback(() => {
        tlRef.current?.kill();
        setDone(false);
       
        onReplayRef.current?.();

        const count = Math.max(3, Math.floor(lineCount));
        recomputeLayout(count);

        const lines = lineRefs.current.slice(0, count);
        const { y, coneScale } = layoutRef.current;

        const wordEls = heroWordRefs.current.slice(0, heroWords.length).filter(Boolean);

        gsap.set(blackPanelRef.current, { yPercent: 0, opacity: 1 });
        gsap.set(revealPanelRef.current, { scaleY: 0, transformOrigin: "50% 50%" });
        gsap.set(linesWrapRef.current, { opacity: 1 });
        gsap.set(wordEls, { opacity: 0, y: 16, filter: "blur(12px)" });
        gsap.set(heroSubtitleRef.current, { opacity: 0, y: 14, filter: "blur(10px)" });
        gsap.set(lines, {
            opacity: 1,
            left: "50%",
            xPercent: -50,
            y: (i: number) => y[i],
            scaleX: 0,
            transformOrigin: "50% 50%",
        });

        if (prefersReducedMotion()) {
            gsap.set(lines, {
                scaleX: 1,
                opacity: 0,
                y: (i: number) => y[i],
            });
            gsap.set(linesWrapRef.current, { opacity: 1 });
            gsap.set(revealPanelRef.current, {
                scaleY: 1,
                opacity: 0,
                transformOrigin: "50% 50%",
            });
            gsap.set(blackPanelRef.current, { opacity: 1 });
            gsap.set(wordEls, { opacity: 0, y: 0, filter: "blur(0px)" });
            gsap.set(heroSubtitleRef.current, {
                opacity: 0,
                y: 0,
                filter: "blur(0px)",
            });

            const tl = gsap.timeline({
                defaults: { ease: "power2.inOut" },
                onComplete: () => {
                    setDone(true);
                    onComplete?.();
                },
            });
            tlRef.current = tl;
            tl.timeScale(1 / safeDuration);

            tl.to(lines, {
                opacity: 1,
                duration: 0.65,
                stagger: { each: 0.02, from: "center" },
            });
            tl.to(
                lines,
                {
                    opacity: 0,
                    duration: safeFadeOutDuration,
                    stagger: { each: 0.015, from: "edges" },
                },
                "+=0.35"
            );
            tl.to(linesWrapRef.current, { opacity: 0, duration: 0.35 }, "<");
            tl.to(
                revealPanelRef.current,
                { opacity: 1, duration: 0.55 },
                "-=0.2"
            );
            tl.to(blackPanelRef.current, { opacity: 0, duration: 0.55 }, "<");
            tl.to(
                wordEls,
                {
                    opacity: 1,
                    duration: 0.5,
                },
                "-=0.2"
            );
            tl.to(
                heroSubtitleRef.current,
                { opacity: 1, duration: 0.45 },
                "-=0.25"
            );
            return;
        }

        const staggerS = STAGGER_MS / 1000;
        const appearS = APPEAR_MS / 1000;
        const morphS = MORPH_MS / 1000;
        const totalS = appearS + morphS;
        const appearPct = totalS === 0 ? 1 : appearS / totalS;
        const scaleSetters = lines.map((el) => (el ? gsap.quickSetter(el, "scaleX") : null));

        const tl = gsap.timeline({
            defaults: { ease: "centerLinesEase" },
            onComplete: () => {
                setDone(true);
                onComplete?.();
            },
        });
        tlRef.current = tl;
        tl.timeScale(1 / safeDuration);

        const mid = (count - 1) / 2;
        const orderIdx = Array.from({ length: count }, (_, i) => i).sort((a, b) => {
            const da = Math.abs(a - mid);
            const db = Math.abs(b - mid);
            return da - db;
        });

        for (let i = 0; i < count; i++) {
            const idx = orderIdx[i];
            const startAt = i * staggerS;
            const setScaleX = scaleSetters[idx];
            if (!setScaleX) continue;

            const driver = { p: 0 };
            tl.to(
                driver,
                {
                    p: 1,
                    duration: totalS,
                    onUpdate: () => {
                        const p = driver.p;
                        const scaled =
                            p <= appearPct
                                ? coneScale[idx] * (appearPct === 0 ? 1 : p / appearPct)
                                : coneScale[idx] + (1 - coneScale[idx]) * ((p - appearPct) / (1 - appearPct));
                        setScaleX(scaled);
                    },
                },
                startAt
            );
        }

        const lastStart = (count - 1) * staggerS;
        const allLinesEnd = lastStart + totalS;

        const midIdx = Math.floor((count - 1) / 2);
        const pairCount = midIdx;
        const pairFadeDur = safeFadeOutDuration;
        const pairGap = 0.045;
        for (let k = 0; k < pairCount; k++) {
            const a = k;
            const b = count - 1 - k;
            tl.to(
                [lines[a], lines[b]].filter(Boolean),
                { opacity: 0, duration: pairFadeDur },
                allLinesEnd + k * pairGap
            );
        }

        const pairsEnd = allLinesEnd + (pairCount - 1) * pairGap + pairFadeDur;
        const revealStart = pairsEnd + 0.02;

        tl.to(
            revealPanelRef.current,
            { scaleY: 1, duration: TRANSLATE_UP_MS / 1000 },
            revealStart
        );
        tl.to(
            blackPanelRef.current,
            { opacity: 0, duration: TRANSLATE_UP_MS / 1000 + 0.25 },
            revealStart + 0.14
        );
        tl.to(linesWrapRef.current, { opacity: 0, duration: safeFadeOutDuration }, revealStart + 0.06);
        tl.to(lines[midIdx], { opacity: 0, duration: safeFadeOutDuration }, revealStart + 0.06);

        tl.to(
            wordEls,
            {
                opacity: 1,
                y: 0,
                filter: "blur(0px)",
                duration: 0.78,
                stagger: 0.06,
            },
            revealStart + 0.18
        );
        tl.to(
            heroSubtitleRef.current,
            {
                opacity: 1,
                y: 0,
                filter: "blur(0px)",
                duration: 0.68,
            },
            revealStart + 0.32
        );
        tl.to({}, { duration: Math.max(0, HOLD_END_MS / 1000) }, revealStart + TRANSLATE_UP_MS / 1000);
    }, [heroWords.length, lineCount, onComplete, recomputeLayout, safeDuration, safeFadeOutDuration]);

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;

        const count = Math.max(3, Math.floor(lineCount));
        const ro = new ResizeObserver(() => recomputeLayout(count));
        ro.observe(el);

        const id = setTimeout(run, 60);
        return () => {
            clearTimeout(id);
            ro.disconnect();
            tlRef.current?.kill();
        };
    }, [lineCount, recomputeLayout, run]);

    let charIdx = 0;
    return (
        <div ref={containerRef} className="fixed inset-0 h-screen w-screen overflow-hidden bg-black">
            <div
                ref={blackPanelRef}
                className="absolute inset-0 z-20 bg-black will-change-transform"
            />
            <div
                ref={revealPanelRef}
                className="absolute inset-0 z-30 bg-white scale-y-0 will-change-transform"
            />
            <div className="absolute inset-0 z-50 flex items-center justify-center">
                <div className="px-6 text-center">
                    <h1 className="select-none font-mono text-[3.5vw] max-md:text-[5vw] max-sm:text-[10vw] font-semibold leading-[1.05] tracking-[-0.03em] text-black">
                        {words.map((word, wordIdx) => (
                            <span key={`${word}-${wordIdx}`}>
                                <span className="inline-block whitespace-nowrap">
                                    {word.split("").map((char, charIdxInWord) => {
                                        const currentIdx = charIdx++;
                                        return (
                                            <span
                                                key={`${char}-${charIdxInWord}`}
                                                ref={(el) => {
                                                    heroWordRefs.current[currentIdx] = el;
                                                }}
                                                className="inline-block opacity-0"
                                            >
                                                {char}
                                            </span>
                                        );
                                    })}
                                </span>
                                {wordIdx === words.length - 1 ? "" : " "}
                            </span>
                        ))}
                    </h1>
                    <p
                        ref={heroSubtitleRef}
                        className="mt-4 select-none font-mono text-[13px] tracking-[0.18em] text-black/70 opacity-0"
                    >
                        {subtitle}
                    </p>
                </div>
            </div>
            <div ref={linesWrapRef} className="pointer-events-none absolute inset-0 z-40 opacity-0">
                {Array.from({ length: Math.max(3, Math.floor(lineCount)) }, (_, i) => (
                    <div
                        key={i}
                        ref={(el) => {
                            lineRefs.current[i] = el;
                        }}
                        className="absolute left-1/2 top-0 w-full origin-center will-change-transform"
                        style={{ height: safeLineHeight, backgroundColor: darkLineColor }}
                    />
                ))}
            </div>

            {done && (
                <button
                    onClick={run}
                    className="absolute bottom-7 max-md:bottom-10 left-1/2 z-60 -translate-x-1/2 cursor-pointer rounded-sm border border-black/20 bg-black/5 px-5.5 py-1.75 font-mono text-[0.75vw] max-md:text-base max-sm:text-sm tracking-widest text-black/70 backdrop-blur max-sm:bottom-20"
                >
                    Replay
                </button>
            )}
        </div>
    );
}

type LinesLoaderVariant = "option1" | "option2";

const VARIANTS: Record<LinesLoaderVariant, ComponentType<any>> = {
  option1: Option1,
  option2: Option2,
};

const VERSIONS: { label: string; value: LinesLoaderVariant }[] = [
  {
    label: "V1",
    value: "option1",
  },
  {
    label: "V2",
    value: "option2",
  },
];

interface LinesLoaderProps {
  onComplete?: () => void;
  onVariantChange?: (variant: LinesLoaderVariant) => void;
  [key: string]: unknown;
}

export default function LinesLoader({ onComplete, onVariantChange, ...props }: LinesLoaderProps) {
  const [activeVariant, setActiveVariant] = useState<LinesLoaderVariant>("option1");
  const [isCompleted, setIsCompleted] = useState(false);

  const ActiveComponent = useMemo(() => {
    return VARIANTS[activeVariant] || Option1;
  }, [activeVariant]);

  const onCompleteRef = useRef(onComplete);
  const onVariantChangeRef = useRef(onVariantChange);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    onVariantChangeRef.current = onVariantChange;
  }, [onVariantChange]);

  const handleVariantChange = useCallback((newVariant: LinesLoaderVariant) => {
    if (newVariant === activeVariant) return;

    setActiveVariant(newVariant);
    setIsCompleted(false);
    if (onVariantChangeRef.current) {
      onVariantChangeRef.current(newVariant);
    }
  }, [activeVariant]);

  const handleComplete = useCallback(() => {
    setIsCompleted(true);
    if (onCompleteRef.current) {
      onCompleteRef.current();
    }
  }, []);

  
  const handleReplay = useCallback(() => {
    setIsCompleted(false);
  }, []);

  return (
    <>
      <VersionNav
        activeVariant={activeVariant}
        onVariantChange={handleVariantChange}
        isCompleted={isCompleted}
      />
      {activeVariant === "option1" ? (
        <ActiveComponent
          key={activeVariant}
          onComplete={handleComplete}
          onReplay={handleReplay}
          {...props}
        />
      ) : (
        <ActiveComponent
          key={activeVariant}
          lineCount={41}
          title="Build better interfaces"
          subtitle="Hyperiux Vault"
          onComplete={handleComplete}
          onReplay={handleReplay}
          {...props}
        />
      )}
    </>
  );
}

interface VersionNavProps {
  activeVariant: LinesLoaderVariant;
  onVariantChange: (variant: LinesLoaderVariant) => void;
  isCompleted: boolean;
}

function VersionNav({ activeVariant, onVariantChange, isCompleted }: VersionNavProps) {
  return (
    <div
      className={`fixed bottom-30 max-md:bottom-[14vh] left-1/2 z-2 flex -translate-x-1/2 flex-col items-center gap-10 max-md:gap-4 transition-all duration-500 max-lg:bottom-35  ${
        isCompleted
          ? "translate-y-0 opacity-100 pointer-events-auto"
          : "translate-y-4 opacity-0 pointer-events-none"
      }`}
    >
      <div className="flex flex-col items-center">
        <a
          href="/effects"
          className="rounded-full flex items-center gap-1 px-6 py-2 text-base  text-black transition-colors hover:text-primary duration-300 ease-in"
        >
          Explore all effects
          <ArrowUpRight className="size-4" />
        </a>
          <a
          href="/effects/loaders/lines-loader"
          className="rounded-full flex items-center gap-1 px-6 py-2 text-base  text-black transition-colors hover:text-primary duration-300 ease-in"
        >
          Read Article
          <ArrowUpRight className="size-4" />
        </a>
        </div>
      <nav className="flex gap-1 rounded-full border border-white/20 bg-black px-1.5 py-1.5 backdrop-blur-md transition-all duration-300 max-lg:px-3 max-lg:py-2 max-md:px-2 max-md:py-1.5">
        {VERSIONS.map((variant) => {
          const isActive = activeVariant === variant.value;
          const btnClass = isCompleted
            ? (isActive ? "bg-white text-black" : "text-white/65 hover:text-white")
            : (isActive ? "bg-white text-black" : "text-white/65 hover:text-white");

          return (
            <button
              key={variant.value}
              type="button"
              disabled={isActive}
              aria-current={isActive ? "true" : undefined}
              onClick={() => onVariantChange(variant.value)}
              className={`rounded-full px-5 py-1.5 text-sm font-semibold tracking-widest transition-all duration-200 disabled:cursor-default disabled:pointer-events-none max-lg:text-lg max-md:text-sm ${btnClass}`}
            >
              {variant.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
