"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import * as THREE from "three";
import gsap from "gsap";
import { useLenis } from "lenis/react";
import { motion } from "motion/react";
import Button from "@/homepage/components/Button";
import { DISPLAY, LABEL, PRICE, T16, T13, catalogueOf, priceOf } from "./tokens";

/*
 * "The corridor": every template hangs as a browser frame along a dark runway,
 * alternating left and right. Scrolling the (tall, sticky) section walks the
 * camera down it; hovering a frame turns it toward you and scrolls its
 * screenshot; clicking flies into it and opens the template. The HUD shows the
 * frame nearest the camera.
 *
 * Loaded with next/dynamic (ssr: false) so three.js only ships when the
 * corridor view is on. Calls onUnsupported if WebGL isn't available.
 */

const GAP = 7.2; // distance between frames along the corridor
const FW = 4.4; // frame width
const FH = 3.1; // frame height (about 16:11)
const BAR_H = 0.2; // browser bar height above the frame
const BG = 0x111111; // --background
const ORANGE = 0xff5f00; // --primary
const SCROLL_PER_FRAME = 25; // vh of page scroll per template

const pad2 = (n) => String(n).padStart(2, "0");
const clamp01 = (v) => Math.min(1, Math.max(0, v));

// The browser bar is drawn at the same proportions as the strip it sits on
// (FW x BAR_H), 32 units tall at 2x, so dots and text aren't stretched.
function chromeTexture(text) {
  const H = 32;
  const W = Math.round((H * FW) / BAR_H);
  const c = document.createElement("canvas");
  c.width = W * 2;
  c.height = H * 2;
  const g = c.getContext("2d");
  g.scale(2, 2);
  g.fillStyle = "#1d1d1d";
  g.fillRect(0, 0, W, H);
  ["#FF5F57", "#FEBC2E", "#28C840"].forEach((color, i) => {
    g.fillStyle = color;
    g.beginPath();
    g.arc(16 + i * 14, 16, 4.5, 0, Math.PI * 2);
    g.fill();
  });
  g.fillStyle = "#2c2c2c";
  g.beginPath();
  g.roundRect(W / 2 - 150, 7, 300, 18, 5);
  g.fill();
  g.fillStyle = "#9a9a9a";
  g.font = "500 11px ui-monospace, Menlo, monospace";
  g.textAlign = "center";
  g.fillText(text, W / 2, 20);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function glowTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d");
  const gr = g.createRadialGradient(64, 64, 10, 64, 64, 64);
  // The site's primary token as rgb, for the canvas glow
  const hex = (getComputedStyle(document.documentElement).getPropertyValue("--primary").trim() || "#ff5f00").replace("#", "");
  const [r, g2, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
  gr.addColorStop(0, `rgba(${r},${g2},${b},0.55)`);
  gr.addColorStop(1, `rgba(${r},${g2},${b},0)`);
  g.fillStyle = gr;
  g.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace; // otherwise #ff5f00 renders washed out toward yellow
  return tex;
}

export default function TemplateCorridor({ templates, onUnsupported }) {
  const sectionRef = useRef(null);
  const canvasRef = useRef(null);
  const labelRefs = useRef([]);
  const sceneRef = useRef(null);
  const templatesRef = useRef(templates);
  const router = useRouter();
  const routerRef = useRef(router);
  const onUnsupportedRef = useRef(onUnsupported);
  const lenis = useLenis();
  const lenisRef = useRef(lenis);
  const [active, setActive] = useState(0);

  useEffect(() => {
    templatesRef.current = templates;
    routerRef.current = router;
    onUnsupportedRef.current = onUnsupported;
    lenisRef.current = lenis;
  });

  /* ---------- scene: renderer, runway, dust, loop (once) ---------- */
  useEffect(() => {
    const canvas = canvasRef.current;
    const section = sectionRef.current;
    const stage = canvas.parentElement;
    let R;
    try {
      R = new THREE.WebGLRenderer({ canvas, antialias: true });
    } catch {
      onUnsupportedRef.current?.();
      return;
    }
    R.setClearColor(BG);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const S = new THREE.Scene();
    S.fog = new THREE.Fog(BG, 7, 34);
    const cam = new THREE.PerspectiveCamera(42, 1, 0.1, 120);
    cam.position.set(0, 0.35, 10);
    const owned = []; // geometries/materials/textures to dispose on unmount

    // runway: two orange guide lines over a floor grid
    [-1, 1].forEach((s) => {
      const geo = new THREE.PlaneGeometry(0.018, 260);
      const mat = new THREE.MeshBasicMaterial({ color: ORANGE, transparent: true, opacity: 0.5 });
      const line = new THREE.Mesh(geo, mat);
      line.rotation.x = -Math.PI / 2;
      line.position.set(s * 1.05, -2.05, -120);
      S.add(line);
      owned.push(geo, mat);
    });
    const grid = new THREE.GridHelper(260, 130, 0x2a2a2a, 0x1a1a1a);
    grid.position.set(0, -2.06, -120);
    S.add(grid);
    owned.push(grid.geometry, grid.material);

    // dust
    const dustCount = 700;
    const dustPos = new Float32Array(dustCount * 3);
    for (let i = 0; i < dustCount; i++) {
      dustPos[i * 3] = (Math.random() - 0.5) * 16;
      dustPos[i * 3 + 1] = Math.random() * 7 - 2;
      dustPos[i * 3 + 2] = -Math.random() * 130 + 8;
    }
    const dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
    const dustMat = new THREE.PointsMaterial({ color: 0xffb27a, size: 0.035, transparent: true, opacity: 0.55 });
    S.add(new THREE.Points(dustGeo, dustMat));
    owned.push(dustGeo, dustMat);

    const glowTex = glowTexture();
    const geos = {
      page: new THREE.PlaneGeometry(FW, FH),
      bar: new THREE.PlaneGeometry(FW, BAR_H),
      glow: new THREE.PlaneGeometry(FW * 1.9, FH * 1.9),
      refl: new THREE.PlaneGeometry(FW, FH * 0.6),
    };
    owned.push(glowTex, ...Object.values(geos));

    const state = {
      S, R, cam, geos, glowTex,
      frames: [],
      mouse: { x: 0, y: 0, on: false },
      hover: -1,
      active: -1,
      camZ: 10,
      flying: false,
      visible: false,
    };
    sceneRef.current = state;

    /* sizing */
    const size = () => {
      const r = stage.getBoundingClientRect();
      R.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
      R.setSize(r.width, r.height, false);
      cam.aspect = r.width / Math.max(1, r.height);
      cam.fov = cam.aspect < 1 ? 60 : 42;
      cam.updateProjectionMatrix();
    };
    size();
    const ro = new ResizeObserver(size);
    ro.observe(stage);

    // only render while the corridor is on screen
    const io = new IntersectionObserver(([entry]) => {
      state.visible = entry.isIntersecting;
    });
    io.observe(section);

    /* pointer */
    const onMove = (e) => {
      const r = canvas.getBoundingClientRect();
      state.mouse.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      state.mouse.y = ((e.clientY - r.top) / r.height) * 2 - 1;
      state.mouse.on = true;
    };
    const onLeave = () => {
      state.mouse.on = false;
    };
    const onClick = () => {
      if (state.hover < 0 || state.flying) return;
      const f = state.frames[state.hover];
      const t = templatesRef.current[state.hover];
      if (!f || !t) return;
      const href = t.href || `/templates/${t.slug}`;
      if (reduced) {
        routerRef.current.push(href);
        return;
      }
      state.flying = true;
      state.flyIndex = state.hover;
      lenisRef.current?.stop(); // no scrolling while the page changes
      const wp = new THREE.Vector3();
      f.g.getWorldPosition(wp);
      gsap.to(f.g.rotation, { y: 0, duration: 1 });
      // Fade the whole page (header included) to the background as the frame
      // comes forward; the detail page then fades in from it.
      const veil = document.createElement("div");
      Object.assign(veil.style, { position: "fixed", inset: "0", zIndex: "9999", background: "var(--background)", opacity: "0" });
      document.body.appendChild(veil);
      state.veil = veil;
      gsap.to(veil, { opacity: 1, duration: 0.75, ease: "power2.inOut" }); // done before the camera arrives
      gsap.to(cam.position, {
        x: wp.x,
        y: wp.y,
        z: wp.z + 2.6,
        duration: 1.1,
        ease: "power3.inOut",
        onComplete: () => routerRef.current.push(href),
      });
    };
    stage.addEventListener("pointermove", onMove);
    stage.addEventListener("pointerleave", onLeave);
    canvas.addEventListener("click", onClick);

    /* loop */
    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const V = new THREE.Vector3();
    let last = performance.now();
    let raf = 0;
    let lastHover = -1;

    const tick = (now) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      if (!state.visible) return;

      const n = state.frames.length;
      const sec = section.getBoundingClientRect();
      const st = stage.getBoundingClientRect();
      const p = clamp01(-sec.top / Math.max(1, sec.height - window.innerHeight));
      const { mouse } = state;

      if (!state.flying) {
        const targetZ = 10 - p * Math.max(0, n - 1) * GAP - p * 4;
        state.camZ += (targetZ - state.camZ) * Math.min(1, dt * 4);
        const near = Math.max(0, Math.min(n - 1, Math.round((7 - state.camZ) / GAP)));
        const side = near % 2 ? 1 : -1;
        cam.position.x += (side * 0.55 + mouse.x * 0.35 - cam.position.x) * Math.min(1, dt * 2);
        cam.position.y += (0.35 - mouse.y * 0.25 - cam.position.y) * Math.min(1, dt * 2);
        cam.position.z = state.camZ;
        cam.lookAt(cam.position.x * 0.4, 0.1, state.camZ - 9);
        if (n && near !== state.active) {
          state.active = near;
          setActive(near);
        }
      }

      state.hover = -1;
      if (mouse.on && !state.flying && n) {
        ndc.set(mouse.x, -mouse.y);
        ray.setFromCamera(ndc, cam);
        const hits = ray.intersectObjects(state.frames.map((f) => f.page));
        if (hits.length && hits[0].distance < 16) state.hover = hits[0].object.userData.i;
      }
      canvas.style.cursor = state.hover >= 0 ? "pointer" : "";
      if (state.hover !== lastHover) {
        lastHover = state.hover;
        const t = templatesRef.current[state.hover];
        if (t) routerRef.current.prefetch(t.href || `/templates/${t.slug}`);
      }

      state.frames.forEach((f, i) => {
        const on = i === state.hover;
        f.h += ((on ? 1 : 0) - f.h) * Math.min(1, dt * 4);
        // the frame being flown into is turned by gsap
        if (!(state.flying && i === state.flyIndex)) f.g.rotation.y = f.rot * (1 - f.h * 0.75);
        f.g.scale.setScalar(1 + f.h * 0.05);
        f.glow.material.opacity = f.h * 0.3 + (i === state.active ? 0.06 : 0);

        // hovering slowly scrolls the screenshot down the page
        if (f.tex) {
          f.s = on ? Math.min(1, f.s + dt * 0.09) : Math.max(0, f.s - dt * 0.6);
          const e = f.s < 0.5 ? 4 * f.s ** 3 : 1 - (-2 * f.s + 2) ** 3 / 2;
          f.tex.offset.y = (1 - f.rep) * (1 - e);
        }

        // floating label under the frame
        const label = labelRefs.current[i];
        if (label) {
          f.g.getWorldPosition(V);
          const dz = cam.position.z - V.z;
          V.y -= FH / 2 + 0.45;
          V.project(cam);
          const visible = dz > 3 && dz < 15 && Math.abs(V.x) < 1;
          label.style.opacity = visible ? Math.min(1, (dz - 3) / 2) * Math.min(1, (15 - dz) / 5) * 0.9 : 0;
          label.style.transform = `translate(${((V.x + 1) / 2) * st.width}px, ${((1 - V.y) / 2) * st.height}px) translate(-50%, 0)`;
        }
      });

      R.render(S, cam);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      stage.removeEventListener("pointermove", onMove);
      stage.removeEventListener("pointerleave", onLeave);
      canvas.removeEventListener("click", onClick);
      gsap.killTweensOf(cam.position);
      if (state.flying) lenisRef.current?.start();
      if (state.veil) {
        gsap.killTweensOf(state.veil);
        state.veil.remove();
      }
      disposeFrames(state);
      owned.forEach((o) => o.dispose());
      R.dispose();
      sceneRef.current = null;
    };
  }, []);

  /* ---------- frames: rebuilt whenever the filtered list changes ---------- */
  useEffect(() => {
    const state = sceneRef.current;
    if (!state) return;
    const { S, R, geos, glowTex } = state;
    disposeFrames(state);
    const loader = new THREE.TextureLoader();

    state.frames = templates.map((t, i) => {
      const side = i % 2 ? 1 : -1;
      const g = new THREE.Group();
      g.position.set(side * 2.9, 0.15, -i * GAP);
      const rot = -side * 0.42;
      g.rotation.y = rot;
      S.add(g);

      // grey until the screenshot loads
      const mat = new THREE.MeshBasicMaterial({ color: 0x1c1c1c, toneMapped: false });
      const page = new THREE.Mesh(geos.page, mat);
      page.userData.i = i;
      g.add(page);

      const barTex = chromeTexture(`vault.hyperiux.com${t.previewHref || ""}`);
      const barMat = new THREE.MeshBasicMaterial({ map: barTex });
      const bar = new THREE.Mesh(geos.bar, barMat);
      bar.position.y = FH / 2 + BAR_H / 2;
      g.add(bar);

      const glowMat = new THREE.MeshBasicMaterial({
        map: glowTex,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        fog: false,
      });
      const glow = new THREE.Mesh(geos.glow, glowMat);
      glow.position.z = -0.08;
      g.add(glow);

      // faint reflection on the floor
      const reflMat = new THREE.MeshBasicMaterial({ color: 0x1c1c1c, transparent: true, opacity: 0.08 });
      const refl = new THREE.Mesh(geos.refl, reflMat);
      refl.rotation.x = Math.PI;
      refl.position.y = -FH / 2 - 0.55;
      refl.scale.y = -1;
      g.add(refl);

      const f = { g, page, mat, barTex, barMat, glow, glowMat, reflMat, rot, tex: null, rep: 1, s: 0, h: 0, disposed: false };

      // the whole desktop design when there is one, so hovering scrolls the full page
      const shot = t.fullShot?.src || (Array.isArray(t.screenshots) ? t.screenshots[0] : null);
      if (shot) {
        loader.load(shot, (tex) => {
          if (f.disposed) {
            tex.dispose();
            return;
          }
          tex.colorSpace = THREE.SRGBColorSpace;
          tex.anisotropy = R.capabilities.getMaxAnisotropy();
          // show the top of the page at the frame's aspect; hover scrolls the rest into view
          const rep = Math.min(1, ((FH / FW) * tex.image.width) / tex.image.height);
          tex.repeat.set(1, rep);
          tex.offset.set(0, 1 - rep);
          f.tex = tex;
          f.rep = rep;
          [mat, reflMat].forEach((m) => {
            m.map = tex;
            m.color.set(0xffffff);
            m.needsUpdate = true;
          });
        });
      }
      return f;
    });

    state.active = -1;
  }, [templates]);

  const n = templates.length;
  const current = templates[Math.min(active, n - 1)];

  return (
    <section
      ref={sectionRef}
      aria-label="Template corridor"
      data-sound-flow="off"
      className="relative"
      style={{ height: `calc(${Math.max(1, n) * SCROLL_PER_FRAME}vh + 100vh)` }}
    >
      <div className="sticky top-0 h-svh overflow-hidden">
        <canvas ref={canvasRef} aria-hidden="true" className="block size-full" />
        {/* blends the corridor into the hero above it */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[22vh] bg-linear-to-b from-background to-transparent" />

        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          {templates.map((t, i) => (
            <div
              key={t.slug}
              ref={(el) => {
                labelRefs.current[i] = el;
              }}
              className={`absolute top-0 left-0 flex items-center gap-2.5 whitespace-nowrap text-foreground/90 opacity-0 transition-opacity duration-500 ${T16}`}
            >
              <b className="font-mono font-normal text-primary">{pad2(i + 1)}</b>
              {t.title}
            </div>
          ))}
        </div>

        {current && (
          <aside
            aria-live="polite"
            className="absolute right-[4.5vw] bottom-[10vh] flex w-[30vw] flex-col gap-2.5 bg-background/70 p-5.5 ring-1 ring-inset ring-foreground/10 shadow-[0_2.8vw_5.5vw_-2vw_black] backdrop-blur-lg max-lg:w-[50vw] max-md:inset-x-[6vw] max-md:bottom-16 max-md:w-auto"
          >
            <div className={`${LABEL} flex items-center gap-2.5 text-foreground/80`}>
              <span>{pad2(active + 1)}</span>
              <span className="h-0.5 flex-1 overflow-hidden bg-foreground/12">
                <i
                  className="block h-full origin-left bg-primary transition-transform duration-700 ease-[cubic-bezier(.16,1,.3,1)]"
                  style={{ transform: `scaleX(${(active + 1) / n})` }}
                />
              </span>
              <span>{pad2(n)}</span>
            </div>
            <p className={`${LABEL} text-primary`}>
              {current.category} · {catalogueOf(current) === "full" ? "Pro+ only" : "Selected catalogue"}
            </p>
            <motion.div
              key={current.slug}
              initial={{ opacity: 0, y: 0 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col gap-2.5"
            >
              <h2 className={`${DISPLAY} font-aeonik text-[2.2vw] leading-[1.1] max-lg:text-[4vw] max-md:text-[7vw]`}>{current.title}</h2>
              <p className={`line-clamp-3 ${T13} text-foreground/70`}>{current.tagline}</p>
              <div className="flex flex-wrap gap-1.25">
                {(current.tags || []).map((tag) => (
                  <span key={tag} className={`inline-flex h-5.5 items-center px-1.75 font-mono ${T13} text-foreground/70 ring-1 ring-inset ring-foreground/15`}>
                    {tag}
                  </span>
                ))}
              </div>
            </motion.div>
            {/* <div className="flex flex-wrap items-center gap-3.5 pt-1.5">
              <Button className="tracking-normal!" text="View template" href={current.href || `/templates/${current.slug}`} />
              {priceOf(current) != null && (
                <span className={`${LABEL} text-foreground/80`}><span className={PRICE}>${priceOf(current)}</span> · or 1 credit</span>
              )}
            </div> */}
          </aside>
        )}

        <p className={`${LABEL} pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-white/60 max-md:hidden`}>
          Scroll to walk the corridor · hover a frame · click to step inside
        </p>
      </div>
    </section>
  );
}

function disposeFrames(state) {
  state.frames.forEach((f) => {
    f.disposed = true;
    state.S.remove(f.g);
    f.tex?.dispose();
    [f.mat, f.barTex, f.barMat, f.glowMat, f.reflMat].forEach((o) => o.dispose());
  });
  state.frames = [];
}
