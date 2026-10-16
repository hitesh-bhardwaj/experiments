// Built using Hyperiux Vault: https://vault.hyperiux.com
"use client";

import gsap from "gsap";
import React, { useEffect, useRef } from "react";
import * as THREE from "three";

// Scene
const FOG_DENSITY = 0.016;
const CAMERA_Z = 20;
const TONE_EXPOSURE = 0.95;
const RIM_INTENSITY = 3.9;
const NARROW_ASPECT = 0.9;

// Ribbons
const TRAIL = 6;
const RIBBON_RADIUS = 6.2;
const RIBBON_STEP = 1.32;
const RIBBON_ARC_START = -1.0;
const RIBBON_ARC_END = Math.PI * 1.42;
const RIBBON_WIDTH = 0.16;
const RIBBON_THICKNESS = 1.05;

// Intro
const INTRO_DELAY = 0.2;
const RING_STAGGER = 0.11;
const RING_GROW = 1.2;
const RING_UNWIND = 1.2;

// Hold
const HOLD_DELAY = 0.2;
const TAP_MS = 220;
const FULL_CHARGE = 0.985;

// Shatter
const BURST_S = 1.5;
const REFORM_MAX_S = 7;
const CROSSFADE_S = 1.4;
const STIR_RADIUS = 2.6;
const NEAR_RING = 0.9;

// No hold on these
const HOLD_EXCLUDE = "a,button,input,textarea,select,label,[role=button],[role=dialog]";

const MAX_SCROLL_STEP = 80;
const MOUSE_TILT_EASE = 0.025;
const MAX_POINTER_STEP = 40;

type Vec3 = [number, number, number];
interface Pose {
  rp: Vec3;
  rr: Vec3;
  rs: number;
}

// Sweep pose
const POSES: Record<"wide" | "narrow", Pose> = {
  wide: { rp: [2.2, -4.6, 0], rr: [-0.28, -0.42, 0.22], rs: 1.12 },
  narrow: { rp: [2.5, -5, -2], rr: [-0.28, -0.42, 0.22], rs: 0.95 },
};

const RIBBON_VERT_PARS = `
  uniform float uScrollV;
  uniform float uTime;
  uniform float uHitT;
  uniform float uHitA;
  uniform float uCharge;
  uniform float uIdle;
  uniform vec3  uHit;
  uniform vec4  uTrail[${TRAIL}];
  varying float vGlow;
  varying float vRip;
`;

const RIBBON_VERT_DISPLACE = `
  #include <begin_vertex>
  vec3 wp = (modelMatrix * vec4(transformed, 1.)).xyz;
  float bul = 0.;
  for (int i = 0; i < ${TRAIL}; i++) {
    float d = distance(wp, uTrail[i].xyz);
    bul += exp(-d * d * .2) * uTrail[i].w;
  }
  float dv = distance(wp, uTrail[0].xyz);
  float wake = sin(dv * 1.5 - uTime * 2.6) * exp(-dv * .42) * uTrail[0].w * .3;
  float dh = distance(wp, uHit);
  float rip = sin(dh * 1.8 - uHitT * 4.2) * exp(-dh * .2) * exp(-uHitT * .6) * uHitA
    * smoothstep(uHitT * 4.2 + 1., uHitT * 4.2 - 2., dh * 1.8);
  float idle = sin(wp.x * .35 + uTime * .5) * sin(wp.y * .3 + uTime * .37) * .14 * uIdle;
  float trem = sin(uTime * 36. + wp.x * 3. + wp.y * 2.) * uCharge * uCharge * .07;
  float sang = atan(position.y, position.x);
  float swave = sin(sang * 7. - uTime * 3.2) * uScrollV * .32;
  vec2 rdir = normalize(position.xy + vec2(.0001));
  transformed.xy += rdir * (bul * .5 + wake + rip * .55 + idle + trem + swave);
  vGlow = bul + abs(swave) * .8;
  vRip = rip;
`;

const RIBBON_FRAG_PARS = `
  uniform float uCharge;
  uniform vec3  uGlow;
  varying float vGlow;
  varying float vRip;
`;

const RIBBON_FRAG_EMISSIVE = `
  #include <emissivemap_fragment>
  totalEmissiveRadiance += uGlow * (clamp(vGlow, 0., 1.3) * .28 + clamp(abs(vRip), 0., 1.) * .4 + uCharge * uCharge * .5);
`;

const STREAK_VERT = `
  ${RIBBON_VERT_PARS}
  varying float vU;

  void main() {
    vU = uv.x;
    ${RIBBON_VERT_DISPLACE}
    transformed.z += ${(RIBBON_THICKNESS / 2 + 0.04).toFixed(3)};
    gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.);
  }
`;

const STREAK_FRAG = `
  uniform float uHead;
  uniform float uLen;
  uniform vec3  uGlow;
  uniform vec3  uGlowHi;
  varying float vU;

  void main() {
    float d = uHead - vU;
    float a = step(0., d) * smoothstep(uLen, 0., d);
    float core = smoothstep(.02, 0., d) * step(0., d);
    vec3 c = mix(uGlow, uGlowHi, core + a * a * .6);
    vec3 col = c * (a * 1.6 + core * 2.);
    gl_FragColor = vec4(col, clamp(max(col.r, max(col.g, col.b)), 0., 1.));
  }
`;

const SHARD_VERT = `
  attribute float aR;
  uniform float uPR;
  varying float vR;

  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uPR * (1.8 + aR * 3.6) * (22. / -mv.z);
    vR = aR;
  }
`;

const SHARD_FRAG = `
  uniform float uAlpha;
  uniform vec3  uGlow;
  uniform vec3  uGlowHi;
  varying float vR;

  void main() {
    float d = length(gl_PointCoord - .5);
    if (d > .5) discard;
    vec3 c = mix(uGlow, uGlowHi, vR * .7);
    vec3 col = c * smoothstep(.5, 0., d) * 1.35 * uAlpha;
    gl_FragColor = vec4(col, clamp(max(col.r, max(col.g, col.b)), 0., 1.));
  }
`;

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const damp = (a: number, b: number, f: number, dt: number) => lerp(a, b, 1 - Math.pow(1 - f, dt * 60));
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

function toRgba(color: string, alpha: number) {
  const hex = new THREE.Color(color).getHex();
  return `rgba(${(hex >> 16) & 255},${(hex >> 8) & 255},${hex & 255},${alpha})`;
}

