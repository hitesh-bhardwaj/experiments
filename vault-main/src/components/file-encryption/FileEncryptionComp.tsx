"use client";

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import gsap from "gsap";
import { attachWebGLContextRecovery } from "./webgl-context-recovery";
import { createSuspendedRaf, createVisibilityGate } from "./createSuspendedRaf";

const CARD_W = 380;
const CARD_H = 240;
const DESKTOP_CARD_GAP = 200;
const TABLET_CARD_GAP=80;
const MOBILE_CARD_GAP = 60;
const AUTO_SPEED = 55;
const PARTICLE_COUNT = 1500;
const BEAM_COLOR ="#ff5f00";
const PARTICLE_COLOR ="#ffb380";
const BACKGROUND_COLOR = "#07060f";

const GLYPHS ="ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789=-%@!";

const CHAR_W = 10;
const CHAR_H = 16;
const PAD_X = 0;
const PAD_Y = 0;
const COLS = Math.floor((CARD_W - PAD_X * 2) / CHAR_W);
const ROWS = Math.floor((CARD_H - PAD_Y * 2) / CHAR_H);

function lcg(seed: number) {
 let s = seed | 0;
 return () => {
 s = (Math.imul(1664525, s) + 1013904223) | 0;
 return (s >>> 0) / 0xffffffff;
 };
}

function seedFromStr(str: string) {
 let h = 0;
 for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
 return h >>> 0;
}

function randomGlyph(rand: () => number) {
 return GLYPHS[Math.floor(rand() * GLYPHS.length)];
}

function makeGrid(seed: number) {
 const rand = lcg(seed);
 return Array.from({ length: ROWS }, () =>
 Array.from({ length: COLS }, () => randomGlyph(rand))
 );
}

function hexToRgb(hex: string): [number, number, number] {
 const h = hex.replace("#","");
 if (h.length === 3)
 return [parseInt(h[0]+h[0],16)/255, parseInt(h[1]+h[1],16)/255, parseInt(h[2]+h[2],16)/255];
 return [parseInt(h.slice(0,2),16)/255, parseInt(h.slice(2,4),16)/255, parseInt(h.slice(4,6),16)/255];
}

function clampNumber(value: unknown, min: number, max: number, fallback: number) {
 const number = Number(value);
 if (!Number.isFinite(number)) return fallback;
 return Math.min(Math.max(number, min), max);
}

function withAlpha(hex: string, alphaHex: string) {
 const value = typeof hex === "string" && hex ? hex : BEAM_COLOR;
 return `${value}${alphaHex}`;
}

//  WebGL Beam
// Vertex shader
const BEAM_VERT = `
attribute vec2 a_pos;
void main() {
 gl_Position = vec4(a_pos, 0.0, 1.0);
}
`;

