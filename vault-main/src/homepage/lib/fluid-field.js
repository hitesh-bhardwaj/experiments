/**
 * Fluid Field — a small incompressible fluid (advection + pressure projection) on the CPU,
 * rendered as soft glowing orange ink, with a dot grid floating on top that the flow pushes around.
 *
 * Two canvases:
 *   ink  : the fluid, drawn at grid resolution and blurred up by CSS (see SiteBackground.jsx)
 *   dots : the dot grid, drawn at full resolution
 *
 * No dependencies. Framework-agnostic ES module.
 *
 *   import { createFluidField } from './fluid-field.js';
 *   const fluid = createFluidField({ ink: inkCanvas, dots: dotsCanvas });
 *   fluid.start();
 */

const DEFAULTS = {
  cell: null,              // px per simulation cell (default 16 desktop, 22 small screens). Bigger = cheaper, softer
  iterations: 14,          // pressure solver iterations
  dyeDecay: 0.984,         // how quickly ink fades (per frame)
  velocityDamping: 0.988,
  dotSpacing: 28,          // px between grid dots
  dotColor: 'rgba(244,244,244,.20)',
  dotHotColor: [255, 190, 140], // dot colour where ink is present (rgb)
  pointerForce: 0.55,      // how hard pointer movement pushes the fluid
  pointerInk: 0.018,       // ink per px of pointer movement
  scrollDrift: true,       // scrolling drags the fluid vertically
  getScroll: null,         // () => number. Default: window.scrollY. Pass () => lenis.scroll with Lenis
  pauseOffscreen: true,
  respectReducedMotion: true, // reduced motion: static dot grid, no simulation
};

