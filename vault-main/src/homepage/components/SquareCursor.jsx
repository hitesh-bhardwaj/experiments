"use client";

import { useEffect, useRef } from "react";

// Action tag: the normal pointer stays; when the pointer is near an interactive effect (the
// hero/footer ribbons, the signal wave, the community particles, the pricing stacks), a small
// orange rectangle pops in at its top right: "Hold to explore" → "Holding" (charge fill) →
// "Release". Each effect marks its zone data-near while the pointer is close. Links, buttons
// and everything else show nothing.

const TEXT_FIELD = "input,textarea,select,[contenteditable=true]";
const HOLD_ZONES = "#hero-v3,#footer,[data-hold-zone]";
const HOLD_SKIP = "a,button,input,textarea,select,label,[role=button],[role=tab],[role=radio],h1,h2,h3,p";
const TEXT_IN_ZONE = "h1,h2,h3,h4,p,li,blockquote,figcaption,[data-cursor-text]";
const LERP = 0.35;
const RECT_H = 30; // px: the tag's height
const PAD_X = 12; // px: label padding inside the tag
const OFFSET_X = 14; // px: tag sits this far right of the pointer...
const OFFSET_Y = 8; // px: ...and this far above it

const textRects = new WeakMap();
const overText = (zone, x, y) => {
  let rects = textRects.get(zone);
  if (!rects) {
    rects = [...zone.querySelectorAll(TEXT_IN_ZONE)].map((el) => el.getBoundingClientRect()).filter((r) => r.width);
    textRects.set(zone, rects);
  }
  return rects.some((r) => x >= r.left && x <= r.right && y >= r.top && y <= r.bottom);
};
const clearTextRects = () => document.querySelectorAll(HOLD_ZONES).forEach((zone) => textRects.delete(zone));