// Fragment shader - idle mode: tall laser glow; card mode: wider burst + particles
const BEAM_FRAG = `
precision highp float;
uniform vec2 u_res;
uniform float u_time;
uniform vec3 u_color;
uniform float u_card; // 0 = no card, 1 = card passing
uniform float u_splitNorm; // normalised split position [0..1] within viewport
uniform float u_cardTop; // normalised card top in WebGL coordinates
uniform float u_cardBottom;// normalised card bottom in WebGL coordinates

// ---- noise helpers ----
float hash(vec2 p) {
 p = fract(p * vec2(234.34, 435.345));
 p += dot(p, p + 34.23);
 return fract(p.x * p.y);
}
float noise(vec2 p) {
 vec2 i = floor(p);
 vec2 f = fract(p);
 f = f*f*(3.0-2.0*f);
 float a = hash(i);
 float b = hash(i+vec2(1,0));
 float c = hash(i+vec2(0,1));
 float d = hash(i+vec2(1,1));
 return mix(mix(a,b,f.x), mix(c,d,f.x), f.y);
}

void main() {
 vec2 uv = gl_FragCoord.xy / u_res;
 float t = u_time * 0.001;

 // --- Beam X center (normalised) ---
 float cx = u_splitNorm;
 float dx = uv.x - cx;

 // Y fade: fade at top and bottom 5%
float yFade = smoothstep(0.10, 0.46, uv.y) * smoothstep(0.10, 0.46, 1.0 - uv.y);

 // Flicker
 float flicker = 0.88 + 0.12 * sin(t * 6.28 * 1.3 + uv.y * 2.0)
 + 0.05 * sin(t * 6.28 * 2.7);

 vec3 col = vec3(0.0);

 float cardMix = smoothstep(0.0, 1.0, u_card);

 // ── IDLE MODE: narrow elegant laser ──
 float idleCore = exp(-abs(dx) * 420.0); // sharp white core
 float idleInner = exp(-abs(dx) * 140.0); // inner glow
 float idleOuter = exp(-abs(dx) * 44.0); // soft aura

 // Vertical noise shimmer on core
 float idleShimmer = noise(vec2(uv.y * 12.0, t * 2.0)) * 0.18;

 vec3 idleCoreCol = mix(u_color, vec3(1.0), 0.9);
 vec3 idleInnerCol = mix(u_color, vec3(1.0), 0.45);
 vec3 idleOuterCol = u_color;

 vec3 idleCol = idleOuterCol * idleOuter * 0.46
 + idleInnerCol * idleInner * 0.68
 + idleCoreCol * idleCore * (0.86 + idleShimmer * 0.8);

 idleCol *= yFade * flicker;

 // Horizontal cross-flare
 float idleCy = 0.5;
 float idleDy = abs(uv.y - idleCy);
 float idleHFlare = exp(-idleDy * 38.0) * exp(-abs(dx) * 5.5) * 0.26;
 idleCol += u_color * idleHFlare * flicker;

 // ── CARD MODE: energised burst + scatter particles ──
 float px = dx;
 float edge = max(1.5 / u_res.y, 0.002);
 float cardMask = smoothstep(u_cardBottom, u_cardBottom + edge, uv.y)
 * (1.0 - smoothstep(u_cardTop - edge, u_cardTop, uv.y));

 // Core laser (same as idle but brighter)
 float core = exp(-abs(px) * 380.0);
 float inner = exp(-abs(px) * 110.0);
 float outer = exp(-abs(px) * 22.0);

 float shimmer = noise(vec2(uv.y * 14.0, t * 3.0)) * 0.22;

 vec3 coreCol = mix(u_color, vec3(1.0), 0.95);
 vec3 innerCol = mix(u_color, vec3(1.0), 0.55);

 vec3 cardCol = u_color * outer * 0.18
 + innerCol * inner * 0.42
 + coreCol * core * (0.88 + shimmer * 0.42);

 cardCol *= cardMask * flicker;

 // Horizontal cross-flare (stronger in card mode)
 float cy = 0.5;
 float dy = abs(uv.y - cy);
 float hFlar = exp(-dy * 60.0) * exp(-abs(px) * 6.0) * 0.08;
 cardCol += u_color * hFlar * flicker;

 col = mix(idleCol, cardCol, cardMix);

 float alpha = clamp(max(max(col.r, col.g), col.b), 0.0, 1.0);
 gl_FragColor = vec4(col, alpha);
}
`;

function compileShader(gl: WebGLRenderingContext, type: number, src: string) {
 const s = gl.createShader(type) as WebGLShader;
 gl.shaderSource(s, src);
 gl.compileShader(s);
 return s;
}

function buildProgram(gl: WebGLRenderingContext, vert: string, frag: string) {
 const p = gl.createProgram() as WebGLProgram;
 gl.attachShader(p, compileShader(gl, gl.VERTEX_SHADER, vert));
 gl.attachShader(p, compileShader(gl, gl.FRAGMENT_SHADER, frag));
 gl.linkProgram(p);
 return p;
}

interface BeamState {
 ready: boolean
 hasCard: boolean
 splitNorm: number
 cardTop: number
 cardBottom: number
 cardLeft: number
 cardRight: number
 cardProgress: number
 time: number
}

