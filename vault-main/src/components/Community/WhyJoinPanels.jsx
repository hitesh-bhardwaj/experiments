"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { prefersReducedMotion } from "@/lib/motion";
import { useInteraction } from "@/homepage-v3/components/InteractionProvider";
import CardFluid from "@/homepage-v3/components/CardFluid";

// Teardown timeline
const TD_DURATION = 2.4;
const TD_PAUSE = 1.2;
const TD_KEYS = [0, 0.18, 0.42, 0.7, 1];
const TD_WORDS = ["Small", "motion.", "Big", "signal."];
const TD_LINES = [
  [["k", "gsap"], ".timeline()"],
  ["  .from(card, { y: 80, opacity: 0, ", ["k", "ease"], ': "expo.out" })'],
  ["  .from(words, { yPercent: 110, ", ["k", "stagger"], ": 0.06 }, 0.18)"],
  ["  .from(glow, { scale: 0.6, opacity: 0 }, 0.42)"],
  ['  .to(card, { boxShadow: "0 30px 60px -20px #FF6B00" }, 0.7)'],
];
const SCRUB_MAX = 1000;
const MANUAL_HOLD_MS = 1500;

// Critique loop
const CRIT_LOOP_S = 4.2;
const CRIT_PINS = [
  { at: 0.18, who: "@lena", text: "The ease-in at the start reads hesitant. Try expo.out and let it land." },
  { at: 0.46, who: "@arjun", text: "Two frames drop here on my Pixel. Promote the card to its own layer." },
  { at: 0.78, who: "@mika", text: "The settle is gorgeous. Shave 80ms off and it’ll feel snappier." },
];
const PIN_WINDOW = 0.09;

const VOTE_IDEAS = [
  { title: "Liquid cursor", text: "A cursor that pools and drips on hover" },
  { title: "WebGL page curl", text: "Routes that peel like paper" },
  { title: "Magnetic gallery", text: "Images that lean toward intent" },
  { title: "3D product scrub", text: "Scroll that turns a model in your hands" },
];