export default function SquareCursor() {
  const rootRef = useRef(null);
  const boxRef = useRef(null);
  const labelRef = useRef(null);
  const measureRef = useRef(null);

  useEffect(() => {
    if (!matchMedia("(pointer: fine)").matches) return undefined;
    const root = rootRef.current, box = boxRef.current, label = labelRef.current, measure = measureRef.current;

    const pos = { x: -100, y: -100 }, cur = { x: -100, y: -100 };
    let state = "", holding = false, ready = false, raf = 0, lastTarget = null;

    // "dot": nothing to show · "label:<text>": the tag with that text · "native": text fields
    const show = (next, text = "") => {
      const key = `${next}:${text}`;
      if (key === state) return;
      state = key;
      root.dataset.mode = next;
      if (next === "label") {
        measure.textContent = text;
        label.textContent = text;
        box.style.width = `${measure.offsetWidth + PAD_X * 2}px`;
      }
    };

    const resolve = (target) => {
      if (!(target instanceof Element)) return show("dot");
      if (target.closest(TEXT_FIELD)) { delete root.dataset.charging; return show("native"); }
      const zone = target.closest(HOLD_ZONES);
      if (zone && !target.closest(HOLD_SKIP) && !overText(zone, pos.x, pos.y)) {
        // Already in pieces: the particles follow the pointer, so just the square
        if (zone.querySelector("[data-ribbons-shattered]") || zone.hasAttribute("data-ribbons-shattered")) {
          delete root.dataset.charging;
          return show("dot");
        }
        // Only near the effect itself (it marks its zone data-near; the pricing stacks use .pt-hover),
        // or while a hold is under way
        const near = zone.hasAttribute("data-near") || zone.classList.contains("pt-hover");
        if (!near && !holding && !ready) { delete root.dataset.charging; return show("dot"); }
        if (holding || ready) root.dataset.charging = ""; else delete root.dataset.charging;
        return show("label", ready ? "Release" : holding ? "Holding" : zone.dataset.cursorLabel || "Hold to explore");
      }
      delete root.dataset.charging;
      // Links and buttons keep just the normal pointer: the tag is only for the interactive scenes
      return show("dot");
    };

    const loop = () => {
      cur.x += (pos.x - cur.x) * LERP;
      cur.y += (pos.y - cur.y) * LERP;
      root.style.transform = `translate3d(${cur.x}px, ${cur.y}px, 0)`;
      raf = Math.abs(pos.x - cur.x) + Math.abs(pos.y - cur.y) > 0.1 ? requestAnimationFrame(loop) : 0;
    };
    const kick = () => { if (!raf) raf = requestAnimationFrame(loop); };

    const onMove = (e) => {
      pos.x = e.clientX; pos.y = e.clientY;
      if (cur.x === -100) { cur.x = pos.x; cur.y = pos.y; }
      root.dataset.visible = "";
      lastTarget = e.target;
      resolve(e.target);
      kick();
    };
    const onDown = () => { holding = true; ready = false; root.dataset.pressed = ""; if (lastTarget) resolve(lastTarget); };
    const onUp = () => { holding = false; ready = false; delete root.dataset.pressed; if (lastTarget) resolve(lastTarget); };
    const onScroll = () => { clearTextRects(); if (pos.x > -100) { lastTarget = document.elementFromPoint(pos.x, pos.y); resolve(lastTarget); } };
    const onLeave = () => { delete root.dataset.visible; };
    const onRibbons = () => { if (lastTarget) resolve(lastTarget); };
    // The hold owner (ribbons / signal wave) says it's fully charged, or the hold was cancelled
    const onReady = () => { ready = true; lastTarget = lastTarget || document.elementFromPoint(pos.x, pos.y); if (lastTarget) resolve(lastTarget); };
    const onCancel = () => { ready = false; if (lastTarget) resolve(lastTarget); };
    // An effect's "near" changed under a still pointer
    const onNear = () => { if (lastTarget) resolve(lastTarget); };

    show("dot");
    addEventListener("pointermove", onMove, { passive: true });
    addEventListener("pointerdown", onDown);
    addEventListener("pointerup", onUp);
    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("resize", clearTextRects);
    document.addEventListener("pointerleave", onLeave);
    addEventListener("hx-ribbons-state", onRibbons);
    addEventListener("hx-hold-ready", onReady);
    addEventListener("hx-hold-cancel", onCancel);
    addEventListener("hx-near", onNear);
    return () => {
      removeEventListener("hx-near", onNear);
      cancelAnimationFrame(raf);
      removeEventListener("pointermove", onMove);
      removeEventListener("pointerdown", onDown);
      removeEventListener("pointerup", onUp);
      removeEventListener("scroll", onScroll);
      removeEventListener("resize", clearTextRects);
      document.removeEventListener("pointerleave", onLeave);
      removeEventListener("hx-ribbons-state", onRibbons);
      removeEventListener("hx-hold-ready", onReady);
      removeEventListener("hx-hold-cancel", onCancel);
    };
  }, []);

  return (
    <div
      ref={rootRef}
      aria-hidden="true"
      data-mode="dot"
      className="group/cursor pointer-events-none fixed top-0 left-0 z-9500 opacity-0 transition-opacity duration-300 will-change-transform data-visible:opacity-100 data-[mode=native]:opacity-0"
    >
      {/* At the pointer's top right; pops in from its bottom-left corner, and its width eases
          between labels */}
      <span
        ref={boxRef}
        className="absolute bottom-0 left-0 flex origin-bottom-left scale-50 items-center justify-center overflow-hidden bg-primary text-background opacity-0 transition-[width,scale,opacity] duration-500 ease-[cubic-bezier(.16,1,.3,1)] group-data-[mode=label]/cursor:scale-100 group-data-[mode=label]/cursor:opacity-100 group-data-pressed/cursor:group-data-[mode=label]/cursor:scale-95"
        style={{ height: RECT_H, transform: `translate(${OFFSET_X}px, ${-OFFSET_Y}px)` }}
      >
        {/* Hold charge: fills left to right over the same 0.2s + 1.9s as the holds */}
        <span className="absolute inset-0 origin-left scale-x-0 bg-background/25 transition-transform duration-300 group-data-charging/cursor:scale-x-100 group-data-charging/cursor:delay-200 group-data-charging/cursor:duration-[1900ms] group-data-charging/cursor:ease-[cubic-bezier(.55,.085,.68,.53)]" />
        <span
          ref={labelRef}
          className="type-label relative whitespace-nowrap opacity-0 transition-opacity duration-200 group-data-[mode=label]/cursor:opacity-100 group-data-[mode=label]/cursor:delay-150"
        />
      </span>
      {/* Off-screen copy of the label, measured to size the rectangle */}
      <span ref={measureRef} className="type-label invisible absolute whitespace-nowrap" />
    </div>
  );
}
