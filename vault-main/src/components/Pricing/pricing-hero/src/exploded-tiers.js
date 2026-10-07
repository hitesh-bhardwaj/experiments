/**
 * Pricing hero object: "Exploded tiers" (from Pricing — Hyperiux Vault (Exploded tiers)).
 *
 * Two glass stacks, one per plan (Pro, Pro+), built from real layers.
 *   · hover a stack   → it explodes into labelled floors with orange guide lines (soft notes, one per floor)
 *   · click           → lock it open (click again to close)
 *   · press and hold  → Pro+ absorbs Pro: Pro's real floors slide across into the Pro+ stack
 * The whole group tilts gently toward the mouse. No drag, no orbit.
 *
 * Self-contained three.js scene (own renderer / camera / lights / PMREM environment) rendered into a
 * transparent canvas, so the hero's own background shows through. Works on three r149 → r182+.
 *
 *   import * as THREE from 'three';
 *   const tiers = mountExplodedTiers(heroSection, { THREE, sound, yearly: true, currency: 'USD' });
 *   tiers.setBilling(false); tiers.setCurrency('INR'); tiers.destroy();
 *
 * `host` is the element that receives the pointer (the whole hero), the canvas is appended to
 * `canvasParent` (defaults to host) and should be absolutely positioned by CSS (.pt-canvas).
 */

export const PRICING = {
  USD: { symbol: '$', monthly: 20, yearly: 179 },
  INR: { symbol: '₹', monthly: 999, yearly: 8999 },
};

/* icon: grid · rows · tpl · coins · star ; ghost:true draws a dashed "not in this plan" floor.
   `pricing` on a plan overrides the shared PRICING table. */
export const DEFAULT_PLANS = [
  {
    id: 'pro', name: 'Pro',
    pricing: {
      USD: { symbol: '$', monthly: 10, yearly: 89 },
      INR: { symbol: '₹', monthly: 499, yearly: 4499 },
    },
    layers: [
      { title: 'Components', sub: 'Every component in the vault', icon: 'grid' },
      { title: 'Template credits', sub: '3 a year · selected catalogue', icon: 'coins' },
      { title: 'Page sections', sub: 'Pro+ only', ghost: true },
      { title: 'Full template catalogue', sub: 'Pro+ only', ghost: true },
    ],
  },
  {
    id: 'pro-plus', name: 'Pro+',
    layers: [
      { title: 'Components', sub: 'Every component in the vault', icon: 'grid' },
      { title: 'Page sections', sub: 'Full-page, ready to compose', icon: 'rows' },
      { title: 'Full template catalogue', sub: 'Every template, whole sites', icon: 'tpl' },
      { title: 'Template credits', sub: '5 a year · worth ~$200', icon: 'coins' },
      { title: 'Freebies & early drops', sub: 'On the house', icon: 'star' },
    ],
  },
];

export function priceLabel(plan, { yearly, currency, pricing = PRICING }) {
  if (plan.priceLabel) return plan.priceLabel({ yearly, currency });
  const table = plan.pricing || pricing;
  const p = table[currency] || table.USD;
  const n = (v) => v.toLocaleString(currency === 'INR' ? 'en-IN' : 'en-US');
  return yearly ? `${p.symbol}${n(p.yearly)} a year` : `${p.symbol}${n(p.monthly)}/mo`;
}

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;

// Canvas can't read CSS variables: resolve next/font's real Plex Mono family name
function codeFontForCanvas() {
  return (typeof document !== "undefined" ? `${getComputedStyle(document.body).getPropertyValue("--font-plex-mono").trim() || '"IBM Plex Mono"'}, ui-monospace, Menlo, monospace` : "ui-monospace, Menlo, monospace");
}

