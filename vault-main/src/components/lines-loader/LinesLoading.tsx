"use client";
import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject, type ReactNode } from "react";
import gsap from "gsap";
import { CustomEase } from "gsap/CustomEase";
import { lerp, prefersReducedMotion } from "./utils";

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
      { left: <span className="font-bold tracking-tighter max-[1025px]:text-2xl max-md:text-2xl">Hyperiux Vault</span> },
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

function clampNumber(value: unknown, min: number, max: number, fallback: number) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(max, Math.max(min, numeric));
}

interface LinesLoadingProps {
  onComplete?: () => void;
  duration?: number;
  lineHeight?: number;
  darkLineColor?: string;
  lightLineColor?: string;
  fadeOutDuration?: number;
}

export default function LinesLoading({
  onComplete,
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
  const safeDuration = clampNumber(duration, 0.25, 3, 1);
  const safeLineHeight = clampNumber(lineHeight, 1, 12, 1);
  const safeFadeOutDuration = clampNumber(fadeOutDuration, 0.1, 3, 0.5);

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
      // Keep lines at their final (flat) positions for the entire sequence.
      y: (i: number) => flatY[i],
      scaleX: 0,
      transformOrigin: "50% 50%",
    });
    gsap.set(lightLineEls, {
      // Black lines are pre-drawn; the wipe (clip-path) reveals them.
      opacity: 1,
      left: "50%",
      xPercent: -50,
      y: (i: number) => flatY[i],
      scaleX: 1,
      transformOrigin: "50% 50%",
    });
    // Light layer reveals bottom -> top (to match the reference"translate up" wipe)
    // Start fully clipped from the top, then animate top inset to 0.
    gsap.set(lightLayerRef.current, {
      clipPath: "inset(100% 0 0 0)",
      opacity: 0,
    });
    gsap.set(darkContentRef.current, { opacity: 0 });
    gsap.set(allTextEls, { opacity: 0, y: 8, filter: "blur(14px)" });

    if (prefersReducedMotion()) {
      // Lines already at final layout - smooth opacity only (no scale morph / wipe).
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

    // One continuous tween per line (prevents the"stop" between phase 1 and phase 2).
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
    // Text reveals on black first (dark layer), while the wipe reveals the light layer (color swap in sync).
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
        {/* Light layer holds the final UI; its text reveals after the line/wipe sequence */}
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