// Flat band, no twist
function buildRibbonGeometry(
  pathAt: (a: number) => THREE.Vector3,
  a0: number,
  a1: number,
  segments: number,
  width: number,
  thickness: number,
) {
  const pos: number[] = [], nor: number[] = [], uv: number[] = [], idx: number[] = [];
  const widthDir = (a: number): [number, number] => {
    const x = Math.cos(a), y = Math.sin(a) * 0.92, l = Math.hypot(x, y);
    return [x / l, y / l];
  };
  const faces: [[number, number], [number, number], (d: [number, number]) => Vec3][] = [
    [[-1, 1], [1, 1], () => [0, 0, 1]],
    [[1, -1], [-1, -1], () => [0, 0, -1]],
    [[1, 1], [1, -1], (d) => [d[0], d[1], 0]],
    [[-1, -1], [-1, 1], (d) => [-d[0], -d[1], 0]],
  ];
  faces.forEach(([c0, c1, normalOf]) => {
    const base = pos.length / 3;
    for (let k = 0; k <= segments; k++) {
      const a = a0 + ((a1 - a0) * k) / segments, p = pathAt(a), d = widthDir(a), n = normalOf(d);
      [c0, c1].forEach((c) => {
        pos.push(p.x + (d[0] * c[0] * width) / 2, p.y + (d[1] * c[0] * width) / 2, p.z + (c[1] * thickness) / 2);
        nor.push(n[0], n[1], n[2]);
        uv.push(k / segments, c[0] > 0 ? 1 : 0);
      });
    }
    for (let k = 0; k < segments; k++) {
      const q = base + k * 2;
      idx.push(q, q + 1, q + 2, q + 1, q + 3, q + 2);
    }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}

const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
const PENTA = [72, 74, 77, 79, 81, 84, 86, 89];

// Synth sounds
function createRibbonSound() {
  let ctx: AudioContext | null = null;
  let sfx: GainNode | null = null;
  let noise: AudioBuffer | null = null;
  let hold: { s: AudioBufferSourceNode; g: GainNode; o: OscillatorNode; og: GainNode } | null = null;

  function init() {
    if (ctx) return true;
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return false;
    try {
      ctx = new AC();
    } catch {
      return false;
    }
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -20;
    comp.ratio.value = 2.5;
    comp.connect(ctx.destination);
    sfx = ctx.createGain();
    sfx.gain.value = 0.8;
    sfx.connect(comp);

    const r = ctx.sampleRate, len = Math.floor(r * 4), ir = ctx.createBuffer(2, len, r);
    for (let c = 0; c < 2; c++) {
      const d = ir.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.2);
    }
    const rev = ctx.createConvolver(), send = ctx.createGain();
    rev.buffer = ir;
    send.gain.value = 0.35;
    sfx.connect(send);
    send.connect(rev);
    rev.connect(comp);

    noise = ctx.createBuffer(2, r * 3, r);
    for (let c = 0; c < 2; c++) {
      const d = noise.getChannelData(c);
      let last = 0;
      for (let i = 0; i < d.length; i++) {
        last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
        d[i] = last * 3.2;
      }
    }
    return true;
  }
  const pan = (ac: AudioContext, v: number) => {
    const p = ac.createStereoPanner();
    p.pan.value = clamp(v, -1, 1);
    return p;
  };
  function droplet(m: number, vol: number, p: number, t0?: number) {
    if (!ctx || !sfx) return;
    const t = t0 ?? ctx.currentTime, f = mtof(m), o = ctx.createOscillator(), g = ctx.createGain(), pn = pan(ctx, p);
    o.frequency.setValueAtTime(f * 0.62, t);
    o.frequency.exponentialRampToValueAtTime(f, t + 0.045);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
    o.connect(g);
    g.connect(pn);
    pn.connect(sfx);
    o.start(t);
    o.stop(t + 0.36);
  }

  function ep(m: number, t: number, vel: number, p: number, len: number) {
    if (!ctx || !sfx) return;
    const f = mtof(m), car = ctx.createOscillator(), mod = ctx.createOscillator(), mg = ctx.createGain(), g = ctx.createGain(), pn = pan(ctx, p);
    car.frequency.value = f;
    mod.frequency.value = f;
    mg.gain.setValueAtTime(f * 2.2, t);
    mg.gain.exponentialRampToValueAtTime(f * 0.25, t + 1.2);
    mod.connect(mg);
    mg.connect(car.frequency);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vel, t + 0.012);
    g.gain.exponentialRampToValueAtTime(vel * 0.35, t + 1.4);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    car.connect(g);
    g.connect(pn);
    pn.connect(sfx);
    [car, mod].forEach((o) => {
      o.start(t);
      o.stop(t + len + 0.1);
    });
  }

  return {
    unlock() {
      if (!init() || !ctx) return;
      if (ctx.state === "suspended") ctx.resume();
    },
    holdStart() {
      if (!ctx || !sfx || !noise) return;
      const t = ctx.currentTime, s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      s.buffer = noise;
      s.loop = true;
      f.type = "bandpass";
      f.Q.value = 3;
      f.frequency.setValueAtTime(250, t);
      f.frequency.exponentialRampToValueAtTime(2200, t + 1.4);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.12, t + 1.3);
      s.connect(f);
      f.connect(g);
      g.connect(sfx);
      s.start(t);
      const o = ctx.createOscillator(), og = ctx.createGain();
      o.frequency.setValueAtTime(mtof(50), t);
      o.frequency.exponentialRampToValueAtTime(mtof(62), t + 1.4);
      og.gain.setValueAtTime(0, t);
      og.gain.linearRampToValueAtTime(0.05, t + 1.2);
      o.connect(og);
      og.connect(sfx);
      o.start(t);
      hold = { s, g, o, og };
    },
    holdEnd(full: boolean, audible = true) {
      if (!ctx) return;
      const t = ctx.currentTime;
      if (hold) {
        [hold.g, hold.og].forEach((g) => {
          g.gain.cancelScheduledValues(t);
          g.gain.setValueAtTime(g.gain.value, t);
          g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
        });
        hold.s.stop(t + 0.7);
        hold.o.stop(t + 0.9);
        hold = null;
      }
      if (audible && !full) droplet(67, 0.05, 0);
    },
    ready() {
      if (!ctx) return;
      droplet(84, 0.04, -0.2);
      droplet(91, 0.03, 0.2, ctx.currentTime + 0.06);
    },
    tap() {
      if (!ctx) return;
      const t = ctx.currentTime;
      droplet(79, 0.06, 0);
      droplet(86, 0.03, 0.3, t + 0.07);
      ep(67, t + 0.02, 0.025, 0, 2.2);
    },
    shatter() {
      if (!ctx || !sfx || !noise) return;
      const t = ctx.currentTime;
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.setValueAtTime(90, t);
      o.frequency.exponentialRampToValueAtTime(28, t + 1.4);
      g.gain.setValueAtTime(0.42, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
      o.connect(g);
      g.connect(sfx);
      o.start(t);
      o.stop(t + 1.7);
      const n = ctx.createBufferSource(), lp = ctx.createBiquadFilter(), ng = ctx.createGain();
      n.buffer = noise;
      lp.type = "lowpass";
      lp.frequency.setValueAtTime(3000, t);
      lp.frequency.exponentialRampToValueAtTime(200, t + 0.9);
      ng.gain.setValueAtTime(0.3, t);
      ng.gain.exponentialRampToValueAtTime(0.0001, t + 1);
      n.connect(lp);
      lp.connect(ng);
      ng.connect(sfx);
      n.start(t);
      n.stop(t + 1.1);
      for (let i = 0; i < 34; i++) {
        const m = PENTA[(Math.random() * PENTA.length) | 0] + 12 * (Math.random() < 0.5 ? 1 : 2);
        droplet(m, 0.012 + Math.random() * 0.02, (Math.random() - 0.5) * 1.8, t + 0.03 + Math.pow(Math.random(), 1.6) * 1.1);
      }
      [53, 60, 64, 67, 69, 72, 76].forEach((m, k) => ep(m, t + 1.6 + k * 0.06, k === 0 ? 0.05 : 0.03, (k / 6 - 0.5) * 0.9, 6));
    },
    reform() {
      if (!ctx) return;
      const t = ctx.currentTime;
      [64, 69, 71, 76].forEach((m, k) => ep(m, t + k * 0.12, 0.03, (k - 1.5) * 0.3, 4));
      droplet(88, 0.025, 0, t + 0.5);
    },
    destroy() {
      hold?.s.stop();
      hold?.o.stop();
      hold = null;
      ctx?.close();
      ctx = null;
    },
  };
}

