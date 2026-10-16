"use client";

// A blob from labs.hyperiux.com/viscous-matter (3dexperiments' Blobify, after
// Blobmixer) drawn as the community page's particles: the surface motion is the
// same vertex displacement with the same preset values, and the dots and their
// grid are crowd.js's, and the cursor is particleHover.js, shared with crowd.js.
// Press and hold explodes it like the homepage hero (particleShatter.js).
//
//   <ParticleBlob preset="slinky" />  (pricing hero)
//   <ParticleBlob preset="fomosphere" />  (blog hero)

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { isLighthouseOrHeadless, isSoftwareRenderer } from "@/lib/audit";
import { prefersReducedMotion } from "@/lib/motion";
import { MEDIA } from "@/lib/breakpoints";
import { createHover } from "./particleHover";
import { createShatter, screenBounds, shockwave } from "./particleShatter";
import { useInteraction } from "@/homepage/components/InteractionProvider";

// Blobify's presets (utils/blobSetting.js): the displacement values only
const PRESETS = {
  slinky: {
    distort: 0.84,
    frequency: 5,
    speed: 1,
    gooPoleAmount: 0,
    surfaceDistort: 0.93,
    surfaceFrequency: 5,
    numberOfWaves: 20,
    surfaceSpeed: 0,
    surfacePoleAmount: 1,
  },
  fomosphere: {
    distort: 0.08,
    frequency: 2.77,
    speed: 1,
    gooPoleAmount: 1,
    surfaceDistort: 3.6,
    surfaceFrequency: 1.62,
    numberOfWaves: 3.4,
    surfaceSpeed: 1,
    surfacePoleAmount: 1,
  },
};
// Blobify: LOOP_DURATION / NOISE_PERIOD_REPEAT
const NOISE_PERIOD = 12 / 3;

const COUNT = 6000;
const COUNT_SMALL = 2600;
const MAX_DT = 0.05;
const MAX_PIXEL_RATIO = 1.75;
const MAX_PIXEL_RATIO_SMALL = 1.25;