export function createFluidField({ ink, dots, ...options }) {
  const o = { ...DEFAULTS, ...options };
  const gi = ink.getContext('2d'), gd = dots.getContext('2d');
  const mq = (q) => typeof matchMedia === 'function' && matchMedia(q).matches;
  const small = mq('(max-width: 760px)') || (navigator.hardwareConcurrency || 8) <= 4;
  const reduced = o.respectReducedMotion && mq('(prefers-reduced-motion: reduce)');
  const S = o.cell || (small ? 22 : 16);
  const getScroll = o.getScroll || (() => window.scrollY);

  let C, R, u, v, u0, v0, pp, dv, dye, dye0, img, W, H, pr = 1;
  const vortex = { a: 0, x: 0, y: 0 };
  const m = { x: -1, y: -1, px: -1, py: -1 };

  function alloc() {
    W = dots.clientWidth || innerWidth; H = dots.clientHeight || innerHeight; pr = Math.min(devicePixelRatio || 1, 2);
    C = Math.ceil(W / S) + 2; R = Math.ceil(H / S) + 2; const n = C * R;
    u = new Float32Array(n); v = new Float32Array(n); u0 = new Float32Array(n); v0 = new Float32Array(n);
    pp = new Float32Array(n); dv = new Float32Array(n); dye = new Float32Array(n); dye0 = new Float32Array(n);
    ink.width = C; ink.height = R; img = gi.createImageData(C, R);
    dots.width = W * pr; dots.height = H * pr;
    dirty = true;
  }

  const ix = (x, y) => (y < 0 ? 0 : y >= R ? R - 1 : y) * C + (x < 0 ? 0 : x >= C ? C - 1 : x);
  function smp(a, x, y) { /* bilinear sample */
    const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0;
    return (a[ix(x0, y0)] * (1 - fx) + a[ix(x0 + 1, y0)] * fx) * (1 - fy) + (a[ix(x0, y0 + 1)] * (1 - fx) + a[ix(x0 + 1, y0 + 1)] * fx) * fy;
  }
  /* add force (fx,fy) and ink d in a gaussian of radius rad cells around (px,py) in canvas pixels */
  function splat(px, py, fx, fy, rad, d) {
    const gx = px / S + 1, gy = py / S + 1, r = Math.ceil(rad * 1.6);
    for (let y = Math.floor(gy - r); y <= gy + r; y++) for (let x = Math.floor(gx - r); x <= gx + r; x++) {
      if (x < 1 || y < 1 || x >= C - 1 || y >= R - 1) continue;
      const dx = x - gx, dy = y - gy, w = Math.exp(-(dx * dx + dy * dy) / (rad * rad)), i = y * C + x;
      u[i] += fx * w; v[i] += fy * w; dye[i] = Math.min(1.6, dye[i] + d * w);
    }
  }

  let lastSY = 0;
  function step() {
    let dsy = 0;
    if (o.scrollDrift) { const sy = getScroll(); dsy = sy - lastSY; lastSY = sy; if (Math.abs(dsy) > innerHeight) dsy = 0; }
    if (m.px >= 0 && m.x >= 0) {
      const dx = m.x - m.px, dy = m.y - m.py, sp = Math.sqrt(dx * dx + dy * dy);
      if (sp > 0.3) splat(m.x, m.y, (dx / S) * o.pointerForce, (dy / S) * o.pointerForce, 2.3, Math.min(0.7, sp * o.pointerInk));
    }
    m.px = m.x; m.py = m.y;
    if (vortex.a > 0.01) { /* swirl around a point, used for press-and-hold */
      const gx = vortex.x / S + 1, gy = vortex.y / S + 1, rr = 10;
      for (let y = Math.max(1, Math.floor(gy - rr)); y < Math.min(R - 1, gy + rr); y++) for (let x = Math.max(1, Math.floor(gx - rr)); x < Math.min(C - 1, gx + rr); x++) {
        const ddx = x - gx, ddy = y - gy, w = Math.exp(-(ddx * ddx + ddy * ddy) / 40) * vortex.a, i = y * C + x;
        u[i] += (-ddy * 0.06 - ddx * 0.012) * w; v[i] += (ddx * 0.06 - ddy * 0.012) * w; dye[i] = Math.min(1.4, dye[i] + w * 0.03);
      }
    }
    let i, x, y;
    u0.set(u); v0.set(v); dye0.set(dye);
    /* advect velocity and ink backwards along the flow */
    for (y = 1; y < R - 1; y++) for (x = 1; x < C - 1; x++) { i = y * C + x; const bx = x - u0[i], by = y - v0[i]; u[i] = smp(u0, bx, by); v[i] = smp(v0, bx, by) - dsy * 0.0012; dye[i] = smp(dye0, bx, by) * o.dyeDecay; }
    /* pressure projection keeps the flow divergence-free (swirly, not spreading) */
    for (y = 1; y < R - 1; y++) for (x = 1; x < C - 1; x++) { i = y * C + x; dv[i] = -0.5 * (u[i + 1] - u[i - 1] + v[i + C] - v[i - C]); pp[i] = 0; }
    for (let it = 0; it < o.iterations; it++) for (y = 1; y < R - 1; y++) for (x = 1; x < C - 1; x++) { i = y * C + x; pp[i] = (dv[i] + pp[i - 1] + pp[i + 1] + pp[i - C] + pp[i + C]) * 0.25; }
    for (y = 1; y < R - 1; y++) for (x = 1; x < C - 1; x++) { i = y * C + x; u[i] = (u[i] - 0.5 * (pp[i + 1] - pp[i - 1])) * o.velocityDamping; v[i] = (v[i] - 0.5 * (pp[i + C] - pp[i - C])) * o.velocityDamping; }
  }

  function draw() {
    /* ink: dark ember → brand orange → peach as density rises */
    const d = img.data;
    for (let i = 0; i < C * R; i++) {
      const q = Math.min(1, dye[i]); let r, g, b;
      if (q < 0.5) { const t = q * 2; r = 110 + 145 * t; g = 30 + 77 * t; b = 0; } else { const t = (q - 0.5) * 2; r = 255; g = 107 + 95 * t; b = 150 * t; }
      d[i * 4] = r; d[i * 4 + 1] = g; d[i * 4 + 2] = b; d[i * 4 + 3] = Math.min(255, q * 255 * 0.9);
    }
    gi.putImageData(img, 0, 0);
    /* dots: displaced by the local velocity, warmer and bigger where there is ink */
    gd.setTransform(pr, 0, 0, pr, 0, 0); gd.clearRect(0, 0, W, H);
    const sp = o.dotSpacing, ox = (W % sp) / 2, hc = o.dotHotColor;
    for (let y = sp / 2; y < H; y += sp) for (let x = ox; x < W; x += sp) {
      const gx = x / S + 1, gy = y / S + 1, du = smp(u, gx, gy), dvv = smp(v, gx, gy), q = smp(dye, gx, gy);
      gd.fillStyle = q > 0.08 ? 'rgba(' + hc[0] + ',' + hc[1] + ',' + hc[2] + ',' + Math.min(0.9, 0.2 + q * 0.6) + ')' : o.dotColor;
      const s = 1.4 + Math.min(1, q) * 1.6;
      gd.fillRect(x + du * S * 0.8 - s / 2, y + dvv * S * 0.8 - s / 2, s, s);
    }
  }

  /* pointer, relative to the dots canvas */
  const onMove = (e) => {
    const r = dots.getBoundingClientRect();
    const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
    if (!inside) { m.x = m.px = -1; return; }
    m.x = e.clientX - r.left; m.y = e.clientY - r.top;
  };

  let raf = 0, running = false, visible = true, ro = null, io = null;
  /* calm: no ink, no flow and no input. The last frame is kept and nothing is
     simulated until the pointer, scroll or an effect (splash / burst / vortex) stirs it */
  let calm = false, dirty = true, kicked = false, scrolled = false;
  const onScroll = () => { scrolled = true; };
  function settled() {
    if (vortex.a > 0.01) return false;
    for (let i = 0; i < C * R; i++) if (dye[i] > 0.004 || Math.abs(u[i]) > 0.01 || Math.abs(v[i]) > 0.01) return false;
    return true;
  }
  function stirred() {
    /* flags only: reading the scroll position every idle frame could force a layout */
    return kicked || vortex.a > 0.01 || (m.x >= 0 && (m.x !== m.px || m.y !== m.py)) || (o.scrollDrift && scrolled);
  }
  function loop() {
    raf = requestAnimationFrame(loop);
    if (!visible || document.hidden) return;
    if (calm) {
      if (!stirred()) { if (dirty) { draw(); dirty = false; } return; }
      /* wake without a scroll jump; m.px stays so the pointer move that woke us still pushes the ink */
      calm = kicked = scrolled = false; lastSY = getScroll();
    }
    if (!reduced) step();
    draw();
    dirty = false;
    calm = reduced || settled();
  }
  function start() {
    if (running) return api;
    running = true; alloc(); lastSY = getScroll();
    addEventListener('pointermove', onMove, { passive: true });
    addEventListener('scroll', onScroll, { passive: true });
    if (typeof ResizeObserver !== 'undefined') { ro = new ResizeObserver(alloc); ro.observe(dots); } else addEventListener('resize', alloc);
    if (o.pauseOffscreen && typeof IntersectionObserver !== 'undefined') { io = new IntersectionObserver((es) => { visible = es[0].isIntersecting; }); io.observe(dots); }
    raf = requestAnimationFrame(loop);
    return api;
  }
  function stop() {
    running = false; cancelAnimationFrame(raf);
    removeEventListener('pointermove', onMove); removeEventListener('scroll', onScroll); removeEventListener('resize', alloc);
    ro && ro.disconnect(); io && io.disconnect(); ro = io = null;
    return api;
  }

  const api = {
    start, stop,
    destroy() { stop(); gi.clearRect(0, 0, ink.width, ink.height); gd.clearRect(0, 0, dots.width, dots.height); },
    /** drop a puff of ink at canvas coordinates (px) */
    splash(x, y) { kicked = true; splat(x, y, 0, 0, 2.4, 0.8); },
    /** radial burst of force + ink, e.g. on a big release. power ≈ 0.6–1.8 */
    burst(x, y, power = 1) { kicked = true; for (let a = 0; a < 28; a++) { const an = (a / 28) * 6.283; splat(x + Math.cos(an) * S * 1.6, y + Math.sin(an) * S * 1.6, Math.cos(an) * power, Math.sin(an) * power, 2.2, 0.55 * Math.min(1, power)); } },
    /** swirl around (x,y) with strength a (0..1); set a=0 to stop */
    setVortex(x, y, a) { kicked = a > 0.01; vortex.x = x; vortex.y = y; vortex.a = a; },
  };
  return api;
}
