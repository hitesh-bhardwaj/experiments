"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import gsap from "gsap";
import { prefersReducedMotion } from "@/lib/motion";
import { MEDIA } from "@/lib/breakpoints";

// Ball cursor after cyanstudio.com: an 80px ball shown at half scale as a grey ring that
// trails the pointer. Links and buttons swell it into a faint grey disc, text fields hide it,
// hold zones open it into a blurred disc with a [ bracketed ] caption, and on a page change an
// arc spins around it until the next route renders.
const LINK_SELECTOR = "a, button, [role=button], [role=tab], [role=radio], label, select, input";
// Text entry only: the ball hides so the caret shows. Range sliders get the drag cursor below,
// and checkboxes, radios, selects and button inputs count as links.
const FIELD_SELECTOR =
  "input:not([type=range],[type=checkbox],[type=radio],[type=button],[type=submit],[type=reset],[type=color],[type=file]), textarea, [contenteditable=true]";
// Draggable rows (carousels) opt in with data-cursor-drag, and range sliders get it too: the ball opens to a thin ring with
// ‹ › chevrons sliding in at its sides. Buttons inside the row keep the link state.
const DRAG_SELECTOR = "[data-cursor-drag], input[type=range]";

// Cyan's greys only read on dark surfaces, so over a light one (the first opaque background
// under the pointer) the cursor switches to ink. Cached per element: backgrounds rarely change.
const tones = new WeakMap();
function surfaceTone(target) {
  for (let el = target; el && el !== document.documentElement; el = el.parentElement) {
    if (tones.has(el)) return tones.get(el);
    const [, , l, a = 1] = gsap.utils.splitColor(getComputedStyle(el).backgroundColor, true);
    if (a === 0) continue;
    const tone = l > 50 ? "light" : "dark";
    tones.set(el, tone);
    return tone;
  }
  return "dark";
}
// Cyan's chevron slide: 0.2s on easeOutCubic, from just outside the ring
const CHEVRON = { duration: 0.2, ease: "power2.out" };
const CHEVRON_OFFSET = 32;
const REST = { scale: 0.5 };
// The ring is an SVG stroke in the ball's 80px space: stroke widths render fractionally, so it
// thins smoothly (CSS borders snap to whole pixels). Its outer edge stays on the ball's edge.
const BALL = 80;
const RING_WIDTH = 4;
const ring = (width) => ({ attr: { "stroke-width": width, r: (BALL - width) / 2 } });
const FOLLOW_DURATION = 0.35;
const SPIN_DURATION = 800; // ms
// The ball settling into its state once the loader has gone, slower than a hover
const SETTLE = { duration: 0.8, ease: "power3.inOut" };
// Caption text rolls up to its next word (Click & Hold → Holding → Release)
const ROLL = { duration: 0.4, ease: "power3.inOut" };
// Stop spinning if a click never turns into a route change (cancelled navigation).
const LOADER_TIMEOUT = 8000;

// Press-and-hold scenes (hero / footer ribbons, signal wave, community particles, pricing
// stacks) mark their zone data-near while the pointer is close and announce the hold through
// hx-* window events. The hero takes a hold anywhere, so its caption stays up across it.
const HOLD_ZONES = "#hero-v3,#footer,[data-hold-zone]";
const ALWAYS_HOLD_ZONE = "#hero-v3";
const HOLD_SKIP = "a,button,input,textarea,select,label,[role=button],[role=tab],[role=radio],h1,h2,h3,p";
const TEXT_IN_ZONE = "h1,h2,h3,h4,p,li,blockquote,figcaption,[data-cursor-text]";
// Same 0.2s delay + 1.9s charge as the holds
const HOLD_DELAY = 0.2;
const HOLD_DURATION = 1.9;

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

