"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import * as THREE from "three";
import gsap from "gsap";
import { motion } from "motion/react";
import { ArrowUpRight } from "lucide-react";
import { DISPLAY, LABEL, T13, T14 } from "../tokens";

/*
 * The template's homepage, exploded into its sections. Each section is a slab
 * showing that section's design, exported from Figma (see
 * scripts/build-exploded-manifest.mjs). Templates without exports fall back to
 * slices of one stitched capture of the live page
 * (scripts/capture-template-sections.mjs).
 *
 * Real pages are 10-17x taller than wide, so the whole page can't fit the
 * stage at a readable size. Instead the stage is sticky and scrolling walks
 * down the page: the section in focus sits at depth 0 and the rest fan out in
 * front of and behind it. Drag to turn, click a layer to bring it forward,
 * and the panel names whichever section is selected or in focus.
 *
 * `explode` (0 assembled · 1 fully exploded) is owned by the parent so its
 * slider can live in the toolbar; this component tweens it on load and reset.
 */

const PAGE_WIDTH = { desktop: 4.2, tablet: 3, phone: 1.6 }; // slab width, world units
const ROOT_SCALE = { desktop: 1, tablet: 1, phone: 1.25 };
const SCROLL_PER_SECTION = 30; // vh of page scroll per section
const REST = { x: -0.12, y: 0.55 }; // default turn
const pad2 = (n) => String(n).padStart(2, "0");
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