interface LiveSettings {
  ribbonColor: string;
  glowColor: string;
  backgroundColor: string;
  metalness: number;
  roughness: number;
  scale: number;
  idleMotion: number;
  streakFrequency: number;
  hoverStrength: number;
  tiltStrength: number;
  sound: boolean;
  holdToShatter: boolean;
  holdDuration: number;
  reformDelay: number;
  onShatter?: () => void;
}

interface HintElements {
  root: HTMLElement | null;
  label: HTMLElement | null;
  fill: HTMLElement | null;
}

interface SceneOptions {
  ribbonCount: number;
  particleCount: number;
  intro: boolean;
}

function mountScene(
  host: HTMLElement,
  canvas: HTMLCanvasElement,
  hint: HintElements,
  live: { current: LiveSettings },
  { ribbonCount, particleCount, intro }: SceneOptions,
) {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const small = window.matchMedia("(max-width: 767px)").matches || (navigator.hardwareConcurrency || 8) <= 4;
  const timers = new Set<ReturnType<typeof setTimeout>>();
  const later = (fn: () => void, ms: number) => {
    const id = setTimeout(() => {
      timers.delete(id);
      fn();
    }, ms);
    timers.add(id);
  };
  const sound = createRibbonSound();

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !small, alpha: true, powerPreference: "high-performance" });
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = TONE_EXPOSURE;
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 200);
  camera.position.set(0, 0, CAMERA_Z);
  const fog = new THREE.FogExp2(0x111111, FOG_DENSITY);
  scene.fog = fog;

  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  envScene.add(
    new THREE.Mesh(
      new THREE.BoxGeometry(30, 16, 30),
      new THREE.MeshBasicMaterial({ color: new THREE.Color().setHex(0x070707, THREE.LinearSRGBColorSpace), side: THREE.BackSide }),
    ),
  );
  const addSoftbox = (w: number, h: number, x: number, y: number, z: number, rx: number, ry: number) => {
    const mat = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    m.position.set(x, y, z);
    m.rotation.set(rx, ry, 0);
    envScene.add(m);
    return mat;
  };
  addSoftbox(14, 2, 0, 7.5, 0, Math.PI / 2, 0).color.setRGB(1.3, 1.25, 1.2);

  const tintedBoxes: [THREE.MeshBasicMaterial, number][] = [
    [addSoftbox(2.5, 10, -14, 1, -2, 0, Math.PI / 2), 4.2],
    [addSoftbox(2, 9, 14, 0, 4, 0, -Math.PI / 2), 3.4],
    [addSoftbox(18, 1.2, 0, -2, -14, 0, 0), 1.3],
  ];
  let envTarget: THREE.WebGLRenderTarget | null = null;

  scene.add(
    new THREE.HemisphereLight(
      new THREE.Color().setHex(0x3a2a22, THREE.LinearSRGBColorSpace),
      new THREE.Color().setHex(0x050505, THREE.LinearSRGBColorSpace),
      0.4 * Math.PI,
    ),
  );
  const key = new THREE.DirectionalLight(new THREE.Color().setHex(0xffe6d4, THREE.LinearSRGBColorSpace), 0.9 * Math.PI);
  key.position.set(-6, 10, 8);
  scene.add(key);
  const rim = new THREE.PointLight(0xffffff, RIM_INTENSITY, 40, 0);
  rim.position.set(8, -4, 6);
  scene.add(rim);

  const uTime = { value: 0 };
  const trail = Array.from({ length: TRAIL }, () => new THREE.Vector4(99, 99, 0, 0));
  const RU = {
    uScrollV: { value: 0 },
    uTime,
    uTrail: { value: trail },
    uHit: { value: new THREE.Vector3(99, 99, 0) },
    uHitT: { value: 99 },
    uHitA: { value: 0 },
    uCharge: { value: 0 },
    uIdle: { value: 1 },
    uGlow: { value: new THREE.Color() },
    uGlowHi: { value: new THREE.Color() },
  };
  const ribMat = new THREE.MeshPhysicalMaterial({
    side: THREE.DoubleSide,
    clearcoat: 1,
    clearcoatRoughness: 0.16,
    envMapIntensity: 1.25,
    transparent: true,
    opacity: 1,
  });
  ribMat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, RU);
    sh.vertexShader = RIBBON_VERT_PARS + sh.vertexShader.replace("#include <begin_vertex>", RIBBON_VERT_DISPLACE);
    sh.fragmentShader = RIBBON_FRAG_PARS + sh.fragmentShader.replace("#include <emissivemap_fragment>", RIBBON_FRAG_EMISSIVE);
  };

  const ribbons = new THREE.Group();
  scene.add(ribbons);
  const subs: THREE.Group[] = [];
  const ribMeshes: THREE.Mesh[] = [];
  const streaks: { m: THREE.ShaderMaterial; head: number; speed: number }[] = [];
  const disposables: { dispose: () => void }[] = [ribMat];
  for (let i = 0; i < ribbonCount; i++) {
    const R = RIBBON_RADIUS + i * RIBBON_STEP;
    const pathAt = (a: number) =>
      new THREE.Vector3(Math.cos(a) * R, Math.sin(a) * R * 0.92, Math.sin(a * 1.3 + i * 0.4) * 0.9 - i * 0.55);
    const pts: THREE.Vector3[] = [];
    for (let k = 0; k <= 96; k++) pts.push(pathAt(RIBBON_ARC_START + ((RIBBON_ARC_END - RIBBON_ARC_START) * k) / 96));
    const curve = new THREE.CatmullRomCurve3(pts);
    const geo = buildRibbonGeometry(pathAt, RIBBON_ARC_START, RIBBON_ARC_END, small ? 220 : 420, RIBBON_WIDTH, RIBBON_THICKNESS);
    const sub = new THREE.Group();
    ribbons.add(sub);
    subs.push(sub);
    const mesh = new THREE.Mesh(geo, ribMat);
    sub.add(mesh);
    ribMeshes.push(mesh);

    const streakMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      premultipliedAlpha: true,
      uniforms: { ...RU, uHead: { value: -1 }, uLen: { value: 0.16 } },
      vertexShader: STREAK_VERT,
      fragmentShader: STREAK_FRAG,
    });
    const streakGeo = new THREE.TubeGeometry(curve, small ? 220 : 420, 0.035, 6, false);
    const streak = new THREE.Mesh(streakGeo, streakMat);
    streak.position.z = 0.1;
    sub.add(streak);
    streaks.push({ m: streakMat, head: -1, speed: 0 });
    disposables.push(geo, streakGeo, streakMat);
  }
  function fireStreak(j: number, delay = 0, speed?: number) {
    const s = streaks[j];
    if (!s) return;
    later(() => {
      s.head = -0.05;
      s.speed = speed || 0.28 + Math.random() * 0.18;
    }, delay);
  }

  const SN = Math.round(small ? particleCount * 0.45 : particleCount);
  const sBase = new Float32Array(SN * 3), sDir = new Float32Array(SN * 3), sR = new Float32Array(SN);
  {
    const ribFlat = ribMeshes.map((m) => m.geometry.toNonIndexed());
    const tmp = new THREE.Vector3(), a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), d = new THREE.Vector3();
    for (let n = 0; n < SN; n++) {
      const g = ribFlat[n % ribFlat.length].attributes.position as THREE.BufferAttribute;
      const tri = Math.floor(Math.random() * (g.count / 3)) * 3;
      a.fromBufferAttribute(g, tri);
      b.fromBufferAttribute(g, tri + 1);
      c.fromBufferAttribute(g, tri + 2);
      let r1 = Math.random(), r2 = Math.random();
      if (r1 + r2 > 1) {
        r1 = 1 - r1;
        r2 = 1 - r2;
      }
      tmp.copy(a).addScaledVector(b.sub(a), r1).addScaledVector(c.sub(a), r2);
      sBase[n * 3] = tmp.x;
      sBase[n * 3 + 1] = tmp.y;
      sBase[n * 3 + 2] = tmp.z;
      d.copy(tmp).normalize();
      d.x += (Math.random() - 0.5) * 1.2;
      d.y += (Math.random() - 0.5) * 1.2;
      d.z += Math.random() * 1.5 + 0.3;
      d.normalize();
      sDir[n * 3] = d.x;
      sDir[n * 3 + 1] = d.y;
      sDir[n * 3 + 2] = d.z;
      sR[n] = Math.random();
    }
    ribFlat.forEach((g) => g.dispose());
  }
  const sPos = new Float32Array(SN * 3), sVel = new Float32Array(SN * 3), sCloud = new Float32Array(SN * 3), sDelay = new Float32Array(SN);
  for (let n = 0; n < SN; n++) {
    sDelay[n] = ((Math.atan2(sBase[n * 3 + 1], sBase[n * 3]) + Math.PI) / (Math.PI * 2) + sR[n] * 0.25) % 1;
  }
  const sGeo = new THREE.BufferGeometry();
  sGeo.setAttribute("position", new THREE.BufferAttribute(sPos, 3));
  sGeo.setAttribute("aR", new THREE.BufferAttribute(sR, 1));
  const SU = { uAlpha: { value: 0 }, uPR: { value: 1 }, uGlow: RU.uGlow, uGlowHi: RU.uGlowHi };
  const sMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    premultipliedAlpha: true,
    uniforms: SU,
    vertexShader: SHARD_VERT,
    fragmentShader: SHARD_FRAG,
  });
  const shards = new THREE.Points(sGeo, sMat);
  shards.frustumCulled = false;
  shards.visible = false;
  ribbons.add(shards);
  disposables.push(sGeo, sMat);

  const applied: Partial<LiveSettings> = {};
  const white = new THREE.Color(1, 1, 1);
  function applyLook(L: LiveSettings) {
    if (applied.glowColor !== L.glowColor) {
      applied.glowColor = L.glowColor;
      const glow = new THREE.Color(L.glowColor);
      RU.uGlow.value.copy(glow);
      RU.uGlowHi.value.copy(glow).lerp(white, 0.5);
      rim.color.copy(glow);
      tintedBoxes.forEach(([mat, power]) => mat.color.copy(glow).multiplyScalar(power));
      envTarget?.dispose();
      envTarget = pmrem.fromScene(envScene, 0.03);
      scene.environment = envTarget.texture;
      if (hint.fill) hint.fill.style.background = L.glowColor;
    }
    if (applied.ribbonColor !== L.ribbonColor) {
      applied.ribbonColor = L.ribbonColor;
      ribMat.color.set(L.ribbonColor);
    }
    if (applied.backgroundColor !== L.backgroundColor) {
      applied.backgroundColor = L.backgroundColor;

      fog.color.setStyle(L.backgroundColor, THREE.LinearSRGBColorSpace);
    }
    ribMat.metalness = L.metalness;
    ribMat.roughness = L.roughness;
    RU.uIdle.value = reduced ? 0 : L.idleMotion;
  }

  const mouse = { x: 0, y: 0, sx: 0, sy: 0, cx: -1, cy: -1, on: false };
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  const pv = new THREE.Vector3(), tmpV = new THREE.Vector3();
  const inv = new THREE.Matrix4(), lo = new THREE.Vector3(), ld = new THREE.Vector3();
  const pointerWorld = (out: THREE.Vector3) => {
    ndc.set(mouse.x, -mouse.y);
    ray.setFromCamera(ndc, camera);
    return ray.ray.intersectPlane(plane, out);
  };

  let hintText = "";
  const setHint = (text: string) => {
    if (!hint.label || text === hintText) return;
    hintText = text;
    hint.label.textContent = text;
  };