// Blobmixer's displacement shader, verbatim (Gustavson's periodic Perlin noise + f())
const BLOB_NOISE = /* glsl */ `
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
vec3 fade(vec3 t) { return t*t*t*(t*(t*6.0-15.0)+10.0); }

float pnoise(vec3 P, vec3 rep) {
  vec3 Pi0 = mod(floor(P), rep);
  vec3 Pi1 = mod(Pi0 + vec3(1.0), rep);
  Pi0 = mod289(Pi0);
  Pi1 = mod289(Pi1);
  vec3 Pf0 = fract(P);
  vec3 Pf1 = Pf0 - vec3(1.0);
  vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);
  vec4 iy = vec4(Pi0.yy, Pi1.yy);
  vec4 iz0 = Pi0.zzzz;
  vec4 iz1 = Pi1.zzzz;

  vec4 ixy = permute(permute(ix) + iy);
  vec4 ixy0 = permute(ixy + iz0);
  vec4 ixy1 = permute(ixy + iz1);

  vec4 gx0 = ixy0 * (1.0 / 7.0);
  vec4 gy0 = fract(floor(gx0) * (1.0 / 7.0)) - 0.5;
  gx0 = fract(gx0);
  vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0);
  vec4 sz0 = step(gz0, vec4(0.0));
  gx0 -= sz0 * (step(0.0, gx0) - 0.5);
  gy0 -= sz0 * (step(0.0, gy0) - 0.5);

  vec4 gx1 = ixy1 * (1.0 / 7.0);
  vec4 gy1 = fract(floor(gx1) * (1.0 / 7.0)) - 0.5;
  gx1 = fract(gx1);
  vec4 gz1 = vec4(0.5) - abs(gx1) - abs(gy1);
  vec4 sz1 = step(gz1, vec4(0.0));
  gx1 -= sz1 * (step(0.0, gx1) - 0.5);
  gy1 -= sz1 * (step(0.0, gy1) - 0.5);

  vec3 g000 = vec3(gx0.x,gy0.x,gz0.x);
  vec3 g100 = vec3(gx0.y,gy0.y,gz0.y);
  vec3 g010 = vec3(gx0.z,gy0.z,gz0.z);
  vec3 g110 = vec3(gx0.w,gy0.w,gz0.w);
  vec3 g001 = vec3(gx1.x,gy1.x,gz1.x);
  vec3 g101 = vec3(gx1.y,gy1.y,gz1.y);
  vec3 g011 = vec3(gx1.z,gy1.z,gz1.z);
  vec3 g111 = vec3(gx1.w,gy1.w,gz1.w);

  vec4 norm0 = taylorInvSqrt(vec4(dot(g000, g000), dot(g010, g010), dot(g100, g100), dot(g110, g110)));
  g000 *= norm0.x;
  g010 *= norm0.y;
  g100 *= norm0.z;
  g110 *= norm0.w;
  vec4 norm1 = taylorInvSqrt(vec4(dot(g001, g001), dot(g011, g011), dot(g101, g101), dot(g111, g111)));
  g001 *= norm1.x;
  g011 *= norm1.y;
  g101 *= norm1.z;
  g111 *= norm1.w;

  float n000 = dot(g000, Pf0);
  float n100 = dot(g100, vec3(Pf1.x, Pf0.yz));
  float n010 = dot(g010, vec3(Pf0.x, Pf1.y, Pf0.z));
  float n110 = dot(g110, vec3(Pf1.xy, Pf0.z));
  float n001 = dot(g001, vec3(Pf0.xy, Pf1.z));
  float n101 = dot(g101, vec3(Pf1.x, Pf0.y, Pf1.z));
  float n011 = dot(g011, vec3(Pf0.x, Pf1.yz));
  float n111 = dot(g111, Pf1);

  vec3 fade_xyz = fade(Pf0);
  vec4 n_z = mix(vec4(n000, n100, n010, n110), vec4(n001, n101, n011, n111), fade_xyz.z);
  vec2 n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y);
  float n_xyz = mix(n_yz.x, n_yz.y, fade_xyz.x);
  return 2.2 * n_xyz;
}

uniform float time;
uniform float distort;
uniform float frequency;
uniform float surfaceDistort;
uniform float surfaceFrequency;
uniform float surfaceTime;
uniform float numberOfWaves;
uniform float surfacePoleAmount;
uniform float gooPoleAmount;
uniform float noisePeriod;

#define M_PI 3.1415926538

float f(vec3 point) {
  float yPos = smoothstep(-1., 1., point.y);
  float amount = sin(yPos * M_PI);
  float wavePoleAmount = mix(amount * 1.0, 1.0, surfacePoleAmount);
  float gooPoleAmount = mix(amount * 1.0, 1.0, gooPoleAmount);

  // blob noise
  float goo = pnoise(vec3(point / (frequency) + mod(time, noisePeriod)), vec3(noisePeriod)) * pow(distort, 2.0);

  // wave noise
  float surfaceNoise = pnoise(vec3(point / (surfaceFrequency) + mod(surfaceTime, noisePeriod)), vec3(noisePeriod));
  float waves = (point.x * sin((point.y+surfaceNoise)*M_PI*numberOfWaves) + point.z * cos((point.y+surfaceNoise)*M_PI*numberOfWaves)) * 0.01 * pow(surfaceDistort, 2.0);

  // combined noise
  return waves * wavePoleAmount + goo * gooPoleAmount;
}
`;

// The community page's particle shader, plus Blobmixer's displacement.
// aOffset is how far each dot is pushed off the surface (clicks and the cursor, run on the CPU).
const VERTEX_SHADER = /* glsl */ `
${BLOB_NOISE}
attribute float aR;
attribute vec3 aOffset;
uniform float uPR, uTwinkle, uPulse;
varying float vR, vA;
void main() {
  vec3 n = normalize(position);
  vec3 displaced = position + n * f(position);
  vec4 mv = modelViewMatrix * vec4(displaced, 1.);
  // The camera is not rotated, so a world-space offset is a view-space one
  mv.xyz += aOffset;
  gl_Position = projectionMatrix * mv;
  // Point size and twinkle exactly as crowd.js
  float tw = .75 + .25 * sin(uTwinkle * 1.7 + aR * 40.);
  gl_PointSize = uPR * (2.4 + aR * 3.6 + uPulse * 1.8) * (24. / -mv.z);
  vR = aR;
  vA = tw;
}`;

const FRAGMENT_SHADER = /* glsl */ `
varying float vR, vA;
void main() {
  float d = length(gl_PointCoord - .5);
  if (d > .5) discard;
  float s = smoothstep(.5, 0., d);
  vec3 base = mix(vec3(.78, .74, .7), vec3(1., .36, .05), step(.62, vR));
  // Opacity follows brightness: the canvas is transparent, and an opaque dark rim would ring each dot
  vec3 col = base * s * vA * .95;
  gl_FragColor = vec4(col, max(col.r, max(col.g, col.b)));
}`;