// The WebGL beam lives in a single fullscreen canvas over the whole section
function useWebGLBeam(canvasRef: RefObject<HTMLCanvasElement | null>, primaryColor: string) {
 // expose a setter so the animation loop can push state each frame
 const stateRef = useRef({
 // `ready` flips once the marquee loop has measured real card geometry. Until
 // then the defaults below describe no card, and drawing them would show the
 // full-height idle beam over a card that is already on the beam.
 ready: false,
 hasCard: false,
 splitNorm: 0.5,
 cardTop: 0.5,
 cardBottom: 0.5,
 cardLeft: 0.5,
 cardRight: 0.5,
 cardProgress: 0,
 time: 0,
 });

 useEffect(() => {
 if (typeof window ==="undefined") return;  const canvas = canvasRef.current;
 if (!canvas) return;
 const gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: false });
 if (!gl) return;

 const [r, g, b] = hexToRgb(primaryColor);

 let loop: ReturnType<typeof createSuspendedRaf> | null = null;
 let prog: WebGLProgram | null | undefined;
 let buf: WebGLBuffer | null | undefined;
 let reduceMotion =
 window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
 const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
 const onReduceMotionChange = (event: MediaQueryListEvent) => {
 reduceMotion = event.matches;
 };
 mq?.addEventListener?.("change", onReduceMotionChange);

 // Build (or rebuild) the GPU program, buffer, and uniform wiring, then start
 // the render loop. Extracted so it can re-run after WebGL context restore.
 const setup = () => {
 prog = buildProgram(gl, BEAM_VERT, BEAM_FRAG);
 gl.useProgram(prog);
 gl.clearColor(0.0, 0.0, 0.0, 0.0);

 // full-screen quad
 buf = gl.createBuffer();
 gl.bindBuffer(gl.ARRAY_BUFFER, buf);
 gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
 const loc = gl.getAttribLocation(prog,"a_pos");
 gl.enableVertexAttribArray(loc);
 gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

 const uRes = gl.getUniformLocation(prog,"u_res");
 const uTime = gl.getUniformLocation(prog,"u_time");
 const uColor = gl.getUniformLocation(prog,"u_color");
 const uCard = gl.getUniformLocation(prog,"u_card");
 const uSplit = gl.getUniformLocation(prog,"u_splitNorm");
 const uCardTop = gl.getUniformLocation(prog,"u_cardTop");
 const uCardBottom = gl.getUniformLocation(prog,"u_cardBottom");

 let seeded = false;
 const smoothed = {
 card: 0,
 top: stateRef.current.cardTop,
 bottom: stateRef.current.cardBottom,
 lastTs: 0,
 };

 const tick = (ts: number) => {
 const { ready, hasCard, splitNorm, cardTop, cardBottom } = stateRef.current;

 const w = canvas.offsetWidth;
 const h = canvas.offsetHeight;
 if (canvas.width !== w || canvas.height !== h) {
 canvas.width = w;
 canvas.height = h;
 gl.viewport(0, 0, w, h);
 }

 // Hold the beam off until the first measurement lands, then jump straight to
 // the measured state. Easing up from the defaults would render the idle beam
 // (a full-height, near-white core) across a card already sitting on it.
 if (!ready) {
 gl.clear(gl.COLOR_BUFFER_BIT);
 return;
 }

 const targetCard = hasCard ? 1 : 0;

 if (!seeded || reduceMotion) {
 seeded = true;
 smoothed.card = targetCard;
 smoothed.top = cardTop;
 smoothed.bottom = cardBottom;
 smoothed.lastTs = ts;
 } else {
 const frameDelta = smoothed.lastTs ? Math.min(ts - smoothed.lastTs, 50) : 16;
 smoothed.lastTs = ts;
 const blend = 1 - Math.exp(-frameDelta * (hasCard ? 0.012 : 0.006));

 smoothed.card += (targetCard - smoothed.card) * blend;
 smoothed.top += (cardTop - smoothed.top) * blend;
 smoothed.bottom += (cardBottom - smoothed.bottom) * blend;
 }

 gl.clear(gl.COLOR_BUFFER_BIT);
 gl.uniform2f(uRes, w, h);
 // Freeze beam flicker/shimmer under reduced motion.
 gl.uniform1f(uTime, reduceMotion ? 0 : ts);
 gl.uniform3f(uColor, r, g, b);
 gl.uniform1f(uCard, smoothed.card);
 gl.uniform1f(uSplit, splitNorm);
 gl.uniform1f(uCardTop, smoothed.top);
 gl.uniform1f(uCardBottom, smoothed.bottom);
 gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
 };

 loop?.destroy();
 loop = createSuspendedRaf({
 root: canvas,
 onFrame: tick,
 });
 loop.start();
 };

 // A raw WebGL context gets no automatic recovery (unlike THREE.WebGLRenderer).
 // On loss, stop the loop and release the invalidated program/buffer; on
 // restore, rebuild them and resume.
 const teardown = () => {
 loop?.destroy();
 loop = null;
 if (buf) { gl.deleteBuffer(buf); buf = null; }
 if (prog) { gl.deleteProgram(prog); prog = null; }
 };

 setup();

 const detachRecovery = attachWebGLContextRecovery(canvas, {
 onLost: teardown,
 onRestored: setup,
 });

 return () => {
 mq?.removeEventListener?.("change", onReduceMotionChange);
 detachRecovery();
 teardown();
 };
 }, [canvasRef, primaryColor]);

 return stateRef;
}