export function mountExplodedTiers(host, opts = {}) {
  const {
    THREE: T, sound = null, plans = DEFAULT_PLANS, pricing = PRICING,
    canvasParent = host, holdMs = 900, pose: poseOpt = null, poseNarrow: poseNarrowOpt = null,
    font = null, monoFont = codeFontForCanvas(),
  } = opts;
  let { yearly = true, currency = 'USD' } = opts;
  if (!T) throw new Error('mountExplodedTiers: pass { THREE }');

  const REV = parseInt(T.REVISION, 10) || 150;
  const LEGACY_LIGHTS = REV < 155; // r155 switched to physical light units
  const LK = LEGACY_LIGHTS ? 1 : Math.PI;

  /* ---------- renderer / scene / camera ---------- */
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  canvasParent.appendChild(canvas);
  let renderer;
  try { renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' }); } catch { canvas.remove(); return { setBilling() {}, setCurrency() {}, destroy() {} }; }
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;
  const srgbTex = (tex) => { tex.colorSpace = T.SRGBColorSpace; return tex; };
  const L = (h) => new T.Color(h);
  // r128 never colour-managed raw hex values, so the concept used them as linear
  const linearHex = (h) => new T.Color().setHex(h, T.LinearSRGBColorSpace);

  const scene = new T.Scene();
  const camera = new T.PerspectiveCamera(32, 1, 0.1, 200);
  camera.position.set(0, 0, 20);

  // soft studio environment: dark box with a white top strip and warm orange side panels
  const pm = new T.PMREMGenerator(renderer);
  const es = new T.Scene();
  es.add(new T.Mesh(new T.BoxGeometry(30, 16, 30), new T.MeshBasicMaterial({ color: linearHex(0x070707), side: T.BackSide })));
  const soft = (w, h, x, y, z, rx, ry, c) => { const m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ color: c, side: T.DoubleSide })); m.position.set(x, y, z); m.rotation.set(rx, ry, 0); es.add(m); };
  soft(14, 2, 0, 7.5, 0, Math.PI / 2, 0, new T.Color(1.3, 1.25, 1.2));
  soft(2.5, 10, -14, 1, -2, 0, Math.PI / 2, new T.Color(4.2, 0.62, 0));
  soft(2, 9, 14, 0, 4, 0, -Math.PI / 2, new T.Color(3.4, 0.5, 0));
  soft(18, 1.2, 0, -2, -14, 0, 0, new T.Color(1.3, 0.19, 0));
  const envRT = pm.fromScene(es, 0.03);
  scene.environment = envRT.texture;
  pm.dispose();

  scene.add(new T.HemisphereLight(linearHex(0x3a2a22), linearHex(0x050505), 0.4 * LK));
  const key = new T.DirectionalLight(linearHex(0xffe6d4), 0.9 * LK); key.position.set(-6, 10, 8); scene.add(key);
  const rim = new T.PointLight(L('#FF6B00'), LEGACY_LIGHTS ? 2.2 : 30, 40, LEGACY_LIGHTS ? 2 : 1.4); rim.position.set(8, -4, 6); scene.add(rim);

  const G = new T.Group();
  scene.add(G);

  /* ---------- floors ---------- */
  const LW = 3.6, LD = 2.05, LH = 0.08, LABEL_H = (3.1 * 0.94 * 180) / 640, LABEL_PX = Math.round(640 * (LW / 3.1)); 
  const faceFont = () => font || getComputedStyle(host).fontFamily || 'system-ui, sans-serif';

  function drawLayer(c, layer, plan) {
    const g = c.getContext('2d'), w = c.width, h = c.height, ghost = !!layer.ghost;
    g.clearRect(0, 0, w, h);
    g.strokeStyle = ghost ? 'rgba(244,244,244,.25)' : 'rgba(255,140,60,.75)'; g.lineWidth = 3;
    if (ghost) g.setLineDash([14, 10]);
    g.beginPath(); if (g.roundRect) g.roundRect(8, 8, w - 16, h - 16, 26); else g.rect(8, 8, w - 16, h - 16); g.stroke(); g.setLineDash([]);
    const ix = 40, iy = 48; g.fillStyle = ghost ? 'rgba(244,244,244,.25)' : '#FF6B00';
    const icon = ghost ? 'none' : layer.icon;
    if (icon === 'grid') { for (let r = 0; r < 3; r++) for (let q = 0; q < 3; q++) { g.globalAlpha = 0.35 + (r + q) * 0.1; g.fillRect(ix + q * 30, iy + r * 30, 22, 22); } g.globalAlpha = 1; }
    else if (icon === 'rows') { for (let r = 0; r < 3; r++) { g.globalAlpha = 0.9 - r * 0.2; g.fillRect(ix, iy + r * 30, 96, 20); } g.globalAlpha = 1; }
    else if (icon === 'tpl') { g.strokeStyle = '#FF6B00'; g.lineWidth = 4; g.strokeRect(ix, iy, 96, 78); g.fillRect(ix, iy, 96, 18); g.globalAlpha = 0.5; g.fillRect(ix + 10, iy + 30, 50, 10); g.fillRect(ix + 10, iy + 48, 76, 20); g.globalAlpha = 1; }
    else if (icon === 'coins') { for (let r = 0; r < 3; r++) { const gr = g.createRadialGradient(ix + 22 + r * 26 - 6, iy + 34, 2, ix + 22 + r * 26, iy + 40, 20); gr.addColorStop(0, '#FFD2B0'); gr.addColorStop(0.55, '#FF6B00'); gr.addColorStop(1, '#9a3800'); g.fillStyle = gr; g.beginPath(); g.arc(ix + 22 + r * 26, iy + 40, 20, 0, 7); g.fill(); } }
    else if (icon === 'star') { g.beginPath(); for (let r = 0; r < 10; r++) { const a = (r / 10) * Math.PI * 2 - Math.PI / 2, rr = r % 2 ? 16 : 40; g.lineTo(ix + 48 + Math.cos(a) * rr, iy + 40 + Math.sin(a) * rr); } g.closePath(); g.fill(); }
    else { g.strokeStyle = 'rgba(244,244,244,.3)'; g.lineWidth = 3; g.beginPath(); g.arc(ix + 40, iy + 40, 30, 0, 7); g.moveTo(ix + 18, iy + 62); g.lineTo(ix + 62, iy + 18); g.stroke(); }
    g.fillStyle = ghost ? 'rgba(244,244,244,.4)' : '#F4F4F4'; g.font = `400 40px ${faceFont()}`; g.fillText(layer.title, 190, 92);
    g.fillStyle = ghost ? 'rgba(244,244,244,.3)' : '#FFB27A'; g.font = `400 26px ${monoFont}`;
    g.fillText(typeof layer.sub === 'function' ? layer.sub({ yearly, currency, plan }) : layer.sub || '', 190, 140);
  }

  function paintTitle(s) {
    const c = s.userData.c, g = c.getContext('2d');
    g.clearRect(0, 0, 512, 160); g.textAlign = 'center';
    g.fillStyle = '#F4F4F4'; g.font = `400 72px ${faceFont()}`; g.fillText(s.userData.plan.name, 256, 72);
    g.fillStyle = '#FF8A3D'; g.font = `400 34px ${monoFont}`; g.fillText(priceLabel(s.userData.plan, { yearly, currency, pricing }), 256, 130);
    s.material.map.needsUpdate = true;
  }
  function titleSprite(plan) {
    const c = document.createElement('canvas'); c.width = 512; c.height = 160;
    const s = new T.Sprite(new T.SpriteMaterial({ map: srgbTex(new T.CanvasTexture(c)), transparent: true, depthTest: false, depthWrite: false }));
    s.scale.set(2.4, 0.75, 1); s.renderOrder = 20; s.userData = { c, plan }; paintTitle(s); return s;
  }

  const stacks = [], hitboxes = [], disposables = [];
  const n = plans.length, gapX = 4.8;
  plans.forEach((plan, si) => {
    const grp = new T.Group(); grp.position.x = (si - (n - 1) / 2) * gapX; G.add(grp);
    const S = { plan, g: grp, layers: [], ex: 0.06, title: titleSprite(plan), guides: null };
    grp.add(S.title);
    plan.layers.forEach((layer, j) => {
      const ghost = !!layer.ghost, lg = new T.Group(); grp.add(lg);
      const glass = new T.Mesh(new T.BoxGeometry(LW, LH, LD), new T.MeshPhysicalMaterial({ color: L(ghost ? '#101010' : '#1a0c05'), metalness: 0.15, roughness: 0.14, clearcoat: 1, clearcoatRoughness: 0.06, transparent: true, opacity: ghost ? 0.1 : 0.62, envMapIntensity: 0.9, depthWrite: false }));
      glass.renderOrder = j * 2; lg.add(glass);
      const edges = new T.LineSegments(new T.EdgesGeometry(glass.geometry), new T.LineBasicMaterial({ color: ghost ? 0x777777 : 0xFF7A20, transparent: true, opacity: ghost ? 0.3 : 0.85, depthWrite: false }));
      lg.add(edges);
      const c = document.createElement('canvas'); c.width = LABEL_PX; c.height = 180; drawLayer(c, layer, plan);
      const tex = srgbTex(new T.CanvasTexture(c)); tex.anisotropy = 4;
      const lab = new T.Mesh(new T.PlaneGeometry(LW * 0.94, LABEL_H), new T.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0 }));
      lab.rotation.x = -Math.PI / 2; lab.position.y = LH / 2 + 0.005; lab.renderOrder = j * 2 + 1; lg.add(lab);
      S.layers.push({ g: lg, glass, edges, lab, c, tex, layer, ghost, y: j * 0.12, x: 0 });
      disposables.push(glass.geometry, glass.material, edges.geometry, edges.material, lab.geometry, lab.material, tex);
    });
    const gg = new T.BufferGeometry(); gg.setAttribute('position', new T.BufferAttribute(new Float32Array(8 * 3), 3));
    S.guides = new T.LineSegments(gg, new T.LineBasicMaterial({ color: 0xFF8A3D, transparent: true, opacity: 0, depthWrite: false }));
    grp.add(S.guides);
    const hb = new T.Mesh(new T.BoxGeometry(LW + 0.3, 3.6, LD + 0.3), new T.MeshBasicMaterial({ visible: false }));
    hb.position.y = 1.5; hb.userData.si = si; grp.add(hb); hitboxes.push(hb);
    disposables.push(gg, S.guides.material, hb.geometry, hb.material, S.title.material, S.title.material.map);
    stacks.push(S);
  });

  // "Hold" target: the richest plan (last) absorbs the others. A floor lands on the matching title if the
  // target has one, otherwise it stacks on top.
  const target = stacks[stacks.length - 1];
  stacks.forEach((S) => {
    if (S === target) return;
    S.layers.forEach((l) => {
      const k = target.layers.findIndex((t) => t.layer.title === l.layer.title || (t.layer.icon && t.layer.icon === l.layer.icon && !t.ghost));
      l.mergeTo = k >= 0 ? k : target.layers.length;
    });
  });

  function relabel() {
    stacks.forEach((S) => {
      S.layers.forEach((l) => { drawLayer(l.c, l.layer, S.plan); l.tex.needsUpdate = true; });
      paintTitle(S.title);
    });
  }
  if (document.fonts?.ready) document.fonts.ready.then(() => { if (!dead) relabel(); });

  /* ---------- layout: pose per breakpoint ---------- */
  const POSE = poseOpt || { op: [1.9, 0.6, 0], or: [0.7, -0.08, 0], os: 1.25 };
  // Tablet and mobile (canvas up to 1025 wide): the stacks scale up and sit a little closer. Desktop is untouched.
  let small = false;
  const SMALL_NARROW = { scale: 1.35, gap: 0.85 }, SMALL_TABLET = { scale: 1.12, gap: 0.9 };
  const POSE_M = poseNarrowOpt || { op: [0, 2.9, -4], or: [0.7, -0.08, 0], os: 0.72 };
  let W = 1, H = 1;
  function resize() {
    const r = canvas.getBoundingClientRect();
    W = Math.max(1, r.width); H = Math.max(1, r.height); small = W <= 1025;
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
    renderer.setSize(W, H, false);
    camera.aspect = W / H; camera.fov = camera.aspect < 0.8 ? 46 : 32; camera.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(resize); ro.observe(canvas); resize();

  /* ---------- pointer: hover / click / hold ---------- */
  const mouse = { x: 0, y: 0, sx: 0, sy: 0, on: false };
  const ray = new T.Raycaster(), ndc = new T.Vector2();
  let hovered = -1, lastHover = -1, locked = stacks.map(() => false), absorb = 0, hold = 0, holding = false, holdStart = 0, holdFired = false, holdRelease = 0;
  const note = (i) => { try { sound?.note?.(i); } catch { /* optional */ } };
  const sfx = (name, ...a) => { try { sound?.[name]?.(...a); } catch { /* optional */ } };
  const onUI = (e) => !!e.target.closest?.('a,button,input,select,textarea,label');

  function chime(si) { stacks[si].layers.forEach((l, j) => setTimeout(() => { if (!l.ghost) note(j); }, j * 80)); }
  function onMove(e) {
    const r = canvas.getBoundingClientRect();
    mouse.x = ((e.clientX - r.left) / r.width) * 2 - 1; mouse.y = ((e.clientY - r.top) / r.height) * 2 - 1;
    mouse.on = e.clientY >= r.top && e.clientY <= r.bottom;
  }
  function onLeave() { mouse.on = false; }
  function onDown(e) {
    if (onUI(e) || e.button) return;
    onMove(e); // touch has no hover before the press
    if (mouse.on) { ndc.set(mouse.x, -mouse.y); ray.setFromCamera(ndc, camera); const hits = ray.intersectObjects(hitboxes, false); hovered = hits.length ? hits[0].object.userData.si : -1; }
    holding = true; holdStart = performance.now(); holdFired = false; sfx('holdStart');
  }
  function onUp(e) {
    if (!holding) return; holding = false;
    const held = performance.now() - holdStart;
    if (holdFired) { sfx('holdEnd', true); holdRelease = performance.now() + 1600; return; }
    sfx('holdEnd', held > 220);
    if (held < 320 && !onUI(e) && hovered >= 0) { locked[hovered] = !locked[hovered]; sfx('tap'); host.dispatchEvent(new CustomEvent('tiers:lock', { detail: { plan: stacks[hovered].plan.id, locked: locked[hovered] } })); }
  }
  host.addEventListener('pointermove', onMove, { passive: true });
  host.addEventListener('pointerleave', onLeave);
  host.addEventListener('pointerdown', onDown);
  addEventListener('pointerup', onUp);
  addEventListener('pointercancel', onUp);

  /* ---------- frame ---------- */
  let visible = true, raf = 0, dead = false, last = performance.now(), time = 0;
  const io = new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible && !raf) { last = performance.now(); raf = requestAnimationFrame(frame); } }, { rootMargin: '120px' });
  io.observe(canvas);
  const V = new T.Vector3();
  const cur = { op: new T.Vector3(...POSE.op), or: new T.Vector3(...POSE.or), os: POSE.os };

  function frame(now) {
    raf = 0; if (dead || !visible) return;
    raf = requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, 0.05); last = now; time += dt;

    const narrow = camera.aspect < 0.9, P = narrow ? POSE_M : POSE, k = 1 - Math.pow(0.12, dt);
    cur.op.lerp(V.fromArray(P.op), k); cur.or.lerp(V.fromArray(P.or), k); cur.os = lerp(cur.os, P.os, k);
    mouse.sx = lerp(mouse.sx, mouse.on ? mouse.x : 0, 0.04); mouse.sy = lerp(mouse.sy, mouse.on ? mouse.y : 0, 0.04);
    const sm = !small ? null : narrow ? SMALL_NARROW : SMALL_TABLET;
    stacks.forEach((S, si) => { S.g.position.x = (si - (n - 1) / 2) * gapX * (sm ? sm.gap : 1); });
    G.position.copy(cur.op); G.scale.setScalar(cur.os * (sm ? sm.scale : 1));
    G.rotation.set(cur.or.x + mouse.sy * 0.06, cur.or.y + mouse.sx * 0.1, cur.or.z);

    hovered = -1;
    if (mouse.on) { ndc.set(mouse.x, -mouse.y); ray.setFromCamera(ndc, camera); const hits = ray.intersectObjects(hitboxes, false); if (hits.length) hovered = hits[0].object.userData.si; }
    if (hovered !== lastHover) { if (hovered >= 0 && !locked[hovered]) chime(hovered); lastHover = hovered; }
    host.classList.toggle('pt-hover', hovered >= 0);

    // hold charge → absorb
    if (holding) {
      hold = clamp((performance.now() - holdStart) / holdMs, 0, 1);
      if (hold >= 1 && !holdFired) { holdFired = true; sfx('ready'); host.dispatchEvent(new CustomEvent('tiers:absorb')); }
    } else if (holdFired && performance.now() > holdRelease) { hold = Math.max(0, hold - dt * 0.6); if (hold === 0) { holdFired = false; sfx('reform'); } }
    else if (!holdFired) hold = Math.max(0, hold - dt * 3);
    absorb += (hold - absorb) * Math.min(1, dt * 3);

    stacks.forEach((S, si) => {
      const isTarget = S === target;
      let want = locked[si] || hovered === si ? 1 : mouse.on ? 0.12 : 0.06;
      if (isTarget) want = Math.max(want, absorb);
      S.ex += (want - S.ex) * Math.min(1, dt * 3.2);
      const sp = 0.12 + S.ex * 0.45; let top = 0;
      S.layers.forEach((l, j) => {
        let ty = j * sp + Math.sin(time * 1.2 + j) * 0.02 * S.ex, tx = 0;
        if (!isTarget && absorb > 0.01 && !l.ghost) {
          const sp2 = 0.12 + target.ex * 0.45;
          tx = lerp(0, target.g.position.x - S.g.position.x, absorb);
          ty = lerp(ty, l.mergeTo * sp2 + 0.06, absorb);
        }
        const kk = Math.min(1, dt * (4 - j * 0.35));
        l.y += (ty - l.y) * kk; l.x += (tx - l.x) * kk; l.g.position.set(l.x, l.y, 0);
        const fade = isTarget ? 1 : l.ghost ? 1 - absorb : 1 - absorb * 0.85;
        l.glass.material.opacity = (l.ghost ? 0.1 : 0.62) * fade;
        l.edges.material.opacity = (l.ghost ? 0.3 : 0.7 + (hovered === si ? 0.3 : 0)) * fade;
        l.lab.material.opacity = Math.min(1, S.ex * 1.6) * fade;
        top = Math.max(top, l.y);
      });
      S.title.position.set(0, top + 0.75, 0);
      S.title.material.opacity = isTarget ? 1 : 1 - absorb * 0.8;
      const Pp = S.guides.geometry.attributes.position.array, cx = LW / 2, cz = LD / 2;
      [[-cx, -cz], [cx, -cz], [-cx, cz], [cx, cz]].forEach((c2, i) => { Pp[i * 6] = c2[0]; Pp[i * 6 + 1] = 0; Pp[i * 6 + 2] = c2[1]; Pp[i * 6 + 3] = c2[0]; Pp[i * 6 + 4] = top; Pp[i * 6 + 5] = c2[1]; });
      S.guides.geometry.attributes.position.needsUpdate = true;
      S.guides.material.opacity = Math.max(0, S.ex - 0.15) * 0.45 * (isTarget ? 1 : 1 - absorb);
    });

    renderer.render(scene, camera);
  }
  raf = requestAnimationFrame(frame);

  return {
    canvas,
    setBilling(y) { yearly = !!y; relabel(); },
    setCurrency(c) { currency = c; relabel(); },
    lock(planId, v = true) { const i = stacks.findIndex((S) => S.plan.id === planId); if (i >= 0) locked[i] = v; },
    destroy() {
      dead = true; cancelAnimationFrame(raf); ro.disconnect(); io.disconnect();
      host.removeEventListener('pointermove', onMove); host.removeEventListener('pointerleave', onLeave); host.removeEventListener('pointerdown', onDown);
      removeEventListener('pointerup', onUp); removeEventListener('pointercancel', onUp);
      host.classList.remove('pt-hover');
      disposables.forEach((d) => d.dispose?.()); envRT.dispose(); renderer.dispose(); canvas.remove();
    },
  };
}

