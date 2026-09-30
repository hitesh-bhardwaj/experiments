/**
 * "This page fell over": the 404 physics toy.
 *
 * The digits 4 0 4 drop onto the floor as real rigid bodies (Matter.js). Drag them back onto
 * the dashed baseline: each one snaps into its slot with a note. A "4" dropped upside down
 * still snaps, with a quip ("h0h. Close enough.") but doesn't count. When all three stand,
 * onDone fires (confetti + "Standing again."). Left alone for 24s, the 0 rolls off-screen
 * like a wheel, stays away 4–12s, then rolls back.
 *
 * DOM-agnostic: everything visible outside the canvas happens through callbacks. See
 * not-found.js for the page wiring.
 *
 *   import Matter from 'matter-js';
 *   const fell = createFellOver(canvas, { Matter, onDone: () => …, onQuip: (t) => … });
 */

const DEFAULTS = {
  Matter: null,             // pass the Matter.js namespace (import Matter from 'matter-js')
  font: '800 {s}px Manrope, "Nunito Sans", system-ui, sans-serif', // {s} is replaced by the size in px
  fontLoad: '800 100px Manrope', // FontFace to wait for before dropping (max 1.5s)
  layoutRoot: null,         // receives --headY / --hintY so the headline and hint sit around the digits (default: <html>, resolved on create so the module is SSR-safe)
  onGrab: null,             // (x 0..1) => void
  onSnap: null,             // (slotIndex 0..2, flipped) => void
  onHit: null,              // () => void, a hard collision
  onDone: null,             // () => void, all three standing correctly
  onUndone: null,           // () => void, a finished digit was pulled out again
  onQuip: null,             // (text) => void
  onFirstGrab: null,        // () => void, e.g. hide the hint
  onZeroGone: null,         // () => void, the 0 rolled off-screen (tidy can't finish without it)
};

