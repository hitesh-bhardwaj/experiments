"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { prefersReducedMotion } from "@/lib/motion";
import { useInteraction } from "@/homepage-v3/components/InteractionProvider";

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
  const manualUntilRef = useRef(0);
  const { sound } = useInteraction() ?? {};
  const [progress, setProgress] = useState(1);

  const paint = (p) => {
    const cv = canvasRef.current;
    if (!cv) return;
    const d = fitCanvas(cv);
    const W = cv.width, H = cv.height, g = cv.getContext("2d"), t = p * TD_DURATION;
    g.clearRect(0, 0, W, H);
    const cp = easeOutExpo(Math.min(1, t / 0.9));
    const cw = W * 0.6, ch = H * 0.62, cx = (W - cw) / 2, cy = (H - ch) / 2 + (1 - cp) * 80 * d;
    g.globalAlpha = cp;
    const gp = easeOutExpo(clamp01((t - 1) / 0.9));
    if (gp > 0) {
      const rg = g.createRadialGradient(W / 2, cy + ch * 0.3, 0, W / 2, cy + ch * 0.3, cw * 0.9 * (0.6 + 0.4 * gp));
      rg.addColorStop(0, `rgba(255,107,0,${0.35 * gp})`);
      rg.addColorStop(1, "rgba(255,107,0,0)");
      g.fillStyle = rg;
      g.fillRect(0, 0, W, H);
    }
    g.fillStyle = "#1d1d1d";
    g.beginPath();
    g.roundRect(cx, cy, cw, ch, 14 * d);
    g.fill();
    g.strokeStyle = `rgba(255,107,0,${0.2 + 0.5 * easeOutExpo(Math.max(0, (t - 1.7) / 0.6))})`;
    g.lineWidth = 1.5 * d;
    g.stroke();
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
      g.fillStyle = i > 1 ? "#FF6B00" : "#F4F4F4";
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
    <div ref={cardRef} className={`relative aspect-[16/11] overflow-hidden bg-[#141414] text-[#F4F4F4] max-sm:aspect-[4/5] grid grid-rows-[1fr_auto_auto]`}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_90%_at_85%_110%,rgba(255,107,0,.45),transparent_55%),radial-gradient(90%_70%_at_0%_0%,rgba(255,255,255,.06),transparent_60%)]" />
      <div className="relative min-h-0"><canvas ref={canvasRef} className="absolute inset-0 size-full font-aeonik" aria-hidden="true" /></div>
      <div className="relative flex items-center gap-3.5 border-t border-[rgba(244,244,244,.08)] px-5 py-3">
        <div className="absolute top-1/2 right-[84px] left-5 h-0" aria-hidden="true">
          {TD_KEYS.map((k) => (
            <i
              key={k}
              className={`absolute -top-[5px] -ml-[5px] size-2.5 rotate-45 shadow-[inset_0_0_0_1px_rgba(255,107,0,.6)] ${progress >= k - 0.001 ? "bg-primary" : "bg-[#2c2c2c]"}`}
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
        <span className={`font-avenir text-[11px] font-medium tracking-[.14em] uppercase min-w-[54px] text-right text-[#9c9c9c] tabular-nums`}>{(progress * TD_DURATION).toFixed(2)}s</span>
      </div>
      <pre className="relative m-0 overflow-hidden border-t border-[rgba(244,244,244,.06)] px-5 pt-3 pb-4 font-mono text-xs leading-[1.75] whitespace-pre text-[#7a7a7a] max-sm:px-3.5 max-sm:text-[10.5px]" aria-hidden="true">
        {TD_LINES.map((parts, i) => (
          <span key={i} className={i === Math.min(TD_LINES.length - 1, phase) ? "bg-[rgba(255,107,0,.16)] text-[#F4F4F4] shadow-[-20px_0_0_rgba(255,107,0,.16),20px_0_0_rgba(255,107,0,.16)]" : ""}>
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
    <div className={`relative aspect-[16/11] overflow-hidden bg-[#141414] text-[#F4F4F4] max-sm:aspect-[4/5] flex flex-col p-[2vw] max-md:p-5`}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_90%_at_85%_110%,rgba(255,107,0,.45),transparent_55%),radial-gradient(90%_70%_at_0%_0%,rgba(255,255,255,.06),transparent_60%)]" />
      <p className={`font-avenir text-[11px] font-medium tracking-[.14em] uppercase relative mb-3.5 text-[#9c9c9c]`}>Up next in the vault · you decide</p>
      <ul ref={listRef} className="relative grid gap-2">
        {order.map((i) => {
          const on = voted.includes(i);
          return (
            <li
              key={i}
              data-idea={i}
              className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3.5 gap-y-0.5 px-4 py-3.5 transition-[background-color,box-shadow] duration-700 ease-[cubic-bezier(.16,1,.3,1)] ${on ? "bg-[rgba(255,107,0,.1)] shadow-[inset_0_0_0_1px_rgba(255,107,0,.45)]" : "bg-[rgba(244,244,244,.04)] shadow-[inset_0_0_0_1px_rgba(244,244,244,.08)]"}`}
            >
              <span className="font-aeonik text-lg text-[#F4F4F4]">{VOTE_IDEAS[i].title}</span>
              <span className="col-start-1 text-[13px] text-[#8c8c8c]">{VOTE_IDEAS[i].text}</span>
              <button
                type="button"
                aria-pressed={on}
                onClick={() => toggle(i)}
                className={`font-avenir text-[11px] font-medium tracking-[.14em] uppercase col-start-2 row-span-2 row-start-1 h-[34px] px-3.5 transition-[background-color,color,box-shadow] duration-600 ease-[cubic-bezier(.16,1,.3,1)] ${on ? "bg-primary text-[#141414]" : "text-[#d8d8d8] shadow-[inset_0_0_0_1px_rgba(244,244,244,.16)] hover:shadow-[inset_0_0_0_1px_rgba(255,107,0,.6)]"}`}
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
    g.fillStyle = "rgba(255,107,0,.12)";
    for (let k = 1; k < 6; k++) {
      g.beginPath();
      g.arc(x - k * 14 * d * (p < 0.5 ? 1 : -1), y, 22 * d - k * 3 * d, 0, 7);
      g.fill();
    }
    g.fillStyle = "#FF6B00";
    g.beginPath();
    g.roundRect(x - 28 * d, y - 28 * d, 56 * d, 56 * d, 12 * d);
    g.fill();
    if (playRef.current) playRef.current.style.width = `${p * 100}%`;
    const hitPin = CRIT_PINS.findIndex((pin) => Math.abs(p - pin.at) < PIN_WINDOW);
    setActivePin((cur) => (cur === hitPin ? cur : hitPin));
  }, CRIT_LOOP_S * 1000 * 0.6);

  return (
    <div ref={cardRef} className={`relative aspect-[16/11] overflow-hidden bg-[#141414] text-[#F4F4F4] max-sm:aspect-[4/5] grid grid-rows-[1fr_auto]`}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_90%_at_85%_110%,rgba(255,107,0,.45),transparent_55%),radial-gradient(90%_70%_at_0%_0%,rgba(255,255,255,.06),transparent_60%)]" />
      <div className="relative">
        <canvas ref={canvasRef} className="absolute inset-0 size-full" aria-hidden="true" />
        <span className={`font-avenir text-[11px] font-medium tracking-[.14em] uppercase absolute top-[18px] left-5 text-[#8c8c8c]`}>Example thread · work in progress</span>
      </div>
      <div className="relative mx-6 mb-[22px] h-16 border-t border-[rgba(244,244,244,.12)]">
        <i ref={playRef} className="absolute -top-px left-0 h-px w-0 bg-primary" />
        {CRIT_PINS.map((pin, i) => (
          <button
            key={pin.who}
            type="button"
            style={{ left: `${pin.at * 100}%` }}
            className={`group/pin absolute -top-[9px] -ml-[9px] size-[18px] bg-primary transition-shadow duration-600 ease-[cubic-bezier(.16,1,.3,1)] hover:shadow-[0_0_0_7px_rgba(255,107,0,.28)] focus-visible:shadow-[0_0_0_7px_rgba(255,107,0,.28)] ${activePin === i ? "shadow-[0_0_0_7px_rgba(255,107,0,.28)]" : "shadow-[0_0_0_4px_rgba(255,107,0,.18)]"}`}
          >
            <span
              className={`pointer-events-none absolute bottom-[calc(100%+12px)] w-[250px] bg-[#F4F4F4] px-3.5 py-3 text-left text-[13px] leading-[1.45] text-[#1D1D1D] transition-opacity duration-500 ease-[cubic-bezier(.16,1,.3,1)] group-hover/pin:opacity-100 group-focus-visible/pin:opacity-100 max-sm:w-[200px] ${activePin === i ? "opacity-100" : "opacity-0"} ${i === 0 ? "left-0 -ml-5" : i === CRIT_PINS.length - 1 ? "right-0 -mr-5" : "left-1/2 -translate-x-1/2"}`}
            >
              <b className="mb-0.5 block font-bold text-[#B34A00]">{pin.who}</b> {pin.text}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

// 04 featured: the spotlight card, addressed to the visitor once they join
export function FeaturedCard({ joined }) {
  return (
    <div className={`relative aspect-[16/11] overflow-hidden bg-[#141414] text-[#F4F4F4] max-sm:aspect-[4/5] grid place-items-center p-[2.8vw] max-md:p-6`}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_90%_at_85%_110%,rgba(255,107,0,.45),transparent_55%),radial-gradient(90%_70%_at_0%_0%,rgba(255,255,255,.06),transparent_60%)]" />
      <div className="relative flex aspect-[4/5] w-[min(78%,420px)] flex-col justify-end gap-2.5 overflow-hidden bg-[linear-gradient(160deg,#241206,#140a04_55%,#0f0f0f)] p-[26px] shadow-[inset_0_0_0_1.5px_rgba(255,107,0,.45)] after:absolute after:-top-[30%] after:-right-[30%] after:aspect-square after:w-4/5 after:rounded-full after:bg-[radial-gradient(circle,rgba(255,107,0,.45),transparent_65%)] after:content-['']">
        <p className={`font-avenir text-[11px] font-medium tracking-[.14em] uppercase relative text-[#FFB27A]`}>Featured on Vault · this week</p>
        <p className="relative font-aeonik text-[2.6vw] max-md:text-[7vw] leading-[1.05] tracking-[-.03em] text-[#F4F4F4]">Your work<br />could be here.</p>
        <p className={`font-avenir text-[11px] font-medium tracking-[.14em] uppercase relative text-[#9c9c9c]`}>by <span className="text-[#F4F4F4]">{joined ? "you, founding member" : "you"}</span></p>
      </div>
    </div>
  );
}
