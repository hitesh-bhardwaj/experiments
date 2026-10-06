// The Crowd: thousands of particles drifting in a curl-like current behind the
// community page's dark sections. The cursor gathers them like a school of
// fish, a click scatters them, the stack chips light up their share of the
// swarm, and joining the waitlist launches one bright particle into it.
//
// Framework-free. The formation eases between poses per `data-zone` section
// ("crowd", "crowd2", "ring"); a "sheet" zone that covers the viewport pauses
// rendering because the light sheet hides the canvas anyway.
//
//   const crowd = mountCrowd(canvas, { THREE, zoneRoot, reducedMotion });
//   crowd.highlight(new Set([0, 3])); crowd.launch(x, y); crowd.destroy();

// Particle counts
const COUNT = 6000;
const COUNT_SMALL = 2600;

// Formation centres per zone, desktop and narrow screens
const CENTER = { crowd: [3.9, 0.9, 0], crowd2: [0, -0.3, -2], ring: [0, 0.4, 0] };
const CENTER_NARROW = { crowd: [0, 2.6, -3], crowd2: [0, 0, -4], ring: [0, 0.2, -2] };
const RING_RADIUS = 5.8;
const RING_RADIUS_NARROW = 3.2;

// Cursor
const GATHER_RADIUS_SQ = 10;
const MOUSE_SPEED_CAP = 60;

// Highlight groups: every particle belongs to one of these, matching one chip each
export const CROWD_GROUPS = 10;

const MAX_DT = 0.05;
const MAX_PIXEL_RATIO = 1.75;
const MAX_PIXEL_RATIO_SMALL = 1.25;

const VERTEX_SHADER = /* glsl */ `
attribute float aHot, aR;
uniform float uPR, uTime, uPulse;
varying float vHot, vR, vA;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.);
  gl_Position = projectionMatrix * mv;
  float tw = .75 + .25 * sin(uTime * 1.7 + aR * 40.);
  gl_PointSize = uPR * (2.4 + aR * 3.6 + aHot * 2.6 + uPulse * 1.8) * (24. / -mv.z) * (aHot > 1.5 ? 2.6 : 1.);
  vHot = aHot; vR = aR; vA = tw;
}`;

const FRAGMENT_SHADER = /* glsl */ `
varying float vHot, vR, vA;
void main() {
  float d = length(gl_PointCoord - .5);
  if (d > .5) discard;
  float s = smoothstep(.5, 0., d);
  vec3 base = mix(vec3(.78, .74, .7), vec3(1., .36, .05), step(.62, vR));
  vec3 hotc = mix(vec3(1., .42, 0.), vec3(1., .95, .9), clamp(vHot - 1., 0., 1.));
  vec3 c = mix(base, hotc, clamp(vHot, 0., 1.));
  gl_FragColor = vec4(c * s * vA * (.95 + clamp(vHot, 0., 2.) * .7), 1.);
}`;

const lerp = (a, b, t) => a + (b - a) * t;
const NOOP_API = { highlight() {}, launch() {}, destroy() {} };