// Shatter state
  const SH = { mode: 0, t: 0 };
  let mouseSpeed = 0;
  function startShatter() {
    for (let n = 0; n < SN; n++) {
      const k = n * 3, sp = 2.2 + sR[n] * 5.5;
      sPos[k] = sBase[k];
      sPos[k + 1] = sBase[k + 1];
      sPos[k + 2] = sBase[k + 2];
      sCloud[k] = sBase[k] + sDir[k] * sp + (Math.random() - 0.5) * 2.4;
      sCloud[k + 1] = sBase[k + 1] + sDir[k + 1] * sp + (Math.random() - 0.5) * 2.4;
      sCloud[k + 2] = sBase[k + 2] + sDir[k + 2] * sp * 0.8 + (Math.random() - 0.2) * 2;
      const im = 3 + sR[n] * 5;
      sVel[k] = sDir[k] * im;
      sVel[k + 1] = sDir[k + 1] * im;
      sVel[k + 2] = sDir[k + 2] * im;
    }
    SH.mode = 1;
    SH.t = 0;
    shards.visible = true;
    SU.uAlpha.value = 1;
    ribMat.opacity = 0;
    ribMeshes.forEach((m) => {
      m.visible = false;
    });
    streaks.forEach((s) => {
      s.head = -1;
    });
  }
  function simShards(dt: number, time: number, floatTime: number) {
    SH.t += dt;
    let mode = SH.mode;
    if (mode === 1 && SH.t > BURST_S) {
      SH.mode = mode = 2;
      SH.t = 0;
    }
    if (mode === 2 && SH.t > floatTime) {
      SH.mode = mode = 3;
      SH.t = 0;
    }

    const useMouse = mouse.on && mode >= 1 && mode <= 3;
    if (useMouse) {
      pointerWorld(pv);
      inv.copy(ribbons.matrixWorld).invert();
      lo.copy(ray.ray.origin).applyMatrix4(inv);
      ld.copy(ray.ray.direction).transformDirection(inv).normalize();
    }
    const mSpd = Math.min(1.6, mouseSpeed * 0.06), drag = Math.pow(mode === 3 ? 0.83 : 0.93, dt * 60);
    let done = 0;
    for (let n = 0; n < SN; n++) {
      const k = n * 3;
      let tx, ty, tz, kk;
      if (mode === 3) {
        let q = clamp((SH.t - sDelay[n] * 1.3) / 1.9, 0, 1);
        q = q * q * (3 - 2 * q);
        tx = sCloud[k] + (sBase[k] - sCloud[k]) * q;
        ty = sCloud[k + 1] + (sBase[k + 1] - sCloud[k + 1]) * q;
        tz = sCloud[k + 2] + (sBase[k + 2] - sCloud[k + 2]) * q;
        kk = 2.4 + q * 14;
      } else {
        const dr = time * 0.35 + sR[n] * 6.28;
        tx = sCloud[k] + Math.sin(dr + sCloud[k + 1] * 0.3) * 0.45;
        ty = sCloud[k + 1] + Math.cos(dr * 0.8 + sCloud[k] * 0.3) * 0.45;
        tz = sCloud[k + 2] + Math.sin(dr * 0.6) * 0.3;
        kk = mode === 1 ? 2.4 : 0.9;
      }
      let ax = (tx - sPos[k]) * kk, ay = (ty - sPos[k + 1]) * kk, az = (tz - sPos[k + 2]) * kk;
      if (useMouse) {
        const wx = sPos[k] - lo.x, wy = sPos[k + 1] - lo.y, wz = sPos[k + 2] - lo.z, tt = wx * ld.x + wy * ld.y + wz * ld.z;
        let rx = wx - ld.x * tt, ry = wy - ld.y * tt, rz = wz - ld.z * tt;
        const dist = Math.sqrt(rx * rx + ry * ry + rz * rz);
        if (dist < STIR_RADIUS && dist > 0.0001) {
          let f = 1 - dist / STIR_RADIUS;
          f = f * f * (4 + mSpd * 14) * (mode === 3 ? 0.4 : 1);
          rx /= dist;
          ry /= dist;
          rz /= dist;
          ax += rx * f;
          ay += ry * f;
          az += rz * f;

          ax += (ld.y * rz - ld.z * ry) * f * 0.9;
          ay += (ld.z * rx - ld.x * rz) * f * 0.9;
          az += (ld.x * ry - ld.y * rx) * f * 0.9;
        }
      }
      sVel[k] = (sVel[k] + ax * dt) * drag;
      sVel[k + 1] = (sVel[k + 1] + ay * dt) * drag;
      sVel[k + 2] = (sVel[k + 2] + az * dt) * drag;
      sPos[k] += sVel[k] * dt;
      sPos[k + 1] += sVel[k + 1] * dt;
      sPos[k + 2] += sVel[k + 2] * dt;
      if (mode === 3) {
        const ex = sBase[k] - sPos[k], ey = sBase[k + 1] - sPos[k + 1], ez = sBase[k + 2] - sPos[k + 2];
        if (ex * ex + ey * ey + ez * ez < 0.02) done++;
      }
    }
    sGeo.attributes.position.needsUpdate = true;
    if (mode === 3 && (done > SN * 0.97 || SH.t > REFORM_MAX_S)) {
      SH.mode = 4;
      SH.t = 0;
      ribMeshes.forEach((m) => {
        m.visible = true;
      });
      RU.uHit.value.set(ribbons.position.x, ribbons.position.y, 0);
      RU.uHitT.value = 0;
      RU.uHitA.value = 0.5;
      streaks.forEach((_, j) => fireStreak(j, j * 80, 0.35));
      if (live.current.sound) sound.reform();
    }
    if (SH.mode === 4) {
      const f = clamp(SH.t / CROSSFADE_S, 0, 1), e = f * f * (3 - 2 * f);
      ribMat.opacity = e;
      SU.uAlpha.value = 1 - e;
      if (f >= 1) {
        SH.mode = 0;
        shards.visible = false;
        ribMat.opacity = 1;
      }
    }
  }

  function tap() {
    if (pointerWorld(pv)) {
      RU.uHit.value.copy(pv);
      RU.uHitT.value = 0;
      RU.uHitA.value = 0.45;
    }
    let best = 0, bestDist = Infinity;
    for (let j = 0; j < streaks.length; j++) {
      const d = Math.abs(
        Math.hypot(pv.x - ribbons.position.x, pv.y - ribbons.position.y) / ribbons.scale.x - (RIBBON_RADIUS + j * RIBBON_STEP),
      );
      if (d < bestDist) {
        bestDist = d;
        best = j;
      }
    }
    fireStreak(best, 0, 0.35);
  }

  // Shatter ripple
  const shockwave = (clientX: number, clientY: number) => {
    if (reduced || clientX < 0) return;
    const r = host.getBoundingClientRect();
    const x = clientX - r.left, y = clientY - r.top;
    const glow = live.current.glowColor;
    [0, 0.12, 0.26].forEach((delay, i) => {
      const ring = document.createElement("span");
      ring.setAttribute("aria-hidden", "true");
      Object.assign(ring.style, {
        position: "absolute", left: `${x}px`, top: `${y}px`, width: "40px", height: "40px",
        margin: "-20px 0 0 -20px", borderRadius: "50%", pointerEvents: "none", zIndex: "2",
        border: `${i === 0 ? 2 : 1}px solid ${i === 1 ? "rgba(255,255,255,.55)" : toRgba(glow, 0.85)}`,
        boxShadow: i === 0 ? `0 0 40px ${toRgba(glow, 0.45)}, inset 0 0 30px ${toRgba(glow, 0.25)}` : "none",
        opacity: "0",
      });
      host.appendChild(ring);
      gsap.fromTo(
        ring,
        { scale: 0.2, opacity: 1 },
        { scale: 26 + i * 6, opacity: 0, duration: 1.6 + i * 0.25, delay, ease: "expo.out", onComplete: () => ring.remove() },
      );
    });
  };

  const charge = { v: 0 };
  let press: { t: number; ready: boolean; sounding: boolean; tw: gsap.core.Tween } | null = null;
  let chargeTween: gsap.core.Tween | null = null;
  let lastX = -1, lastY = -1;
  const canHold = (target: EventTarget | null) =>
    live.current.holdToShatter &&
    target instanceof Element &&
    host.contains(target) &&
    !target.closest(HOLD_EXCLUDE);

  const updatePointer = (clientX: number, clientY: number) => {
    const r = canvas.getBoundingClientRect();
    mouse.cx = clientX - r.left;
    mouse.cy = clientY - r.top;
    mouse.x = clamp((mouse.cx / r.width) * 2 - 1, -1, 1);
    mouse.y = clamp((mouse.cy / r.height) * 2 - 1, -1, 1);
    mouse.on = mouse.cx >= 0 && mouse.cy >= 0 && mouse.cx <= r.width && mouse.cy <= r.height;
  };
  // Pointer where a hold can start, grabbing while one is active.
  let holdable = false;
  const restCursor = () => {
    host.style.cursor = holdable ? "pointer" : "";
  };
  const onPointerMove = (e: PointerEvent) => {
    updatePointer(e.clientX, e.clientY);
    holdable = canHold(e.target);
    if (!press) restCursor();
    lastX = e.clientX;
    lastY = e.clientY;
  };
  const onPointerLeave = () => {
    holdable = false;
    if (!press) restCursor();
    mouse.on = false;
    mouse.x = 0;
    mouse.y = 0;
  };
  const onPointerDown = (e: PointerEvent) => {
    if (!e.isPrimary || e.button !== 0 || !canHold(e.target)) return;
    e.preventDefault();
    if (live.current.sound) sound.unlock();
    updatePointer(e.clientX, e.clientY);
    lastX = e.clientX;
    lastY = e.clientY;
    chargeTween?.kill();
    charge.v = 0;
    const p = {
      t: performance.now(),
      ready: false,
      sounding: false,
      tw: gsap.to(charge, {
        v: 1,
        duration: live.current.holdDuration,
        delay: HOLD_DELAY,
        ease: "power2.in",
        onStart: () => {
          p.sounding = live.current.sound;
          if (p.sounding) sound.holdStart();
        },
        onUpdate: () => {
          if (!p.ready && charge.v >= FULL_CHARGE) {
            p.ready = true;
            if (SH.mode === 0) setHint("Release");
            if (live.current.sound) sound.ready();
          }
        },
      }),
    };
    press = p;
    host.style.cursor = "grabbing";
  };
  // Long-press on touch opens the callout/context menu, which would eat the hold.
  const onContextMenu = (e: Event) => {
    if (canHold(e.target)) e.preventDefault();
  };
  const onPointerUp = () => {
    if (!press) return;
    const p = press;
    press = null;
    restCursor();
    p.tw.kill();
    const quick = performance.now() - p.t < TAP_MS, full = charge.v > FULL_CHARGE;
    if (p.sounding) sound.holdEnd(full, live.current.sound);
    if (quick) {
      tap();
      if (live.current.sound) sound.tap();
    } else if (full && SH.mode === 0) {
      startShatter();
      if (live.current.sound) sound.shatter();
      streaks.forEach((_, j) => fireStreak(j, j * 70, 0.5));
      shockwave(lastX, lastY);
      live.current.onShatter?.();
    } else if (pointerWorld(pv)) {
      RU.uHit.value.copy(pv);
      RU.uHitT.value = 0;
      RU.uHitA.value = 0.4 + charge.v * 0.6;
    }
    chargeTween = gsap.to(charge, { v: 0, duration: 1.4, ease: "expo.out" });
  };
  // Touch: the browser takes over for a vertical scroll and cancels the pointer,
  // so drop the hold without firing a shatter or a tap.
  const onPointerCancel = () => {
    if (!press) return;
    const p = press;
    press = null;
    restCursor();
    p.tw.kill();
    if (p.sounding) sound.holdEnd(false, live.current.sound);
    chargeTween = gsap.to(charge, { v: 0, duration: 0.6, ease: "expo.out" });
    onPointerLeave();
  };
  const onScroll = () => {
    if (lastX >= 0) updatePointer(lastX, lastY);
  };

  let raf = 0, inView = false;
  const clock = new THREE.Clock();
  let lastScroll = window.scrollY, scrollV = 0, scrollWave = 0;
  const setRunning = () => {
    const run = inView && !document.hidden;
    if (run && !raf) {
      clock.getDelta();

      lastScroll = window.scrollY;
      scrollV = 0;
      scrollWave = 0;
      raf = requestAnimationFrame(frame);
    } else if (!run && raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
  };
  // Pause off-screen
  const io = new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting;
    setRunning();
  });
  io.observe(canvas);
  document.addEventListener("visibilitychange", setRunning);

  const onResize = () => {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    const pr = Math.min(window.devicePixelRatio || 1, small ? 1.25 : 1.75);
    renderer.setPixelRatio(pr);
    SU.uPR.value = pr;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = camera.aspect < 0.8 ? 46 : 32;
    camera.updateProjectionMatrix();

    if (raf) renderer.render(scene, camera);
  };
  const ro = new ResizeObserver(onResize);
  ro.observe(canvas);
  onResize();

  const startPose = POSES[camera.aspect < NARROW_ASPECT ? "narrow" : "wide"];
  const cur = {
    rp: new THREE.Vector3().fromArray(startPose.rp),
    rr: new THREE.Vector3().fromArray(startPose.rr),
    rs: startPose.rs * live.current.scale,
  };
  let lastScrollStreak = 0, hoverAmp = 0, lastMx = -1, lastMy = -1, idleT = 3;
  let entering = intro && !reduced;
  let introT = 0;
  const ringStarted = subs.map(() => false);
  if (entering) subs.forEach((sb) => sb.scale.setScalar(0.001));
  if (hint.root) hint.root.style.opacity = "1";

  function updateIntro(dt: number) {
    introT += dt;
    let settled = true;
    subs.forEach((sb, j) => {
      const t = clamp((introT - INTRO_DELAY - j * RING_STAGGER) / RING_GROW, 0, 1);
      if (t > 0 && !ringStarted[j]) {
        ringStarted[j] = true;
        fireStreak(j, 0, 0.5);
      }
      const e = easeOutCubic(t);
      sb.visible = t > 0;
      sb.scale.setScalar(Math.max(e, 0.001));
      sb.rotation.z = (1 - e) * RING_UNWIND * (j % 2 ? 1 : -1);
      if (t < 1) settled = false;
    });
    if (settled) entering = false;
  }

  function frame() {
    raf = requestAnimationFrame(frame);
    const L = live.current;
    applyLook(L);
    const dt = Math.min(clock.getDelta(), 0.05);
    const time = (uTime.value += dt);
    const P = POSES[camera.aspect < NARROW_ASPECT ? "narrow" : "wide"];
    const k = 1 - Math.pow(0.12, dt);
    cur.rp.lerp(tmpV.fromArray(P.rp), k);
    cur.rr.lerp(tmpV.fromArray(P.rr), k);
    cur.rs = lerp(cur.rs, P.rs * L.scale, k);

    const sy = window.scrollY;
    scrollV = lerp(scrollV, clamp(sy - lastScroll, -MAX_SCROLL_STEP, MAX_SCROLL_STEP), 0.08);
    lastScroll = sy;
    scrollWave = lerp(scrollWave, clamp(scrollV / 26, -1.3, 1.3), 0.07);
    RU.uScrollV.value = scrollWave;

    mouse.sx = damp(mouse.sx, mouse.x, MOUSE_TILT_EASE, dt);
    mouse.sy = damp(mouse.sy, mouse.y, MOUSE_TILT_EASE, dt);
    const ch = charge.v;
    RU.uCharge.value = ch;

    if (entering) updateIntro(dt);
    ribbons.position.copy(cur.rp);
    ribbons.position.x += Math.sin(time * 40) * ch * ch * 0.04;
    ribbons.scale.setScalar(cur.rs * (1 - ch * 0.09));
    ribbons.rotation.set(
      cur.rr.x + mouse.sy * 0.06 * L.tiltStrength,
      cur.rr.y + mouse.sx * 0.18 * L.tiltStrength,
      cur.rr.z + Math.sin(time * 0.12) * 0.03 * L.idleMotion + ch * 0.12,
    );

    camera.position.z = lerp(camera.position.z, CAMERA_Z - ch * 1.8, 0.06);

    if (!reduced && L.streakFrequency > 0 && Math.abs(scrollV) > 20 && time - lastScrollStreak > 0.3 && !SH.mode) {
      lastScrollStreak = time;
      fireStreak((Math.random() * streaks.length) | 0, 0, 0.45 + Math.min(0.5, Math.abs(scrollV) * 0.01));
    }

    if (SH.mode) simShards(dt, time, L.reformDelay);

    const moved = lastMx < 0 ? 0 : Math.min(MAX_POINTER_STEP, Math.hypot(mouse.cx - lastMx, mouse.cy - lastMy));
    lastMx = mouse.cx;
    lastMy = mouse.cy;
    mouseSpeed = damp(mouseSpeed, moved, 0.18, dt);
    if (moved > 2 && SH.mode === 2) SH.t = Math.min(SH.t, Math.max(0, L.reformDelay - 2.5));
    hoverAmp = damp(
      hoverAmp,
      mouse.on && !SH.mode ? (0.45 + Math.min(0.6, mouseSpeed * 0.03) + ch * 0.5) * L.hoverStrength : 0,
      0.05,
      dt,
    );
    if (pointerWorld(pv)) {
      trail[0].x = damp(trail[0].x, pv.x, 0.12, dt);
      trail[0].y = damp(trail[0].y, pv.y, 0.12, dt);
      trail[0].z = 0;
    }
    for (let i = 1; i < TRAIL; i++) {
      trail[i].x = damp(trail[i].x, trail[i - 1].x, 0.15, dt);
      trail[i].y = damp(trail[i].y, trail[i - 1].y, 0.15, dt);
    }
    for (let i = 0; i < TRAIL; i++) trail[i].w = hoverAmp * (1 - i * 0.13);
    RU.uHitT.value += dt;

    if (!reduced && L.streakFrequency > 0) {
      idleT -= dt * L.streakFrequency;
      if (idleT < 0) {
        idleT = 2.5 + Math.random() * 4;
        fireStreak((Math.random() * streaks.length) | 0, 0, 0.16 + Math.random() * 0.1);
      }
    }
    streaks.forEach((s) => {
      if (s.head > -1) {
        s.head += s.speed * dt;
        if (s.head > 1.25) s.head = -1;
      }
      s.m.uniforms.uHead.value = s.head;
    });

    if (hint.root) {
      if (SH.mode === 1 || SH.mode === 2) setHint("Move to Stir");
      else if (SH.mode) setHint("Reforming");
      else if (!press || !press.ready) setHint(press ? "Keep Holding" : "Press and Hold");
      if (hint.fill) hint.fill.style.transform = `scaleX(${SH.mode ? 0 : ch.toFixed(3)})`;
      hint.root.style.opacity = L.holdToShatter ? "1" : "0";
    }

    renderer.render(scene, camera);
  }

  host.addEventListener("pointermove", onPointerMove, { passive: true });
  host.addEventListener("pointerleave", onPointerLeave);
  host.addEventListener("pointerdown", onPointerDown);
  window.addEventListener("pointerup", onPointerUp);
  window.addEventListener("pointercancel", onPointerCancel);
  host.addEventListener("contextmenu", onContextMenu);
  window.addEventListener("scroll", onScroll, { passive: true });

  return () => {
    cancelAnimationFrame(raf);
    raf = 0;
    io.disconnect();
    ro.disconnect();
    document.removeEventListener("visibilitychange", setRunning);
    host.removeEventListener("pointermove", onPointerMove);
    host.removeEventListener("pointerleave", onPointerLeave);
    host.removeEventListener("pointerdown", onPointerDown);
    window.removeEventListener("pointerup", onPointerUp);
    window.removeEventListener("pointercancel", onPointerCancel);
    host.removeEventListener("contextmenu", onContextMenu);
    window.removeEventListener("scroll", onScroll);
    timers.forEach(clearTimeout);
    timers.clear();
    chargeTween?.kill();
    press?.tw.kill();
    press = null;
    host.style.cursor = "";
    sound.destroy();
    disposables.forEach((d) => d.dispose());
    envScene.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.geometry.dispose();
        (o.material as THREE.Material).dispose();
      }
    });
    envTarget?.dispose();
    pmrem.dispose();

    renderer.dispose();
  };
}