function makeParticles(count: number) {
 const rand = lcg(0x51f15eed);

 return Array.from({ length: count }, () => ({
 seed: rand() * 1000,
 y: rand(),
 speed: 0.45 + rand() * 0.85,
 travel: 18 + rand() * 52,
 size: 0.65 + rand() * 0.9,
 }));
}

function useParticleCanvas(
 canvasRef: RefObject<HTMLCanvasElement | null>,
 beamStateRef: RefObject<BeamState>,
 particleColor: string,
 speedRef: RefObject<number>,
) {
 const particles = useMemo(() => makeParticles(PARTICLE_COUNT), []);

 useEffect(() => {
 if (typeof window ==="undefined") return;
 const canvas = canvasRef.current;
 if (!canvas) return;
 const ctx = canvas.getContext("2d");
 if (!ctx) return;

 let reduceMotion =
 window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
 const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
 const onReduceMotionChange = (event: MediaQueryListEvent) => {
 reduceMotion = event.matches;
 };
 mq?.addEventListener?.("change", onReduceMotionChange);

 const visibleState = {
 alpha: 0,
 splitNorm: 0.5,
 cardTop: 0.5,
 cardBottom: 0.5,
 cardLeft: 0.5,
 cardRight: 0.5,
 lastTs: 0,
 };
 const draw = (ts: number) => {
 const frameDelta = visibleState.lastTs ? Math.min(ts - visibleState.lastTs, 50) : 16;
 visibleState.lastTs = ts;
 const dpr = Math.min(window.devicePixelRatio || 1, 2);
 const width = canvas.offsetWidth;
 const height = canvas.offsetHeight;

 if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
 canvas.width = Math.round(width * dpr);
 canvas.height = Math.round(height * dpr);
 }

 ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
 ctx.clearRect(0, 0, width, height);

 // Reduced-motion: skip animated particle scatter.
 if (reduceMotion) return;

 const state = beamStateRef.current;
 const targetAlpha = state.hasCard ? 1 : 0;
 const blend = 1 - Math.exp(-frameDelta * (state.hasCard ? 0.012 : 0.006));
 visibleState.alpha += (targetAlpha - visibleState.alpha) * blend;

 if (state.hasCard) {
 visibleState.splitNorm = state.splitNorm;
 visibleState.cardTop = state.cardTop;
 visibleState.cardBottom = state.cardBottom;
 visibleState.cardLeft = state.cardLeft;
 visibleState.cardRight = state.cardRight;
 }

 if (visibleState.alpha < 0.01) {
 return;
 }

 const beamX = visibleState.splitNorm * width;
 const top = (1 - visibleState.cardTop) * height;
 const bottom = (1 - visibleState.cardBottom) * height;
 const left = visibleState.cardLeft * width;
 const right = visibleState.cardRight * width;
 const particleAlpha = visibleState.alpha;
 const time = ts * 0.001;

 ctx.save();
 ctx.beginPath();
 ctx.rect(left, top, Math.max(0, right - left), Math.max(0, bottom - top));
 ctx.clip();
 ctx.globalCompositeOperation ="lighter";

 for (const p of particles) {
 const life = (time * p.speed * speedRef.current + p.seed) % 1;

 // distance from beam → card exit edge
const maxTravel = Math.max(0, right - beamX);

// always allow particles until card fully exits
const travel = Math.min(p.travel, maxTravel);

// start slightly after beam
const startX = beamX + 0.25;

// particle moves from beam → edge of card
const x = startX + life * travel;

 const y = top + p.y * (bottom - top) + Math.sin(time * 6 + p.seed) * 1.4;
 const edgeFade = Math.min(1, maxTravel / 10); // fades only when almost exiting

const fade =
 Math.min(1, life / 0.16) *
 Math.min(1, (1 - life) / 0.28) *
 particleAlpha *
 edgeFade;
 if (fade <= 0) continue;

 ctx.globalAlpha = fade * 0.9;
 ctx.fillStyle = particleColor;
 ctx.beginPath();
 ctx.arc(x, y, p.size, 0, Math.PI * 2);
 ctx.fill();
 }

 ctx.restore();
 };

 const loop = createSuspendedRaf({
 root: canvas,
 onFrame: draw,
 });
 loop.start();
 return () => {
 mq?.removeEventListener?.("change", onReduceMotionChange);
 loop.destroy();
 };
 }, [beamStateRef, canvasRef, particleColor, particles, speedRef]);
}