const MAX_DPR = 2;
const easeOutExpo = (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
const clamp01 = (v) => Math.max(0, Math.min(1, v));

// Shared card shell and small uppercase label
const CARD = "relative isolate flex aspect-[16/11] flex-col overflow-hidden bg-dark-card text-foreground max-md:aspect-[4/5]";
const LABEL = "font-avenir text-[0.7vw] font-medium uppercase tracking-[0.1em] max-md:text-[2.8vw]";

// Site colour tokens for the canvases (globals.css)
const cssColor = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
const withAlpha = (hex, a) => {
  const n = parseInt(hex.replace("#", "").replace(/^(.)(.)(.)$/, "$1$1$2$2$3$3"), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
};

// Keep a canvas's backing store matched to its CSS size; returns the scale
function fitCanvas(cv) {
  const r = cv.getBoundingClientRect();
  const d = Math.min(devicePixelRatio || 1, MAX_DPR);
  const w = Math.max(2, Math.round(r.width * d));
  const h = Math.max(2, Math.round(r.height * d));
  if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
  return d;
}

// Run `draw(now)` every frame only while `ref` is on screen. Under reduced
// motion it draws a single frame (at `stillAt` ms) whenever it scrolls in.
function useVisibleLoop(ref, draw, stillAt = 0) {
  const drawRef = useRef(draw);
  useLayoutEffect(() => { drawRef.current = draw; });

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const still = prefersReducedMotion();
    let raf = 0;
    const loop = (now) => { raf = requestAnimationFrame(loop); drawRef.current(now); };
    const io = new IntersectionObserver(([entry]) => {
      cancelAnimationFrame(raf);
      if (!entry.isIntersecting) return;
      if (still) drawRef.current(stillAt);
      else raf = requestAnimationFrame(loop);
    });
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [ref, stillAt]);
}

// 01 teardown: scrub a split-reveal and read the code that drives each phase
export function TeardownCard() {
  const cardRef = useRef(null);
  const canvasRef = useRef(null);
  const boxRef = useRef(null);
  const manualUntilRef = useRef(0);
  const { sound } = useInteraction() ?? {};
  const [progress, setProgress] = useState(1);

  const paint = (p) => {
    const cv = canvasRef.current;
    if (!cv) return;
    const d = fitCanvas(cv);
    const W = cv.width, H = cv.height, g = cv.getContext("2d"), t = p * TD_DURATION;
    g.clearRect(0, 0, W, H);
    const primary = cssColor("--primary"), fg = cssColor("--foreground");
    const cp = easeOutExpo(Math.min(1, t / 0.9));
    const cw = W * 0.6, ch = H * 0.62, cx = (W - cw) / 2, cy = (H - ch) / 2 + (1 - cp) * 80 * d;
    g.globalAlpha = cp;
    const gp = easeOutExpo(clamp01((t - 1) / 0.9));
    if (gp > 0) {
      const rg = g.createRadialGradient(W / 2, cy + ch * 0.3, 0, W / 2, cy + ch * 0.3, cw * 0.9 * (0.6 + 0.4 * gp));
      rg.addColorStop(0, withAlpha(primary, 0.35 * gp));
      rg.addColorStop(1, withAlpha(primary, 0));
      g.fillStyle = rg;
      g.fillRect(0, 0, W, H);
    }
    // The box itself is a DOM element (so it can blur the fluid behind it); the canvas positions it
    const box = boxRef.current;
    if (box) {
      Object.assign(box.style, {
        left: `${cx / d}px`, top: `${cy / d}px`, width: `${cw / d}px`, height: `${ch / d}px`,
        opacity: cp,
        borderColor: withAlpha(primary, 0.2 + 0.5 * easeOutExpo(Math.max(0, (t - 1.7) / 0.6))),
      });
    }
    const family = getComputedStyle(cv).fontFamily || "sans-serif";
    g.font = `500 ${Math.round(H * 0.1)}px ${family}`;
    let x = cx + cw * 0.1, y = cy + ch * 0.42;
    TD_WORDS.forEach((w, i) => {
      const wp = easeOutExpo(clamp01((t - 0.43 - i * 0.14) / 0.7));
      const ww = g.measureText(`${w} `).width;
      if (i === 2) { x = cx + cw * 0.1; y += H * 0.13; }
      g.save();
      g.beginPath();
      g.rect(x, y - H * 0.11, ww, H * 0.15);
      g.clip();
      g.fillStyle = i > 1 ? primary : fg;
      g.fillText(w, x, y + (1 - wp) * H * 0.13);
      g.restore();
      x += ww;
    });
    g.globalAlpha = 1;
  };

  useVisibleLoop(cardRef, (now) => {
    if (now < manualUntilRef.current) return;
    const p = Math.min(1, ((now / 1000) % (TD_DURATION + TD_PAUSE)) / TD_DURATION);
    paint(p);
    setProgress(p);
  }, TD_DURATION * 1000);

  const phase = TD_KEYS.findLastIndex((k) => progress >= k - 0.001);

  const onScrub = (e) => {
    const p = e.target.value / SCRUB_MAX;
    manualUntilRef.current = performance.now() + MANUAL_HOLD_MS;
    const next = TD_KEYS.findLastIndex((k) => p >= k - 0.001);
    if (next !== phase) sound?.note?.(next);
    paint(p);
    setProgress(p);
  };

  return (
    <div ref={cardRef} className={CARD}>
      <CardFluid />
      <div className="relative min-h-0 flex-1">
        <div ref={boxRef} className="absolute border border-transparent bg-black/20 backdrop-blur-lg" aria-hidden="true" />
        <canvas ref={canvasRef} className="absolute inset-0 size-full font-aeonik" aria-hidden="true" />
      </div>
      <div className="relative flex items-center gap-[1vw] border-t border-foreground/10 px-[1.4vw] py-[0.8vw] max-md:gap-[3.5vw] max-md:px-[5vw] max-md:py-[3vw]">
        <div className="absolute top-1/2 right-[5.8vw] left-[1.4vw] h-0 max-md:right-[21vw] max-md:left-[5vw]" aria-hidden="true">
          {TD_KEYS.map((k) => (
            <i
              key={k}
              className={`absolute -top-[0.35vw] -ml-[0.35vw] size-[0.7vw] rotate-45 ring-1 ring-inset ring-primary/60 max-md:-top-[1.3vw] max-md:-ml-[1.3vw] max-md:size-[2.6vw] ${progress >= k - 0.001 ? "bg-primary" : "bg-foreground/10"}`}
              style={{ left: `${k * 100}%` }}
            />
          ))}
        </div>
        <input
          className="relative z-1 flex-1 accent-primary"
          type="range"
          min="0"
          max={SCRUB_MAX}
          value={Math.round(progress * SCRUB_MAX)}
          onChange={onScrub}
          onPointerDown={() => { manualUntilRef.current = Infinity; }}
          onPointerUp={() => { manualUntilRef.current = performance.now() + MANUAL_HOLD_MS; }}
          aria-label="Scrub the teardown timeline"
        />
        <span className={`${LABEL} min-w-[3.8vw] text-right text-foreground/60 tabular-nums max-md:min-w-[14vw]`}>{(progress * TD_DURATION).toFixed(2)}s</span>
      </div>
      <pre className="relative m-0 overflow-hidden border-t border-foreground/5 px-[1.4vw] py-[0.9vw] font-mono text-[0.8vw] leading-[1.8] whitespace-pre text-foreground/40 max-md:px-[3.6vw] max-md:py-[3vw] max-md:text-[2.7vw]" aria-hidden="true">
        {TD_LINES.map((parts, i) => (
          <span key={i} className={i === Math.min(TD_LINES.length - 1, phase) ? "bg-primary/15 text-foreground shadow-[-1.4vw_0_0_color-mix(in_srgb,var(--primary)_15%,transparent),1.4vw_0_0_color-mix(in_srgb,var(--primary)_15%,transparent)]" : ""}>
            {parts.map((part, j) => (Array.isArray(part) ? <span key={j} className="text-[#FFB27A]">{part[1]}</span> : part))}
            {i < TD_LINES.length - 1 ? "\n" : ""}
          </span>
        ))}
      </pre>
    </div>
  );
}

// 02 vote: toggle, and voted ideas float to the top
export function VoteCard() {
  const listRef = useRef(null);
  const firstTops = useRef(null);
  const { sound } = useInteraction() ?? {};
  const [voted, setVoted] = useState([]);

  const order = [...VOTE_IDEAS.keys()].sort((a, b) => (voted.includes(b) ? 1 : 0) - (voted.includes(a) ? 1 : 0));

  // FLIP: animate each row from where it was before the re-sort
  useLayoutEffect(() => {
    const tops = firstTops.current;
    firstTops.current = null;
    if (!tops || prefersReducedMotion()) return undefined;
    const tweens = [];
    listRef.current.querySelectorAll("li").forEach((li) => {
      const dy = tops.get(li.dataset.idea) - li.getBoundingClientRect().top;
      if (dy) tweens.push(gsap.fromTo(li, { y: dy }, { y: 0, duration: 1, ease: "expo.out" }));
    });
    return () => tweens.forEach((t) => t.kill());
  }, [voted]);

  const toggle = (i) => {
    const tops = new Map();
    listRef.current.querySelectorAll("li").forEach((li) => tops.set(li.dataset.idea, li.getBoundingClientRect().top));
    firstTops.current = tops;
    sound?.note?.(i + 1);
    setVoted((v) => (v.includes(i) ? v.filter((x) => x !== i) : [...v, i]));
  };

  return (
    <div className={`${CARD} gap-[1vw] p-[2vw] max-md:gap-[3.5vw] max-md:p-[5vw]`}>
      <CardFluid />
      <p className={`${LABEL} relative text-foreground/60`}>Up next in the vault · you decide</p>
      <ul ref={listRef} className="relative flex flex-col gap-[0.6vw] max-md:gap-[2vw]">
        {order.map((i) => {
          const on = voted.includes(i);
          return (
            <li
              key={i}
              data-idea={i}
              className={`flex items-center justify-between gap-[1vw] px-[1.1vw] py-[1vw] ring-1 ring-inset transition-[background-color,box-shadow] duration-700 ease-[cubic-bezier(.16,1,.3,1)] max-md:gap-[3.5vw] max-md:px-[4vw] max-md:py-[3.5vw] ${on ? "bg-primary/10 ring-primary/45" : "bg-black/20 ring-foreground/10 backdrop-blur-lg"}`}
            >
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="text24 font-aeonik text-foreground">{VOTE_IDEAS[i].title}</span>
                <span className="text18 text-foreground/50">{VOTE_IDEAS[i].text}</span>
              </div>
              <button
                type="button"
                aria-pressed={on}
                onClick={() => toggle(i)}
                className={`${LABEL} h-[2.4vw] shrink-0 px-[1vw] ring-1 ring-inset transition-[background-color,color,box-shadow] duration-600 ease-[cubic-bezier(.16,1,.3,1)] max-md:h-[9vw] max-md:px-[3.5vw] ${on ? "bg-primary text-background ring-primary" : "text-foreground/80 ring-foreground/15 hover:ring-primary/60"}`}
              >
                {on ? "Voted ✓" : "Vote"}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// 03 critique: a work-in-progress loop with timestamped comments
export function CritiqueCard() {
  const cardRef = useRef(null);
  const canvasRef = useRef(null);
  const playRef = useRef(null);
  const [activePin, setActivePin] = useState(-1);

  useVisibleLoop(cardRef, (now) => {
    const cv = canvasRef.current;
    if (!cv) return;
    const d = fitCanvas(cv);
    const W = cv.width, H = cv.height, g = cv.getContext("2d");
    const p = ((now / 1000) % CRIT_LOOP_S) / CRIT_LOOP_S;
    g.clearRect(0, 0, W, H);
    const e = p < 0.5 ? Math.pow(p / 0.5, 2.2) : 1 - Math.pow(1 - (p - 0.5) / 0.5, 3);
    const x = W * 0.15 + e * W * 0.7, y = H * 0.55;
    const primary = cssColor("--primary");
    g.fillStyle = withAlpha(primary, 0.12);
    for (let k = 1; k < 6; k++) {
      g.beginPath();
      g.arc(x - k * 14 * d * (p < 0.5 ? 1 : -1), y, 22 * d - k * 3 * d, 0, 7);
      g.fill();
    }
    g.fillStyle = primary;
    g.beginPath();
    g.roundRect(x - 28 * d, y - 28 * d, 56 * d, 56 * d, 12 * d);
    g.fill();
    if (playRef.current) playRef.current.style.width = `${p * 100}%`;
    const hitPin = CRIT_PINS.findIndex((pin) => Math.abs(p - pin.at) < PIN_WINDOW);
    setActivePin((cur) => (cur === hitPin ? cur : hitPin));
  }, CRIT_LOOP_S * 1000 * 0.6);

  return (
    <div ref={cardRef} className={CARD}>
      <CardFluid />
      <div className="relative flex-1">
        <canvas ref={canvasRef} className="absolute inset-0 size-full" aria-hidden="true" />
        <span className={`${LABEL} absolute top-[1.2vw] left-[1.4vw] text-foreground/50 max-md:top-[4.5vw] max-md:left-[5vw]`}>Example thread · work in progress</span>
      </div>
      <div className="relative px-[1.7vw] pb-[1.5vw] max-md:px-[6vw] max-md:pb-[5.6vw]">
        <div className="relative h-[4.4vw] border-t border-foreground/10 max-md:h-[16vw]">
          <i ref={playRef} className="absolute -top-px left-0 h-px w-0 bg-primary" />
          {CRIT_PINS.map((pin, i) => (
            <button
              key={pin.who}
              type="button"
              style={{ left: `${pin.at * 100}%` }}
              className={`group/pin absolute -top-[0.6vw] -ml-[0.6vw] size-[1.2vw] bg-primary transition-shadow duration-600 ease-[cubic-bezier(.16,1,.3,1)] hover:ring-[0.5vw] hover:ring-primary/30 focus-visible:ring-[0.5vw] focus-visible:ring-primary/30 max-md:-top-[2.3vw] max-md:-ml-[2.3vw] max-md:size-[4.6vw] ${activePin === i ? "ring-[0.5vw] ring-primary/30" : "ring-[0.3vw] ring-primary/20"}`}
            >
              <span
                className={`pointer-events-none absolute bottom-[calc(100%+0.8vw)] w-[17vw] bg-light px-[1vw] py-[0.8vw] text-left text18 leading-[1.4] text-ink transition-opacity duration-500 ease-[cubic-bezier(.16,1,.3,1)] group-hover/pin:opacity-100 group-focus-visible/pin:opacity-100 max-md:w-[52vw] max-md:px-[3.5vw] max-md:py-[3vw] ${activePin === i ? "opacity-100" : "opacity-0"} ${i === 0 ? "-left-[1.4vw]" : i === CRIT_PINS.length - 1 ? "-right-[1.4vw]" : "left-1/2 -translate-x-1/2"}`}
              >
                <b className="block font-bold text-[#B34A00]">{pin.who}</b> {pin.text}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// 04 featured: the spotlight card, addressed to the visitor once they join
export function FeaturedCard({ joined }) {
  return (
    <div className={`${CARD} items-center justify-center p-[2.8vw] max-md:p-[6vw]`}>
      <CardFluid />
      <div className="relative flex aspect-[4/5] w-[78%] max-w-[29vw] flex-col justify-end gap-[0.7vw] overflow-hidden bg-black/20 p-[1.8vw] ring-1 ring-inset ring-primary/45 backdrop-blur-lg max-md:max-w-none max-md:gap-[2.5vw] max-md:p-[6.6vw] after:absolute after:-top-[30%] after:-right-[30%] after:aspect-square after:w-4/5 after:bg-[radial-gradient(circle,color-mix(in_srgb,var(--primary)_45%,transparent),transparent_65%)] after:content-['']">
        <p className={`${LABEL} relative text-[#FFB27A]`}>Featured on Vault · this week</p>
        <p className="text32 relative font-aeonik tracking-tight text-foreground">Your work<br />could be here.</p>
        <p className={`${LABEL} relative text-foreground/60`}>by <span className="text-foreground">{joined ? "you, founding member" : "you"}</span></p>
      </div>
    </div>
  );
}