// The same pnoise() and f() on the CPU, so the physics knows where each dot's home on the surface is
const glslMod = (x, y) => x - y * Math.floor(x / y);
const mod289 = (x) => x - Math.floor(x / 289) * 289;
const permute = (x) => mod289((x * 34 + 1) * x);
const fract = (x) => x - Math.floor(x);
const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
const mix = (a, b, t) => a + (b - a) * t;
const grad = (v, out) => {
  let gx = v / 7;
  let gy = fract(Math.floor(gx) / 7) - 0.5;
  gx = fract(gx);
  const gz = 0.5 - Math.abs(gx) - Math.abs(gy);
  if (gz <= 0) {
    gx -= (gx >= 0 ? 1 : 0) - 0.5;
    gy -= (gy >= 0 ? 1 : 0) - 0.5;
  }
  const inv = 1.79284291400159 - 0.85373472095314 * (gx * gx + gy * gy + gz * gz);
  out[0] = gx * inv;
  out[1] = gy * inv;
  out[2] = gz * inv;
  return out;
};
const G = [0, 0, 0];
const corner = (v, x, y, z) => (grad(v, G), G[0] * x + G[1] * y + G[2] * z);
const pnoise = (px, py, pz, rep) => {
  const x0 = mod289(glslMod(Math.floor(px), rep)), x1 = mod289(glslMod(Math.floor(px) + 1, rep));
  const y0 = mod289(glslMod(Math.floor(py), rep)), y1 = mod289(glslMod(Math.floor(py) + 1, rep));
  const z0 = mod289(glslMod(Math.floor(pz), rep)), z1 = mod289(glslMod(Math.floor(pz) + 1, rep));
  const fx0 = fract(px), fy0 = fract(py), fz0 = fract(pz);
  const fx1 = fx0 - 1, fy1 = fy0 - 1, fz1 = fz0 - 1;
  const xy00 = permute(permute(x0) + y0), xy10 = permute(permute(x1) + y0);
  const xy01 = permute(permute(x0) + y1), xy11 = permute(permute(x1) + y1);
  const n000 = corner(permute(xy00 + z0), fx0, fy0, fz0);
  const n100 = corner(permute(xy10 + z0), fx1, fy0, fz0);
  const n010 = corner(permute(xy01 + z0), fx0, fy1, fz0);
  const n110 = corner(permute(xy11 + z0), fx1, fy1, fz0);
  const n001 = corner(permute(xy00 + z1), fx0, fy0, fz1);
  const n101 = corner(permute(xy10 + z1), fx1, fy0, fz1);
  const n011 = corner(permute(xy01 + z1), fx0, fy1, fz1);
  const n111 = corner(permute(xy11 + z1), fx1, fy1, fz1);
  const u = fade(fx0), v = fade(fy0), w = fade(fz0);
  const a = mix(mix(n000, n001, w), mix(n010, n011, w), v);
  const b = mix(mix(n100, n101, w), mix(n110, n111, w), v);
  return 2.2 * mix(a, b, u);
};
const smoothstep = (e0, e1, x) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

// crowd.js physics: the blob's pull, damping and drift (the cursor is particleHover.js, shared with crowd.js)
// The homepage hero's inner ribbon radius: the shatter is scaled from it to the blob
const RIBBON_RADIUS = 6.2;
const PULL = 1.4 + 6; // crowd.js pull with the blob fully formed
const DRIFT = 0.02; // crowd.js: the drifting current is 98% calmed on the blob

