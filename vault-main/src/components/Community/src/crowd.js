import { MEDIA } from "@/lib/breakpoints";
import { createHover } from "../../Animations/particleHover";
import { createShatter, screenBounds, shockwave } from "../../Animations/particleShatter";

// Particle counts
const COUNT = 6000;
const COUNT_SMALL = 2600;

// Formation centres per zone, desktop and narrow screens
// The hero blob's x is set from the screen width (placeHeroBlob), right of the copy like the pricing and blog blobs
const CENTER = { crowd: [4, 0, 0], crowd2: [0, -0.3, -2], ring: [0, 0.4, 0] };
const CENTER_NARROW = { crowd: [0, 4.6, -3], crowd2: [0, 0, -4], ring: [0, 0.2, -2] };
// Hero blob: particles spread evenly over a sphere whose surface wobbles and slowly turns
const BLOB_RADIUS = 3.2;
const BLOB_RADIUS_NARROW = 2.5;
const BLOB_TILT = 0.45; // radians: the blob tips toward the viewer
// "What do you build with": the blob spreads into a rolling sheet of dots
const SHEET_W = 34;
const SHEET_DEPTH = 26;
const SHEET_BACK = -22;
const SHEET_Y = -5.4; // low: the sheet lies along the bottom of the section

const SHEET_W_NARROW = 14;
const SHEET_BACK_NARROW = -16;
// Blob + sheet animation speed (1 = the first version)
const SHAPE_SPEED = 2.4;

// Join: rings as fractions of the ring radius (inner → outer) and their tilt
const RIBBON_RINGS = 2;
const RIBBON_R0 = 0.62;
const RIBBON_GAP = 0.26;
const RIBBON_ARC = 0.7; // each ribbon is an open arc, this share of a full circle
const RIBBON_TILT_X = -0.28;
const RIBBON_TILT_Y = -0.42;
const RING_RADIUS = 5.8;
const RING_RADIUS_NARROW = 3.2;
// A section's formation builds with scroll, from when its top enters the
// bottom of the screen until it has risen this share of the screen height, so
// the change is watched happening instead of finishing under a light sheet.
const ZONE_FORM_SPAN = 0.8;

// Cursor
const GATHER_RADIUS_SQ = 10;
// Cursor gathers / swirls the particles (off: they ignore the mouse)
const POINTER_INTERACTION = true;
const MOUSE_SPEED_CAP = 60;
// The homepage hero's inner ribbon radius: the hold's shatter is scaled from it to the blob
const RIBBON_RADIUS = 6.2;

// Highlight groups: every particle belongs to one of these, matching one chip each
export const CROWD_GROUPS = 10;

const MAX_DT = 0.05;
const MAX_PIXEL_RATIO = 1.75;
const MAX_PIXEL_RATIO_SMALL = 1.25;

const VERTEX_SHADER = /* glsl */ `
attribute float aHot, aR, aRib;
attribute vec3 aHover;
uniform float uPR, uTime, uPulse, uRing;
varying float vHot, vR, vA, vSolid;
void main() {
  vec4 mv = modelViewMatrix * vec4(position + aHover, 1.);
  gl_Position = projectionMatrix * mv;
  float tw = .75 + .25 * sin(uTime * 1.7 + aR * 40.);
  gl_PointSize = uPR * (2.4 + aR * 3.6 + aHot * 2.6 + uPulse * 1.8) * (24. / -mv.z) * (aHot > 1.5 ? 2.6 : 1.);
  vHot = aHot; vR = aR; vA = tw;
  vSolid = aRib * uRing;
}`;

const FRAGMENT_SHADER = /* glsl */ `
varying float vHot, vR, vA, vSolid;
void main() {
  float d = length(gl_PointCoord - .5);
  if (d > .5) discard;
  float s = smoothstep(.5, 0., d);
  vec3 base = mix(vec3(.78, .74, .7), vec3(1., .36, .05), step(.62, vR));
  // The Join ribbons: the second ribbon is all orange
  base = mix(base, vec3(1., .36, .05), vSolid);
  vec3 hotc = mix(vec3(1., .42, 0.), vec3(1., .95, .9), clamp(vHot - 1., 0., 1.));
  vec3 c = mix(base, hotc, clamp(vHot, 0., 1.));
  gl_FragColor = vec4(c * s * vA * (.95 + clamp(vHot, 0., 2.) * .7), 1.);
}`;

const lerp = (a, b, t) => a + (b - a) * t;

