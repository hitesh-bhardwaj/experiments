import * as THREE from "three";
import gsap from "gsap";

// Scene
const FOG_COLOR = 0x111111;
const FOG_DENSITY = 0.016;
const CAMERA_Z = 20;
const TONE_EXPOSURE = 0.95;
const RIM_INTENSITY = 3.9;

// Ribbons
const TRAIL = 6;
const RIBBON_RADIUS = 6.2;
const RIBBON_STEP = 1.32;
const RIBBON_ARC_START = -1.0;
const RIBBON_ARC_END = Math.PI * 1.42;
const RIBBON_WIDTH = 0.16;
const RIBBON_THICKNESS = 1.05;

// Motion
const INTRO_DURATION = 4.2;
// Footer ribbons start this far right and slide in as the footer comes into view
const FOOTER_SLIDE_FROM = 9;
const INTRO_DROP = 6; // world units the hero ribbons rise through on play()
const NARROW_ASPECT = 0.9;

// Press and hold
const HOLD_DELAY = 0.2;
const HOLD_DURATION = 1.9;
const TAP_MS = 220;
const FULL_CHARGE = 0.985;
const UNLOCK_DELAY_MS = 1700;

// Shatter: 1 burst → 2 linger (stirrable) → 3 reform → 4 crossfade → 0 idle
const BURST_S = 1.5;
const LINGER_S = 7;
const REFORM_MAX_S = 7;
const CROSSFADE_S = 1.4;
const STIR_RADIUS = 2.6;

// Targets that keep their own pointer behaviour: never start a hold on them
const HOLD_EXCLUDE = "a,button,input,textarea,select,label,form,[role=button],[role=dialog],h1,h2,h3,p";

const MAX_TILT_SCROLL = 40; // px/frame of smoothed scroll speed that still tilts the ribbons
const MAX_SCROLL_STEP = 80; // px of scroll one frame can register
const MOUSE_TILT_EASE = 0.025; // per 60fps frame: how quickly the tilt follows the pointer
const MAX_POINTER_STEP = 40; // px of pointer movement one frame can register

const POSE = {
  ribbons: { rp: [2.2, -4.6, 0], rr: [-0.28, -0.42, 0.22], rs: 1.12 },
  ribbons_m: { rp: [2.5, -5, -2], rr: [-0.28, -0.42, 0.22], rs: 0.95 },
  // Footer: a small cluster in the top-right corner
  // Turned counter-clockwise from the original 0.22 so the open ends close the gap on the right
  footer: { rp: [7, 2.2, 0], rr: [-0.28, -0.42, 0.79], rs: 0.4 },
  // Phones: on the right edge like desktop, mostly off-screen so a slice shows
  // (the camera sees about ±3.9 units across there). Same rotation as desktop.
  footer_m: { rp: [6.2, 1.5, 0], rr: [-0.28, -0.42, 0.35], rs: 0.5 },
};

const RIBBON_VERT_PARS = /* glsl */ `
  uniform float uScrollV;
  uniform float uTime;
  uniform float uHitT;
  uniform float uHitA;
  uniform float uCharge;
  uniform vec3  uHit;
  uniform vec4  uTrail[${TRAIL}];
  varying float vGlow;
  varying float vRip;
`;

const RIBBON_VERT_DISPLACE = /* glsl */ `
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
  float idle = sin(wp.x * .35 + uTime * .5) * sin(wp.y * .3 + uTime * .37) * .14;
  float trem = sin(uTime * 36. + wp.x * 3. + wp.y * 2.) * uCharge * uCharge * .07;
  float sang = atan(position.y, position.x);
  float swave = sin(sang * 7. - uTime * 3.2) * uScrollV * .32;
  vec2 rdir = normalize(position.xy + vec2(.0001));
  transformed.xy += rdir * (bul * .5 + wake + rip * .55 + idle + trem + swave);
  vGlow = bul + abs(swave) * .8;
  vRip = rip;
`;

const RIBBON_FRAG_PARS = /* glsl */ `
  uniform float uCharge;
  varying float vGlow;
  varying float vRip;
`;

const RIBBON_FRAG_EMISSIVE = /* glsl */ `
  #include <emissivemap_fragment>
  totalEmissiveRadiance += vec3(1., .2, 0.) * (clamp(vGlow, 0., 1.3) * .28 + clamp(abs(vRip), 0., 1.) * .4 + uCharge * uCharge * .5);
`;