export function mountCrowd(canvas, opts = {}) {
  const { THREE: T, zoneRoot = document, reducedMotion = false, small = false, sound = null, getFluid = () => null, onToast = null } = opts;
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
  const geo = new T.BufferGeometry();
  geo.setAttribute("position", new T.BufferAttribute(pos, 3));
  geo.setAttribute("aHot", new T.BufferAttribute(hot, 1));
  geo.setAttribute("aR", new T.BufferAttribute(rnd, 1));
  const uniforms = { uPR: { value: 1 }, uTime: { value: 0 }, uPulse: { value: 0 } };
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
  let zone = "crowd";
  const center = new T.Vector3(3.6, reducedMotion ? 0.9 : -6, 0);
  let ringMix = 0;

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
  const onPointerMove = (e) => { mouse.cx = e.clientX; mouse.cy = e.clientY; mouse.on = true; };
  const onPointerLeave = () => { mouse.on = false; };
  window.addEventListener("pointermove", onPointerMove, { passive: true });
  document.addEventListener("pointerleave", onPointerLeave);

  const state = { pulse: 0, joinIdx: -1, covered: false, running: false, logoMix: 0 };

  // Resize
  const onResize = () => {
    const pr = Math.min(devicePixelRatio || 1, small ? MAX_PIXEL_RATIO_SMALL : MAX_PIXEL_RATIO);
    renderer.setPixelRatio(pr);
    uniforms.uPR.value = pr;
    renderer.setSize(innerWidth, innerHeight, false);
    camera.aspect = innerWidth / innerHeight;
    camera.fov = camera.aspect < 0.8 ? 46 : 32;
    camera.updateProjectionMatrix();
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
  };

  // Simulation step
  const step = (dt, time) => {
    const narrow = camera.aspect < 0.9;
    const C = (narrow ? CENTER_NARROW : CENTER)[zone] || CENTER.crowd;
    const k = 1 - Math.pow(0.25, dt);
    center.x += (C[0] - center.x) * k;
    center.y += (C[1] - center.y) * k;
    center.z += (C[2] - center.z) * k;
    ringMix += ((zone === "ring" ? 1 : 0) - ringMix) * k * 0.8;

    const moved = Math.hypot(mouse.cx - mouse.lastX, mouse.cy - mouse.lastY);
    mouse.lastX = mouse.cx;
    mouse.lastY = mouse.cy;
    mouse.speed += (Math.min(MOUSE_SPEED_CAP, moved) - mouse.speed) * 0.2;
    const hasMouse = mouse.on && !state.covered && toWorld(mouse.cx, mouse.cy, hit);
    state.pulse *= Math.pow(0.2, dt);
    uniforms.uPulse.value = state.pulse;

    const damp = Math.pow(0.955, dt * 60);
    const ringR = narrow ? RING_RADIUS_NARROW : RING_RADIUS;
    const spd = Math.min(1, mouse.speed / 25);
    // Hold: the charge eases the crowd into the Hyperiux wordmark (prototype)
    const ch = charge.v;
    state.logoMix += ((hasLogo && ch > 0.02 ? Math.min(1, ch * 1.4) : 0) - state.logoMix) * Math.min(1, dt * 3);
    const logoMix = state.logoMix;
    const pull = 1.4 + ringMix * 1.4 + logoMix * 7;
    let stir = 0;

    for (let i = 0; i < N; i++) {
      const q = i * 3;
      const x = pos[q], y = pos[q + 1], z = pos[q + 2];

      // Drifting current
      let ax = (Math.sin(y * 0.55 + time * 0.35 + rnd[i] * 2) + Math.cos(z * 0.7 - time * 0.25)) * 0.55;
      let ay = (Math.sin(z * 0.5 + time * 0.4) + Math.cos(x * 0.45 + time * 0.2)) * 0.45;
      let az = (Math.sin(x * 0.4 - time * 0.3) + Math.cos(y * 0.5 + time * 0.35)) * 0.35;

      // Formation: cloud, easing into a ring in the Join zone
      let hx = center.x + home[q], hy = center.y + home[q + 1], hz = center.z + home[q + 2];
      if (ringMix > 0.01) {
        const an = rnd[i] * 6.283 + time * 0.08 * (rnd[i] > 0.5 ? 1 : -1);
        const rr = ringR + (rnd[i] - 0.5) * 1.1;
        hx = lerp(hx, center.x + Math.cos(an) * rr, ringMix);
        hy = lerp(hy, center.y + Math.sin(an) * rr * 0.9, ringMix);
        hz = lerp(hz, center.z + home[q + 2] * 0.3, ringMix);
      }
      if (logoMix > 0.01) {
        hx = lerp(hx, center.x + logo[q], logoMix);
        hy = lerp(hy, center.y + logo[q + 1], logoMix);
        hz = lerp(hz, center.z + logo[q + 2], logoMix);
      }
      ax += (hx - x) * pull;
      ay += (hy - y) * pull;
      az += (hz - z) * pull;

      // School-of-fish cursor: gather and swirl
      if (hasMouse && logoMix < 0.5) {
        const dx = hit.x - x, dy = hit.y - y, d2 = dx * dx + dy * dy;
        if (d2 < GATHER_RADIUS_SQ) {
          stir++;
          const f = 1 - d2 / GATHER_RADIUS_SQ;
          const inv = 1 / Math.sqrt(d2 + 0.05);
          ax += dx * inv * f * (2.2 + spd * 3) - dy * inv * f * (3 + spd * 6);
          ay += dy * inv * f * (2.2 + spd * 3) + dx * inv * f * (3 + spd * 6);
          az += (rnd[i] - 0.5) * f * 2;
          if (d2 < 0.6) { ax -= dx * inv * 4; ay -= dy * inv * 4; }
        }
      }

      vel[q] = (vel[q] + ax * dt) * damp;
      vel[q + 1] = (vel[q + 1] + ay * dt) * damp;
      vel[q + 2] = (vel[q + 2] + az * dt) * damp;
      pos[q] += vel[q] * dt;
      pos[q + 1] += vel[q + 1] * dt;
      pos[q + 2] += vel[q + 2] * dt;
      hot[i] += (hotTarget[i] - hot[i]) * Math.min(1, dt * 2.5);
    }
    geo.attributes.position.needsUpdate = true;
    geo.attributes.aHot.needsUpdate = true;
    // Prototype: Sound.sparkle, transposed like its zones (crowd2 → 'orb', -3)
    sound?.sparkle?.(hasMouse ? Math.min(1, stir / (N * 0.06)) * (0.3 + spd) : 0, mouse.cx / innerWidth, zone === "crowd2" ? -3 : 0);
  };

  const render = () => renderer.render(scene, camera);

  // Animation loop
  const clock = new T.Clock();
  let raf = 0;
  const frame = () => {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), MAX_DT);
    const time = (uniforms.uTime.value += dt);
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

  // Click scatters; press and hold charges the crowd into the wordmark, and a
  // full charge explodes it on release (prototype). Dark sections only, never on controls.
  const HOLD_DELAY = 0.2, HOLD_DURATION = 1.9, FULL_CHARGE = 0.985;
  const charge = { v: 0 };
  let press = null, chargeRaf = 0;
  const scatter = (x, y) => {
    for (let i = 0; i < N; i++) {
      const k = i * 3;
      const dx = pos[k] - x, dy = pos[k + 1] - y, dz = pos[k + 2];
      const f = 5 / (dx * dx + dy * dy + dz * dz + 0.4);
      vel[k] += dx * f;
      vel[k + 1] += dy * f;
      vel[k + 2] += dz * f * 0.5;
    }
    state.pulse = 0.6;
  };
  const explode = () => {
    for (let i = 0; i < N; i++) {
      const k = i * 3, a = rnd[i] * 6.283;
      vel[k] += Math.cos(a) * (4 + rnd[i] * 6);
      vel[k + 1] += Math.sin(a) * (4 + rnd[i] * 6);
      vel[k + 2] += (rnd[i] - 0.5) * 6;
    }
    state.pulse = 1.4;
    state.logoMix = 0;
  };
  const chargeTick = () => {
    if (!press) return;
    // power2.in after a short delay, like the homepage hold
    const t = Math.min(1, Math.max(0, (performance.now() - press.t) / 1000 - HOLD_DELAY) / HOLD_DURATION);
    charge.v = t * t;
    // Prototype: the hold sound starts with the charge; the fluid swirls under the pointer
    if (!press.sounding && (performance.now() - press.t) / 1000 >= HOLD_DELAY) { press.sounding = true; sound?.holdStart?.(); }
    getFluid()?.setVortex?.(mouse.cx, mouse.cy, charge.v * 0.6);
    chargeRaf = requestAnimationFrame(chargeTick);
  };
  // Prototype: gsap.to(charge, { v: 0, duration: 1.4, ease: "expo.out" })
  const easeChargeOut = () => {
    const from = charge.v, t0 = performance.now();
    const tick = () => {
      if (press) return;
      const t = Math.min(1, (performance.now() - t0) / 1400);
      charge.v = from * (1 - (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)));
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  const onPointerDown = (e) => {
    if (reducedMotion || state.covered || e.button !== 0) return;
    // Same exclusions as the prototype's ring cursor (EX)
    if (e.target.closest?.("a,button,input,label,form,h1,h2,h3,p,[data-zone='sheet'],.sheet,header,nav")) return;
    if (!toWorld(e.clientX, e.clientY, hit)) return;
    press = { t: performance.now(), x: hit.x, y: hit.y, sounding: false };
    cancelAnimationFrame(chargeRaf);
    chargeRaf = requestAnimationFrame(chargeTick);
  };
  const onPointerUp = (e) => {
    if (!press) return;
    const p = press;
    press = null;
    cancelAnimationFrame(chargeRaf);
    const fluid = getFluid();
    const quick = performance.now() - p.t < 220, full = charge.v > FULL_CHARGE;
    const ex = e?.clientX ?? mouse.cx, ey = e?.clientY ?? mouse.cy;
    if (p.sounding) sound?.holdEnd?.(full);
    fluid?.setVortex?.(ex, ey, 0);
    if (quick) {
      // Prototype: World.tap + Field.splash + Sound.tap
      scatter(p.x, p.y);
      fluid?.splash?.(ex, ey);
      sound?.crowdTap?.();
    } else {
      fluid?.burst?.(ex, ey, full ? 1.6 : 0.6 + charge.v);
      if (full) {
        explode();
        sound?.release?.("shatter");
        onToast?.("That\u2019s what a crowd can build.");
      } else scatter(p.x, p.y);
    }
    easeChargeOut();
  };
  addEventListener("pointerup", onPointerUp);
  addEventListener("pointercancel", onPointerUp);
  zoneRoot.addEventListener("pointerdown", onPointerDown);

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
      zoneRoot.removeEventListener("pointerdown", onPointerDown);
      removeEventListener("pointerup", onPointerUp);
      removeEventListener("pointercancel", onPointerUp);
      cancelAnimationFrame(chargeRaf);
      geo.dispose();
      mat.dispose();
      renderer.dispose();
      renderer.forceContextLoss?.();
    },
  };
}
