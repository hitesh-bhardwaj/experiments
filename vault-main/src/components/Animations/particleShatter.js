// Press-and-hold shatter for the particle blobs (community, pricing, blog), after the
// homepage hero ribbons (homepage/lib/theremin-ribbons.js), with the same timings and
// forces: holding charges the model (the page shrinks and shakes it with `charge`), and
// letting go at full charge bursts the dots out across the screen, lets them linger there in
// slow motion (stirred by the cursor), then sweeps them back home round the model.
//
// Like particleHover.js it is a layer on top of each page's own motion:
// shatter.offset[i * 3..] is added to where the dot would otherwise be drawn.
//
//   const shatter = createShatter(N, scale, { onHoldStart, onReady, onReform }); // scale: world units per
//                                            // homepage ribbon unit (setScale on resize); hooks for sound
//   shatter.press(); shatter.release();      // release() → { kind: "tap" | "partial" | "full", started, full }
//   shatter.burst(at, cx, cy, cz, px, py);   // at(i, axis): the dot's world position; px, py: release point
//   shatter.frame(dt, time, pointerOn, x, y, movedPx, cameraZ); // once per frame, pointer on z = 0
//   shatter.step(i, x, y, z);                // per dot, its position before the offset
//   shatter.setBounds(screenBounds(visW, visH, midY)); // the box the burst spreads over
//   shatter.pace                             // speed for the page's own motion (slow motion in pieces)

// Press and hold (theremin-ribbons.js)
const HOLD_DELAY = 0.2;
const HOLD_DURATION = 1.9;
const TAP_MS = 220;
const FULL_CHARGE = 0.985;
const CHARGE_OUT_S = 1.4;

// Shatter: 1 burst → 2 linger (stirrable) → 3 reform → 4 settle → 0 idle
const BURST_S = 1.5;
const LINGER_S = 7;
const REFORM_MAX_S = 7;
const SETTLE_S = 1.4;
const STIR_RADIUS = 2.6;
// The burst breaks the surface into this many chunks, each thrown its own way
const FRAGMENTS = 48;
// Launch speed per unit of travel: with the burst's drag (0.93 per frame) a dot coasts to its spot
const LAUNCH = 4.2;
// While charging, every dot trembles (the homepage ribbons' uCharge tremble, sized for dots)
const TREMBLE = 0.15;
const TREMBLE_HZ = 24;
// In pieces (and on the way home) the dots and the page's own motion run in slow motion, at this
// share of normal speed (pace)
const SCATTER_SPEED = 0.1;
// The pointer on scattered dots, against the homepage's: reach and push, and how much of the push
// the dots keep (carve), so it sweeps paths through the cloud
const STIR_REACH = 1.6;
const STIR_FORCE = 2.5;
const STIR_CARVE = 0.4;
// The burst spreads the dots evenly over the screen (setBounds; screenBounds builds the box): the
// share of the visible width and height it covers, and its depth in world units
export const SCATTER_FILL = { w: 1.1, h: 1.1, depth: 6 };

// Targets that keep their own pointer behaviour: never start a hold on them (theremin-ribbons.js)
export const HOLD_EXCLUDE = "a,button,input,textarea,select,label,form,[role=button],[role=dialog],h1,h2,h3,p";

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const damp = (a, b, f, dt) => a + (b - a) * (1 - Math.pow(1 - f, dt * 60));