interface CardData {
 id?: string
 number: string
 holder: string
 expiry: string
 gradient: string
 glowColor: string
 networkColor1: string
 networkColor2: string
 _uid?: string
}

function Chip() {
 return (
 <div className="relative h-9 w-12 rounded-md bg-[#f0ead6] shadow-inner overflow-hidden">
 <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 gap-px p-1">
 {Array.from({ length: 9 }).map((_, i) => (
 <div key={i} className="rounded-sm bg-[#c8b97a] opacity-80" />
 ))}
 </div>
 <div className="absolute inset-x-0 top-1/2 h-px bg-[#a08840]/60 -translate-y-1/2" />
 <div className="absolute inset-y-0 left-1/2 w-px bg-[#a08840]/60 -translate-x-1/2" />
 </div>
 );
}

function Contactless() {
 return (
 <div className="relative w-8 h-8 flex items-center justify-center">
 {[10, 16, 22].map((r, i) => (
 <span key={i} className="absolute rounded-r-full border-y-2 border-r-2 border-white/80"
 style={{ width: r, height: r, opacity: 0.9 - i * 0.18 }} />
 ))}
 </div>
 );
}

function NetworkMark({ c1, c2 }: { c1: string, c2: string }) {
 return (
 <div className="flex -space-x-2.5">
 <span className="w-8 h-8 rounded-full" style={{ background: c1, opacity: 0.95 }} />
 <span className="w-8 h-8 rounded-full" style={{ background: c2, opacity: 0.85 }} />
 </div>
 );
}

function PlainFace({ card }: { card: CardData }) {
 return (
 <div
 className="absolute inset-0 rounded-lg p-6 flex flex-col justify-between text-white overflow-hidden"
 style={{
 background: card.gradient,
 boxShadow:"0 24px 60px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.15)",
 }}
 >
 <div className="absolute inset-0 bg-linear-to-br from-white/10 via-transparent to-black/10" />
 <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.12),transparent_40%)]" />
 <div className="relative flex justify-between items-start">
 <div className="flex items-center gap-3">
 <Chip />
 <Contactless />
 </div>
 <NetworkMark c1={card.networkColor1} c2={card.networkColor2} />
 </div>
 <div className="relative">
 <p className="font-mono text-xl font-bold tracking-[0.16em] text-white/95">{card.number}</p>
 </div>
 <div className="relative flex justify-between items-end">
 <div>
 <p className="text-[10px] uppercase tracking-widest text-white/50">Card Holder</p>
 <p className="mt-0.5 font-semibold text-base text-white/95">{card.holder}</p>
 </div>
 <div className="text-right">
 <p className="text-[10px] uppercase tracking-widest text-white/50">Expires</p>
 <p className="mt-0.5 font-semibold text-base text-white/95">{card.expiry}</p>
 </div>
 </div>
 </div>
 );
}

function AsciiFace({ card, beamLit, speedValue, cardScale }: { card: CardData, beamLit: boolean, speedValue: number, cardScale: number }) {
 const seed = useMemo(() => seedFromStr(card.id || card.number || card.holder), [card]);
 const [grid, setGrid] = useState(() => makeGrid(seed));
 const randRef = useRef<(() => number) | null>(null);

 useEffect(() => {
 randRef.current = lcg((seed ^ 0xdeadbeef) + Date.now());
 }, [seed]);

 useEffect(() => {
 if (!beamLit) return;
 if (window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) return;
 const intervalMs =
 speedValue <= 0 ? 1000000 : Math.max(18, 55 / speedValue);
 const interval = setInterval(() => {
 const rand = randRef.current as () => number;
 setGrid(prev =>
 prev.map(row =>
 row.map(ch => (rand() < 0.22 ? randomGlyph(rand) : ch))
 )
 );
 }, intervalMs);
 return () => clearInterval(interval);
 }, [beamLit, speedValue]);

 return (
 <div
 className="absolute inset-0 rounded-lg overflow-hidden"
 style={{ background:"transparent" }}
 >
 <div
 className="absolute inset-0"
 style={{
 background: `radial-gradient(ellipse at 60% 50%, ${card.glowColor}20 0%, transparent 65%)`,
 }}
 />
 <div
 className="absolute font-mono select-none"
 style={{
 top: PAD_Y * cardScale,
 left: PAD_X * cardScale,
 right: PAD_X * cardScale,
 bottom: PAD_Y * cardScale,
 fontSize: 11 * cardScale,
 lineHeight: `${CHAR_H * cardScale}px`,
 letterSpacing: `${(CHAR_W - 7) * cardScale}px`,
 color: card.glowColor,
 opacity: 0.85,
 textShadow: beamLit
 ? `0 0 6px ${card.glowColor}, 0 0 14px ${card.glowColor}99`
 : `0 0 4px ${card.glowColor}66`,
 whiteSpace:"pre",
 overflow:"hidden",
 transition:"text-shadow 0.15s",
 }}
 >
 {grid.map((row, i) => (
 <div key={i}>{row.join("")}</div>
 ))}
 </div>
 </div>
 );
}