// 3D simplex noise (-1..1, Gustavson): smooth, round features - what makes the blob lumpy
const GRAD3 = [[1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0], [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1], [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1]];
const PERM = (() => {
  const p = Array.from({ length: 256 }, (_, i) => i);
  let seed = 7;
  for (let i = 255; i > 0; i--) {
    seed = (seed * 16807) % 2147483647;
    const j = seed % (i + 1);
    [p[i], p[j]] = [p[j], p[i]];
  }
  return Uint8Array.from({ length: 512 }, (_, i) => p[i & 255]);
})();
const simplex3 = (x, y, z) => {
  const F3 = 1 / 3, G3 = 1 / 6;
  const sk = (x + y + z) * F3;
  const i = Math.floor(x + sk), j = Math.floor(y + sk), k = Math.floor(z + sk);
  const t0 = (i + j + k) * G3;
  const x0 = x - (i - t0), y0 = y - (j - t0), z0 = z - (k - t0);
  let i1, j1, k1, i2, j2, k2;
  if (x0 >= y0) {
    if (y0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 1; k2 = 0; }
    else if (x0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 0; k2 = 1; }
    else { i1 = 0; j1 = 0; k1 = 1; i2 = 1; j2 = 0; k2 = 1; }
  } else if (y0 < z0) { i1 = 0; j1 = 0; k1 = 1; i2 = 0; j2 = 1; k2 = 1; }
  else if (x0 < z0) { i1 = 0; j1 = 1; k1 = 0; i2 = 0; j2 = 1; k2 = 1; }
  else { i1 = 0; j1 = 1; k1 = 0; i2 = 1; j2 = 1; k2 = 0; }
  const ii = i & 255, jj = j & 255, kk = k & 255;
  const corner = (dx, dy, dz, gi) => {
    const t = 0.6 - dx * dx - dy * dy - dz * dz;
    if (t < 0) return 0;
    const g = GRAD3[gi % 12];
    return t * t * t * t * (g[0] * dx + g[1] * dy + g[2] * dz);
  };
  return 32 * (
    corner(x0, y0, z0, PERM[ii + PERM[jj + PERM[kk]]]) +
    corner(x0 - i1 + G3, y0 - j1 + G3, z0 - k1 + G3, PERM[ii + i1 + PERM[jj + j1 + PERM[kk + k1]]]) +
    corner(x0 - i2 + 2 * G3, y0 - j2 + 2 * G3, z0 - k2 + 2 * G3, PERM[ii + i2 + PERM[jj + j2 + PERM[kk + k2]]]) +
    corner(x0 - 1 + 3 * G3, y0 - 1 + 3 * G3, z0 - 1 + 3 * G3, PERM[ii + 1 + PERM[jj + 1 + PERM[kk + 1]]])
  );
};

// The blob's radius multiplier at a point on the unit sphere (px, py, pz).
// Like quantumstretch.com: a slow, broad swell plus big smooth lobes (about eight or nine round the rim)
// that keep morphing, both from simplex noise drifting through time `t`.
const blobShape = (la, lo, cl, px, py, pz, t) =>
  1 +
  simplex3(px * 0.6 + t * 0.12, py * 0.6 - t * 0.09, pz * 0.6 + t * 0.07) * 0.06 +
  simplex3(px * 1.4 - t * 0.36, py * 1.4 + t * 0.3, pz * 1.4 + t * 0.24) * 0.2;
const NOOP_API = { highlight() {}, launch() {}, destroy() {} };