const STREAK_VERT = /* glsl */ `
  ${RIBBON_VERT_PARS}
  varying float vU;

  void main() {
    vU = uv.x;
    ${RIBBON_VERT_DISPLACE}
    // Ride on the ribbon's front face, not its centre line (it's ${RIBBON_THICKNESS} deep),
    // or the tube sits buried inside the ribbon and fails the depth test
    transformed.z += ${(RIBBON_THICKNESS / 2 + 0.04).toFixed(3)};
    gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.);
  }
`;

const STREAK_FRAG = /* glsl */ `
  uniform float uHead;
  uniform float uLen;
  varying float vU;

  void main() {
    float d = uHead - vU;
    float a = step(0., d) * smoothstep(uLen, 0., d);
    float core = smoothstep(.02, 0., d) * step(0., d);
    vec3 c = mix(vec3(1., .2, 0.), vec3(1., .62, .42), core + a * a * .6);
    vec3 col = c * (a * 1.6 + core * 2.);
    gl_FragColor = vec4(col, clamp(max(col.r, max(col.g, col.b)), 0., 1.));
  }
`;

const SHARD_VERT = /* glsl */ `
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

const SHARD_FRAG = /* glsl */ `
  uniform float uAlpha;
  varying float vR;

  void main() {
    float d = length(gl_PointCoord - .5);
    if (d > .5) discard;
    vec3 c = mix(vec3(1., .2, 0.), vec3(1., .5, .26), vR);
    vec3 col = c * smoothstep(.5, 0., d) * 1.35 * uAlpha;
    gl_FragColor = vec4(col, clamp(max(col.r, max(col.g, col.b)), 0., 1.));
  }