// ─── CardShell
function CardShell({ card, settersRef, cardScale, speedValue }: { card: CardData, settersRef: RefObject<Record<string, (px: number) => void>>, cardScale: number, speedValue: number }) {
 const [beamLit, setBeamLit] = useState(false);
 const beamLitRef = useRef(false);

 useEffect(() => {
 const setters = settersRef.current;

 setters[card._uid as string] = (px: number) => {
 const lit = px > 1 && px < CARD_W - 1;
 if (lit !== beamLitRef.current) {
 beamLitRef.current = lit;
 setBeamLit(lit);
 }
 };

 return () => {
 delete setters[card._uid as string];
 };
 }, [card._uid, settersRef]);

 return (
 <div
 data-card-uid={card._uid}
 className="relative shrink-0 rounded-2xl"
 style={{
 width: CARD_W,
 height: CARD_H,
 transform: `scale(${cardScale})`,
 transformOrigin: "center",
 transition: "transform 260ms ease",
 }}
 >
 <div data-plain className="absolute inset-0"
 style={{ clipPath: `inset(0 ${CARD_W}px 0 0 round 16px)` }}>
 <PlainFace card={card} />
 </div>
 <div data-ascii className="absolute h-full w-full inset-0"
 style={{ clipPath: `inset(0 0 0 ${CARD_W}px round 16px)` }}>
 <AsciiFace
 card={card}
 beamLit={beamLit}
 speedValue={speedValue}
 cardScale={1}
 />
 </div>
 </div>
 );
}

interface FileEncryptionCompProps {
 cards?: CardData[]
 speed?: number
 accentColor?: string
 backgroundColor?: string
 cardSize?: number
}

