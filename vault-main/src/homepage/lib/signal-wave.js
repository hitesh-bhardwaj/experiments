/**
 * Signal Wave: the "theremin line". Replaces the pillar field ("piano") in the Discipline section.
 *
 * A single glowing orange string (a 1D wave simulation) with a fading "pulsar" trail of its
 * past shapes stacked behind it. It is also an instrument:
 *   Hover   : moving near the line drags it; ripples travel along the whole string.
 *             onLevel(level, y, bright) fires every frame so a theremin tone can follow
 *             proximity/energy (level), cursor height (y → pitch) and brightness.
 *   Click   : plucks the string at the pointer (onPluck(y)).
 *   Hold    : pulls the line into a peak under the pointer as the charge builds.
 *   Release : partial = pluck; full = the whole string snaps into a big standing wave → returns 'signal'.
 *
 * The canvas should be pinned to the viewport so the line is never clipped. The line sits beside
 * `anchor` and scrolls with it; it is playable while `zone` crosses the middle of the screen. Needs `three`.
 *
 *   import { createSignalWave } from './signal-wave.js';
 *   const wave = createSignalWave(canvas, { anchor, zone, onLevel: sound.theremin, onPluck: sound.pluckString }).start();
 */
import * as THREE from 'three';

const DEFAULTS = {
  anchor: null,                                   // element the line sits beside: it centres on it and scrolls with it
  zone: null,                                     // section that owns the line: it is playable while this crosses the viewport middle (prototype's 'orb' zone)
  hitArea: null,                                  // element the pointer must be over to touch the string (default: the canvas)
  quality: 'auto',                                // 'auto' | 'high' | 'low'
  maxPixelRatio: null,
  pose: { op: [2.2, -0.9, 0], os: 1 },            // world offset from the anchor centre + scale (desktop)
  poseMobile: { op: [0, -3.6, -2], os: 0.55 },    // viewport aspect < 0.9
  pauseOffscreen: true,
  respectReducedMotion: true,
  onLevel: null,                                  // (level 0..1, y 0..1, bright 0..1) => void, every frame while visible
  onPluck: null,                                  // (y 0..1, amount) => void
  trail: true,                                    // the fading 'pulsar' history behind the line
};

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export function createSignalWave(canvas, options = {}) {
  const o = { ...DEFAULTS, ...options };
  const T = THREE;
  const mq = (q) => matchMedia(q).matches;
  const small = o.quality === 'low' || (o.quality === 'auto' && (mq('(max-width: 760px)') || (navigator.hardwareConcurrency || 8) <= 4));
  const reduced = o.respectReducedMotion && mq('(prefers-reduced-motion: reduce)');
  const zone = o.zone || canvas.parentElement, anchor = o.anchor || zone;

  const renderer = new T.WebGLRenderer({ canvas, antialias: !small, alpha: true, premultipliedAlpha: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0x000000, 0);
  const scene = new T.Scene(), camera = new T.PerspectiveCamera(32, 1, 0.1, 200); camera.position.set(0, 0, 20);
  const G = new T.Group(); scene.add(G);

  /* ---- the string: N points, a main strip and HM history strips (the pulsar trail) ---- */
  const N = small ? 140 : 220, HM = small ? 14 : 24, XW = 6.6;
  const y = new Float32Array(N), v = new Float32Array(N), hist = []; for (let k = 0; k < HM; k++) hist.push(new Float32Array(N));
  let hi = 0, frameN = 0;
  const st = { energy: 0, prox: 0, flare: 0, ly: 0, lx: 0, has: false, idx: -1 };
  const X = (i) => -XW + (2 * XW * i) / (N - 1);
  function strip(count) {
    const g = new T.BufferGeometry(), pos = new Float32Array(count * N * 2 * 3), uv = new Float32Array(count * N * 2 * 2), kk = new Float32Array(count * N * 2), idx = [];
    for (let c = 0; c < count; c++) for (let i = 0; i < N; i++) { const b = (c * N + i) * 2; uv[b * 2] = i / (N - 1); uv[b * 2 + 1] = 0; uv[b * 2 + 2] = i / (N - 1); uv[b * 2 + 3] = 1; kk[b] = kk[b + 1] = c / Math.max(1, count - 1); if (i < N - 1) idx.push(b, b + 1, b + 2, b + 1, b + 3, b + 2); }
    g.setAttribute('position', new T.BufferAttribute(pos, 3)); g.setAttribute('uv', new T.BufferAttribute(uv, 2)); g.setAttribute('aK', new T.BufferAttribute(kk, 1)); g.setIndex(idx); return g;
  }
  function mat(trail) {
    return new T.ShaderMaterial({
      // Prototype shader, additive (ONE, ONE). Alpha follows each pixel's brightness (also added), so
      // the canvas is valid premultiplied colour: a glow with alpha 0 is dropped by Safari / Firefox.
      transparent: true, depthWrite: false, blending: T.CustomBlending, blendEquation: T.AddEquation, blendSrc: T.OneFactor, blendDst: T.OneFactor, blendSrcAlpha: T.OneFactor, blendDstAlpha: T.OneFactor, side: T.DoubleSide, uniforms: { uGlow: { value: 1 }, uFlare: { value: 0 } },
      vertexShader: 'attribute float aK;varying vec2 vUv;varying float vK;void main(){vUv=uv;vK=aK;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader: 'uniform float uGlow,uFlare;varying vec2 vUv;varying float vK;void main(){float d=abs(vUv.y-.5)*2.;float edge=smoothstep(0.,.08,vUv.x)*smoothstep(1.,.92,vUv.x);' +
        (trail ? 'float a=exp(-d*d*4.)*(1.-vK)*.55*uGlow*edge;vec3 c=mix(vec3(1.,.28,0.),vec3(.55,.12,0.),vK);vec3 o=c*a;gl_FragColor=vec4(o,max(o.r,max(o.g,o.b)));}'
               : 'float core=exp(-d*d*40.);float glow=exp(-d*d*3.)*.55;vec3 c=vec3(1.,.22,0.)*(glow+uFlare*.6)+vec3(1.,.78,.55)*core*(1.+uFlare);vec3 o=c*edge*uGlow;gl_FragColor=vec4(o,max(o.r,max(o.g,o.b)));}'),
    });
  }
  const mainGeo = strip(1), trailGeo = strip(HM), mainMat = mat(false), trailMat = mat(true);
  if (o.trail) G.add(new T.Mesh(trailGeo, trailMat));
  const mm = new T.Mesh(mainGeo, mainMat); mm.renderOrder = 2; G.add(mm);

  /* ---- pointer → local coordinates on the string's plane ---- */
  const mouse = { x: 0, y: 0, sx: 0, sy: 0, on: false };
  const ray = new T.Raycaster(), plane = new T.Plane(), lp = new T.Vector3(), ndc = new T.Vector2(), tv = new T.Vector3(), nv = new T.Vector3();
  function local() {
    ndc.set(mouse.x, -mouse.y); ray.setFromCamera(ndc, camera); G.updateMatrixWorld();
    nv.set(0, 0, 1).transformDirection(G.matrixWorld); tv.setFromMatrixPosition(G.matrixWorld); plane.setFromNormalAndCoplanarPoint(nv, tv);
    if (!ray.ray.intersectPlane(plane, lp)) return false; G.worldToLocal(lp); return true;
  }
  /* The string only feels the pointer over `hitArea` (e.g. the wave's own block, when the canvas is a
     larger pinned layer); anywhere else it settles back to a flat line. Checked every frame, since the
     page can scroll under a still pointer. */
  const pointer = { x: -1, y: -1, inPage: false, moved: false };
  const updatePointer = () => {
    const r = canvas.getBoundingClientRect(), h = (o.hitArea || canvas).getBoundingClientRect();
    mouse.x = ((pointer.x - r.left) / r.width) * 2 - 1; mouse.y = ((pointer.y - r.top) / r.height) * 2 - 1;
    mouse.on = inZone && pointer.inPage && pointer.x >= h.left && pointer.x <= h.right && pointer.y >= h.top && pointer.y <= h.bottom;
  };
  const onMove = (e) => { pointer.x = e.clientX; pointer.y = e.clientY; pointer.inPage = true; pointer.moved = true; updatePointer(); };
  const onLeavePage = () => { pointer.inPage = false; mouse.on = false; };
  const tri = (j, c, w) => Math.max(0, 1 - Math.abs(j - c) / w);

  /* ---- sizing: same pixels-per-unit as a full-viewport canvas ---- */
  let W = 1, H = 1;
  function resize() {
    W = canvas.clientWidth || innerWidth; H = canvas.clientHeight || innerHeight;
    const pr = Math.min(devicePixelRatio || 1, o.maxPixelRatio || (small ? 1.25 : 1.75)); renderer.setPixelRatio(pr); renderer.setSize(W, H, false);
    camera.aspect = W / H; const base = innerWidth / innerHeight < 0.8 ? 46 : 32;
    camera.fov = (2 * Math.atan(Math.tan((base * Math.PI) / 360) * (H / innerHeight)) * 180) / Math.PI; camera.updateProjectionMatrix();
  }

  /* ---- simulation + drawing ---- */
  let charge = 0, time = 0, scrolling = false;
  function sim(dt) {
    // As in the prototype (line fixed to the viewport): scrolling the line under a still pointer
    // does not touch the string, only real pointer movement does
    let i, j; const hit = mouse.on && !scrolling && local(); let yN = 0.5;
    if (hit) {
      const idx = Math.round(((lp.x + XW) / (2 * XW)) * (N - 1));
      if (idx >= 0 && idx < N) {
        const prox = Math.max(0, 1 - Math.abs(lp.y - y[idx]) / 1.8); st.prox += (prox - st.prox) * 0.1;
        if (st.has) { const vy = lp.y - st.ly; for (j = Math.max(1, idx - 16); j < Math.min(N - 1, idx + 16); j++) { const w = Math.exp((-(j - idx) * (j - idx)) / 70) * prox; v[j] += vy * 0.2 * w; y[j] += (lp.y - y[j]) * 0.012 * w; } }
        st.idx = idx;
      } else st.prox *= 0.9;
      st.lx = lp.x; st.ly = lp.y; st.has = true; yN = clamp((lp.y + 2.6) / 5.2, 0, 1);
    } else { st.has = false; st.prox *= 0.92; }
    if (inZone && charge > 0 && st.idx >= 0) { const peak = clamp(st.ly, -2.6, 2.6); for (j = 1; j < N - 1; j++) { const t2 = tri(j, st.idx, N * 0.38); y[j] += (peak * t2 - y[j]) * 0.07 * charge; v[j] *= 1 - 0.2 * charge; } st.flare = Math.max(st.flare, charge * 0.7); }
    // As in the prototype: constant damping plus a tiny travelling sine force, so the string
    // always ripples gently on its own
    time += dt;
    for (let s = 0; s < 2; s++) { for (i = 1; i < N - 1; i++) { v[i] += (y[i - 1] + y[i + 1] - 2 * y[i]) * 0.42 + Math.sin(i * 0.06 + time * 1.1) * 0.0004; v[i] *= 0.9925; } for (i = 1; i < N - 1; i++) y[i] += v[i]; }
    let e = 0; for (i = 0; i < N; i++) e += Math.abs(v[i]); e = Math.min(1, e / (N * 0.02)); st.energy += (e - st.energy) * 0.08; st.flare *= Math.pow(0.35, dt);
    if (++frameN % 2 === 0) { hist[hi].set(y); hi = (hi + 1) % HM; }
    const P = mainGeo.attributes.position.array;
    for (i = 0; i < N; i++) {
      const x = X(i), yy = y[i], dy = y[Math.min(N - 1, i + 1)] - y[Math.max(0, i - 1)], dx = 2 * ((2 * XW) / (N - 1)), l = Math.sqrt(dx * dx + dy * dy), nx = -dy / l, ny = dx / l, w2 = 0.09 + Math.min(0.12, Math.abs(v[i]) * 0.9) + st.flare * 0.05, b = i * 6;
      P[b] = x + nx * w2; P[b + 1] = yy + ny * w2; P[b + 2] = 0; P[b + 3] = x - nx * w2; P[b + 4] = yy - ny * w2; P[b + 5] = 0;
    }
    mainGeo.attributes.position.needsUpdate = true;
    if (o.trail) {
    const Q = trailGeo.attributes.position.array;
    for (let k = 0; k < HM; k++) { const h = hist[(hi - 1 - k + HM * 2) % HM], zz = -(k + 1) * 0.5, oy = (k + 1) * 0.12; for (i = 0; i < N; i++) { const b2 = (k * N + i) * 6, x2 = X(i), y2 = h[i] * 0.92 + oy; Q[b2] = x2; Q[b2 + 1] = y2 + 0.035; Q[b2 + 2] = zz; Q[b2 + 3] = x2; Q[b2 + 4] = y2 - 0.035; Q[b2 + 5] = zz; } }
    trailGeo.attributes.position.needsUpdate = true;
    }
    mainMat.uniforms.uFlare.value = st.flare; trailMat.uniforms.uGlow.value = 1 + st.flare * 1.5;
    o.onLevel && o.onLevel(inZone ? st.prox * 0.45 + st.energy * 0.6 + charge * 0.4 : 0, yN, st.energy + charge * 0.6);
    // Tells the page's cursor tag when the pointer is actually near the line, not just over the section
    const isNear = hit && st.prox > NEAR_PROX;
    if (isNear !== near) { near = isNear; if (near) zone.dataset.near = ""; else delete zone.dataset.near; dispatchEvent(new Event('hx-near')); }
  }
  const NEAR_PROX = 0.25; // proximity 0..1 (1 = on the line, 0 = 1.8 units away)
  let near = false;

  /* ---- the line is playable (and sounds) while its zone crosses the viewport middle, as in the prototype ---- */
  let inZone = false;
  function updateZone() { const vh = innerHeight, r = zone.getBoundingClientRect(); inZone = r.top < vh * 0.6 && r.bottom > vh * 0.4; }

  const pose0 = () => (innerWidth / innerHeight < 0.9 ? o.poseMobile : o.pose);
  const cur = { op: new T.Vector3().fromArray(pose0().op), os: pose0().os };
  let raf = 0, running = false, visible = true, last = performance.now(), lastDy = 0;
  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (!visible || document.hidden) { o.onLevel && o.onLevel(0, 0.5, 0); return; }
    updateZone(); updatePointer();
    const P = pose0(), k = 1 - Math.pow(0.12, dt);
    cur.op.lerp(tv.fromArray(P.op), k); cur.os += (P.os - cur.os) * k;
    // Sit beside the anchor and scroll with it. The picture is shifted in screen space (view offset)
    // rather than moving the line in 3D, so the camera angle, and the trail's perspective, stay
    // exactly as in the prototype's viewport-centred pose.
    const cr = canvas.getBoundingClientRect(), ar = anchor.getBoundingClientRect(), dyPx = ar.top + ar.height / 2 - cr.top - H / 2;
    camera.setViewOffset(W, H, 0, -dyPx, W, H);
    scrolling = Math.abs(dyPx - lastDy) > 0.5 && !pointer.moved; lastDy = dyPx; pointer.moved = false;
    mouse.sx += (mouse.x - mouse.sx) * 0.03; mouse.sy += (mouse.y - mouse.sy) * 0.03;
    G.position.copy(cur.op); G.scale.setScalar(Math.max(0.001, cur.os)); G.rotation.set(mouse.sy * 0.06, mouse.sx * 0.1, 0);
    sim(dt);
    renderer.render(scene, camera);
  }

  let ro = null, io = null;
  function start() {
    if (running) return api; running = true;
    addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerleave', onLeavePage);
    if (typeof ResizeObserver !== 'undefined') { ro = new ResizeObserver(resize); ro.observe(canvas); }
    addEventListener('resize', resize);
    if (o.pauseOffscreen && typeof IntersectionObserver !== 'undefined') { io = new IntersectionObserver((es) => { visible = es[0].isIntersecting; }); io.observe(canvas); }
    resize(); last = performance.now();
    if (reduced) { frame(last); cancelAnimationFrame(raf); running = false; return api; }
    raf = requestAnimationFrame(frame); return api;
  }
  function stop() {
    running = false; cancelAnimationFrame(raf); o.onLevel && o.onLevel(0, 0.5, 0);
    removeEventListener('pointermove', onMove); removeEventListener('resize', resize);
    document.removeEventListener('pointerleave', onLeavePage);
    ro && ro.disconnect(); io && io.disconnect(); ro = io = null; return api;
  }

  const api = {
    start, stop,
    destroy() { stop(); [mainGeo, trailGeo, mainMat, trailMat].forEach((d) => d.dispose()); renderer.dispose(); },
    /** pluck the string at the pointer */
    tap() { if (st.idx < 0) return; for (let j = 1; j < N - 1; j++) y[j] += tri(j, st.idx, 12) * (st.ly > y[st.idx] ? 0.8 : -0.8); o.onPluck && o.onPluck(clamp((st.ly + 2.6) / 5.2, 0, 1), 1); },
    /** hold charge 0..1 (drive it from the liquid cursor's hold:charge event) */
    setCharge(c) { charge = clamp(c, 0, 1); },
    /** end a hold; full = the whole string snaps into a standing wave → returns 'signal' */
    release(full) {
      // charge is not reset here: the caller eases it back to 0 (prototype: 1.4s expo.out)
      if (!full) { api.tap(); return null; }
      for (let j = 1; j < N - 1; j++) v[j] += -y[j] * 0.5 + Math.sin((j / N) * Math.PI * 3) * 0.25;
      st.flare = 1.6; return 'signal';
    },
    /** music pulse (sound.onPulse): a small pluck in the middle */
    pulse(vv = 1) { const mid = (N / 2) | 0; for (let j = 1; j < N - 1; j++) y[j] += tri(j, mid + ((Math.random() - 0.5) * N * 0.6) | 0, 10) * 0.25 * vv; },
    renderer, scene, camera,
  };
  return api;
}