`;

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
// Frame-rate independent lerp: `f` is the fraction closed per 60fps frame, so
// the easing feels the same at 60Hz, 120Hz or after a dropped frame
const damp = (a, b, f, dt) => lerp(a, b, 1 - Math.pow(1 - f, dt * 60));

// r128 never colour-managed these hex values, so they were used as linear
const linearHex = (hex) => new THREE.Color().setHex(hex, THREE.LinearSRGBColorSpace);

// A flat band built explicitly: width runs radially in the arc plane,
// thickness along z. Explicit per-face normals, no Frenet frames, so it can
// never twist or flip.
function buildRibbonGeometry(pathAt, a0, a1, segments, width, thickness) {
  const pos = [], nor = [], uv = [], idx = [];
  const widthDir = (a) => {
    const x = Math.cos(a), y = Math.sin(a) * 0.92, l = Math.hypot(x, y);
    return [x / l, y / l];
  };
  const faces = [
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

export function mountThereminRibbons(host, canvas, { pose = "hero", sound = null, onUnlock = null } = {}) {
  const isHero = pose === "hero";
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;
  const small = matchMedia("(max-width: 760px)").matches || (navigator.hardwareConcurrency || 8) <= 4;
  const timers = new Set();
  const later = (fn, ms) => {
    const id = setTimeout(() => { timers.delete(id); fn(); }, ms);
    timers.add(id);
  };

  // Renderer and scene
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !small, alpha: true, powerPreference: "high-performance" });
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = TONE_EXPOSURE;
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 200);
  camera.position.set(0, 0, CAMERA_Z);
  scene.fog = new THREE.FogExp2(linearHex(FOG_COLOR), FOG_DENSITY);

  // Environment: a dark room with warm softboxes, baked once for reflections
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  envScene.add(new THREE.Mesh(new THREE.BoxGeometry(30, 16, 30), new THREE.MeshBasicMaterial({ color: linearHex(0x070707), side: THREE.BackSide })));
  const addSoftbox = (w, h, x, y, z, rx, ry, color) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }));
    m.position.set(x, y, z);
    m.rotation.set(rx, ry, 0);
    envScene.add(m);
  };
  addSoftbox(14, 2, 0, 7.5, 0, Math.PI / 2, 0, new THREE.Color(1.3, 1.25, 1.2));
  addSoftbox(2.5, 10, -14, 1, -2, 0, Math.PI / 2, new THREE.Color(4.2, 0.62, 0));
  addSoftbox(2, 9, 14, 0, 4, 0, -Math.PI / 2, new THREE.Color(3.4, 0.5, 0));
  addSoftbox(18, 1.2, 0, -2, -14, 0, 0, new THREE.Color(1.3, 0.19, 0));
  const envTarget = pmrem.fromScene(envScene, 0.03);
  scene.environment = envTarget.texture;

  // Lights
  scene.add(new THREE.HemisphereLight(linearHex(0x3a2a22), linearHex(0x050505), 0.4 * Math.PI));
  const key = new THREE.DirectionalLight(linearHex(0xffe6d4), 0.9 * Math.PI);
  key.position.set(-6, 10, 8);
  scene.add(key);
  const rim = new THREE.PointLight(new THREE.Color("#FF6B00"), RIM_INTENSITY, 40, 0);
  rim.position.set(8, -4, 6);
  scene.add(rim);

  // Ribbon material with the liquid, trailing hover
  const uTime = { value: 0 };
  const trail = Array.from({ length: TRAIL }, () => new THREE.Vector4(99, 99, 0, 0));
  const RU = {
    uScrollV: { value: 0 }, uTime, uTrail: { value: trail },
    uHit: { value: new THREE.Vector3(99, 99, 0) }, uHitT: { value: 99 }, uHitA: { value: 0 }, uCharge: { value: 0 },
  };
  const ribMat = new THREE.MeshPhysicalMaterial({
    side: THREE.DoubleSide, color: new THREE.Color("#24120a"), metalness: 0.4, roughness: 0.26,
    clearcoat: 1, clearcoatRoughness: 0.16, envMapIntensity: 1.25, transparent: true, opacity: 1,
  });
  ribMat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, RU);
    sh.vertexShader = RIBBON_VERT_PARS + sh.vertexShader.replace("#include <begin_vertex>", RIBBON_VERT_DISPLACE);
    sh.fragmentShader = RIBBON_FRAG_PARS + sh.fragmentShader.replace("#include <emissivemap_fragment>", RIBBON_FRAG_EMISSIVE);
  };

  // Ribbons and their streaks
  const ribbons = new THREE.Group();
  scene.add(ribbons);
  const subs = [], ribMeshes = [], streaks = [], disposables = [ribMat];
  const ribbonCount = small ? 5 : 7;
  for (let i = 0; i < ribbonCount; i++) {
    const R = RIBBON_RADIUS + i * RIBBON_STEP;
    const pathAt = (a) => new THREE.Vector3(Math.cos(a) * R, Math.sin(a) * R * 0.92, Math.sin(a * 1.3 + i * 0.4) * 0.9 - i * 0.55);
    const pts = [];
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
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, premultipliedAlpha: true,
      // Shares the ribbon's uniform objects, so both bend together
      uniforms: { ...RU, uHead: { value: -1 }, uLen: { value: 0.16 } },
      vertexShader: STREAK_VERT, fragmentShader: STREAK_FRAG,
    });
    const streakGeo = new THREE.TubeGeometry(curve, 420, 0.035, 6, false);
    const streak = new THREE.Mesh(streakGeo, streakMat);
    streak.position.z = 0.1;
    sub.add(streak);
    streaks.push({ m: streakMat, head: -1, speed: 0 });
    disposables.push(geo, streakGeo, streakMat);
  }
  function fireStreak(j, delay = 0, speed) {
    const s = streaks[j];
    if (!s) return;
    later(() => { s.head = -0.05; s.speed = speed || 0.28 + Math.random() * 0.18; }, delay);
  }

  // Shatter particles, sampled on the ribbon surfaces
  const SN = small ? 5000 : 11000;
  const sBase = new Float32Array(SN * 3), sDir = new Float32Array(SN * 3), sR = new Float32Array(SN);
  const ribFlat = ribMeshes.map((m) => m.geometry.toNonIndexed());
  {
    const tmp = new THREE.Vector3(), a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
    for (let n = 0; n < SN; n++) {
      const g = ribFlat[n % ribFlat.length].attributes.position, tri = Math.floor(Math.random() * (g.count / 3)) * 3;
      a.fromBufferAttribute(g, tri); b.fromBufferAttribute(g, tri + 1); c.fromBufferAttribute(g, tri + 2);
      let r1 = Math.random(), r2 = Math.random();
      if (r1 + r2 > 1) { r1 = 1 - r1; r2 = 1 - r2; }
      tmp.copy(a).addScaledVector(b.sub(a), r1).addScaledVector(c.sub(a), r2);
      sBase[n * 3] = tmp.x; sBase[n * 3 + 1] = tmp.y; sBase[n * 3 + 2] = tmp.z;
      const d = tmp.clone().normalize();
      d.x += (Math.random() - 0.5) * 1.2; d.y += (Math.random() - 0.5) * 1.2; d.z += Math.random() * 1.5 + 0.3;
      d.normalize();
      sDir[n * 3] = d.x; sDir[n * 3 + 1] = d.y; sDir[n * 3 + 2] = d.z;
      sR[n] = Math.random();
    }
  }
  ribFlat.forEach((g) => g.dispose());
  const sPos = new Float32Array(SN * 3), sVel = new Float32Array(SN * 3), sCloud = new Float32Array(SN * 3), sDelay = new Float32Array(SN);
  for (let n = 0; n < SN; n++) sDelay[n] = ((Math.atan2(sBase[n * 3 + 1], sBase[n * 3]) + Math.PI) / (Math.PI * 2) + sR[n] * 0.25) % 1;
  const sGeo = new THREE.BufferGeometry();
  sGeo.setAttribute("position", new THREE.BufferAttribute(sPos, 3));
  sGeo.setAttribute("aR", new THREE.BufferAttribute(sR, 1));
  const SU = { uAlpha: { value: 0 }, uPR: { value: 1 } };
  const sMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, premultipliedAlpha: true,
    uniforms: SU, vertexShader: SHARD_VERT, fragmentShader: SHARD_FRAG,
  });
  const shards = new THREE.Points(sGeo, sMat);
  shards.frustumCulled = false;
  shards.visible = false;
  ribbons.add(shards);
  disposables.push(sGeo, sMat);

  // Pointer state, in canvas-relative coordinates
  const mouse = { x: 0, y: 0, sx: 0, sy: 0, cx: -1, cy: -1, on: false };
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  const pv = new THREE.Vector3(), tmpV = new THREE.Vector3();
  const inv = new THREE.Matrix4(), lo = new THREE.Vector3(), ld = new THREE.Vector3();
  const pointerWorld = (out) => {
    ndc.set(mouse.x, -mouse.y);
    ray.setFromCamera(ndc, camera);
    return ray.ray.intersectPlane(plane, out);
  };

  // Shatter state machine
  const SH = { mode: 0, t: 0 };
  let mouseSpeed = 0, sparkling = false;
  // Lets the page (the homepage cursor) know whether this scene is in pieces.
  // Marked on the hero's <main> / the <footer>, plus a window event.
  function announce(shattered) {
    const zone = host.closest("main, footer, section") || host;
    if (shattered) zone.dataset.ribbonsShattered = ""; else delete zone.dataset.ribbonsShattered;
    dispatchEvent(new CustomEvent("hx-ribbons-state", { detail: { shattered } }));
  }
  function startShatter() {
    for (let n = 0; n < SN; n++) {
      const k = n * 3, sp = 2.2 + sR[n] * 5.5;
      sPos[k] = sBase[k]; sPos[k + 1] = sBase[k + 1]; sPos[k + 2] = sBase[k + 2];
      sCloud[k] = sBase[k] + sDir[k] * sp + (Math.random() - 0.5) * 2.4;
      sCloud[k + 1] = sBase[k + 1] + sDir[k + 1] * sp + (Math.random() - 0.5) * 2.4;
      sCloud[k + 2] = sBase[k + 2] + sDir[k + 2] * sp * 0.8 + (Math.random() - 0.2) * 2;
      const im = 3 + sR[n] * 5;
      sVel[k] = sDir[k] * im; sVel[k + 1] = sDir[k + 1] * im; sVel[k + 2] = sDir[k + 2] * im;
    }
    SH.mode = 1; SH.t = 0;
    announce(true);
    shards.visible = true;
    SU.uAlpha.value = 1;
    ribMat.opacity = 0;
    ribMeshes.forEach((m) => { m.visible = false; });
    streaks.forEach((s) => { s.head = -1; });
  }
  function simShards(dt, time) {
    SH.t += dt;
    let mode = SH.mode;
    if (mode === 1 && SH.t > BURST_S) { SH.mode = mode = 2; SH.t = 0; }
    if (mode === 2 && SH.t > LINGER_S) { SH.mode = mode = 3; SH.t = 0; }
    // Pointer ray in the ribbons' local space, so the grains can be stirred in 3D
    const useMouse = mouse.on && mode >= 1 && mode <= 3;
    if (useMouse) {
      pointerWorld(pv);
      inv.copy(ribbons.matrixWorld).invert();
      lo.copy(ray.ray.origin).applyMatrix4(inv);
      ld.copy(ray.ray.direction).transformDirection(inv).normalize();
    }
    const mSpd = Math.min(1.6, mouseSpeed * 0.06), damp = Math.pow(mode === 3 ? 0.83 : 0.93, dt * 60);
    let done = 0, stir = 0;
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
        const d = Math.sqrt(rx * rx + ry * ry + rz * rz);
        if (d < STIR_RADIUS && d > 0.0001) {
          stir++;
          let f = 1 - d / STIR_RADIUS;
          f = f * f * (4 + mSpd * 14) * (mode === 3 ? 0.4 : 1);
          rx /= d; ry /= d; rz /= d;
          ax += rx * f; ay += ry * f; az += rz * f;
          // swirl around the pointer ray
          ax += (ld.y * rz - ld.z * ry) * f * 0.9; ay += (ld.z * rx - ld.x * rz) * f * 0.9; az += (ld.x * ry - ld.y * rx) * f * 0.9;
        }
      }
      sVel[k] = (sVel[k] + ax * dt) * damp; sVel[k + 1] = (sVel[k + 1] + ay * dt) * damp; sVel[k + 2] = (sVel[k + 2] + az * dt) * damp;
      sPos[k] += sVel[k] * dt; sPos[k + 1] += sVel[k + 1] * dt; sPos[k + 2] += sVel[k + 2] * dt;
      if (mode === 3) {
        const ex = sBase[k] - sPos[k], ey = sBase[k + 1] - sPos[k + 1], ez = sBase[k + 2] - sPos[k + 2];
        if (ex * ex + ey * ey + ez * ez < 0.02) done++;
      }
    }
    sGeo.attributes.position.needsUpdate = true;
    // No sound while the pointer stirs the shards (the shatter itself still sounds)
    if (mode === 3 && (done > SN * 0.97 || SH.t > REFORM_MAX_S)) {
      SH.mode = 4; SH.t = 0;
      ribMeshes.forEach((m) => { m.visible = true; });
      RU.uHit.value.set(ribbons.position.x, ribbons.position.y, 0);
      RU.uHitT.value = 0;
      RU.uHitA.value = 0.5;
      streaks.forEach((_, j) => fireStreak(j, j * 80, 0.35));
      sound?.reform?.();
    }
    if (SH.mode === 4) {
      const f = clamp(SH.t / CROSSFADE_S, 0, 1), e = f * f * (3 - 2 * f);
      ribMat.opacity = e;
      SU.uAlpha.value = 1 - e;
      if (f >= 1) { SH.mode = 0; shards.visible = false; ribMat.opacity = 1; announce(false); }
    }
  }

  function tap() {
    if (pointerWorld(pv)) { RU.uHit.value.copy(pv); RU.uHitT.value = 0; RU.uHitA.value = 0.45; }
    let best = 0, bestDist = Infinity;
    for (let j = 0; j < streaks.length; j++) {
      const d = Math.abs(Math.hypot(pv.x - ribbons.position.x, pv.y - ribbons.position.y) / ribbons.scale.x - (RIBBON_RADIUS + j * RIBBON_STEP));
      if (d < bestDist) { bestDist = d; best = j; }
    }
    fireStreak(best, 0, 0.35);
  }
  function release(full) {
    if (!full) {
      if (pointerWorld(pv)) { RU.uHit.value.copy(pv); RU.uHitT.value = 0; RU.uHitA.value = 0.4 + charge.v * 0.6; }
      return null;
    }
    if (SH.mode !== 0) return null;
    startShatter();
    streaks.forEach((_, j) => fireStreak(j, j * 70, 0.5));
    return "shatter";
  }

  // Click and hold on the ribbons (fine pointers only, like the original)
  const charge = { v: 0 };
  let press = null, chargeTween = null, overOk = false, lastX = -1, lastY = -1;
  let played = !isHero || reduced;
  // The hero canvas is sticky, so its lower part can sit under the next
  // section. Interaction (hover, tap, hold, sound) counts wherever the hero
  // is still visible - even a thin strip at the top - but not below it.
  const heroSection = isHero ? host.closest("main, section") : null;
  const heroActive = (clientY = lastY) => !heroSection || clientY < heroSection.getBoundingClientRect().bottom;
  const checkTarget = (target) => {
    // In the hero, anything layered over the canvas (the tools strip, the
    // empty space under it) counts too, like Theremin; links, buttons and
    // text still keep their own behaviour via HOLD_EXCLUDE.
    const inside = !!target && (host.contains(target) || (!!heroSection && heroSection.contains(target)));
    overOk = finePointer && played && heroActive() && inside && !target.closest?.(HOLD_EXCLUDE);
  };

  // Pointer relative to the canvas, clamped to its edges (a pointer far
  // outside it must not tilt the model hard). Re-run on scroll too: the
  // canvas moves under a still pointer, and a stale position left the
  // ribbons tilted until the cursor moved again.
  const updatePointer = (clientX, clientY) => {
    const r = canvas.getBoundingClientRect();
    mouse.cx = clientX - r.left;
    mouse.cy = clientY - r.top;
    mouse.x = clamp((mouse.cx / r.width) * 2 - 1, -1, 1);
    mouse.y = clamp((mouse.cy / r.height) * 2 - 1, -1, 1);
    mouse.on = heroActive(clientY) && mouse.cx >= 0 && mouse.cy >= 0 && mouse.cx <= r.width && mouse.cy <= r.height;
  };
  const onPointerMove = (e) => {
    updatePointer(e.clientX, e.clientY);
    lastX = e.clientX; lastY = e.clientY;
    checkTarget(e.target);
  };
  const onPointerLeave = () => { mouse.on = false; };
  const onPointerDown = (e) => {
    if (!overOk || e.button !== 0) return;
    e.preventDefault(); // no text selection while holding
    chargeTween?.kill();
    charge.v = 0;
    const p = { t: performance.now(), sounding: false, ready: false, tw: null };
    press = p;
    p.tw = gsap.to(charge, {
      v: 1, duration: HOLD_DURATION, delay: HOLD_DELAY, ease: "power2.in",
      onStart: () => { p.sounding = true; sound?.holdStart?.(); },
      onUpdate: () => {
        if (!p.ready && charge.v >= FULL_CHARGE) { p.ready = true; sound?.ready?.(); }
      },
    });
  };
  // Shatter ripple: the ribbons vanish into shards on release, so the
  // surface ripple has nothing to ride on - draw the wave over the canvas.
  const shockwave = (clientX, clientY) => {
    if (reduced || clientX < 0) return;
    const r = host.getBoundingClientRect();
    const x = clientX - r.left, y = clientY - r.top;
    [0, 0.12, 0.26].forEach((delay, i) => {
      const ring = document.createElement("span");
      ring.setAttribute("aria-hidden", "true");
      Object.assign(ring.style, {
        position: "absolute", left: `${x}px`, top: `${y}px`, width: "40px", height: "40px",
        margin: "-20px 0 0 -20px", borderRadius: "50%", pointerEvents: "none", zIndex: "2",
        border: `${i === 0 ? 2 : 1}px solid ${i === 1 ? "rgba(255,255,255,.55)" : "rgba(255,107,0,.85)"}`,
        boxShadow: i === 0 ? "0 0 40px rgba(255,107,0,.45), inset 0 0 30px rgba(255,107,0,.25)" : "none",
        opacity: "0",
      });
      host.appendChild(ring);
      gsap.fromTo(ring, { scale: 0.2, opacity: 1 }, {
        scale: 26 + i * 6, opacity: 0, duration: 1.6 + i * 0.25, delay, ease: "expo.out",
        onComplete: () => ring.remove(),
      });
    });
  };
  const onPointerUp = () => {
    if (!press) return;
    const p = press;
    press = null;
    p.tw.kill();
    const quick = performance.now() - p.t < TAP_MS, full = charge.v > FULL_CHARGE;
    if (p.sounding) sound?.holdEnd?.(full);
    if (quick) {
      tap();
      sound?.tap?.();
    } else if (release(full) && full) {
      shockwave(lastX, lastY);
      sound?.release?.("shatter");
      later(() => onUnlock?.("shatter"), UNLOCK_DELAY_MS);
    }
    chargeTween = gsap.to(charge, { v: 0, duration: 1.4, ease: "expo.out" });
  };

  // Visibility: rendering (and mouse response) runs whenever any part of the
  // canvas is on screen, and stops only once it has fully left the viewport
  let raf = 0, inView = false;
  const clock = new THREE.Clock();
  const setRunning = () => {
    const run = inView;
    if (run && !raf) { clock.getDelta(); resetScrollState(); raf = requestAnimationFrame(frame); }
    else if (!run && raf) { cancelAnimationFrame(raf); raf = 0; }
  };
  const onScroll = () => {
    // Scrolled past the hero mid-hold: let go quietly, no shatter.
    if (press && !heroActive()) {
      const p = press;
      press = null;
      p.tw.kill();
      if (p.sounding) sound?.holdEnd?.(false);
      chargeTween = gsap.to(charge, { v: 0, duration: 1.4, ease: "expo.out" });
    }
    if (lastX >= 0) {
      updatePointer(lastX, lastY);
      checkTarget(document.elementFromPoint(lastX, lastY));
    }
  };
  const io = new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; setRunning(); });
  io.observe(canvas);

  const onResize = () => {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    const pr = Math.min(devicePixelRatio || 1, small ? 1.25 : 1.75);
    renderer.setPixelRatio(pr);
    SU.uPR.value = pr;
    renderer.setSize(w, h, false);
    // The footer canvas bleeds above the footer (so the rings aren't cut when the sheet above lifts away).
    // Frame the scene as if the canvas were only the footer's height, then reveal the extra strip on top.
    const bleed = isHero ? 0 : Math.max(0, h - host.clientHeight);
    camera.aspect = w / (h - bleed);
    camera.fov = camera.aspect < 0.8 ? 46 : 32;
    if (bleed) camera.setViewOffset(w, h - bleed, 0, -bleed, w, h);
    else camera.clearViewOffset();
    camera.updateProjectionMatrix();
  };
  const ro = new ResizeObserver(onResize);
  ro.observe(canvas);
  onResize();

  // Animation loop
  // No rise-in: the hero model already sits in its final place under the loader,
  // so when the loader clears it's simply there (HeroRibbons fades it in)
  const state = { introT: 0 };
  // Start in the pose for this screen shape, so nothing glides across on load
  const startNarrow = (canvas.clientWidth || innerWidth) / (canvas.clientHeight || innerHeight) < NARROW_ASPECT;
  const basePose = isHero ? (startNarrow ? POSE.ribbons_m : POSE.ribbons) : (startNarrow ? POSE.footer_m : POSE.footer);
  const cur = { rp: new THREE.Vector3().fromArray(basePose.rp), rr: new THREE.Vector3().fromArray(basePose.rr), rs: basePose.rs };
  // Footer only: the cluster's x offset, starting off to the right
  let footerSlide = FOOTER_SLIDE_FROM;
  let scrollV = 0, lastScroll = window.scrollY, scrollWave = 0, lastScrollStreak = 0, hoverAmp = 0, lastMx = -1, lastMy = -1, idleT = 3;
  // The loop pauses off-screen, so on resume the scroll it missed must not
  // land as one giant jump (that throws the layers apart and tilts them)
  function resetScrollState() {
    lastScroll = window.scrollY;
    scrollV = 0;
    scrollWave = 0;
    RU.uScrollV.value = 0;
  }

  function frame() {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), 0.05);
    const time = (uTime.value += dt);
    const narrow = camera.aspect < NARROW_ASPECT;
    const P = isHero ? (narrow ? POSE.ribbons_m : POSE.ribbons) : (narrow ? POSE.footer_m : POSE.footer);
    const k = 1 - Math.pow(0.12, dt);
    cur.rp.lerp(tmpV.fromArray(P.rp), k);
    cur.rr.lerp(tmpV.fromArray(P.rr), k);
    cur.rs = lerp(cur.rs, P.rs, k);
    const sy = window.scrollY;
    // Capped per frame, so a fast flick (or a dropped frame) can't spike it
    scrollV = lerp(scrollV, clamp(sy - lastScroll, -MAX_SCROLL_STEP, MAX_SCROLL_STEP), 0.08);
    lastScroll = sy;
    // Mouse tilt eases toward the pointer at the same pace on any refresh rate
    mouse.sx = damp(mouse.sx, mouse.x, MOUSE_TILT_EASE, dt);
    mouse.sy = damp(mouse.sy, mouse.y, MOUSE_TILT_EASE, dt);
    const ch = charge.v;

    ribbons.position.copy(cur.rp);
    ribbons.position.y -= state.introT * INTRO_DROP;
    ribbons.position.x += Math.sin(time * 40) * ch * ch * 0.04;
    ribbons.scale.setScalar(cur.rs * (1 - ch * 0.09));
    ribbons.rotation.set(
      // Scroll speed only nudges the tilt: capped, so a fast flick can't swing the model off its axis
      // The hero model stays put while scrolling: no scroll tilt there (footer keeps it)
      cur.rr.x + mouse.sy * 0.06 + (isHero ? 0 : clamp(scrollV, -MAX_TILT_SCROLL, MAX_TILT_SCROLL) * 0.0008),
      // Left-right turn with the pointer (a touch gentler in the footer)
      cur.rr.y + mouse.sx * (isHero ? 0.18 : 0.1),
      // The slow turn with page scroll belongs to the hero; at the footer (far
      // down the page) it would add a whole extra radian of twist
      cur.rr.z + Math.sin(time * 0.12) * 0.03 + ch * 0.12,
    );

    // Scroll: the hero unfurls and rises as it's left; the footer settles as it arrives
    scrollWave = lerp(scrollWave, clamp(scrollV / 26, -1.3, 1.3), 0.07);
    // The hero holds its pose while scrolling (only the scroll ripple reacts)
    if (!isHero) {
      // Slides in from the right as the footer arrives (and back out if it leaves)
      const footerTop = host.getBoundingClientRect().top;
      footerSlide = lerp(footerSlide, footerTop < window.innerHeight * 0.85 ? 0 : FOOTER_SLIDE_FROM, 1 - Math.pow(0.06, dt));
      ribbons.position.x += footerSlide;
      // Drifts left / right with the pointer
      ribbons.position.x += mouse.sx * 1.3;
      // Settles into its corner as the footer arrives (scaled to the small pose)
      const fr = clamp(host.getBoundingClientRect().top / window.innerHeight, -1, 1);
      ribbons.rotation.z += fr * 0.3;
      ribbons.position.y += fr * 0.8;
    }
    // Rings fan apart with scroll speed - not in the hero, where the model holds still
    subs.forEach((sb, j) => { sb.position.z = isHero ? 0 : (j - (subs.length - 1) / 2) * Math.abs(scrollWave) * 0.3; });
    RU.uScrollV.value = scrollWave;
    if (!reduced && Math.abs(scrollV) > 20 && time - lastScrollStreak > 0.3 && !SH.mode) {
      lastScrollStreak = time;
      fireStreak((Math.random() * streaks.length) | 0, 0, 0.45 + Math.min(0.5, Math.abs(scrollV) * 0.01));
    }
    // Camera pushes in with scroll speed (footer only) and with the hold charge
    camera.position.z = lerp(camera.position.z, CAMERA_Z - ch * 1.8 - (isHero ? 0 : Math.abs(scrollWave) * 0.6), 0.06);
    RU.uCharge.value = ch;

    if (SH.mode) { simShards(dt, time); sparkling = true; }
    else if (sparkling) { sparkling = false; sound?.sparkle?.(0, 0.5); }

    // Liquid trailing hover
    // Per-frame movement is capped and smoothed, so one quick flick can't spike the swell
    const moved = lastMx < 0 ? 0 : Math.min(MAX_POINTER_STEP, Math.hypot(mouse.cx - lastMx, mouse.cy - lastMy));
    lastMx = mouse.cx; lastMy = mouse.cy;
    mouseSpeed = damp(mouseSpeed, moved, 0.18, dt);
    if (moved > 2 && SH.mode === 2) SH.t = Math.min(SH.t, LINGER_S - 2.5); // keep lingering while stirred
    hoverAmp = damp(hoverAmp, mouse.on && played && !SH.mode ? 0.45 + Math.min(0.6, mouseSpeed * 0.03) + ch * 0.5 : 0, 0.05, dt);
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

    if (!reduced) {
      idleT -= dt;
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

    renderer.render(scene, camera);
  }

  addEventListener("pointermove", onPointerMove, { passive: true });
  addEventListener("pointerdown", onPointerDown);
  addEventListener("pointerup", onPointerUp);
  addEventListener("pointercancel", onPointerUp);
  addEventListener("scroll", onScroll, { passive: true });
  document.documentElement.addEventListener("pointerleave", onPointerLeave);
  onScroll();

  let introTween = null;
  return {
    play() {
      played = true;
      if (reduced || introTween || !isHero) return;
      introTween = gsap.to(state, { introT: 0, duration: INTRO_DURATION, ease: "expo.out" });
    },
    destroy() {
      cancelAnimationFrame(raf);
      raf = 0;
      io.disconnect();
      ro.disconnect();
      removeEventListener("pointermove", onPointerMove);
      removeEventListener("pointerdown", onPointerDown);
      removeEventListener("pointerup", onPointerUp);
      removeEventListener("pointercancel", onPointerUp);
      removeEventListener("scroll", onScroll);
      document.documentElement.removeEventListener("pointerleave", onPointerLeave);
      timers.forEach(clearTimeout);
      timers.clear();
      introTween?.kill();
      chargeTween?.kill();
      press?.tw.kill();
      if (press?.sounding) sound?.holdEnd?.(false);
      press = null;
      disposables.forEach((d) => d.dispose());
      envScene.traverse((o) => { o.geometry?.dispose(); o.material?.dispose(); });
      envTarget.dispose();
      pmrem.dispose();
      // No forceContextLoss(): a lost context stays lost on this canvas, so a
      // remount (React dev double-mount, HMR) would get a dead, white canvas.
      renderer.dispose();
    },
  };
}