export function FileEncryptionComp({
 cards = [],
 speed = 1,
 accentColor = BEAM_COLOR,
 backgroundColor = BACKGROUND_COLOR,
 cardSize = 1,
}: FileEncryptionCompProps) {
 const rootRef = useRef<HTMLElement | null>(null);
 const trackRef = useRef<HTMLDivElement | null>(null);
 const xRef = useRef<number | null>(null);
 const dragRef = useRef({ active: false, lastX: 0, velocity: 0 });
 const beamCanvasRef = useRef<HTMLCanvasElement | null>(null);
 const particleCanvasRef = useRef<HTMLCanvasElement | null>(null);
 const settersRef = useRef<Record<string, (px: number) => void>>({});
 const reduceMotionRef = useRef(
 Boolean(
 typeof window !== "undefined" &&
 window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches
 ));
 const speedRef = useRef(clampNumber(speed, 0, 5, 1));
 const resolvedSpeed = clampNumber(speed, 0, 5, 1);
 const resolvedCardSize = clampNumber(cardSize, 0.65, 1.5, 1);
 const cardScale = resolvedCardSize;
 const particleColor = withAlpha(accentColor, "99");

 useEffect(() => {
 speedRef.current = resolvedSpeed;
 }, [resolvedSpeed]);

 const allCards = useMemo(() => {
 if (!cards.length) return [];
 const tagged = cards.map((c, i) => ({ ...c, _uid: `${c.id ?? i}` }));
 return [
 ...tagged.map((c) => ({ ...c, _uid: `a-${c._uid}` })),
 ...tagged.map((c) => ({ ...c, _uid: `b-${c._uid}` })),
 ...tagged.map((c) => ({ ...c, _uid: `c-${c._uid}` })),
 ];
 }, [cards]);

  const [cardGap, setCardGap] = useState(DESKTOP_CARD_GAP);

  useEffect(() => {
    const updateGap = () => {
      setCardGap(
  window.innerWidth < 768
    ? MOBILE_CARD_GAP
    : window.innerWidth < 1025
    ? TABLET_CARD_GAP
    : DESKTOP_CARD_GAP
);
    };
    updateGap();
    window.addEventListener("resize", updateGap);
    return () => window.removeEventListener("resize", updateGap);
  }, []);

  const singleGroupWidth = useMemo(
    () => cards.length * ((CARD_W + cardGap) * resolvedCardSize),
    [cards.length, cardGap, resolvedCardSize]
  );
 const visualCardGap = cardGap * resolvedCardSize;

 const primaryColor = accentColor;

 // WebGL beam state ref
 const beamStateRef = useWebGLBeam(beamCanvasRef, primaryColor);
 useParticleCanvas(particleCanvasRef, beamStateRef, particleColor, speedRef);

 useEffect(() => {
 if (typeof window ==="undefined") return;  if (!cards.length) return;
 const root = rootRef.current;
 const track = trackRef.current;
 if (!root || !track) return;

 const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
 const onReduceMotionChange = (event: MediaQueryListEvent) => {
 reduceMotionRef.current = event.matches;
 if (event.matches) dragRef.current.velocity = 0;
 };
 if (mq) {
 reduceMotionRef.current = mq.matches;
 mq.addEventListener?.("change", onReduceMotionChange);
 }

 if (xRef.current === null) xRef.current = -singleGroupWidth;

 const onDown = (e: PointerEvent) => {
 dragRef.current.active = true;
 dragRef.current.lastX = e.clientX ?? (e as any).touches?.[0]?.clientX;
 dragRef.current.velocity = 0;
 root.style.cursor ="grabbing";
 };
 const onMove = (e: PointerEvent) => {
 if (!dragRef.current.active) return;
 const cx = e.clientX ?? (e as any).touches?.[0]?.clientX;
 const dx = cx - dragRef.current.lastX;
 dragRef.current.lastX = cx;
 dragRef.current.velocity = reduceMotionRef.current ? 0 : dx;
 xRef.current = (xRef.current as number) + dx;
 };
 const onUp = () => {
 dragRef.current.active = false;
 if (reduceMotionRef.current) dragRef.current.velocity = 0;
 root.style.cursor ="grab";
 };

 root.addEventListener("pointerdown", onDown);
 window.addEventListener("pointermove", onMove);
 window.addEventListener("pointerup", onUp);
  window.addEventListener("pointercancel", onUp);

 const update = (_time: number, delta: number) => {
 const dt = Math.min(delta, 50);

 if (!dragRef.current.active) {
 if (reduceMotionRef.current) {
 // No auto-scroll / inertia - drag still moves cards directly.
 dragRef.current.velocity = 0;
 } else {
 xRef.current = (xRef.current as number) + (AUTO_SPEED * speedRef.current * dt) / 1000;
 if (Math.abs(dragRef.current.velocity) > 0.5) {
 xRef.current = (xRef.current as number) + dragRef.current.velocity * 0.4 * speedRef.current;
 dragRef.current.velocity *= 0.88;
 }
 }
 }

 if ((xRef.current as number) >= 0)
 xRef.current = (xRef.current as number) - singleGroupWidth;
 if ((xRef.current as number) < -2 * singleGroupWidth)
 xRef.current = (xRef.current as number) + singleGroupWidth;

 track.style.transform = `translate3d(${xRef.current}px, 0, 0)`;

 const rootBox = root.getBoundingClientRect();
 const beamX = rootBox.left + rootBox.width / 2;
 const beamNorm = 0.5; // beam is always center of viewport

 let anyCard = false;
 let activeCardTop = 0.5;
 let activeCardBottom = 0.5;
 let activeCardLeft = 0.5;
 let activeCardRight = 0.5;
 let activeCardProgress = 0;

 track.querySelectorAll("[data-card-uid]").forEach((elRaw: Element) => {
 const el = elRaw as HTMLElement;
 const uid = el.dataset.cardUid;
 const box = el.getBoundingClientRect();
 const displayWidth = Math.max(1, box.width);
 const splitDisplayPx = Math.max(0, Math.min(displayWidth, beamX - box.left));
 const splitPx = splitDisplayPx / resolvedCardSize;
 const lit = splitDisplayPx > 1 && splitDisplayPx < displayWidth - 1;

 if (lit) {
 anyCard = true;
 activeCardTop = 1 - (box.top - rootBox.top) / rootBox.height;
 activeCardBottom = 1 - (box.bottom - rootBox.top) / rootBox.height;
 activeCardLeft = (box.left - rootBox.left) / rootBox.width;
 activeCardRight = (box.right - rootBox.left) / rootBox.width;
 activeCardProgress = splitDisplayPx / displayWidth;
 }

 settersRef.current[uid as string]?.(splitPx);

 const plain = el.querySelector("[data-plain]") as HTMLElement | null;
 const ascii = el.querySelector("[data-ascii]") as HTMLElement | null;
 if (plain) plain.style.clipPath = `inset(0 ${Math.max(CARD_W - splitPx, 0)}px 0 0 round 0)`;
 if (ascii) ascii.style.clipPath = `inset(0 0 0 ${splitPx}px round 0)`;
 });

 // Push beam state to WebGL shader
 beamStateRef.current.hasCard = anyCard;
 beamStateRef.current.splitNorm = beamNorm;
 if (anyCard) {
 beamStateRef.current.cardTop = Math.max(0, Math.min(1, activeCardTop));
 beamStateRef.current.cardBottom = Math.max(0, Math.min(1, activeCardBottom));
 beamStateRef.current.cardLeft = Math.max(0, Math.min(1, activeCardLeft));
 beamStateRef.current.cardRight = Math.max(0, Math.min(1, activeCardRight));
 beamStateRef.current.cardProgress = Math.max(0, Math.min(1, activeCardProgress));
 } else {
 beamStateRef.current.cardProgress = 0;
 }
 beamStateRef.current.ready = true;
 };

 gsap.ticker.add(update);

 // Pause the marquee ticker when the section is offscreen or the tab is hidden.
 // Beam/particle loops self-suspend via createSuspendedRaf; sleep/wake the shared
 // GSAP ticker here so auto-scroll stops with them. Always wake on teardown so we
 // never leave the global ticker sleeping for the rest of the page.
 const gate = createVisibilityGate({
 root,
 onChange: (active) => {
 if (active) gsap.ticker.wake();
 else gsap.ticker.sleep();
 },
 });
 if (!gate.isActive) gsap.ticker.sleep();

 return () => {
 mq?.removeEventListener?.("change", onReduceMotionChange);
 gate.destroy();
 gsap.ticker.wake();
 gsap.ticker.remove(update);
 root.removeEventListener("pointerdown", onDown);
 window.removeEventListener("pointermove", onMove);
 window.removeEventListener("pointerup", onUp);
  window.removeEventListener("pointercancel", onUp);
 };
 }, [beamStateRef, cards.length, resolvedCardSize, singleGroupWidth]);

 if (!cards.length) return null;

 return (
 <section
 ref={rootRef}
 className="relative overflow-visible select-none"
 style={{ height: CARD_H * 1.5 + 80, cursor:"grab", touchAction:"none", backgroundColor }}
 aria-label="Encrypted cards marquee"
 >
 {/* WebGL beam canvas - full section coverage, screen blend */}
 <canvas
 ref={beamCanvasRef}
 aria-hidden="true"
 className="pointer-events-none absolute inset-0 z-40"
 style={{
 width:"100%",
 height:"100%",
 mixBlendMode:"screen",
 }}
 />
 <canvas
 ref={particleCanvasRef}
 aria-hidden="true"
 className="pointer-events-none absolute inset-0 z-50"
 style={{
 width:"100%",
 height:"100%",
 mixBlendMode:"screen",
 }}
 />

 {/* Card track */}
 <div
 ref={trackRef}
 className="absolute top-1/2 left-0 flex will-change-transform"
style={{
  gap: visualCardGap,
  marginTop: -(CARD_H / 2),
}}
 >
 {allCards.map((card) => (
 <CardShell
 key={card._uid}
 card={card}
 settersRef={settersRef}
 cardScale={cardScale}
 speedValue={resolvedSpeed}
 />
 ))}
 </div>

 <style>{`
 [data-card-uid] { transform: translateZ(0); }
 `}</style>
 </section>
 );
}
