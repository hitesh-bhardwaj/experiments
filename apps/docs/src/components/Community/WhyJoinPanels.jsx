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
    <div ref={cardRef} className="card td">
      <div className="card-glow" />
      <div className="td-stage"><canvas ref={canvasRef} className="td-canvas" aria-hidden="true" /></div>
      <div className="td-track">
        <div className="td-keys" aria-hidden="true">
          {TD_KEYS.map((k) => <i key={k} className={progress >= k - 0.001 ? "on" : ""} style={{ left: `${k * 100}%` }} />)}
        </div>
        <input
          className="td-scrub"
          type="range"
          min="0"
          max={SCRUB_MAX}
          value={Math.round(progress * SCRUB_MAX)}
          onChange={onScrub}
          onPointerDown={() => { manualUntilRef.current = Infinity; }}
          onPointerUp={() => { manualUntilRef.current = performance.now() + MANUAL_HOLD_MS; }}
          aria-label="Scrub the teardown timeline"
        />
        <span className="td-time label">{(progress * TD_DURATION).toFixed(2)}s</span>
      </div>
      <pre className="td-code" aria-hidden="true">
        {TD_LINES.map((parts, i) => (
          <span key={i} className={i === Math.min(TD_LINES.length - 1, phase) ? "hl" : ""}>
            {parts.map((part, j) => (Array.isArray(part) ? <span key={j} className="k">{part[1]}</span> : part))}
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
    <div className="card vote">
      <div className="card-glow" />
      <p className="vote-h label">Up next in the vault · you decide</p>
      <ul ref={listRef} className="vote-list">
        {order.map((i) => {
          const on = voted.includes(i);
          return (
            <li key={i} data-idea={i} className={on ? "voted" : ""}>
              <span className="vi-t">{VOTE_IDEAS[i].title}</span>
              <span className="vi-d">{VOTE_IDEAS[i].text}</span>
              <button className="vi-b label" type="button" aria-pressed={on} onClick={() => toggle(i)}>
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
    <div ref={cardRef} className="card crit">
      <div className="card-glow" />
      <div className="crit-stage">
        <canvas ref={canvasRef} className="crit-canvas" aria-hidden="true" />
        <span className="crit-tag label">Example thread · work in progress</span>
      </div>
      <div className="crit-line">
        <i ref={playRef} className="crit-play" />
        {CRIT_PINS.map((pin, i) => (
          <button key={pin.who} type="button" className={`pin${activePin === i ? " on" : ""}`} style={{ left: `${pin.at * 100}%` }}>
            <span className="pop"><b>{pin.who}</b> {pin.text}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// 04 featured: the spotlight card, addressed to the visitor once they join
export function FeaturedCard({ joined }) {
  return (
    <div className="card feat">
      <div className="card-glow" />
      <div className="feat-card">
        <p className="label feat-k">Featured on Vault · this week</p>
        <p className="feat-t">Your work<br />could be here.</p>
        <p className="feat-by label">by <span className="feat-name">{joined ? "you, founding member" : "you"}</span></p>
      </div>
    </div>
  );
}