export function createShatter(N, initialScale = 1, { onHoldStart, onReady, onReform } = {}) {
  // A world-space box the burst spreads the dots across (setBounds), instead of a cloud round the model
  let bounds = null;
  const stirR = STIR_RADIUS * STIR_REACH;
  let scale = initialScale;
  // Simulated in homepage ribbon units, drawn in world units (offset = sim * scale)
  const offset = new Float32Array(N * 3);
  const sOff = new Float32Array(N * 3);
  const sVel = new Float32Array(N * 3);
  const sCloud = new Float32Array(N * 3);
  const sDelay = new Float32Array(N);
  const sR = Float32Array.from({ length: N }, () => Math.random());
  // Each dot trembles along its own direction
  const tDir = new Float32Array(N * 3);
  for (let n = 0; n < N; n++) {
    const th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
    tDir[n * 3] = Math.sin(ph) * Math.cos(th);
    tDir[n * 3 + 1] = Math.sin(ph) * Math.sin(th);
    tDir[n * 3 + 2] = Math.cos(ph);
  }
  let trembling = false;
  const SH = { mode: 0, t: 0 };
  const m = { on: false, x: 0, y: 0, speed: 0, useMouse: false, mSpd: 0, damp: 1, time: 0, drift: 0 };
  const charge = { v: 0 };
  let press = null, out = null;

  const press_ = () => {
    press = { t: performance.now(), ready: false, started: false };
    out = null;
    charge.v = 0;
  };
  // Hold released: what it was, and the charge eases back out (expo.out over 1.4s)
  const release = () => {
    if (!press) return null;
    const quick = performance.now() - press.t < TAP_MS, full = charge.v > FULL_CHARGE;
    const started = press.started;
    press = null;
    out = { from: charge.v, t: performance.now() };
    return { kind: quick ? "tap" : full && SH.mode === 0 ? "full" : "partial", started, full };
  };
  // Let go quietly (scrolled away mid-hold): no shatter
  const cancel = () => {
    if (!press) return false;
    const started = press.started;
    press = null;
    out = { from: charge.v, t: performance.now() };
    dispatchEvent(new Event("hx-hold-cancel"));
    return started;
  };

  // Debris, not a swelling ball: the surface breaks into chunks that fly off on their own
  // headings (leaning toward the camera), most dots go a little way and a few a long way, and
  // the blast kicks away from where the pointer let go (px, py; world units on z = 0).
  const burst = (at, cx, cy, cz, px = cx, py = cy) => {
    const frags = [];
    for (let f = 0; f < FRAGMENTS; f++) {
      const th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
      frags.push([Math.sin(ph) * Math.cos(th), Math.sin(ph) * Math.sin(th), Math.cos(ph), 0.4 + Math.random() * 1.1]);
    }
    const ox = (px - cx) / scale, oy = (py - cy) / scale;
    for (let n = 0; n < N; n++) {
      const k = n * 3;
      const bx = (at(n, 0) - cx) / scale, by = (at(n, 1) - cy) / scale, bz = (at(n, 2) - cz) / scale;
      const bl = Math.hypot(bx, by, bz) || 1;
      const rx = bx / bl, ry = by / bl, rz = bz / bl;
      // The chunk this dot belongs to: the fragment heading closest to where it sits on the surface
      let fi = 0, best = -2;
      for (let f = 0; f < FRAGMENTS; f++) {
        const d = rx * frags[f][0] + ry * frags[f][1] + rz * frags[f][2];
        if (d > best) { best = d; fi = f; }
      }
      const F = frags[fi];
      // Away from the release point, harder close to it
      const ax = bx - ox, ay = by - oy, al = Math.hypot(ax, ay) || 1, kick = 1.6 / (1 + al * 0.25);
      let dx = rx * 0.6 + F[0] + (ax / al) * kick + (Math.random() - 0.5) * 0.5;
      let dy = ry * 0.6 + F[1] + (ay / al) * kick + (Math.random() - 0.5) * 0.5;
      let dz = rz * 0.6 + F[2] + 0.5 + (Math.random() - 0.5) * 0.5;
      const dl = Math.hypot(dx, dy, dz);
      dx /= dl; dy /= dl; dz /= dl;
      sOff[k] = sOff[k + 1] = sOff[k + 2] = 0;
      if (bounds) {
        // Spread evenly over the box (the screen, not a ball round the model): of a few random spots
        // in it, each dot takes the one most in line with its heading, so it still flies outward
        let qx = 0, qy = 0, qz = 0, bestQ = -Infinity;
        for (let c = 0; c < 2; c++) {
          const x = (bounds.x0 + Math.random() * (bounds.x1 - bounds.x0) - cx) / scale;
          const y = (bounds.y0 + Math.random() * (bounds.y1 - bounds.y0) - cy) / scale;
          const z = (bounds.z0 + Math.random() * (bounds.z1 - bounds.z0) - cz) / scale;
          const a = ((x - bx) * dx + (y - by) * dy + (z - bz) * dz) / (Math.hypot(x - bx, y - by, z - bz) || 1);
          if (a > bestQ) { bestQ = a; qx = x; qy = y; qz = z; }
        }
        sCloud[k] = qx - bx;
        sCloud[k + 1] = qy - by;
        sCloud[k + 2] = qz - bz;
      } else {
        // Heavy tail: most dots stay near, a few are flung far
        const sp = (1.4 + Math.pow(Math.random(), 2.2) * 11) * F[3] * (1 + kick * 0.4);
        sCloud[k] = dx * sp;
        sCloud[k + 1] = dy * sp;
        sCloud[k + 2] = dz * sp * 0.8;
      }
      // Thrown hard and slowed by drag, so it pops instead of inflating
      sVel[k] = sCloud[k] * LAUNCH * (0.9 + Math.random() * 0.2);
      sVel[k + 1] = sCloud[k + 1] * LAUNCH * (0.9 + Math.random() * 0.2);
      sVel[k + 2] = sCloud[k + 2] * LAUNCH * (0.9 + Math.random() * 0.2);
      // Home in a sweep round the model
      sDelay[n] = ((Math.atan2(by, bx) + Math.PI) / (Math.PI * 2) + sR[n] * 0.25) % 1;
    }
    SH.mode = 1;
    SH.t = 0;
  };

  const frame = (dt, time, on, x, y, moved = 0, camZ = 20) => {
    // Charge: power2.in after a short delay while held, expo.out back to 0 once let go
    if (press) {
      const held = (performance.now() - press.t) / 1000;
      const t = clamp((held - HOLD_DELAY) / HOLD_DURATION, 0, 1);
      charge.v = t * t;
      if (!press.started && held >= HOLD_DELAY) { press.started = true; onHoldStart?.(); }
      if (!press.ready && charge.v >= FULL_CHARGE) { press.ready = true; onReady?.(); dispatchEvent(new Event("hx-hold-ready")); }
    } else if (out) {
      const t = Math.min(1, (performance.now() - out.t) / 1000 / CHARGE_OUT_S);
      charge.v = out.from * (t >= 1 ? 0 : Math.pow(2, -10 * t));
      if (t >= 1) out = null;
    }

    m.speed = damp(m.speed, Math.min(40, moved), 0.18, dt);
    m.time = time;
    m.drift += dt * SCATTER_SPEED;
    m.tremble = TREMBLE * charge.v * charge.v;
    if (!SH.mode) {
      // Idle: only the charge's tremble moves the dots
      if (trembling && !m.tremble) offset.fill(0);
      trembling = m.tremble > 0;
      return;
    }
    trembling = true;
    SH.t += dt;
    if (moved > 2 && SH.mode === 2) SH.t = Math.min(SH.t, LINGER_S - 2.5); // keep lingering while stirred
    if (SH.mode === 1 && SH.t > BURST_S) { SH.mode = 2; SH.t = 0; }
    if (SH.mode === 2 && SH.t > LINGER_S) { SH.mode = 3; SH.t = 0; m.done = 0; }
    if (SH.mode === 3 && (m.done > N * 0.97 || SH.t > REFORM_MAX_S)) { SH.mode = 4; SH.t = 0; onReform?.(); }
    if (SH.mode === 4 && SH.t > SETTLE_S) {
      SH.mode = 0;
      offset.fill(0);
      return;
    }
    m.done = 0;
    m.useMouse = on && SH.mode <= 3;
    m.x = x / scale;
    m.y = y / scale;
    m.camZ = camZ / scale;
    m.mSpd = Math.min(1.6, m.speed * 0.06);
    m.damp = Math.pow(SH.mode >= 3 ? 0.83 : 0.93, dt * 60);
    m.dt = dt;
  };

  const step = (i, x, y, z = 0) => {
    const mode = SH.mode;
    const k = i * 3;
    if (!mode) {
      if (!m.tremble) return;
      const w = Math.sin(m.time * TREMBLE_HZ + sR[i] * 1.5 + x * 1.5 + y) * m.tremble * scale;
      offset[k] = tDir[k] * w;
      offset[k + 1] = tDir[k + 1] * w;
      offset[k + 2] = tDir[k + 2] * w;
      return;
    }
    const dt = m.dt;
    let tx, ty, tz, kk;
    if (mode === 3) {
      let q = clamp((SH.t - sDelay[i] * 1.3) / 1.9, 0, 1);
      q = q * q * (3 - 2 * q);
      tx = sCloud[k] * (1 - q);
      ty = sCloud[k + 1] * (1 - q);
      tz = sCloud[k + 2] * (1 - q);
      kk = 2.4 + q * 14;
    } else if (mode === 4) {
      tx = ty = tz = 0;
      kk = 16.4;
    } else {
      // Scattered dots drift round their spot, in slow motion (SCATTER_SPEED)
      const dr = m.drift * 0.35 + sR[i] * 6.28;
      tx = sCloud[k] + Math.sin(dr + sCloud[k + 1] * 0.3) * 0.45;
      ty = sCloud[k + 1] + Math.cos(dr * 0.8 + sCloud[k] * 0.3) * 0.45;
      tz = sCloud[k + 2] + Math.sin(dr * 0.6) * 0.3;
      // The burst coasts free for a moment before the cloud starts holding it
      kk = mode === 1 ? 2.4 * clamp((SH.t - 0.3) / 0.6, 0, 1) : 0.9;
    }
    let ax = (tx - sOff[k]) * kk, ay = (ty - sOff[k + 1]) * kk, az = (tz - sOff[k + 2]) * kk;
    if (m.useMouse) {
      // Stirred by the pointer (the camera looks straight down -z, so the pointer ray is -z)
      // The camera sits on the z axis, so the pointer ray crosses the dot's depth at the pointer's
      // z = 0 position scaled toward the axis; the burst throws dots toward the camera, where
      // they show well away from their x, y
      const along = (m.camZ - (z / scale + sOff[k + 2])) / m.camZ;
      let rx = x / scale + sOff[k] - m.x * along, ry = y / scale + sOff[k + 1] - m.y * along;
      const d = Math.sqrt(rx * rx + ry * ry);
      if (d < stirR && d > 0.0001) {
        let f = 1 - d / stirR;
        f = f * f * (4 + m.mSpd * 14) * (mode === 3 ? 0.4 : 1) * STIR_FORCE;
        rx /= d; ry /= d;
        // Pushed out, and swirled round the pointer ray
        ax += rx * f + ry * f * 0.9;
        ay += ry * f - rx * f * 0.9;
        // Scattered dots keep some of the push: their spot in the cloud moves with them, so the
        // pointer sweeps paths through the cloud instead of the dots springing straight back
        if (mode <= 2) {
          sCloud[k] += (rx + ry * 0.9) * f * STIR_CARVE * dt;
          sCloud[k + 1] += (ry - rx * 0.9) * f * STIR_CARVE * dt;
        }
      }
    }
    sVel[k] = (sVel[k] + ax * dt) * m.damp;
    sVel[k + 1] = (sVel[k + 1] + ay * dt) * m.damp;
    sVel[k + 2] = (sVel[k + 2] + az * dt) * m.damp;
    sOff[k] += sVel[k] * dt;
    sOff[k + 1] += sVel[k + 1] * dt;
    sOff[k + 2] += sVel[k + 2] * dt;
    if (mode === 3 && sOff[k] * sOff[k] + sOff[k + 1] * sOff[k + 1] + sOff[k + 2] * sOff[k + 2] < 0.02) m.done++;
    // The last of the settle eases the offset fully away
    const e = mode === 4 ? 1 - clamp(SH.t / SETTLE_S, 0, 1) ** 2 : 1;
    offset[k] = sOff[k] * scale * e;
    offset[k + 1] = sOff[k + 1] * scale * e;
    offset[k + 2] = sOff[k + 2] * scale * e;
  };

  return {
    offset,
    charge,
    press: press_,
    release,
    cancel,
    burst,
    frame,
    step,
    setScale(s) { scale = s; },
    // { x0, x1, y0, y1, z0, z1 } in world units, or null for the cloud round the model
    setBounds(b) { bounds = b; },
    get active() { return SH.mode !== 0; },
    // Burst or lingering: in pieces, not yet heading home
    get scattered() { return SH.mode === 1 || SH.mode === 2; },
    // The page's own motion speed: SCATTER_SPEED while in pieces and while they fly home, easing
    // back to full speed only as the reformed shape settles, so it doesn't race before it's whole
    get pace() {
      if (!SH.mode) return 1;
      if (SH.mode < 4) return SCATTER_SPEED;
      const e = clamp(SH.t / SETTLE_S, 0, 1);
      return SCATTER_SPEED + (1 - SCATTER_SPEED) * e * e * (3 - 2 * e);
    },
    get holding() { return !!press; },
  };
}