function mountBlob(canvas, { preset, phoneTop = 0.29, sound = null, small, reducedMotion }) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: "high-performance" });
  } catch {
    return null;
  }
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  camera.position.set(0, 0, 20);

  // Dots on the unit sphere (the sphere Blobmixer displaces) in crowd.js's cube-sphere grid: each cube
  // face's grid pushed out onto the sphere, so they sit in the same curved rows. Leftovers go at random.
  const N = small ? COUNT_SMALL : COUNT;
  const pos = new Float32Array(N * 3);
  const rnd = new Float32Array(N);
  const FACE = Math.floor(Math.sqrt(N / 6));
  for (let i = 0; i < N; i++) {
    let x, y, z;
    if (i < FACE * FACE * 6) {
      const f = Math.floor(i / (FACE * FACE)), k = i % (FACE * FACE);
      const u = Math.tan(((k % FACE + 0.5) / FACE * 2 - 1) * Math.PI / 4);
      const v = Math.tan(((Math.floor(k / FACE) + 0.5) / FACE * 2 - 1) * Math.PI / 4);
      const sg = f % 2 ? -1 : 1;
      if (f < 2) { x = sg; y = u; z = v * sg; } else if (f < 4) { x = u * sg; y = sg; z = v; } else { x = u; y = v * sg; z = sg; }
    } else {
      const ph = Math.acos(2 * Math.random() - 1), th = Math.random() * 2 * Math.PI;
      x = Math.sin(ph) * Math.cos(th); y = Math.cos(ph); z = Math.sin(ph) * Math.sin(th);
    }
    const len = Math.hypot(x, y, z);
    pos[i * 3] = x / len;
    pos[i * 3 + 1] = y / len;
    pos[i * 3 + 2] = z / len;
    rnd[i] = Math.random();
  }
  // Each dot's push off its home (world units) and velocity; drawn is that plus the cursor's hover offset
  const off = new Float32Array(N * 3);
  const vel = new Float32Array(N * 3);
  const drawn = new Float32Array(N * 3);
  const hover = createHover(N);
  // The homepage hero's sounds: the hold's hum, ready, the reform chime
  const shatter = createShatter(N, 1, {
    onHoldStart: () => sound?.holdStart?.(),
    onReady: () => sound?.ready?.(),
    onReform: () => sound?.reform?.(),
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("aR", new THREE.BufferAttribute(rnd, 1));
  geo.setAttribute("aOffset", new THREE.BufferAttribute(drawn, 3));

  const uniforms = {
    uPR: { value: 1 },
    uTwinkle: { value: 0 },
    uPulse: { value: 0 },
    time: { value: 0 },
    surfaceTime: { value: 0 },
    noisePeriod: { value: NOISE_PERIOD },
    ...Object.fromEntries(Object.entries(preset).map(([k, v]) => [k, { value: v }])),
  };
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    // Additive, for alpha too, so the dots light the page behind the transparent canvas
    blending: THREE.CustomBlending,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneFactor,
    blendSrcAlpha: THREE.OneFactor,
    blendDstAlpha: THREE.OneFactor,
    uniforms,
    vertexShader: VERTEX_SHADER,
    fragmentShader: FRAGMENT_SHADER,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  // Upright, rings level, as on viscous-matter (its preset rotation never reaches the mesh)
  scene.add(points);

  // The hero is taller than the screen: the blob sits in the first screenful, right of the copy
  // (above it on narrow screens)
  const view = { w: 1, h: 1, x: 0, y: 0, s: 1 };
  const layout = () => {
    const w = canvas.clientWidth || 1, h = canvas.clientHeight || 1;
    const pr = Math.min(devicePixelRatio || 1, small ? MAX_PIXEL_RATIO_SMALL : MAX_PIXEL_RATIO);
    renderer.setPixelRatio(pr);
    renderer.setSize(w, h, false);
    uniforms.uPR.value = pr;
    camera.aspect = w / h;
    const narrow = camera.aspect < 0.9;
    camera.fov = narrow ? 46 : 32;
    camera.updateProjectionMatrix();
    const visH = 2 * camera.position.z * Math.tan((camera.fov * Math.PI) / 360);
    const visW = visH * camera.aspect;
    // World units per CSS pixel, and how far the first screenful's centre is above the canvas centre
    const unit = visH / h;
    const screenMid = (h / 2 - Math.min(innerHeight, h) / 2) * unit;
    if (narrow) {
      // Phones get a larger blob, a little lower (still above the copy, which starts at 48svh)
      const phone = window.matchMedia(MEDIA.mobile).matches;
      points.position.set(0, h / 2 * unit - Math.min(innerHeight, h) * (phone ? phoneTop : 0.26) * unit, 0);
      points.scale.setScalar(visW * (phone ? 0.33 : 0.27));
    } else {
      points.position.set(visW * 0.22, screenMid, 0);
      points.scale.setScalar(Math.min(visW * 0.15, innerHeight * unit * 0.27));
    }
    view.w = visW;
    view.h = visH;
    // Where the blob rests: the hold charge shrinks and shakes it from here
    view.x = points.position.x;
    view.y = points.position.y;
    view.s = points.scale.x;
    shatter.setScale(view.s / RIBBON_RADIUS);
    // The burst spreads over the hero's first screenful
    shatter.setBounds(screenBounds(visW, Math.min(innerHeight, h) * unit, screenMid));
  };

  // Pointer, projected onto the z = 0 plane (the camera looks straight down -z from x = y = 0), as crowd.js
  const mouse = { cx: -1, cy: -1, x: 0, y: 0, on: false, lastX: -1, lastY: -1 };
  const toWorld = (cx, cy) => {
    const r = canvas.getBoundingClientRect();
    if (cx < r.left || cx > r.right || cy < r.top || cy > r.bottom) return false;
    mouse.x = ((cx - r.left) / r.width - 0.5) * view.w;
    mouse.y = -((cy - r.top) / r.height - 0.5) * view.h;
    return true;
  };
  // Touch does nothing here: the blob answers a mouse or trackpad only
  const onPointerMove = (e) => {
    if (e.pointerType === "touch") return;
    mouse.cx = e.clientX; mouse.cy = e.clientY; mouse.on = true;
  };
  const onPointerLeave = () => { mouse.on = false; };

  // The hero is a hold zone for the page's cursor label (SiteCursor), as the homepage hero:
  // marked data-near while the pointer is over the blob, data-ribbons-shattered while in pieces
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const zone = finePointer && !reducedMotion ? canvas.closest("section") : null;
  if (zone) zone.dataset.holdZone = "";
  const marks = { near: false, shattered: false };
  const markZone = (near, shattered) => {
    if (!zone) return;
    if (near !== marks.near) {
      marks.near = near;
      if (near) zone.dataset.near = ""; else delete zone.dataset.near;
      dispatchEvent(new Event("hx-near"));
    }
    if (shattered !== marks.shattered) {
      marks.shattered = shattered;
      // Back in one piece: the shards' sparkle stops, as the homepage hero
      if (!shattered) sound?.sparkle?.(0, 0.5);
      if (shattered) zone.dataset.ribbonsShattered = ""; else delete zone.dataset.ribbonsShattered;
      dispatchEvent(new CustomEvent("hx-ribbons-state", { detail: { shattered } }));
    }
  };

  // Each dot's home this frame: the displaced surface point in world space
  const P = preset;
  const home = new Float32Array(N * 3);
  const surfaceNoise = new Float32Array(N);
  let surfaceCached = false;
  const computeHomes = () => {
    const t = glslMod(uniforms.time.value, NOISE_PERIOD);
    const st = glslMod(uniforms.surfaceTime.value, NOISE_PERIOD);
    const cacheSurface = P.surfaceSpeed === 0;
    const s = points.scale.x, ox = points.position.x, oy = points.position.y, oz = points.position.z;
    const goo2 = P.distort * P.distort, wave = 0.01 * P.surfaceDistort * P.surfaceDistort;
    for (let i = 0; i < N; i++) {
      const q = i * 3, px = pos[q], py = pos[q + 1], pz = pos[q + 2];
      const amount = Math.sin(smoothstep(-1, 1, py) * Math.PI);
      const goo = goo2 ? pnoise(px / P.frequency + t, py / P.frequency + t, pz / P.frequency + t, NOISE_PERIOD) * goo2 : 0;
      let sn = surfaceNoise[i];
      if (!cacheSurface || !surfaceCached) {
        sn = pnoise(px / P.surfaceFrequency + st, py / P.surfaceFrequency + st, pz / P.surfaceFrequency + st, NOISE_PERIOD);
        surfaceNoise[i] = sn;
      }
      const ph = (py + sn) * Math.PI * P.numberOfWaves;
      const waves = (px * Math.sin(ph) + pz * Math.cos(ph)) * wave;
      const d = 1 + waves * mix(amount, 1, P.surfacePoleAmount) + goo * mix(amount, 1, P.gooPoleAmount);
      home[q] = ox + px * d * s;
      home[q + 1] = oy + py * d * s;
      home[q + 2] = oz + pz * d * s;
    }
    surfaceCached = true;
  };

  // crowd.js step(), with the blob as the only formation
  const state = { pulse: 0 };
  const step = (dt, time) => {
    // The hold charge, as the homepage hero: the blob shrinks, shakes and turns, the camera pushes in
    const ch = shatter.charge.v;
    points.scale.setScalar(view.s * (1 - ch * 0.09));
    points.position.x = view.x + Math.sin(time * 40) * ch * ch * 0.04;
    points.position.y = view.y;
    points.rotation.z = ch * 0.12;
    camera.position.z += (20 - ch * 1.8 - camera.position.z) * 0.06;
    computeHomes();
    const pointerOn = mouse.on && toWorld(mouse.cx, mouse.cy);
    const moved = mouse.lastX < 0 ? 0 : Math.min(40, Math.hypot(mouse.cx - mouse.lastX, mouse.cy - mouse.lastY));
    mouse.lastX = mouse.cx;
    mouse.lastY = mouse.cy;
    // In pieces, the cursor stirs the shards instead of the hover
    hover.frame(dt, pointerOn && !shatter.active, mouse.x, mouse.y);
    // The page's cursor label (SiteCursor): "Click & Hold" near the blob, nothing once in pieces
    markZone(pointerOn && Math.hypot(mouse.x - view.x, mouse.y - view.y) < view.s * 1.3, shatter.active);
    shatter.frame(dt, time, pointerOn, mouse.x, mouse.y, moved, camera.position.z);
    state.pulse *= Math.pow(0.2, dt);
    uniforms.uPulse.value = state.pulse;
    const damp = Math.pow(0.955, dt * 60);
    for (let i = 0; i < N; i++) {
      const q = i * 3;
      const x = home[q] + off[q], y = home[q + 1] + off[q + 1], z = home[q + 2] + off[q + 2];
      // Drifting current (all but calmed on the blob)
      let ax = (Math.sin(y * 0.55 + time * 0.35 + rnd[i] * 2) + Math.cos(z * 0.7 - time * 0.25)) * 0.55 * DRIFT;
      let ay = (Math.sin(z * 0.5 + time * 0.4) + Math.cos(x * 0.45 + time * 0.2)) * 0.45 * DRIFT;
      let az = (Math.sin(x * 0.4 - time * 0.3) + Math.cos(y * 0.5 + time * 0.35)) * 0.35 * DRIFT;
      // Pull back onto the surface
      ax -= off[q] * PULL;
      ay -= off[q + 1] * PULL;
      az -= off[q + 2] * PULL;
      vel[q] = (vel[q] + ax * dt) * damp;
      vel[q + 1] = (vel[q + 1] + ay * dt) * damp;
      vel[q + 2] = (vel[q + 2] + az * dt) * damp;
      off[q] += vel[q] * dt;
      off[q + 1] += vel[q + 1] * dt;
      off[q + 2] += vel[q + 2] * dt;
      // The cursor's hover, eased (particleHover.js), and the hold's shatter (particleShatter.js)
      hover.step(i, x, y, z);
      shatter.step(i, x, y, z);
      drawn[q] = off[q] + hover.offset[q] + shatter.offset[q];
      drawn[q + 1] = off[q + 1] + hover.offset[q + 1] + shatter.offset[q + 1];
      drawn[q + 2] = off[q + 2] + hover.offset[q + 2] + shatter.offset[q + 2];
    }
    geo.attributes.aOffset.needsUpdate = true;
  };

  // A quick click scatters the dots (crowd.js scatter); press and hold (fine pointers) charges the
  // blob and a full charge explodes it on release, as the homepage hero. Never on controls or copy.
  const scatter = (sx, sy) => {
    for (let i = 0; i < N; i++) {
      const q = i * 3;
      const dx = home[q] + off[q] - sx, dy = home[q + 1] + off[q + 1] - sy, dz = home[q + 2] + off[q + 2];
      const f = 5 / (dx * dx + dy * dy + dz * dz + 0.4);
      vel[q] += dx * f;
      vel[q + 1] += dy * f;
      vel[q + 2] += dz * f * 0.5;
    }
    state.pulse = 0.6;
  };
  let press = null;
  const onPointerDown = (e) => {
    if (e.pointerType === "touch" || e.button !== 0 || e.target.closest?.("a,button,input,label,form,h1,h2,h3,p,header,nav")) return;
    if (!toWorld(e.clientX, e.clientY)) return;
    press = { t: performance.now(), x: mouse.x, y: mouse.y };
    if (finePointer) {
      e.preventDefault(); // no text selection while holding
      shatter.press();
    }
  };
  const onPointerUp = (e) => {
    if (!press) return;
    const r = finePointer ? shatter.release() : null;
    if (r?.started) sound?.holdEnd?.(r.full);
    if (performance.now() - press.t < 220) {
      scatter(press.x, press.y);
      sound?.tap?.();
    } else if (r?.kind === "full") {
      const ex = e?.clientX ?? mouse.cx, ey = e?.clientY ?? mouse.cy;
      if (!toWorld(ex, ey)) { mouse.x = points.position.x; mouse.y = points.position.y; }
      shatter.burst((i, a) => home[i * 3 + a] + off[i * 3 + a], points.position.x, points.position.y, points.position.z, mouse.x, mouse.y);
      shockwave(canvas.parentElement, ex, ey);
      state.pulse = 1.4;
      sound?.release?.("shatter");
    }
    press = null;
  };
  // Scrolled the blob away mid-hold: let go quietly, no shatter
  const onScroll = () => {
    if (press && mouse.cx >= 0 && !toWorld(mouse.cx, mouse.cy)) {
      press = null;
      if (shatter.cancel()) sound?.holdEnd?.(false);
    }
  };
  if (!reducedMotion) {
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    document.addEventListener("pointerleave", onPointerLeave);
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  const render = () => renderer.render(scene, camera);

  // Blobify: time += delta * (speed / 3), surfaceTime += delta * (surfaceSpeed / 3)
  const clock = new THREE.Clock();
  let raf = 0;
  let running = false;
  const frame = () => {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), MAX_DT);
    // The surface slows to slow motion while the dots are in pieces (particleShatter.js), and eases
    // back to full speed once they have reformed
    const pace = shatter.pace;
    uniforms.time.value += dt * pace * (preset.speed / 3);
    uniforms.surfaceTime.value += dt * pace * (preset.surfaceSpeed / 3);
    const time = (uniforms.uTwinkle.value += dt);
    step(dt, time);
    render();
  };
  const start = () => {
    if (running || reducedMotion) return;
    running = true;
    clock.getDelta();
    raf = requestAnimationFrame(frame);
  };
  const stop = () => {
    running = false;
    cancelAnimationFrame(raf);
  };

  const onResize = () => {
    layout();
    if (!running) render();
  };
  window.addEventListener("resize", onResize);
  layout();
  render();

  return {
    start,
    stop,
    destroy() {
      stop();
      if (press && shatter.cancel()) sound?.holdEnd?.(false);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerleave", onPointerLeave);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
      window.removeEventListener("scroll", onScroll);
      if (zone) {
        delete zone.dataset.holdZone;
        delete zone.dataset.near;
        delete zone.dataset.ribbonsShattered;
      }
      geo.dispose();
      mat.dispose();
      renderer.dispose();
      renderer.forceContextLoss?.();
    },
  };
}