export function createFellOver(canvas, options = {}) {
  const o = { ...DEFAULTS, ...options };
  if (!o.layoutRoot) o.layoutRoot = document.documentElement;
  const M = o.Matter || (typeof window !== 'undefined' && window.Matter);
  if (!M) throw new Error('[fell-over] Matter.js is required: pass { Matter }');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const g = canvas.getContext('2d');
  let dpr = 1, Wd = 0, Ht = 0, DH = 200, GM = {}, raf = 0, dead = false;
  const engine = M.Engine.create({ gravity: { x: 0, y: 1.15 } }), world = engine.world;
  let walls = [], digits = [], slots = [], parts = [], done = false, firstGrab = false;
  const timers = new Set(); const later = (fn, ms) => { const id = setTimeout(() => { timers.delete(id); if (!dead) fn(); }, ms); timers.add(id); };

  const size = () => Math.round(DH * 1.25);
  function metrics(ch) {
    const k = ch + size(); if (GM[k]) return GM[k];
    g.font = o.font.replace('{s}', size()); g.textAlign = 'center'; g.textBaseline = 'alphabetic';
    const m = g.measureText(ch), L = m.actualBoundingBoxLeft || 0, Rr = m.actualBoundingBoxRight || m.width, A = m.actualBoundingBoxAscent || size() * 0.72, D = m.actualBoundingBoxDescent || 0;
    return (GM[k] = { w: L + Rr, h: A + D, ox: (L - Rr) / 2, oy: (A - D) / 2 });
  }
  function dims() {
    dpr = Math.min(devicePixelRatio || 1, 2); Wd = innerWidth; Ht = innerHeight;
    canvas.width = Math.round(Wd * dpr); canvas.height = Math.round(Ht * dpr);
    DH = Math.round(Math.min(Ht * 0.24, Wd * 0.2)); GM = {};
    const cx = Wd / 2, cy = Ht * 0.42, sp = DH * 0.8;
    if (!slots.length) slots = [{ ch: '4', b: null }, { ch: '0', b: null }, { ch: '4', b: null }];
    slots.forEach((s, i) => { s.x = cx + (i - 1) * sp; s.y = cy; });
    const half = metrics('4').h / 2, R = o.layoutRoot.style;
    R.setProperty('--headY', cy - half - Math.max(90, DH * 0.55) + 'px'); R.setProperty('--hintY', cy + half + 34 + 'px');
  }
  const floorY = () => Ht;
  function buildWalls() {
    walls.forEach((w) => M.Composite.remove(world, w)); const t = 400;
    walls = [M.Bodies.rectangle(Wd / 2, Ht + t / 2, Wd * 4, t, { isStatic: true, friction: 0.9 }), M.Bodies.rectangle(-t / 2, Ht / 2, t, Ht * 4, { isStatic: true }), M.Bodies.rectangle(Wd + t / 2, Ht / 2, t, Ht * 4, { isStatic: true }), M.Bodies.rectangle(Wd / 2, -Ht * 1.5, Wd * 4, t, { isStatic: true })];
    M.Composite.add(world, walls);
  }
  function makeDigit(ch, x, y) {
    const gm = metrics(ch), w = gm.w * 0.97, h = gm.h * 0.97; let b;
    if (ch === '0') { const v = []; for (let i = 0; i < 32; i++) { const a = (i / 32) * Math.PI * 2; v.push({ x: (Math.cos(a) * w) / 2, y: (Math.sin(a) * h) / 2 }); } b = M.Bodies.fromVertices(x, y, [v], { restitution: 0.3, friction: 0.4, frictionAir: 0.01, density: 0.0025 }); }
    else b = M.Bodies.rectangle(x, y, w, h, { chamfer: { radius: DH * 0.08 }, restitution: 0.2, friction: 0.7, density: 0.003 });
    b.ch = ch; b.w = w; b.h = h; b.touched = performance.now(); b.snap = null; M.Composite.add(world, b); return b;
  }
  dims(); buildWalls();

  /* ---- grabbing (own pointer handling, correct at any pixel density) ---- */
  let grab = null;
  const hit = (x, y) => { const hits = M.Query.point(digits, { x, y }); return hits.length ? hits[hits.length - 1] : null; };
  const onMove = (e) => { if (grab) { grab.c.pointA = { x: e.clientX, y: e.clientY }; return; } canvas.classList.toggle('can', !!hit(e.clientX, e.clientY)); };
  const onDown = (e) => {
    const b = hit(e.clientX, e.clientY); if (!b) return; e.preventDefault(); canvas.setPointerCapture(e.pointerId);
    if (b.roll) stopRoll(b); if (b.snap) { unsnap(b); if (done) { done = false; o.onUndone && o.onUndone(); } }
    const dx = e.clientX - b.position.x, dy = e.clientY - b.position.y, c = Math.cos(-b.angle), s = Math.sin(-b.angle);
    const con = M.Constraint.create({ pointA: { x: e.clientX, y: e.clientY }, bodyB: b, pointB: { x: dx * c - dy * s, y: dx * s + dy * c }, stiffness: 0.22, damping: 0.12, length: 0 });
    M.Composite.add(world, con); grab = { c: con, b }; b.touched = performance.now(); canvas.classList.add('grab');
    o.onGrab && o.onGrab(b.position.x / Wd); if (!firstGrab) { firstGrab = true; o.onFirstGrab && o.onFirstGrab(); }
  };
  const onUp = () => { if (!grab) return; const b = grab.b; M.Composite.remove(world, grab.c); grab = null; canvas.classList.remove('grab'); b.touched = performance.now(); trySnap(b); };
  canvas.addEventListener('pointermove', onMove); canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointerup', onUp); canvas.addEventListener('pointercancel', onUp);

  const angleNorm = (a) => { a %= Math.PI * 2; if (a > Math.PI) a -= Math.PI * 2; if (a < -Math.PI) a += Math.PI * 2; return a; };
  function trySnap(b) { let best = null, bd = 1e9; slots.forEach((s) => { if (s.b || s.ch !== b.ch) return; const d = Math.hypot(b.position.x - s.x, b.position.y - s.y); if (d < bd) { bd = d; best = s; } }); if (best && bd < DH * 0.7) snapTo(b, best); }
  function snapTo(b, s, upright = false) {
    const a = angleNorm(b.angle), flipped = !upright && b.ch === '4' && Math.abs(a) > Math.PI * 0.72; s.b = b;
    b.snap = { s, t: 0, fx: b.position.x, fy: b.position.y, fa: b.angle, ta: b.angle - a + (flipped ? Math.PI : 0), flipped };
    M.Body.setVelocity(b, { x: 0, y: 0 }); M.Body.setAngularVelocity(b, 0); if (!b.isStatic) M.Body.setStatic(b, true);
    o.onSnap && o.onSnap(slots.indexOf(s), flipped); if (flipped) quip('h0h. Close enough.'); check();
  }
  function unsnap(b) { if (!b.snap) return; b.snap.s.b = null; b.snap = null; if (b.isStatic) M.Body.setStatic(b, false); b.touched = performance.now(); }
  function check() { const ok = slots.every((s) => s.b && s.b.snap && !s.b.snap.flipped); if (ok && !done) { done = true; later(celebrate, 420); } }
  function quip(t) { o.onQuip && o.onQuip(t); }
  function celebrate() {
    quip(''); o.onDone && o.onDone();
    if (!reduced) for (let i = 0; i < 70; i++) { const s = slots[i % 3]; parts.push({ x: s.x + (Math.random() - 0.5) * DH * 0.6, y: s.y + DH * 0.45, vx: (Math.random() - 0.5) * 7, vy: -Math.random() * 9 - 3, life: 1, r: Math.random() * 4 + 2, c: Math.random() < 0.7 ? '#FF6B00' : '#F4F4F4' }); }
  }
  let lastHit = 0;
  M.Events.on(engine, 'collisionStart', (ev) => { const now = performance.now(); if (now - lastHit < 90) return; ev.pairs.forEach((p) => { const v = Math.hypot(p.bodyA.velocity.x - p.bodyB.velocity.x, p.bodyA.velocity.y - p.bodyB.velocity.y); if (v > 5 && now - lastHit > 90) { lastHit = now; o.onHit && o.onHit(); } }); });

  /* ---- the 0 rolls away like a wheel, stays gone 4–12s, rolls back ---- */
  const support = (b, a) => { const A = b.w / 2, B = b.h / 2; return Math.sqrt(Math.pow(A * Math.sin(a), 2) + Math.pow(B * Math.cos(a), 2)); };
  function startRoll(b, dir, toX) { b.roll = { dir, v: 0, vmax: DH * 1.5, toX }; if (!b.isStatic) M.Body.setStatic(b, true); }
  function stopRoll(b) { b.roll = null; if (b.isStatic) M.Body.setStatic(b, false); M.Body.setVelocity(b, { x: 0, y: 0 }); M.Body.setAngularVelocity(b, 0); b.touched = performance.now(); }
  function rollStep(b, dt) {
    const r = b.roll, s = dt / 1000;
    if (r.toX == null) r.v = Math.min(r.vmax, r.v + r.vmax * 1.1 * s); else { const left = (r.toX - b.position.x) * r.dir; r.v = Math.max(DH * 0.08, Math.min(r.vmax, left * 2.2)); }
    const dx = r.v * s * r.dir, ang = b.angle + dx / support(b, b.angle); M.Body.setAngle(b, ang); M.Body.setPosition(b, { x: b.position.x + dx, y: floorY() - support(b, ang) });
    if (r.toX == null && b.position.x > Wd + b.w) {
      b.roll = null; b.away = true; M.Composite.remove(world, b); quip('The 0 has left. It was never really committed.'); o.onZeroGone && o.onZeroGone();
      later(() => { b.away = false; M.Body.setAngle(b, 0); M.Body.setPosition(b, { x: -b.w, y: floorY() - b.h / 2 }); M.Composite.add(world, b); startRoll(b, 1, Wd * (0.25 + Math.random() * 0.5)); }, 4000 + Math.random() * 8000);
    } else if (r.toX != null && Math.abs(r.toX - b.position.x) < 2) { stopRoll(b); quip('It’s back. Commitment issues.'); }
  }
  function zeroTick(now) {
    const z = digits.find((d) => d.ch === '0'); if (!z || z.snap || z.roll || z.away || reduced || (grab && grab.b === z)) return;
    const resting = Math.hypot(z.velocity.x, z.velocity.y) < 0.25 && Math.abs(z.angularVelocity) < 0.01 && floorY() - (z.position.y + support(z, z.angle)) < 6;
    if (resting && now - z.touched > 24000) startRoll(z, 1, null);
  }

  /* ---- drop in once the font is ready ---- */
  const ready = document.fonts && document.fonts.load ? Promise.race([document.fonts.load(o.fontLoad), new Promise((r) => setTimeout(r, 1500))]) : Promise.resolve();
  ready.then(() => {
    if (dead) return; GM = {}; dims();
    [[0.36, '4'], [0.52, '0'], [0.66, '4']].forEach((d, i) => later(() => {
      const b = makeDigit(d[1], Wd * d[0], reduced ? floorY() - DH * 0.6 : -DH * (1 + i * 0.4));
      M.Body.setAngle(b, (Math.random() - 0.5) * 0.9); M.Body.setAngularVelocity(b, (Math.random() - 0.5) * 0.08); digits.push(b);
    }, reduced ? 0 : 250 + i * 380));
  });

  /* ---- drawing: glossy extruded digits, dashed baseline + ghost slots, floor shadows, confetti ---- */
  function glyph(ch, sz, face, depth) {
    g.font = o.font.replace('{s}', sz); g.textAlign = 'center'; g.textBaseline = 'alphabetic'; const gm = metrics(ch);
    for (let i = depth; i > 0; i--) { g.fillStyle = i === depth ? '#070707' : '#0c0c0c'; g.fillText(ch, gm.ox + i * 0.55, gm.oy + i * 0.7); }
    g.fillStyle = face; g.fillText(ch, gm.ox, gm.oy);
  }
  function faceGrad(ch, sz) {
    const gr = g.createLinearGradient(0, -sz * 0.4, 0, sz * 0.4);
    if (ch === '0') {
      // Same stops as the homepage's .gradient-text-animate
      const hg = g.createLinearGradient(-sz * 0.35, 0, sz * 0.35, 0);
      hg.addColorStop(0, '#FF8400'); hg.addColorStop(0.5, '#FF4100'); hg.addColorStop(1, '#FF8400');
      return hg;
    } else { gr.addColorStop(0, '#FFFFFF'); gr.addColorStop(0.55, '#E9E7E3'); gr.addColorStop(1, '#B9B6B0'); }
    return gr;
  }
  let last = performance.now();
  function loop(now) {
    raf = requestAnimationFrame(loop); const dt = Math.min(now - last, 33); last = now;
    M.Engine.update(engine, dt); zeroTick(now); digits.forEach((b) => { if (b.roll) rollStep(b, dt); });
    digits.forEach((b) => { if (!b.snap || b.snap.t >= 1) return; const s = b.snap; s.t = Math.min(1, s.t + dt / 420); const e = 1 - Math.pow(1 - s.t, 3); M.Body.setPosition(b, { x: s.fx + (s.s.x - s.fx) * e, y: s.fy + (s.s.y - s.fy) * e }); M.Body.setAngle(b, s.fa + (s.ta - s.fa) * e); });
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, Wd, Ht);
    const sz = size(), half = metrics('4').h / 2, bl = slots[0].y + half + 6;
    g.strokeStyle = 'rgba(244,244,244,.12)'; g.setLineDash([6, 8]); g.lineWidth = 1.2; g.beginPath(); g.moveTo(slots[0].x - DH * 0.6, bl); g.lineTo(slots[2].x + DH * 0.6, bl); g.stroke(); g.setLineDash([]);
    slots.forEach((s) => { if (s.b) return; const gm = metrics(s.ch); g.save(); g.translate(s.x, s.y); g.font = o.font.replace('{s}', sz); g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.strokeStyle = 'rgba(244,244,244,.15)'; g.lineWidth = 1.5; g.setLineDash([5, 7]); g.strokeText(s.ch, gm.ox, gm.oy); g.setLineDash([]); g.restore(); });
    if (done) { g.fillStyle = 'rgba(255,107,0,.9)'; g.fillRect(slots[0].x - DH * 0.6, bl - 1, slots[2].x - slots[0].x + DH * 1.2, 2); }
    const fy = floorY();
    digits.forEach((b) => { if (b.away) return; const d = Math.max(0, fy - (b.position.y + b.h / 2)), a = Math.max(0, 0.35 - d / 900); if (a <= 0) return; const gr = g.createRadialGradient(b.position.x, fy - 4, 1, b.position.x, fy - 4, b.w * 0.7); gr.addColorStop(0, 'rgba(0,0,0,' + a + ')'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(b.position.x - b.w, fy - 40, b.w * 2, 40); });
    digits.forEach((b) => { if (b.away) return; g.save(); g.translate(b.position.x, b.position.y); g.rotate(b.angle); glyph(b.ch, sz, faceGrad(b.ch, sz), Math.round(DH * 0.05)); g.restore(); });
    parts = parts.filter((p) => { p.vy += 0.28; p.x += p.vx; p.y += p.vy; p.life -= 0.012; if (p.life <= 0) return false; g.globalAlpha = p.life; g.fillStyle = p.c; g.fillRect(p.x, p.y, p.r, p.r); g.globalAlpha = 1; return true; });
  }
  raf = requestAnimationFrame(loop);

  const onResize = () => {
    dims(); buildWalls();
    digits.forEach((b) => { if (b.away) return; if (b.snap) { b.snap.t = 0; b.snap.fx = b.position.x; b.snap.fy = b.position.y; b.snap.fa = b.angle; } else if (!b.roll) M.Body.setPosition(b, { x: Math.min(Math.max(b.position.x, DH), Wd - DH), y: Math.min(b.position.y, Ht - DH) }); });
  };
  addEventListener('resize', onResize);

  return {
    /** "Skip the physics": snap every free digit into place. Returns false if the 0 is currently away */
    tidy() {
      const taken = []; slots.forEach((s) => { if (s.b && s.b.snap && !s.b.snap.flipped) taken.push(s.b); });
      slots.forEach((s, i) => {
        if (s.b && s.b.snap && !s.b.snap.flipped) return; if (s.b && s.b.snap) unsnap(s.b);
        const b = digits.find((d) => d.ch === s.ch && !d.snap && taken.indexOf(d) < 0 && !d.away); if (!b) return;
        if (b.roll) stopRoll(b); taken.push(b); s.b = b; later(() => { s.b = null; snapTo(b, s, true); }, i * 180); /* skip always stands them upright */
      });
      return digits.some((d) => d.ch === '0' && !d.away);
    },
    get done() { return done; },
    destroy() {
      dead = true; cancelAnimationFrame(raf); timers.forEach(clearTimeout); timers.clear();
      removeEventListener('resize', onResize); canvas.removeEventListener('pointermove', onMove); canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointerup', onUp); canvas.removeEventListener('pointercancel', onUp);
      M.Events.off(engine); M.World.clear(world, false); M.Engine.clear(engine);
    },
  };
}