export function mountCrowd(canvas, opts = {}) {
  const { THREE: T, zoneRoot = document, reducedMotion = false, small = false, sound = null } = opts;
  if (!T) throw new Error("mountCrowd: pass { THREE }");

  // Renderer and scene
  let renderer;
  try {
    renderer = new T.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: "high-performance" });
  } catch {
    return NOOP_API;
  }
  // As the prototype: an opaque #111 canvas behind the page, the dots add light onto it
  renderer.setClearColor(0x111111);
  const scene = new T.Scene();
  const camera = new T.PerspectiveCamera(32, 1, 0.1, 200);
  camera.position.set(0, 0, 20);

  // Particles: home = position inside the cloud, grp = which chip lights it
  const N = small ? COUNT_SMALL : COUNT;
  const pos = new Float32Array(N * 3);
  const vel = new Float32Array(N * 3);
  const home = new Float32Array(N * 3);
  const hot = new Float32Array(N);
  const hotTarget = new Float32Array(N);
  const rnd = new Float32Array(N);
  const grp = new Uint8Array(N);
  const logo = new Float32Array(N * 3);
  let hasLogo = false;
  for (let i = 0; i < N; i++) {
    const th = Math.random() * 6.283;
    const ph = Math.acos(2 * Math.random() - 1);
    const r = Math.cbrt(Math.random());
    home[i * 3] = Math.sin(ph) * Math.cos(th) * r * 4.6;
    home[i * 3 + 1] = Math.cos(ph) * r * 3.2;
    home[i * 3 + 2] = Math.sin(ph) * Math.sin(th) * r * 2.4;
    // Reduced motion starts settled; otherwise the crowd rises into place
    const scatter = reducedMotion ? 0 : 1;
    pos[i * 3] = home[i * 3] + (Math.random() - 0.5) * 14 * scatter;
    pos[i * 3 + 1] = home[i * 3 + 1] - (4 + Math.random() * 3) * scatter;
    pos[i * 3 + 2] = home[i * 3 + 2];
    rnd[i] = Math.random();
    grp[i] = i % CROWD_GROUPS;
  }
  // Blob + sheet layout: a latitude/longitude grid, so the dots line up in visible rows (the blob's
  // rings, the sheet's furrows)
  const ROWS = Math.max(8, Math.round(Math.sqrt(N / 1.7)));
  const COLS = Math.ceil(N / ROWS);
  const lat = new Float32Array(N), lon = new Float32Array(N), gu = new Float32Array(N), gv = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const r = Math.floor(i / COLS), c = i % COLS;
    gu[i] = c / (COLS - 1);
    gv[i] = r / (ROWS - 1);
  }
  // Blob layout: a cube-sphere grid (each cube face's grid pushed out onto the sphere), so the dots
  // sit in an even grid of curved rows with no crowding at the poles. Any leftovers go at random.
  const FACE = Math.floor(Math.sqrt(N / 6));
  for (let i = 0; i < N; i++) {
    let x, y, z;
    if (i < FACE * FACE * 6) {
      const f = Math.floor(i / (FACE * FACE)), k = i % (FACE * FACE);
      const u = Math.tan(((k % FACE + 0.5) / FACE * 2 - 1) * Math.PI / 4);
      const v = Math.tan(((Math.floor(k / FACE) + 0.5) / FACE * 2 - 1) * Math.PI / 4);
      const s = f % 2 ? -1 : 1;
      if (f < 2) { x = s; y = u; z = v * s; } else if (f < 4) { x = u * s; y = s; z = v; } else { x = u; y = v * s; z = s; }
    } else {
      const ph = Math.acos(2 * Math.random() - 1), th = Math.random() * 2 * Math.PI;
      x = Math.sin(ph) * Math.cos(th); y = Math.cos(ph); z = Math.sin(ph) * Math.sin(th);
    }
    const len = Math.hypot(x, y, z);
    lat[i] = Math.asin(y / len);
    lon[i] = Math.atan2(z / len, x / len);
  }
  const geo = new T.BufferGeometry();
  geo.setAttribute("position", new T.BufferAttribute(pos, 3));
  geo.setAttribute("aHot", new T.BufferAttribute(hot, 1));
  geo.setAttribute("aR", new T.BufferAttribute(rnd, 1));
  // Which Join ribbon a particle lands in (matches the ribbon layout in step): 1 = the single-colour one
  const rib = new Float32Array(N);
  for (let i = 0; i < N; i++) rib[i] = Math.min(RIBBON_RINGS - 1, Math.floor(gv[i] * RIBBON_RINGS)) === 1 ? 1 : 0;
  geo.setAttribute("aRib", new T.BufferAttribute(rib, 1));
  // The cursor's hover, eased (particleHover.js, shared with the pricing and blog blobs)
  const hover = createHover(N);
  // Press and hold explodes the particles like the homepage hero (particleShatter.js); its offset
  // is drawn on top of the hover's
  const shatter = createShatter(N, BLOB_RADIUS / RIBBON_RADIUS, {
    onHoldStart: () => sound?.holdStart?.(),
    onReady: () => sound?.ready?.(),
    onReform: () => sound?.reform?.(),
  });
  const drawnOff = new Float32Array(N * 3);
  geo.setAttribute("aHover", new T.BufferAttribute(drawnOff, 3));
  const uniforms = { uPR: { value: 1 }, uTime: { value: 0 }, uPulse: { value: 0 }, uRing: { value: 0 } };
  const mat = new T.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    // Prototype material + shader verbatim
    blending: T.AdditiveBlending,
    uniforms,
    vertexShader: VERTEX_SHADER,
    fragmentShader: FRAGMENT_SHADER,
  });
  const points = new T.Points(geo, mat);
  points.frustumCulled = false;
  scene.add(points);

  // Zones
  const zones = Array.from(zoneRoot.querySelectorAll("[data-zone]"));
  const NEAR_STIR = 3; // particles stirred this frame for the pointer to count as "near"
  const nearState = { v: false };
  let zone = "crowd";
  // Target weight of each formation, from scroll (readZone); the mixes ease toward these
  const target = { crowd: 1, crowd2: 0, ring: 0 };
  const formZones = zones.filter((el) => el.dataset.zone !== "sheet");
  const center = new T.Vector3(3.6, reducedMotion ? 0.9 : -6, 0);
  let ringMix = 0;
  let blobMix = 0;
  let sheetMix = 0;

  // Pointer, projected onto the z = 0 plane
  const mouse = { cx: -1, cy: -1, on: false, speed: 0, lastX: -1, lastY: -1 };
  const ray = new T.Raycaster();
  const ndc = new T.Vector2();
  const plane = new T.Plane(new T.Vector3(0, 0, 1), 0);
  const hit = new T.Vector3();
  const toWorld = (sx, sy, out) => {
    ndc.set((sx / innerWidth) * 2 - 1, -((sy / innerHeight) * 2 - 1));
    ray.setFromCamera(ndc, camera);
    return ray.ray.intersectPlane(plane, out);
  };
  // Touch does nothing here: the crowd answers a mouse or trackpad only
  const onPointerMove = (e) => {
    if (e.pointerType === "touch") return;
    mouse.cx = e.clientX; mouse.cy = e.clientY; mouse.on = true;
  };
  const onPointerLeave = () => { mouse.on = false; };
  window.addEventListener("pointermove", onPointerMove, { passive: true });
  document.addEventListener("pointerleave", onPointerLeave);

  const state = { pulse: 0, joinIdx: -1, covered: false, running: false, logoMix: 0, motionT: 0 };

  // Hero blob on the right, at the same share of the visible width as the pricing and blog blobs (ParticleBlob)
  // On narrow screens it sits above the copy, its centre 26% down the screen (32% on phones, as pricing and blog)
  const placeHeroBlob = () => {
    const aspect = innerWidth / innerHeight;
    const visH = 2 * camera.position.z * Math.tan((32 * Math.PI) / 360);
    CENTER.crowd[0] = visH * aspect * 0.22;
    const narrowFov = aspect < 0.8 ? 46 : 32;
    const halfH = (camera.position.z - CENTER_NARROW.crowd[2]) * Math.tan((narrowFov * Math.PI) / 360);
    // ...but low enough that the top of the blob clears the navbar
    const down = window.matchMedia(MEDIA.mobile).matches ? 0.32 : 0.26;
    CENTER_NARROW.crowd[1] = Math.min(halfH * (1 - 2 * down), halfH * 0.85 - BLOB_RADIUS_NARROW * 1.35);
  };
  placeHeroBlob();

  // Resize
  const onResize = () => {
    placeHeroBlob();
    const pr = Math.min(devicePixelRatio || 1, small ? MAX_PIXEL_RATIO_SMALL : MAX_PIXEL_RATIO);
    renderer.setPixelRatio(pr);
    uniforms.uPR.value = pr;
    renderer.setSize(innerWidth, innerHeight, false);
    camera.aspect = innerWidth / innerHeight;
    camera.fov = camera.aspect < 0.8 ? 46 : 32;
    camera.updateProjectionMatrix();
    // The hold's burst spreads the particles over the whole screen (the camera rests at z = 20)
    const visH = 2 * 20 * Math.tan((camera.fov * Math.PI) / 360);
    shatter.setBounds(screenBounds(visH * camera.aspect, visH));
    if (reducedMotion) render();
  };

  // Which zone is under the middle of the viewport
  const readZone = () => {
    const vh = innerHeight;
    let covered = false;
    let found = null;
    for (const el of zones) {
      const r = el.getBoundingClientRect();
      if (el.dataset.zone === "sheet") {
        if (r.top <= 0 && r.bottom >= vh) covered = true;
        continue;
      }
      if (!found && r.top < vh * 0.6 && r.bottom > vh * 0.4) found = el.dataset.zone;
    }
    if (!found) {
      let best = Infinity;
      for (const el of zones) {
        if (el.dataset.zone === "sheet") continue;
        const r = el.getBoundingClientRect();
        const d = Math.min(Math.abs(r.top - vh / 2), Math.abs(r.bottom - vh / 2));
        if (d < best) { best = d; found = el.dataset.zone; }
      }
    }
    if (found) zone = found;
    state.covered = covered;

    // Scroll-driven blend: the latest section whose top is on screen forms in
    // step with how far it has risen, out of the formation before it
    let cur = -1;
    for (let i = 0; i < formZones.length; i++) if (formZones[i].getBoundingClientRect().top < vh) cur = i;
    target.crowd = target.crowd2 = target.ring = 0;
    if (cur < 0) { target[formZones[0]?.dataset.zone ?? "crowd"] = 1; return; }
    const name = formZones[cur].dataset.zone;
    let prev = cur - 1;
    while (prev >= 0 && formZones[prev].dataset.zone === name) prev--;
    // Short sections (mobile) finish forming within their own height, before the next sheet arrives
    const cr = formZones[cur].getBoundingClientRect();
    const span = Math.min(vh * ZONE_FORM_SPAN, cr.height * 0.6);
    const e = prev < 0 ? 1 : Math.min(1, Math.max(0, (vh - cr.top) / span));
    target[name] += e;
    if (prev >= 0) target[formZones[prev].dataset.zone] += 1 - e;
  };

  // Simulation step
  // Opening on the hero: place every particle straight onto the blob (no flying in to form it);
  // the canvas itself fades in (CommunityCrowd)
  const startInBlob = () => {
    const vh = innerHeight;
    const heroZone = zones.find((el) => el.dataset.zone === "crowd");
    if (!heroZone) return;
    const r = heroZone.getBoundingClientRect();
    if (!(r.top < vh * 0.6 && r.bottom > vh * 0.4)) return;
    const narrow = innerWidth / innerHeight < 0.9;
    const C = (narrow ? CENTER_NARROW : CENTER).crowd;
    center.set(C[0], C[1], C[2]);
    blobMix = 1;
    const blobR = narrow ? BLOB_RADIUS_NARROW : BLOB_RADIUS;
    const tc = Math.cos(BLOB_TILT), ts = Math.sin(BLOB_TILT);
    for (let i = 0; i < N; i++) {
      const q = i * 3, la = lat[i], lo = lon[i], cl = Math.cos(la);
      const px = cl * Math.cos(lo), py = Math.sin(la), pz = cl * Math.sin(lo);
      const rr = blobR * blobShape(la, lo, cl, px, py, pz, 0);
      pos[q] = C[0] + px * rr;
      pos[q + 1] = C[1] + (py * tc - pz * ts) * rr;
      pos[q + 2] = C[2] + (py * ts + pz * tc) * rr;
      vel[q] = vel[q + 1] = vel[q + 2] = 0;
    }
    geo.attributes.position.needsUpdate = true;
  };
  startInBlob();

  const step = (dt, time) => {
    const narrow = camera.aspect < 0.9;
    // Centre: the target formations' centres, weighted the same way
    const CS = narrow ? CENTER_NARROW : CENTER;
    const C = [0, 1, 2].map((a) => CS.crowd[a] * target.crowd + CS.crowd2[a] * target.crowd2 + CS.ring[a] * target.ring);
    // Smoothing only: the scroll sets where each mix is heading, this keeps it soft
    const k = 1 - Math.pow(0.02, dt);
    center.x += (C[0] - center.x) * k;
    center.y += (C[1] - center.y) * k;
    center.z += (C[2] - center.z) * k;
    ringMix += (target.ring - ringMix) * k;
    blobMix += (target.crowd - blobMix) * k;
    sheetMix += (target.crowd2 - sheetMix) * k;
    const st = time * SHAPE_SPEED;
    const rcx = Math.cos(RIBBON_TILT_X), rsx = Math.sin(RIBBON_TILT_X), rcy = Math.cos(RIBBON_TILT_Y), rsy = Math.sin(RIBBON_TILT_Y);
    const blobR = narrow ? BLOB_RADIUS_NARROW : BLOB_RADIUS;
    // Seen a little from above, so the latitude rings read (as in the reference video)
    const tc = Math.cos(BLOB_TILT), ts = Math.sin(BLOB_TILT);

    const moved = Math.hypot(mouse.cx - mouse.lastX, mouse.cy - mouse.lastY);
    mouse.lastX = mouse.cx;
    mouse.lastY = mouse.cy;
    mouse.speed += (Math.min(MOUSE_SPEED_CAP, moved) - mouse.speed) * 0.2;
    const hasMouse = mouse.on && !state.covered && toWorld(mouse.cx, mouse.cy, hit);
    const cursorOn = POINTER_INTERACTION && hasMouse && state.logoMix < 0.5;
    // In pieces, the cursor stirs the shards instead of the hover
    hover.frame(dt, cursorOn && !shatter.active, hit.x, hit.y);
    // Covered by a light sheet mid-hold: let go quietly, no shatter
    if (state.covered && shatter.holding && shatter.cancel()) sound?.holdEnd?.(false);
    shatter.setScale(blobR / RIBBON_RADIUS);
    shatter.frame(dt, time, cursorOn, hit.x, hit.y, Math.min(40, moved), camera.position.z);
    announceShattered(shatter.active);
    state.pulse *= Math.pow(0.2, dt);
    uniforms.uPulse.value = state.pulse;
    uniforms.uRing.value = ringMix;

    const damp = Math.pow(0.955, dt * 60);
    const ringR = narrow ? RING_RADIUS_NARROW : RING_RADIUS;
    // The hold charge, as the homepage hero: the formation shrinks and shakes, the camera pushes in
    const ch = shatter.charge.v;
    const shrink = 1 - ch * 0.09, shake = Math.sin(time * 40) * ch * ch * 0.04;
    camera.position.z += (20 - ch * 1.8 - camera.position.z) * 0.06;
    // The hold-to-logo was removed: the particles never form the wordmark
    state.logoMix = 0;
    const logoMix = state.logoMix;
    const pull = 1.4 + ringMix * 1.4 + blobMix * 6 + sheetMix * 2.2;
    // The blob reads as a clean surface: the drifting current is mostly calmed while it forms
    const drift = 1 - Math.max(blobMix * 0.98, sheetMix * 0.85);
    let stir = 0;

    for (let i = 0; i < N; i++) {
      const q = i * 3;
      const x = pos[q], y = pos[q + 1], z = pos[q + 2];

      // Drifting current
      let ax = (Math.sin(y * 0.55 + time * 0.35 + rnd[i] * 2) + Math.cos(z * 0.7 - time * 0.25)) * 0.55;
      let ay = (Math.sin(z * 0.5 + time * 0.4) + Math.cos(x * 0.45 + time * 0.2)) * 0.45;
      let az = (Math.sin(x * 0.4 - time * 0.3) + Math.cos(y * 0.5 + time * 0.35)) * 0.35;
      ax *= drift; ay *= drift; az *= drift;

      // Formation: cloud, easing into a ring in the Join zone
      let hx = center.x + home[q], hy = center.y + home[q + 1], hz = center.z + home[q + 2];
      if (blobMix > 0.01) {
        // Petal-like lobes around the rim that slowly turn, plus ripples travelling down from the top
        const la = lat[i], lo = lon[i], cl = Math.cos(la);
        const px = cl * Math.cos(lo), py = Math.sin(la), pz = cl * Math.sin(lo);
        const rr = blobR * blobShape(la, lo, cl, px, py, pz, st);
        const ty = py * tc - pz * ts, tz = py * ts + pz * tc;
        hx = lerp(hx, center.x + px * rr, blobMix);
        hy = lerp(hy, center.y + ty * rr, blobMix);
        hz = lerp(hz, center.z + tz * rr, blobMix);
      }
      if (sheetMix > 0.01) {
        // A wide sheet in perspective (back rows far, front rows close), rolling in slow waves
        const sx = (gu[i] - 0.5) * (narrow ? SHEET_W_NARROW : SHEET_W);
        const sz = (narrow ? SHEET_BACK_NARROW : SHEET_BACK) + gv[i] * SHEET_DEPTH;
        const sy = SHEET_Y +
          Math.sin(sx * 0.32 + st * 0.8) * Math.cos(sz * 0.25 - st * 0.6) * 1.1 +
          Math.sin((sx + sz) * 0.18 - st) * 0.5;
        hx = lerp(hx, sx, sheetMix);
        hy = lerp(hy, sy, sheetMix);
        hz = lerp(hz, sz, sheetMix);
      }
      if (ringMix > 0.01) {
        // Join (the page's end): the particles form the theremin footer ribbons, concentric rings
        // tilted like the site's footer ribbons: two open arcs (not full circles), turning in
        // opposite directions, each a band with some width
        const j = Math.min(RIBBON_RINGS - 1, Math.floor(gv[i] * RIBBON_RINGS));
        const an = j * 2.4 + gu[i] * 6.283 * RIBBON_ARC + st * 0.12 * (j % 2 ? -1 : 1);
        const rr = ringR * (RIBBON_R0 + j * RIBBON_GAP) + Math.sin(an * 3 + st * 0.8 + j) * 0.12 + (rnd[i] - 0.5) * 0.4;
        const rx = Math.cos(an) * rr, ry = Math.sin(an) * rr, rz = (rnd[i] - 0.5) * 0.15;
        const y1 = ry * rcx - rz * rsx, z1 = ry * rsx + rz * rcx;
        hx = lerp(hx, center.x + rx * rcy + z1 * rsy, ringMix);
        hy = lerp(hy, center.y + y1, ringMix);
        hz = lerp(hz, center.z - rx * rsy + z1 * rcy, ringMix);
      }
      if (logoMix > 0.01) {
        hx = lerp(hx, center.x + logo[q], logoMix);
        hy = lerp(hy, center.y + logo[q + 1], logoMix);
        hz = lerp(hz, center.z + logo[q + 2], logoMix);
      }
      if (ch > 0) {
        hx = center.x + (hx - center.x) * shrink + shake;
        hy = center.y + (hy - center.y) * shrink;
        hz = center.z + (hz - center.z) * shrink;
      }
      ax += (hx - x) * pull;
      ay += (hy - y) * pull;
      az += (hz - z) * pull;

      // Cursor: counts the dots it is among (for the cursor tag); the push itself is the hover layer below
      if (cursorOn) {
        const dx = hit.x - x, dy = hit.y - y;
        if (dx * dx + dy * dy < GATHER_RADIUS_SQ) stir++;
      }

      vel[q] = (vel[q] + ax * dt) * damp;
      vel[q + 1] = (vel[q + 1] + ay * dt) * damp;
      vel[q + 2] = (vel[q + 2] + az * dt) * damp;
      pos[q] += vel[q] * dt;
      pos[q + 1] += vel[q + 1] * dt;
      pos[q + 2] += vel[q + 2] * dt;
      hot[i] += (hotTarget[i] - hot[i]) * Math.min(1, dt * 2.5);
      hover.step(i, pos[q], pos[q + 1], pos[q + 2]);
      shatter.step(i, pos[q], pos[q + 1], pos[q + 2]);
      drawnOff[q] = hover.offset[q] + shatter.offset[q];
      drawnOff[q + 1] = hover.offset[q + 1] + shatter.offset[q + 1];
      drawnOff[q + 2] = hover.offset[q + 2] + shatter.offset[q + 2];
    }
    geo.attributes.position.needsUpdate = true;
    geo.attributes.aHot.needsUpdate = true;
    geo.attributes.aHover.needsUpdate = true;
    // No sparkle jingle while the pointer stirs the particles (hero or any other zone)
    // Tells the page's cursor tag when the pointer is among the particles (enough of them stirred),
    // not just anywhere over the canvas: marks every hold zone (the cursor reads the one it's over)
    const isNear = POINTER_INTERACTION && hasMouse && stir > NEAR_STIR;
    if (isNear !== nearState.v) {
      nearState.v = isNear;
      zoneRoot.querySelectorAll("[data-hold-zone]").forEach((z) => { if (isNear) z.dataset.near = ""; else delete z.dataset.near; });
      dispatchEvent(new Event("hx-near"));
    }
  };

  const render = () => renderer.render(scene, camera);

  // Animation loop
  const clock = new T.Clock();
  let raf = 0;
  const frame = () => {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), MAX_DT);
    uniforms.uTime.value += dt;
    // The crowd's own motion runs in slow motion while the hold's shatter is in pieces (pace)
    const time = (state.motionT += dt * shatter.pace);
    readZone();
    step(dt, time);
    if (!state.covered) render();
  };
  const start = () => {
    if (state.running || reducedMotion) return;
    state.running = true;
    clock.getDelta();
    raf = requestAnimationFrame(frame);
  };
  const stop = () => {
    sound?.sparkle?.(0, 0.5);
    state.running = false;
    cancelAnimationFrame(raf);
  };

  // Reduced motion: a static crowd, re-drawn only when something changes
  const redrawStatic = () => {
    for (let i = 0; i < N; i++) hot[i] = hotTarget[i];
    geo.attributes.aHot.needsUpdate = true;
    render();
  };

  // Wordmark targets: /hyperiux-wordmark.svg rasterised and sampled, one point per particle
  (() => {
    const img = new Image();
    img.onload = () => {
      const W2 = 900, H2 = 120, cv = document.createElement("canvas");
      cv.width = W2; cv.height = H2;
      const g = cv.getContext("2d");
      const scale = Math.min((W2 - 20) / img.width, (H2 - 12) / img.height);
      const w = img.width * scale, h = img.height * scale;
      g.drawImage(img, (W2 - w) / 2, (H2 - h) / 2, w, h);
      const d = g.getImageData(0, 0, W2, H2).data, L = [];
      for (let y = 0; y < H2; y++) for (let x = 0; x < W2; x++) if (d[(y * W2 + x) * 4 + 3] > 120) L.push(x, y);
      if (!L.length) return;
      for (let n = 0; n < N; n++) {
        const j2 = ((Math.random() * L.length) / 2 | 0) * 2;
        logo[n * 3] = (L[j2] / W2 - 0.5) * 10;
        logo[n * 3 + 1] = -(L[j2 + 1] / H2 - 0.5) * 10 * (H2 / W2);
        logo[n * 3 + 2] = (Math.random() - 0.5) * 0.4;
      }
      hasLogo = true;
    };
    img.src = "/hyperiux-wordmark.svg";
  })();

  // Press and hold (fine pointers) charges the particles and a full charge explodes them on
  // release, as the homepage hero. Dark sections only, never on controls or copy.
  const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;
  // The dark sections are hold zones for the page's cursor tag (SquareCursor), as the homepage hero
  const holdZones = finePointer && !reducedMotion ? formZones : [];
  holdZones.forEach((z) => { z.dataset.holdZone = ""; });
  // Lets the page's cursor know the particles are in pieces, as the homepage ribbons do
  let shattered = false;
  function announceShattered(next) {
    if (next === shattered) return;
    shattered = next;
    // Back in one piece: the shards' sparkle stops, as the homepage hero
    if (!next) sound?.sparkle?.(0, 0.5);
    zoneRoot.querySelectorAll("[data-hold-zone]").forEach((z) => { if (next) z.dataset.ribbonsShattered = ""; else delete z.dataset.ribbonsShattered; });
    dispatchEvent(new CustomEvent("hx-ribbons-state", { detail: { shattered: next } }));
  }
  const onPointerDown = (e) => {
    if (!finePointer || e.pointerType === "touch" || reducedMotion || state.covered || e.button !== 0) return;
    // Same exclusions as the prototype's ring cursor (EX)
    if (e.target.closest?.("a,button,input,label,form,h1,h2,h3,p,[data-zone='sheet'],.sheet,header,nav")) return;
    if (!toWorld(e.clientX, e.clientY, hit)) return;
    e.preventDefault(); // no text selection while holding
    shatter.press();
  };
  const onPointerUp = (e) => {
    const r = shatter.release();
    if (!r) return;
    if (r.started) sound?.holdEnd?.(r.full);
    if (r.kind !== "full") return;
    const ex = e?.clientX ?? mouse.cx, ey = e?.clientY ?? mouse.cy;
    if (!toWorld(ex, ey, hit)) hit.copy(center);
    shatter.burst((i, a) => pos[i * 3 + a], center.x, center.y, center.z, hit.x, hit.y);
    shockwave(null, ex, ey);
    state.pulse = 1.4;
    sound?.release?.("shatter");
  };
  addEventListener("pointerdown", onPointerDown);
  addEventListener("pointerup", onPointerUp);
  addEventListener("pointercancel", onPointerUp);

  window.addEventListener("resize", onResize);
  onResize();
  if (reducedMotion) {
    readZone();
    const C = (camera.aspect < 0.9 ? CENTER_NARROW : CENTER).crowd;
    center.set(C[0], C[1], C[2]);
    for (let i = 0; i < N * 3; i++) pos[i] = home[i] + center.getComponent(i % 3);
    geo.attributes.position.needsUpdate = true;
    render();
  }

  return {
    start,
    stop,
    // Light up every particle whose group index is in `groups`
    highlight(groups) {
      for (let i = 0; i < N; i++) {
        if (i === state.joinIdx) continue;
        hotTarget[i] = groups.has(grp[i]) ? 1 : 0;
      }
      if (reducedMotion) redrawStatic();
    },
    // Fire the visitor's own bright particle from a screen point into the swarm
    launch(sx, sy) {
      const i = state.joinIdx >= 0 ? state.joinIdx : (Math.random() * N) | 0;
      state.joinIdx = i;
      hotTarget[i] = 2.2;
      if (reducedMotion) { redrawStatic(); return; }
      if (!toWorld(sx, sy, hit)) hit.set(0, -4, 0);
      const k = i * 3;
      pos[k] = hit.x;
      pos[k + 1] = hit.y;
      pos[k + 2] = 2;
      vel[k] = (center.x - hit.x) * 2.2;
      vel[k + 1] = (center.y - hit.y) * 2.2 + 2;
      vel[k + 2] = -2;
      state.pulse = 1.2;
      for (let j = 0; j < N; j++) {
        const q = j * 3;
        vel[q] += (pos[q] - center.x) * 0.6;
        vel[q + 1] += (pos[q + 1] - center.y) * 0.6;
      }
    },
    destroy() {
      stop();
      window.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerleave", onPointerLeave);
      window.removeEventListener("resize", onResize);
      removeEventListener("pointerdown", onPointerDown);
      holdZones.forEach((z) => { delete z.dataset.holdZone; delete z.dataset.near; delete z.dataset.ribbonsShattered; });
      removeEventListener("pointerup", onPointerUp);
      removeEventListener("pointercancel", onPointerUp);
      geo.dispose();
      mat.dispose();
      renderer.dispose();
      renderer.forceContextLoss?.();
    },
  };
}