// phoneTop: how far down the screen the blob's centre sits on phones (share of the screen height)
export default function ParticleBlob({ preset = "slinky", phoneTop }) {
  const wrapRef = useRef(null);
  const { sound } = useInteraction() ?? {};

  useEffect(() => {
    const wrap = wrapRef.current;
    // Same audit check as the homepage: PSI desktop has a plain UA, only its software GPU gives it away
    if (!wrap || isLighthouseOrHeadless() || isSoftwareRenderer()) return undefined;
    // A fresh canvas per mount: destroy() loses the WebGL context, and a canvas whose context was
    // lost only ever returns that dead context (Strict Mode remounts would paint it white)
    const canvas = document.createElement("canvas");
    canvas.className = "pointer-events-none block size-full opacity-0 transition-opacity duration-1000 ease-out";
    wrap.appendChild(canvas);
    const small = window.matchMedia(MEDIA.mobile).matches || (navigator.hardwareConcurrency || 8) <= 4;
    const blob = mountBlob(canvas, { preset: PRESETS[preset] ?? PRESETS.slinky, phoneTop, sound, small, reducedMotion: prefersReducedMotion() });
    if (!blob) {
      canvas.remove();
      return undefined;
    }
    requestAnimationFrame(() => requestAnimationFrame(() => { canvas.style.opacity = "1"; }));

    // Only animate while the hero is on screen
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) blob.start();
      else blob.stop();
    });
    io.observe(canvas);

    return () => {
      io.disconnect();
      blob.destroy();
      canvas.remove();
    };
  }, [preset, phoneTop, sound]);

  return <div ref={wrapRef} aria-hidden="true" className="pointer-events-none size-full" />;
}
