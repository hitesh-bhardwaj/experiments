"use client";

import { useEffect, useRef } from "react";

// Theremin-style cursor for the homepage: a ring with "Hold to explore", shown
// only over the hero / footer ribbons. Links, buttons and anything marked
// data-cursor-off show nothing extra. The native cursor always stays visible;
// the ring trails alongside it. Fine pointers only.

const CLICKABLE = "a[href],button,input,select,textarea,[role=button],[role=tab],[role=radio],label,summary";
const HOLD_ZONES = "#hero-v3,#footer";
const HOLD_SKIP = "a,button,input,textarea,select,label,[role=button],[role=tab],[role=radio],h1,h2,h3,p";
const LERP = 0.22;
// Text in the hold zones: hidden over it even when it ignores the pointer
// (the hero copy sits in a pointer-events: none layer over the canvas)
const TEXT_IN_ZONE = "h1,h2,h3,h4,p,li,blockquote,figcaption,[data-cursor-text]";

// Text boxes are measured once per scroll / resize, not on every pointer move:
// reading layout right after the cursor writes forced a reflow each move and
// made the WebGL scene stutter under the hero copy.
const textRects = new WeakMap();
function measureText(zone) {
    const rects = [...zone.querySelectorAll(TEXT_IN_ZONE)].map((el) => el.getBoundingClientRect()).filter((r) => r.width);
    textRects.set(zone, rects);
    return rects;
}
function overText(zone, x, y) {
    const rects = textRects.get(zone) ?? measureText(zone);
    return rects.some((r) => x >= r.left && x <= r.right && y >= r.top && y <= r.bottom);
}
function clearTextRects() {
    document.querySelectorAll(HOLD_ZONES).forEach((zone) => textRects.delete(zone));
}

export default function CursorV3() {
    const rootRef = useRef(null);
    const labelRef = useRef(null);
    const eyesRef = useRef(null);

    useEffect(() => {
        if (!matchMedia("(pointer: fine)").matches) return undefined;
        const root = rootRef.current, label = labelRef.current, eyes = eyesRef.current;
        const look = { x: 0, y: 0 };
        const pos = { x: -100, y: -100 }, cur = { x: -100, y: -100 };
        let mode = "off", holding = false, raf = 0, lastTarget = null;

        const setMode = (next, text = "") => {
            if (label.textContent !== text) label.textContent = text;
            if (next === mode) return;
            mode = next;
            root.dataset.mode = next;
        };

        const resolve = (target) => {
            // Clickables count as data-cursor-off: the native cursor is enough there
            if (!(target instanceof Element) || target.closest("[data-cursor-off]") || target.closest(CLICKABLE)) {
                delete root.dataset.charging;
                return setMode("off");
            }
            const zone = target.closest(HOLD_ZONES);
            if (zone && !target.closest(HOLD_SKIP) && !overText(zone, pos.x, pos.y)) {
                // Already in pieces: the particles follow the pointer, so invite that instead
                if (zone.querySelector("[data-ribbons-shattered]") || zone.hasAttribute("data-ribbons-shattered")) {
                    delete root.dataset.charging;
                    return setMode("hold", " ");
                }
                // Charging: the ring's primary stroke fills in step with the ribbons' hold
                if (holding) root.dataset.charging = ""; else delete root.dataset.charging;
                return setMode("hold", holding ? "" : "Hold to explore");
            }
            delete root.dataset.charging;
            return setMode("off");
        };

        const loop = () => {
            cur.x += (pos.x - cur.x) * LERP;
            cur.y += (pos.y - cur.y) * LERP;
            root.style.transform = `translate3d(${cur.x}px, ${cur.y}px, 0)`;
            // Eyes glance toward where the ring is heading, then settle
            const dx = pos.x - cur.x, dy = pos.y - cur.y;
            const d = Math.hypot(dx, dy) || 1, k = Math.min(1, d / 40) * 4;
            look.x += ((dx / d) * k - look.x) * 0.2;
            look.y += ((dy / d) * k - look.y) * 0.2;
            eyes.style.transform = `translate(${look.x.toFixed(2)}px, ${look.y.toFixed(2)}px)`;
            const moving = Math.abs(dx) + Math.abs(dy) > 0.1 || Math.abs(look.x) + Math.abs(look.y) > 0.05;
            raf = moving ? requestAnimationFrame(loop) : 0;
        };
        const kick = () => { if (!raf) raf = requestAnimationFrame(loop); };

        const onMove = (e) => {
            pos.x = e.clientX; pos.y = e.clientY;
            if (mode === "off" && cur.x === -100) { cur.x = pos.x; cur.y = pos.y; }
            lastTarget = e.target;
            resolve(e.target);
            kick();
        };
        const onDown = () => { holding = true; if (mode === "hold") resolve(lastTarget); root.dataset.pressed = ""; };
        const onUp = () => { holding = false; resolve(lastTarget); delete root.dataset.pressed; };
        // Content scrolls under a still pointer
        const onScroll = () => { clearTextRects(); if (pos.x > -100) { lastTarget = document.elementFromPoint(pos.x, pos.y); resolve(lastTarget); } };
        const onLeave = () => setMode("off");
        // Ribbons shattered / re-formed under a still pointer
        const onRibbons = () => { if (lastTarget) resolve(lastTarget); };

        addEventListener("pointermove", onMove, { passive: true });
        addEventListener("pointerdown", onDown);
        addEventListener("pointerup", onUp);
        addEventListener("scroll", onScroll, { passive: true });
        addEventListener("resize", clearTextRects);
        document.addEventListener("pointerleave", onLeave);
        addEventListener("hx-ribbons-state", onRibbons);
        return () => {
            removeEventListener("hx-ribbons-state", onRibbons);
            cancelAnimationFrame(raf);
            removeEventListener("pointermove", onMove);
            removeEventListener("pointerdown", onDown);
            removeEventListener("pointerup", onUp);
            removeEventListener("scroll", onScroll);
            removeEventListener("resize", clearTextRects);
            document.removeEventListener("pointerleave", onLeave);
        };
    }, []);

    return (
        <div ref={rootRef} data-mode="off" aria-hidden="true" className="hx-cursor">
            <span className="hx-cursor-ring">
                <svg className="hx-cursor-charge" viewBox="0 0 44 44">
                    <circle cx="22" cy="22" r="21" pathLength="100" />
                </svg>
                <span ref={eyesRef} className="hx-cursor-eyes">
                    <i />
                    <i />
                </span>
            </span>
            <span ref={labelRef} className="hx-cursor-label" />
        </div>
    );
}