export interface LiquidShatterProps {
  ribbonCount?: number;

  ribbonColor?: string;

  glowColor?: string;

  backgroundColor?: string;

  metalness?: number;

  roughness?: number;

  scale?: number;

  idleMotion?: number;

  streakFrequency?: number;

  hoverStrength?: number;

  tiltStrength?: number;

  sound?: boolean;

  holdToShatter?: boolean;

  holdDuration?: number;

  reformDelay?: number;

  particleCount?: number;

  introAnimation?: boolean;

  holdHint?: boolean;

  onShatter?: () => void;

  className?: string;

  children?: React.ReactNode;
}

export default function LiquidShatter({
  ribbonCount = 7,
  ribbonColor = "#24120a",
  glowColor = "#ff6b00",
  backgroundColor = "#111111",
  metalness = 0.4,
  roughness = 0.26,
  scale = 1,
  idleMotion = 1,
  streakFrequency = 1,
  hoverStrength = 1,
  tiltStrength = 1,
  sound = true,
  holdToShatter = true,
  holdDuration = 1.9,
  reformDelay = 3,
  particleCount = 11000,
  introAnimation = true,
  holdHint = true,
  onShatter,
  className = "",
  children,
}: LiquidShatterProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hintRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const fillRef = useRef<HTMLSpanElement>(null);

  const settings: LiveSettings = {
    ribbonColor,
    glowColor,
    backgroundColor,
    metalness: clamp(metalness, 0, 1),
    roughness: clamp(roughness, 0, 1),
    scale: clamp(scale, 0.2, 3),
    idleMotion: Math.max(0, idleMotion),
    streakFrequency: Math.max(0, streakFrequency),
    hoverStrength: Math.max(0, hoverStrength),
    tiltStrength: Math.max(0, tiltStrength),
    sound,
    holdToShatter,
    holdDuration: clamp(holdDuration, 0.3, 10),
    reformDelay: clamp(reformDelay, 1, 30),
    onShatter,
  };
  // Read every frame
  const liveRef = useRef(settings);
  useEffect(() => {
    liveRef.current = settings;
  });

  const rings = Math.round(clamp(ribbonCount, 3, 9));
  const shards = Math.round(clamp(particleCount, 1000, 30000));
  useEffect(() => {
    const host = hostRef.current, canvas = canvasRef.current;
    if (!host || !canvas) return undefined;
    return mountScene(
      host,
      canvas,
      { root: hintRef.current, label: labelRef.current, fill: fillRef.current },
      liveRef,
      { ribbonCount: rings, particleCount: shards, intro: introAnimation },
    );
  }, [rings, shards, introAnimation]);

  return (
    <div
      ref={hostRef}
      className={`relative h-svh w-full touch-pan-y overflow-hidden select-none [-webkit-touch-callout:none] ${className}`}
      style={{ background: backgroundColor }}
    >
      <canvas ref={canvasRef} aria-hidden="true" className="absolute inset-0 block h-full w-full" />
      {children ? <div className="pointer-events-none relative z-10 h-full w-full">{children}</div> : null}
      {holdHint ? (
        <div
          ref={hintRef}
          aria-hidden="true"
          className="pointer-events-none absolute bottom-8 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-2.5 opacity-0 transition-opacity duration-700"
        >
          <span ref={labelRef} className="font-mono text-sm text-white/60 ">
            Press and Hold
          </span>
          <span className="relative block h-px w-24 overflow-hidden bg-white/15">
            <span ref={fillRef} className="absolute inset-0 origin-left" style={{ transform: "scaleX(0)" }} />
          </span>
        </div>
      ) : null}
    </div>
  );
}