export default function TemplateExploded({
  device = "desktop",
  capture,
  sections = [],
  explode,
  onExplode,
  resetKey = 0,
  onOpenLive,
  onUnsupported,
  toolbar = null,
}) {
  const sectionRef = useRef(null);
  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const labelRefs = useRef([]);
  const sceneRef = useRef(null);
  const explodeRef = useRef(explode);
  const onExplodeRef = useRef(onExplode);
  const onUnsupportedRef = useRef(onUnsupported);
  const [panelIndex, setPanelIndex] = useState(0);
  const [selected, setSelected] = useState(-1);

  useEffect(() => {
    explodeRef.current = explode;
    onExplodeRef.current = onExplode;
    onUnsupportedRef.current = onUnsupported;
  });

  /* ---------- scene + loop (once) ---------- */
  useEffect(() => {
    const canvas = canvasRef.current;
    const stage = stageRef.current;
    const section = sectionRef.current;
    let R;
    try {
      R = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    } catch {
      onUnsupportedRef.current?.();
      return;
    }
    R.setClearColor(0x000000, 0);
    const S = new THREE.Scene();
    const cam = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
    cam.position.set(0, 0, 15);
    const root = new THREE.Group();
    const G = new THREE.Group();
    root.add(G);
    S.add(root);

    const state = {
      R, G, root, slabs: [], textures: new Map(), PH: 0,
      rot: { x: REST.x, y: REST.y, tx: REST.x, ty: REST.y },
      mouse: { x: 0, y: 0, on: false },
      drag: null, hover: -1, sel: -1, focus: null, panel: -1, visible: false,
    };
    sceneRef.current = state;

    const size = () => {
      const r = stage.getBoundingClientRect();
      R.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      R.setSize(r.width, r.height, false);
      cam.aspect = r.width / Math.max(1, r.height);
      cam.position.z = cam.aspect < 1 ? 20 : 15;
      cam.updateProjectionMatrix();
    };
    size();
    const ro = new ResizeObserver(size);
    ro.observe(stage);
    const io = new IntersectionObserver(([entry]) => {
      state.visible = entry.isIntersecting;
    });
    io.observe(section);

    /* drag to turn, click to select */
    const onDown = (e) => {
      if (e.target.closest("[data-exploded-ui]")) return;
      state.drag = { x: e.clientX, y: e.clientY, rx: state.rot.tx, ry: state.rot.ty, moved: false };
    };
    const onMove = (e) => {
      const r = canvas.getBoundingClientRect();
      state.mouse.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      state.mouse.y = ((e.clientY - r.top) / r.height) * 2 - 1;
      state.mouse.on = true;
      const d = state.drag;
      if (!d) return;
      const dx = e.clientX - d.x;
      const dy = e.clientY - d.y;
      if (Math.abs(dx) + Math.abs(dy) > 4) d.moved = true;
      state.rot.ty = clamp(d.ry + dx * 0.006, -1.1, 1.1);
      state.rot.tx = clamp(d.rx + dy * 0.004, -0.7, 0.5);
    };
    const onUp = () => {
      const d = state.drag;
      state.drag = null;
      if (d && !d.moved && state.hover >= 0) {
        state.sel = state.sel === state.hover ? -1 : state.hover;
        setSelected(state.sel);
      }
    };
    const onLeave = () => {
      state.mouse.on = false;
    };
    stage.addEventListener("pointerdown", onDown);
    stage.addEventListener("pointermove", onMove);
    stage.addEventListener("pointerleave", onLeave);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);

    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const V = new THREE.Vector3();
    let last = performance.now();
    let raf = 0;

    const tick = (now) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      if (!state.visible) return;
      const { slabs, rot, mouse } = state;
      const n = slabs.length;
      const e = clamp(explodeRef.current ?? 0.7, 0, 1);
      const st = stage.getBoundingClientRect();

      // turn
      const k = Math.min(1, dt * 5);
      rot.x += (rot.tx + (state.drag ? 0 : mouse.y * 0.05) - rot.x) * k;
      rot.y += (rot.ty + (state.drag ? 0 : mouse.x * 0.08) - rot.y) * k;
      root.rotation.set(rot.x, rot.y, 0);

      // scroll progress → the point of the page in focus (G-local y, exploded)
      const sec = section.getBoundingClientRect();
      const p = clamp(-sec.top / Math.max(1, sec.height - window.innerHeight), 0, 1);
      const spread = 1 + e * 0.18;
      const half = (state.PH / 2) * spread;
      const margin = Math.min(half, 2.6 / root.scale.x);
      const target = half - margin - p * 2 * (half - margin);
      state.focus = state.focus == null ? target : state.focus + (target - state.focus) * Math.min(1, dt * 6);
      G.position.y = -state.focus;

      // which section the focus sits in (fractional, for a smooth fan)
      let fi = 0;
      for (let i = 0; i < n; i++) {
        const top = (slabs[i].y0 + slabs[i].h / 2) * spread;
        const bottom = (slabs[i].y0 - slabs[i].h / 2) * spread;
        if (state.focus <= top && state.focus >= bottom) {
          fi = i + clamp((top - state.focus) / Math.max(0.001, top - bottom), 0, 1) - 0.5;
          break;
        }
        if (state.focus < bottom) fi = i + 0.5;
      }
      fi = clamp(fi, 0, Math.max(0, n - 1));

      // hover
      state.hover = -1;
      if (mouse.on && !state.drag && n) {
        ndc.set(mouse.x, -mouse.y);
        ray.setFromCamera(ndc, cam);
        const hits = ray.intersectObjects(slabs.map((s) => s.m));
        if (hits.length) state.hover = hits[0].object.userData.i;
      }
      stage.style.cursor = state.drag ? "grabbing" : state.hover >= 0 ? "pointer" : "grab";

      slabs.forEach((s, i) => {
        s.pop += ((i === state.sel ? 1 : 0) - s.pop) * Math.min(1, dt * 5);
        const y = s.y0 * spread;
        const z = e * (i - fi) * 0.62 + s.pop * 1.1;
        const x = e * (i - fi) * 0.06;
        s.m.position.set(x, y, z);
        s.edge.position.copy(s.m.position);
        const dim = state.sel >= 0 && i !== state.sel ? 0.35 : 1;
        s.m.material.opacity += (dim - s.m.material.opacity) * Math.min(1, dt * 6);
        s.edge.material.opacity = (i === state.hover || i === state.sel ? 0.9 : e * 0.25) * (dim > 0.5 ? 1 : 0.5);

        const label = labelRefs.current[i];
        if (label) {
          V.set(x + s.w / 2, y, z).applyMatrix4(G.matrixWorld).project(cam);
          const onScreen = Math.abs(V.y) < 0.92 && V.x < 0.98;
          label.style.transform = `translate(${((V.x + 1) / 2) * st.width + 8}px, ${((1 - V.y) / 2) * st.height - 12}px)`;
          label.style.opacity = onScreen ? Math.max(0, (e - 0.25) * 1.6) * dim : 0;
          label.dataset.on = i === state.sel ? "true" : "false";
        }
      });

      const panel = state.sel >= 0 ? state.sel : Math.round(fi);
      if (panel !== state.panel && n) {
        state.panel = panel;
        setPanelIndex(panel);
      }
      R.render(S, cam);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      stage.removeEventListener("pointerdown", onDown);
      stage.removeEventListener("pointermove", onMove);
      stage.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      disposeSlabs(state);
      state.textures.forEach((t) => t.dispose());
      R.dispose();
      sceneRef.current = null;
    };
  }, []);

  /* ---------- slabs: rebuilt when the device (capture) changes ---------- */
  useEffect(() => {
    const state = sceneRef.current;
    if (!state || !capture) return;
    disposeSlabs(state);

    const PW = PAGE_WIDTH[device] || PAGE_WIDTH.desktop;
    const scale = PW / capture.width;
    const PH = capture.height * scale;
    state.PH = PH;
    state.focus = null;
    state.sel = -1;
    state.panel = -1;

    // Textures are cached by src; slabs stay grey until theirs has loaded.
    if (!state.waiting) state.waiting = new Map(); // src -> materials to light up on load
    const { waiting } = state;
    const textureFor = (src) => {
      let tex = state.textures.get(src);
      if (!tex) {
        tex = new THREE.TextureLoader().load(src, () => {
          (waiting.get(src) || []).forEach((m) => {
            m.color.set(0xffffff);
            m.needsUpdate = true;
          });
          waiting.delete(src);
        });
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = state.R.capabilities.getMaxAnisotropy();
        state.textures.set(src, tex);
      }
      return tex;
    };

    state.slabs = sections.map((s, i) => {
      const h = s.h * scale;
      // A section with its own image (a Figma export) uses all of it; otherwise
      // the slab is a slice of the one stitched page capture.
      const src = s.src || capture.src;
      const tex = textureFor(src);
      const w = s.src && s.w ? s.w * scale : PW;
      const geo = new THREE.PlaneGeometry(w, h);
      if (!s.src) {
        const uv = geo.attributes.uv;
        const v0 = 1 - (s.y + s.h) / capture.height;
        const v1 = 1 - s.y / capture.height;
        for (let j = 0; j < uv.count; j++) uv.setY(j, uv.getY(j) > 0.5 ? v1 : v0);
        uv.needsUpdate = true;
      }
      const mat = new THREE.MeshBasicMaterial({
        map: tex,
        color: tex.image ? 0xffffff : 0x1c1c1c,
        transparent: true,
        toneMapped: false,
        side: THREE.DoubleSide,
      });
      if (!tex.image) waiting.set(src, [...(waiting.get(src) || []), mat]);
      const m = new THREE.Mesh(geo, mat);
      m.userData.i = i;
      const edgeGeo = new THREE.EdgesGeometry(geo);
      const edge = new THREE.LineSegments(edgeGeo, new THREE.LineBasicMaterial({ color: 0xff5f00, transparent: true, opacity: 0 }));
      state.G.add(m, edge);
      return { m, edge, edgeGeo, w, h, y0: PH / 2 - s.y * scale - h / 2, pop: 0 };
    });
    state.root.scale.setScalar(ROOT_SCALE[device] || 1);

    // fly the layers apart on every (re)build
    const proxy = { v: 0 };
    const tween = gsap.to(proxy, {
      v: 0.7,
      duration: 2.2,
      delay: 0.3,
      ease: "expo.inOut",
      onStart: () => onExplodeRef.current?.(0),
      onUpdate: () => onExplodeRef.current?.(proxy.v),
    });
    return () => tween.kill();
  }, [capture, sections, device]);

  /* ---------- reset view ---------- */
  useEffect(() => {
    const state = sceneRef.current;
    if (!state || !resetKey) return;
    state.rot.tx = REST.x;
    state.rot.ty = REST.y;
    state.sel = -1;
    const proxy = { v: explodeRef.current ?? 0.7 };
    const tween = gsap.to(proxy, { v: 0.7, duration: 1.2, ease: "expo.out", onUpdate: () => onExplodeRef.current?.(proxy.v) });
    return () => tween.kill();
  }, [resetKey]);

  // Selection lives in the scene's state (read every frame); this mirrors it for the panel.
  const select = (i) => {
    const state = sceneRef.current;
    if (state) state.sel = i;
    setSelected(i);
  };

  const n = sections.length;
  const current = sections[Math.min(panelIndex, n - 1)];

  return (
    <section
      ref={sectionRef}
      aria-label="Exploded template view"
      className="relative"
      style={{ height: `calc(${Math.max(1, n) * SCROLL_PER_SECTION}vh + 100vh)` }}
    >
      <div
        ref={stageRef}
        className="sticky top-0 h-svh touch-pan-y overflow-hidden bg-[radial-gradient(80%_70%_at_50%_40%,#1c1c1c,#0c0c0c)] select-none"
      >
        <canvas ref={canvasRef} aria-hidden="true" className="block size-full" />

        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          {sections.map((s, i) => (
            <div
              key={`${device}-${i}`}
              ref={(el) => {
                labelRefs.current[i] = el;
              }}
              className="group/xl absolute top-0 left-0 flex items-center gap-2.5 whitespace-nowrap opacity-0 transition-opacity duration-500"
            >
              <i className="block h-px w-10 bg-[#ff5f00]/60" />
              <span className={`${T13} bg-[rgba(16,16,16,.7)] px-2.25 py-1 text-[#e6e6e6] shadow-[inset_0_0_0_1px_rgba(244,244,244,.1)] group-data-[on=true]/xl:bg-[#ff5f00] group-data-[on=true]/xl:text-[#141414]`}>
                <b className="font-mono font-normal text-[#FFB27A] group-data-[on=true]/xl:text-[#141414]">{pad2(i + 1)}</b> {s.name}
              </span>
            </div>
          ))}
        </div>

        {current && (
          <aside
            data-exploded-ui
            aria-live="polite"
            className="absolute top-28 left-[3.4vw] grid w-[22vw] gap-2 bg-[rgba(16,16,16,.72)] p-4.5 shadow-[inset_0_0_0_1px_rgba(244,244,244,.1)] backdrop-blur-[16px] max-[1025px]:left-[5vw] max-[1025px]:w-[44vw] max-md:inset-x-4 max-md:top-24 max-md:w-auto"
          >
            <p className={`${LABEL} flex justify-between text-[#8a8a8a]`}>
              <span>{selected >= 0 ? "Selected section" : "In view"}</span>
              <span>
                {pad2(panelIndex + 1)} / {pad2(n)}
              </span>
            </p>
            <motion.div
              key={`${device}-${panelIndex}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="grid gap-2"
            >
              <h3 className={`${DISPLAY} text-[1.7vw] leading-[1.1] max-[1025px]:text-[3.4vw] max-md:text-[6vw]`}>{current.name}</h3>
              {current.note && <p className={`${T14} text-[#bdbdbd] max-md:line-clamp-2`}>{current.note}</p>}
              <div className="mt-1 flex flex-wrap gap-1.5">
                {/* Effects that aren't in the registry have no page to link to. */}
                {current.effect?.href ? (
                  <Link
                    href={current.effect.href}
                    className={`inline-flex h-7.5 items-center gap-1.5 bg-[#ff5f00]/14 px-3 ${T13} text-[#FFB27A] transition-colors duration-500 hover:bg-[#ff5f00]/25`}
                  >
                    Powered by {current.effect.title} →
                  </Link>
                ) : current.effect ? (
                  <span className={`inline-flex h-7.5 items-center px-3 ${T13} text-[#FFB27A]/80 bg-[#ff5f00]/8`}>
                    Built with {current.effect.title}
                  </span>
                ) : null}
                <button
                  type="button"
                  onClick={() => onOpenLive?.(panelIndex)}
                  className={`inline-flex h-7.5 cursor-pointer items-center gap-1.5 px-3 ${T13} text-[#cfcfcf] shadow-[inset_0_0_0_1px_rgba(244,244,244,.14)] transition-colors duration-500 hover:text-white`}
                >
                  See it live <ArrowUpRight className="size-3.5" aria-hidden="true" />
                </button>
                {selected >= 0 && (
                  <button
                    type="button"
                    onClick={() => select(-1)}
                    className={`inline-flex h-7.5 cursor-pointer items-center px-3 ${T13} text-[#8a8a8a] transition-colors duration-500 hover:text-white`}
                  >
                    Deselect
                  </button>
                )}
              </div>
            </motion.div>
          </aside>
        )}

        {toolbar && (
          <div data-exploded-ui className="absolute bottom-6 left-[3.4vw] right-[3.4vw] max-[1025px]:inset-x-[5vw] max-md:inset-x-4 max-md:bottom-4">
            {toolbar}
          </div>
        )}

        <p className={`${LABEL} pointer-events-none absolute top-28 right-[3.4vw] text-right text-white/45 max-[1025px]:hidden`}>
          Scroll to move down the page
          <br />
          Drag to turn · click a layer
        </p>
      </div>
    </section>
  );
}

function disposeSlabs(state) {
  state.slabs.forEach((s) => {
    state.G.remove(s.m, s.edge);
    s.m.geometry.dispose();
    s.m.material.dispose();
    s.edgeGeo.dispose();
    s.edge.material.dispose();
  });
  state.slabs = [];
}