// The homepage's shatter ripple: three rings spreading from the release point.
// `host` is a positioned element the rings are placed in; with none they are fixed to the viewport.
export function shockwave(host, clientX, clientY) {
  if (clientX < 0) return;
  const r = host ? host.getBoundingClientRect() : { left: 0, top: 0 };
  const x = clientX - r.left, y = clientY - r.top;
  [0, 0.12, 0.26].forEach((delay, i) => {
    const ring = document.createElement("span");
    ring.setAttribute("aria-hidden", "true");
    Object.assign(ring.style, {
      position: host ? "absolute" : "fixed", left: `${x}px`, top: `${y}px`, width: "40px", height: "40px",
      margin: "-20px 0 0 -20px", borderRadius: "50%", pointerEvents: "none", zIndex: host ? "2" : "-1",
      border: `${i === 0 ? 2 : 1}px solid ${i === 1 ? "color-mix(in srgb, var(--foreground) 55%, transparent)" : "color-mix(in srgb, var(--primary) 85%, transparent)"}`,
      boxShadow: i === 0 ? "0 0 40px color-mix(in srgb, var(--primary) 45%, transparent), inset 0 0 30px color-mix(in srgb, var(--primary) 25%, transparent)" : "none",
      opacity: "0",
    });
    (host || document.body).appendChild(ring);
    const anim = ring.animate(
      [{ transform: "scale(.2)", opacity: 1 }, { transform: `scale(${26 + i * 6})`, opacity: 0 }],
      { duration: (1.6 + i * 0.25) * 1000, delay: delay * 1000, easing: "cubic-bezier(.16,1,.3,1)", fill: "both" },
    );
    anim.onfinish = () => ring.remove();
  });
}

// The SCATTER_FILL box for a camera on the z axis looking down -z: the visible width and height at
// z = 0 are visW x visH, centred at (0, midY)
export function screenBounds(visW, visH, midY = 0) {
  const sw = visW * SCATTER_FILL.w / 2, sh = visH * SCATTER_FILL.h / 2, sd = SCATTER_FILL.depth / 2;
  return { x0: -sw, x1: sw, y0: midY - sh, y1: midY + sh, z0: -sd, z1: sd };
}