function isPageNavigation(e) {
  const anchor = e.target.closest?.("a");
  const href = anchor?.getAttribute("href");
  if (!href || href.startsWith("#") || anchor.target === "_blank" || anchor.hasAttribute("download")) return false;
  if (anchor.hasAttribute("data-no-page-transition") || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return false;
  try {
    const url = new URL(href, window.location.href);
    return url.origin === window.location.origin && url.pathname !== window.location.pathname;
  } catch {
    return false;
  }
}

export default function SiteCursor() {
  const pathname = usePathname();
  const cursorRef = useRef(null);
  const ballRef = useRef(null);
  const ringRef = useRef(null);
  const discRef = useRef(null);
  const captionRef = useRef(null);
  // Two stacked lines: the shown word rolls up and out as the next rolls in from below
  const captionLinesRef = useRef([]);
  const frontLineRef = useRef(0);
  const chargeRef = useRef(null);
  const chevronsRef = useRef([]);
  const loaderRef = useRef(null);
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(false);

  const loadingRef = useRef(false);
  // Hover stays frozen from the loader's start until the ball has settled after it
  const blockedRef = useRef(false);
  const spinRef = useRef(null);
  const modeRef = useRef({ kind: "rest" });
  const holdRef = useRef({ holding: false, ready: false });
  const pointerRef = useRef(null);
  const targetRef = useRef(null);

  const holdLabel = useCallback((target) => {
    const p = pointerRef.current;
    const zone = target?.closest?.(HOLD_ZONES);
    if (!zone || !p || target.closest(HOLD_SKIP) || overText(zone, p.x, p.y)) return null;
    if (zone.querySelector("[data-ribbons-shattered]") || zone.hasAttribute("data-ribbons-shattered")) return null;
    const { holding, ready } = holdRef.current;
    const near = zone.matches(ALWAYS_HOLD_ZONE) || zone.hasAttribute("data-near") || zone.classList.contains("pt-hover");
    if (!near && !holding && !ready) return null;
    return ready ? "Release" : holding ? "Holding" : zone.dataset.cursorLabel || "Click & Hold";
  }, []);

  const show = useCallback((next, settle = false) => {
    const prev = modeRef.current;
    if (prev.kind === next.kind && prev.text === next.text) return;
    modeRef.current = next;

    const charging = next.kind === "caption" && (holdRef.current.holding || holdRef.current.ready);
    if (charging !== Boolean(prev.charging)) {
      gsap.to(chargeRef.current, charging
        ? { scale: 1, duration: HOLD_DURATION, delay: HOLD_DELAY, ease: "power2.in", overwrite: true }
        : { scale: 0, duration: 0.3, overwrite: true });
    }
    next.charging = charging;

    if (next.kind === "caption") {
      const lines = captionLinesRef.current;
      const out = lines[frontLineRef.current];
      if (prev.kind === "caption") {
        const incoming = lines[1 - frontLineRef.current];
        frontLineRef.current = 1 - frontLineRef.current;
        incoming.textContent = next.text;
        // Both lines sit centred in the box, which is as tall as the taller word, so roll by
        // the box's height: the incoming word starts fully below and lands where it will stay
        const h = incoming.parentElement.offsetHeight;
        gsap.fromTo(incoming, { y: h }, { y: 0, ...ROLL, overwrite: true });
        gsap.fromTo(out, { y: 0 }, { y: -h, ...ROLL, overwrite: true, onComplete: () => { out.textContent = ""; } });
        return;
      }
      gsap.killTweensOf(lines);
      gsap.set(lines, { y: 0 });
      lines.forEach((line) => { line.textContent = line === out ? next.text : ""; });
    }

    // overwrite: a quick move between states must not let an older, longer tween finish last
    const ball = ballRef.current;
    const t = (duration) => ({ duration, overwrite: true, ...(settle && SETTLE) });
    gsap.to(discRef.current, { opacity: next.kind === "link" ? 0.15 : 0, ...t(0.2) });
    gsap.to(captionRef.current, { opacity: next.kind === "caption" ? 1 : 0, ...t(0.3), ...(settle && { delay: 0.2 }) });
    gsap.to(ringRef.current, { ...ring(next.kind === "rest" ? RING_WIDTH : next.kind === "drag" ? 2 : 0), ...t(next.kind === "rest" ? 0.3 : 0.2) });
    const [left, right] = chevronsRef.current;
    if (next.kind === "drag") {
      gsap.fromTo(left, { x: -CHEVRON_OFFSET, opacity: 0 }, { x: 0, opacity: 1, ...CHEVRON, overwrite: true });
      gsap.fromTo(right, { x: CHEVRON_OFFSET, opacity: 0 }, { x: 0, opacity: 1, ...CHEVRON, overwrite: true });
    } else if (prev.kind === "drag") {
      gsap.to(left, { x: -CHEVRON_OFFSET, opacity: 0, ...CHEVRON, overwrite: true });
      gsap.to(right, { x: CHEVRON_OFFSET, opacity: 0, ...CHEVRON, overwrite: true });
    }
    if (next.kind === "drag") gsap.to(ball, { scale: 1, opacity: 1, ...t(0.2) });
    else if (next.kind === "link") gsap.to(ball, { scale: 1, opacity: 1, ...t(0.2) });
    else if (next.kind === "caption") gsap.to(ball, { scale: 1.4, opacity: 1, ...t(0.3) });
    else if (next.kind === "hidden") gsap.to(ball, { scale: 1, opacity: 0, ...t(0.2) });
    else gsap.to(ball, { ...REST, opacity: 1, ...t(0.3) });
  }, []);

  const sync = useCallback(
    (target, settle = false) => {
      targetRef.current = target;
      const tone = target ? surfaceTone(target) : "dark";
      if (cursorRef.current.dataset.tone !== tone) cursorRef.current.dataset.tone = tone;
      if (blockedRef.current) return;
      const text = target ? holdLabel(target) : null;
      if (text) return show({ kind: "caption", text }, settle);
      if (target?.closest?.(FIELD_SELECTOR)) return show({ kind: "hidden" }, settle);
      if (target?.closest?.(DRAG_SELECTOR) && !target.closest("button")) return show({ kind: "drag" }, settle);
      show({ kind: target?.closest?.(LINK_SELECTOR) ? "link" : "rest" }, settle);
    },
    [holdLabel, show],
  );

  useEffect(() => {
    const query = window.matchMedia(`(pointer: fine) and (not ${MEDIA.tablet})`);
    const update = () => setEnabled(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const cursor = cursorRef.current;
    if (!enabled || !cursor) return undefined;

    gsap.set(cursor, { xPercent: -50, yPercent: -50, autoAlpha: 0 });
    gsap.set(ballRef.current, REST);
    gsap.set([discRef.current, captionRef.current, loaderRef.current, ...chevronsRef.current], { opacity: 0 });
    gsap.set(chargeRef.current, { scale: 0 });

    const xTo = gsap.quickTo(cursor, "x", { duration: FOLLOW_DURATION, ease: "power1.out" });
    const yTo = gsap.quickTo(cursor, "y", { duration: FOLLOW_DURATION, ease: "power1.out" });
    // Hover is resolved once per frame from the latest pointer target, so captions also follow
    // data-near / text changes under a moving pointer, not just element changes.
    let dirty = false;
    const mark = () => { dirty = true; };

    const onMove = (e) => {
      if (!pointerRef.current) {
        gsap.set(cursor, { x: e.clientX, y: e.clientY });
        gsap.to(cursor, { autoAlpha: 1, duration: 0.2 });
      }
      pointerRef.current = { x: e.clientX, y: e.clientY };
      xTo(e.clientX);
      yTo(e.clientY);
      targetRef.current = e.target;
      dirty = true;
    };
    const onLeaveWindow = () => {
      sync(null);
      pointerRef.current = null;
      gsap.to(cursor, { autoAlpha: 0, duration: 0.2 });
    };
    const onDown = () => {
      holdRef.current = { holding: true, ready: false };
      dirty = true;
    };
    const onUp = () => {
      holdRef.current = { holding: false, ready: false };
      dirty = true;
    };
    const onReady = () => {
      holdRef.current.ready = true;
      dirty = true;
    };
    const onCancel = () => {
      holdRef.current.ready = false;
      dirty = true;
    };
    const onScroll = () => {
      clearTextRects();
      const p = pointerRef.current;
      if (p) targetRef.current = document.elementFromPoint(p.x, p.y);
      dirty = true;
    };
    const tick = () => {
      if (!dirty) return;
      dirty = false;
      sync(targetRef.current);
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", clearTextRects);
    window.addEventListener("hx-hold-ready", onReady);
    window.addEventListener("hx-hold-cancel", onCancel);
    window.addEventListener("hx-near", mark);
    window.addEventListener("hx-ribbons-state", mark);
    document.documentElement.addEventListener("mouseleave", onLeaveWindow);
    gsap.ticker.add(tick);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", clearTextRects);
      window.removeEventListener("hx-hold-ready", onReady);
      window.removeEventListener("hx-hold-cancel", onCancel);
      window.removeEventListener("hx-near", mark);
      window.removeEventListener("hx-ribbons-state", mark);
      document.documentElement.removeEventListener("mouseleave", onLeaveWindow);
      gsap.ticker.remove(tick);
      pointerRef.current = null;
      modeRef.current = { kind: "rest" };
    };
  }, [enabled, sync]);

  useEffect(() => {
    if (!enabled) return undefined;
    const onClick = (e) => {
      if (isPageNavigation(e)) setLoading(true);
    };
    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, [enabled]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(false);
    clearTextRects();
  }, [pathname]);

  useEffect(() => {
    if (!loading) return undefined;
    const timer = setTimeout(() => setLoading(false), LOADER_TIMEOUT);
    return () => clearTimeout(timer);
  }, [loading]);

  // The loader arc spins as a Web Animation, so the compositor keeps it smooth while the next
  // route renders on the main thread. Once the page is in, the current turn finishes first.
  useEffect(() => {
    const wasLoading = loadingRef.current;
    loadingRef.current = loading;
    if (!enabled) return undefined;
    const loader = loaderRef.current;

    if (loading) {
      blockedRef.current = true;
      show({ kind: "rest" });
      spinRef.current?.cancel();
      spinRef.current = null;
      gsap.to(loader, { opacity: 1, duration: 0.2, overwrite: true });
      if (prefersReducedMotion()) {
        gsap.to(loader, { opacity: 0.3, duration: 0.6, repeat: -1, yoyo: true, ease: "sine.inOut", delay: 0.2 });
      } else {
        spinRef.current = loader.animate(
          [
            { transform: "rotate(0deg)" },
            { transform: "rotate(350deg)", offset: 0.95 },
            { transform: "rotate(360deg)" },
          ],
          { duration: SPIN_DURATION, iterations: Infinity, easing: "ease-in-out" },
        );
      }
      return undefined;
    }

    if (!wasLoading) return undefined;
    let cancelled = false;
    const hide = () => {
      if (cancelled) return;
      gsap.to(loader, {
        opacity: 0,
        duration: 0.3,
        overwrite: true,
        onComplete: () => {
          if (cancelled) return;
          spinRef.current?.cancel();
          spinRef.current = null;
          blockedRef.current = false;
          const p = pointerRef.current;
          if (p) sync(document.elementFromPoint(p.x, p.y), true);
        },
      });
    };

    const spin = spinRef.current;
    if (spin) {
      const turns = Math.floor((spin.currentTime ?? 0) / SPIN_DURATION) + 1;
      spin.effect.updateTiming({ iterations: turns, fill: "forwards" });
      spin.finished.then(hide, () => {});
    } else {
      hide();
    }
    return () => {
      cancelled = true;
    };
  }, [loading, enabled, show, sync]);

  if (!enabled) return null;

  return (
    <div ref={cursorRef} aria-hidden="true" data-tone="dark" className="group/cursor pointer-events-none fixed top-0 left-0 z-100003 size-20">
      <div ref={ballRef} className="absolute inset-0 rounded-full">
        <svg viewBox={`0 0 ${BALL} ${BALL}`} className="absolute inset-0 size-full overflow-visible">
          <circle ref={ringRef} cx={BALL / 2} cy={BALL / 2} r={(BALL - RING_WIDTH) / 2} strokeWidth={RING_WIDTH} className="fill-none stroke-light-grey transition-colors duration-300 group-data-[tone=light]/cursor:stroke-black/40" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-between px-3 text-foreground transition-colors duration-300 group-data-[tone=light]/cursor:text-ink">
          {["M10 3 5 8l5 5", "M6 3l5 5-5 5"].map((d, i) => (
            <svg key={d} ref={(el) => { chevronsRef.current[i] = el; }} viewBox="0 0 16 16" className="size-4 fill-none stroke-current stroke-2">
              <path d={d} />
            </svg>
          ))}
        </div>
        <div ref={discRef} className="absolute inset-0 rounded-full bg-light-grey transition-colors duration-300 group-data-[tone=light]/cursor:bg-ink" />
        <div ref={captionRef} className="absolute inset-0 flex items-center justify-center overflow-hidden rounded-full bg-background/30 text-foreground backdrop-blur-lg">
          <div ref={chargeRef} className="absolute inset-0 rounded-full bg-primary" />
          {/* Brackets pinned to the sides so they hold still while the word between them rolls */}
          <p className="type-label relative flex w-4/5 items-center justify-between text-center text-[10px]">
            <span>[</span>
            <span className="grid flex-1 overflow-hidden">
              {[0, 1].map((i) => (
                <span key={i} ref={(el) => { captionLinesRef.current[i] = el; }} className="col-start-1 row-start-1 self-center" />
              ))}
            </span>
            <span>]</span>
          </p>
        </div>
        <div ref={loaderRef} className="absolute -top-2.5 -left-2.5 size-25 rounded-full border-4 border-transparent border-b-light-grey transition-colors duration-300 group-data-[tone=light]/cursor:border-b-black/40" />
      </div>
    </div>
  );
}
