"use client";

/**
 * DemoHeader: the live-preview control bar for every demo page.
 *
 *   · a floating glass bar at the top: ← back to the effect page · Free/Pro badge · Desktop / Tablet / Phone
 *     · Replay · Reduced motion · Props · Shortcuts · Copy props
 *   · the bar tucks away after ~3s idle and a "Controls" tag drops in on a cord (sways); click it
 *     to bring the bar back
 *   · Props opens a draggable side panel with the registry's RemixerPanel
 *   · Tablet / Phone show the page in a real device-sized iframe (media queries fire), scaled to fit
 *   · Reduced motion makes matchMedia('(prefers-reduced-motion: reduce)') match, then replays
 *   · one floating tooltip (with the key hint) for every control, a toast, and a shortcuts sheet
 *
 * Styling is Tailwind; every animation is GSAP. Inside RegistryRemixerDemo it reads the
 * registry, props and replay from context, so a page only needs `<DemoHeader />`. Outside it,
 * pass `title` / `tier` / `onReplay` directly (Props and Copy are hidden without a registry).
 */

import { createContext, useContext, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import RemixerPanel from "@/components/remixer-panel/RemixerPanel";
import { MEDIA } from "@/lib/breakpoints";
import { ButtonChrome, buttonClassName } from "@/homepage/components/Button";
import { getEffectRouteSlug } from "@/lib/effect-slugs";
import { useInteraction } from "@/homepage/components/InteractionProvider";
import { DEVICES, EMBED_MESSAGE, prefersReducedMotion, readEmbed, simulateReducedMotion } from "./embed";

gsap.registerPlugin(useGSAP, ScrollTrigger);

/** RegistryRemixerDemo provides { registry, groups, values, hasProps, onChange, onCopyCode, onReset, onReplay, defaultOpenGroupId }. */
/** @type {import("react").Context<any>} */
const DemoHeaderContext = createContext(null);
export const DemoHeaderProvider = DemoHeaderContext.Provider;

const EASE = "expo.out"; // ≈ cubic-bezier(.16, 1, .3, 1)
const IDLE_MS = 3200;

/* ---------- class tokens ---------- */
const LABEL = "m-0 text-[11px] font-semibold uppercase tracking-[.14em]";
const CODE_FONT = "font-code";
const BTN =
  "inline-flex h-9.5 min-w-9.5 cursor-pointer items-center justify-center gap-2 px-2.5 text-[#cfcfcf] transition-colors duration-400 " +
  "hover:bg-[rgba(244,244,244,.08)] hover:text-white [&_svg]:size-4.25 " +
  "aria-checked:bg-primary aria-checked:text-black aria-checked:shadow-[inset_0_0_0_1px_rgba(255,107,0,.45)] " +
  "aria-pressed:bg-primary aria-pressed:text-black aria-pressed:shadow-[inset_0_0_0_1px_rgba(255,107,0,.45)] " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F4F4F4]";
const SEP = "mx-1 h-5.5 w-px bg-[rgba(244,244,244,.1)] max-md:hidden";

/* ---------- icons ---------- */
const ICONS = {
  back: <path d="M15 6l-6 6 6 6" />,
  full: (
    <>
      <rect x="3" y="4" width="18" height="12" rx="1.5" />
      <path d="M8 20h8M12 16v4" />
    </>
  ),
  tablet: (
    <>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M11 18h2" />
    </>
  ),
  phone: (
    <>
      <rect x="7" y="3" width="10" height="18" rx="2" />
      <path d="M11 18h2" />
    </>
  ),
  replay: (
    <>
      <path d="M4 12a8 8 0 1 0 2.4-5.7" />
      <path d="M4 4v4h4" />
    </>
  ),
  rm: <path d="M3 12h4l3-7 4 14 3-7h4" />,
  props: (
    <>
      <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
      <circle cx="16" cy="7" r="2" />
      <circle cx="10" cy="17" r="2" />
    </>
  ),
  keys: (
    <>
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <path d="M7 10h.01M11 10h.01M15 10h.01M8 14h8" />
    </>
  ),
};

function Icon({ name }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICONS[name]}
    </svg>
  );
}

const DEVICE_BUTTONS = [
  { id: "full", label: "Desktop, full width", tip: "Desktop", key: "1" },
  { id: "tablet", label: "Tablet", tip: "Tablet · 820 × 1180", key: "2" },
  { id: "phone", label: "Phone", tip: "Phone · 390 × 844", key: "3" },
];
const DEVICE_KEYS = { 1: "full", 2: "tablet", 3: "phone" };
// Device previews are desktop-only; the same range as Tailwind's `max-lg:`.
const isCompact = () => matchMedia(MEDIA.tablet).matches;

/* ---------- helpers ---------- */
const subscribeNever = () => () => {};
const isEmbedded = () => new URLSearchParams(location.search).get("embed") === "1";

function demoSlugFrom(pathname) {
  const path = pathname?.replace(/\/$/, "") || "";
  return path.startsWith("/demo/") ? path.slice(6).split("/")[0] : "";
}

const titleFromSlug = (slug) => slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) || "Effect";

// JSON-safe copy, so the values can cross postMessage into the device iframe.
function cloneable(values) {
  try {
    return JSON.parse(JSON.stringify(values ?? {}));
  } catch {
    return {};
  }
}

// The demo slug → /effects/<category>/<effect>.
function useEffectArticleHref(demoSlug, fallback = "/effects") {
  const [href, setHref] = useState(fallback);

  useEffect(() => {
    if (!demoSlug) return undefined;
    let active = true;
    fetch("/api/effects/search-index")
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data) => {
        const slug = getEffectRouteSlug(demoSlug);
        const effect = data.effects?.find((e) => e.effectSlug === slug || e.slug === slug || e.name === slug);
        if (active && effect?.categorySlug && effect?.effectSlug) {
          setHref(`/effects/${effect.categorySlug}/${effect.effectSlug}`);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [demoSlug]);

  return href;
}

/**
 * Renders nothing on the server and inside the device iframe (`?embed=1`), so the
 * header never previews itself. On the page it portals into <body>, so no wrapper's
 * transform or stacking context can trap its fixed layers.
 */
export default function DemoHeader(props) {
  const embedded = useSyncExternalStore(subscribeNever, isEmbedded, () => null);

  // Pages outside RegistryRemixerDemo still honour `?rm=1` inside the iframe.
  useEffect(() => {
    if (embedded) readEmbed();
  }, [embedded]);

  // Embedded (the effect page's preview iframe): links must not open inside the iframe,
  // or a demo's "Effects" / article links would load the whole site in there - and that
  // page's own preview again, nesting it. Our own pages outside this demo open in the
  // main window; other sites in a new tab. Window capture phase - ahead of document
  // listeners such as a demo's page-transition router, which would otherwise take the
  // click and navigate the iframe client-side - and stopImmediatePropagation, so
  // nothing else acts on it.
  useEffect(() => {
    if (!embedded) return undefined;
    const demoRoot = location.pathname.split("/").slice(0, 3).join("/"); // /demo/<slug>
    const onClick = (event) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey) return;
      const link = event.target.closest?.("a[href]");
      if (!link || link.target === "_blank" || link.hasAttribute("download")) return;
      const url = new URL(link.href, location.href);
      if (url.origin === location.origin && url.pathname.startsWith(demoRoot)) return; // within this demo
      if (url.origin === location.origin && url.pathname === location.pathname && url.hash) return; // in-page anchor
      event.preventDefault();
      event.stopImmediatePropagation();
      if (url.origin === location.origin) {
        url.searchParams.delete("embed");
        (window.top || window).location.assign(url.toString());
      } else {
        window.open(url.toString(), "_blank", "noopener,noreferrer");
      }
    };
    window.addEventListener("click", onClick, true);
    return () => window.removeEventListener("click", onClick, true);
  }, [embedded]);

  if (embedded !== false) return null;
  return createPortal(<PreviewBar {...props} />, document.body);
}

function PreviewBar({ title: titleProp, tier: tierProp, backHref: backHrefProp, onReplay: onReplayProp, shortcuts = [], idleMs = IDLE_MS, startOpen = false }) {
  const demo = useContext(DemoHeaderContext);
  const pathname = usePathname();
  const demoSlug = demoSlugFrom(pathname);
  const resolvedBackHref = useEffectArticleHref(demoSlug);
  const { sound } = useInteraction() ?? {};

  const registry = demo?.registry;
  const title = titleProp ?? registry?.title ?? titleFromSlug(demoSlug);
  const tier = (tierProp ?? registry?.tier) === "pro" ? "pro" : "free";
  const backHref = backHrefProp ?? resolvedBackHref;
  const groups = demo?.groups ?? [];
  const hasProps = !!demo?.hasProps && groups.length > 0;
  const onReplay = onReplayProp ?? demo?.onReplay;
  const onCopyCode = demo?.onCopyCode;

  const [dev, setDevState] = useState("full");
  const [rm, setRm] = useState(false);
  const [panelOpen, setPanelOpen] = useState(startOpen && hasProps);
  const [keysOpen, setKeysOpen] = useState(false);
  const [away, setAway] = useState(false);
  const [dims, setDims] = useState("");
  const [toast, setToast] = useState("");
  const [dragging, setDragging] = useState(false);
  const [copyHovered, setCopyHovered] = useState(false);

  // DOM
  const rootRef = useRef(null);
  const barRef = useRef(null);
  const pullRef = useRef(null);
  const hangRef = useRef(null);
  const panelRef = useRef(null);
  const keysRef = useRef(null);
  const stageRef = useRef(null);
  const frameRef = useRef(null);
  const iframeRef = useRef(null);
  const tipRef = useRef(null);
  const tipTextRef = useRef(null);
  const tipKeyRef = useRef(null);
  const toastRef = useRef(null);
  const replayIconRef = useRef(null);

  // State that timers and document listeners read
  const devRef = useRef("full");
  const prevDevRef = useRef("full");
  const rmRef = useRef(false);
  const panelOpenRef = useRef(panelOpen);
  const keysOpenRef = useRef(false);
  const awayRef = useRef(false);
  const frameReadyRef = useRef(false);
  const lastValuesRef = useRef(null);
  const dragRef = useRef(null);
  const tipCurRef = useRef(null);
  const hangTlRef = useRef(null);
  const timers = useRef({ idle: 0, toast: 0, tip: 0 });
  const api = useRef(null);

  const note = (i) => {
    try {
      sound?.note?.(i);
    } catch {
      /* sound is optional */
    }
  };

  /* ---------- toast ---------- */
  function showToast(message) {
    setToast(message);
    clearTimeout(timers.current.toast);
    gsap.to(toastRef.current, { yPercent: 0, duration: 1, ease: EASE, overwrite: true });
    timers.current.toast = setTimeout(() => {
      gsap.to(toastRef.current, { yPercent: 240, duration: 1, ease: EASE, overwrite: true });
    }, 3400);
  }

  /* ---------- devices: real-size iframe, scaled to fit ---------- */
  function fit(animate) {
    const d = DEVICES[devRef.current];
    const stage = stageRef.current;
    if (!d || !stage) return;
    const cs = getComputedStyle(stage);
    const aw = innerWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const ah = innerHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    const s = Math.min(1, aw / d[0], ah / d[1]);
    const size = { width: Math.round(d[0] * s), height: Math.round(d[1] * s) };
    if (animate) gsap.to(frameRef.current, { ...size, duration: 0.9, ease: EASE, overwrite: "auto" });
    else gsap.set(frameRef.current, size);
    gsap.set(iframeRef.current, { width: d[0], height: d[1], scale: s, transformOrigin: "0 0" });
    setDims(`${d[0]} × ${d[1]}${s < 1 ? ` · shown at ${Math.round(s * 100)}%` : ""}`);
  }

  function loadFrame() {
    frameReadyRef.current = false;
    iframeRef.current.src = `${location.pathname}?embed=1${rmRef.current ? "&rm=1" : ""}`;
  }

  function postValues() {
    const win = iframeRef.current?.contentWindow;
    if (devRef.current !== "full" && frameReadyRef.current && win && lastValuesRef.current) {
      win.postMessage({ type: EMBED_MESSAGE, values: lastValuesRef.current }, location.origin);
    }
  }

  function setDev(v) {
    if (!(v in DEVICES) || v === devRef.current) return;
    const wasFull = devRef.current === "full";
    devRef.current = v;
    setDevState(v);
    if (v !== "full" && (wasFull || !iframeRef.current.src)) loadFrame();
    note(v === "full" ? 4 : v === "tablet" ? 2 : 0);
  }

  /* ---------- replay / reduced motion ---------- */
  function replay() {
    if (!onReplay) return;
    onReplay();
    requestAnimationFrame(() => ScrollTrigger.refresh());
    if (devRef.current !== "full") loadFrame();
    gsap.fromTo(replayIconRef.current, { rotation: 0 }, { rotation: -360, duration: 0.7, ease: EASE, overwrite: true });
    note(1);
  }

  function setReducedMotion(v) {
    simulateReducedMotion(v);
    rmRef.current = v;
    setRm(v);
    showToast(v ? "Previewing reduced motion." : "Full motion restored.");
    replay();
  }

  /* ---------- props panel / shortcuts ---------- */
  function setPanel(v) {
    if (!hasProps) return;
    panelOpenRef.current = v;
    setPanelOpen(v);
  }

  function toggleKeys(v = !keysOpenRef.current) {
    keysOpenRef.current = v;
    setKeysOpen(v);
  }

  async function copy() {
    if (!onCopyCode) return;
    const text = onCopyCode();
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const t = document.createElement("textarea");
      t.value = text;
      document.body.appendChild(t);
      t.select();
      document.execCommand("copy");
      t.remove();
    }
    showToast(`Props copied. Paste them onto <${title.replace(/\s+/g, "")} /> in your project.`);
  }

  // Drag the panel by its header; it stays inside the viewport.
  function onPanelPointerDown(e) {
    if (e.button || e.target.closest("button")) return;
    const r = panelRef.current.getBoundingClientRect();
    dragRef.current = { dx: e.clientX - r.left, dy: e.clientY - r.top, id: e.pointerId };
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
    e.preventDefault();
  }
  function onPanelPointerMove(e) {
    const drag = dragRef.current;
    const panel = panelRef.current;
    if (!drag || e.pointerId !== drag.id) return;
    const x = Math.max(8, Math.min(innerWidth - panel.offsetWidth - 8, e.clientX - drag.dx));
    const y = Math.max(8, Math.min(innerHeight - 48, e.clientY - drag.dy));
    gsap.set(panel, { left: x, top: y, right: "auto" });
  }
  function endDrag() {
    dragRef.current = null;
    setDragging(false);
  }


  /* ---------- the bar tucks into a pull tag while you watch ---------- */
  function tuck() {
    hideTip();
    awayRef.current = true;
    setAway(true);
  }
  function scheduleIdle() {
    clearTimeout(timers.current.idle);
    timers.current.idle = setTimeout(() => {
      const bar = barRef.current;
      const busy = panelOpenRef.current || keysOpenRef.current || bar?.matches(":hover") || bar?.contains(document.activeElement);
      if (busy) api.current.scheduleIdle();
      else api.current.tuck();
    }, idleMs);
  }
  function wake() {
    if (awayRef.current) hideTip();
    awayRef.current = false;
    setAway(false);
    scheduleIdle();
  }
  function onPullClick() {
    wake();
    if (matchMedia("(pointer:fine)").matches) barRef.current?.querySelector("a, button")?.focus({ preventScroll: true });
    note(3);
  }

  function onKey(e) {
    if (e.target?.closest?.("input,textarea,select,[contenteditable='true']")) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key.toLowerCase();
    if (k === "r") replay();
    else if (k === "p") setPanel(!panelOpenRef.current);
    else if (k === "m") setReducedMotion(!rmRef.current);
    else if (k in DEVICE_KEYS && !isCompact()) setDev(DEVICE_KEYS[k]);
    else if (k === "?" || (k === "/" && e.shiftKey)) toggleKeys();
    else if (k === "escape") {
      if (keysOpenRef.current) toggleKeys(false);
      else if (panelOpenRef.current) setPanel(false);
      else if (devRef.current !== "full") setDev("full");
    }
  }

  /* ---------- tooltips: one floating element, hover + keyboard focus ---------- */
  function showTip(el) {
    const tip = tipRef.current;
    tipCurRef.current = el;
    tipTextRef.current.textContent = el.dataset.tip;
    tipKeyRef.current.textContent = el.dataset.key ?? "";
    tipKeyRef.current.hidden = !el.dataset.key;
    const r = el.getBoundingClientRect();
    const tw = tip.offsetWidth;
    const th = tip.offsetHeight;
    const x = Math.max(10, Math.min(innerWidth - tw - 10, r.left + r.width / 2 - tw / 2));
    let y = r.bottom + 10;
    if (y + th > innerHeight - 10) y = r.top - th - 10;
    gsap.set(tip, { left: x, top: y });
    gsap.to(tip, { autoAlpha: 1, y: 0, duration: 0.35, ease: EASE, overwrite: true });
  }
  function hideTip() {
    clearTimeout(timers.current.tip);
    tipCurRef.current = null;
    if (tipRef.current) gsap.to(tipRef.current, { autoAlpha: 0, y: -4, duration: 0.2, overwrite: true });
  }
  function onTipOver(e) {
    const el = e.target.closest?.("[data-tip]");
    if (el === tipCurRef.current) return;
    clearTimeout(timers.current.tip);
    if (!el) hideTip();
    else timers.current.tip = setTimeout(() => showTip(el), 140);
  }
  function onTipFocus(e) {
    const el = e.target.closest?.("[data-tip]");
    if (el && el.matches(":focus-visible")) showTip(el);
  }

  // Timers and document listeners always call the latest render's handlers.
  useEffect(() => {
    api.current = { tuck, scheduleIdle, onKey, fit, hideTip, setDev };
  });

  /* ---------- GSAP: initial states ---------- */
  useGSAP(
    () => {
      gsap.set(pullRef.current, { xPercent: -50, yPercent: -110, autoAlpha: 0 });
      gsap.set(keysRef.current, { xPercent: -50, autoAlpha: 0, transformOrigin: "50% 0" });
      gsap.set(tipRef.current, { autoAlpha: 0, y: -4 });
      gsap.set(toastRef.current, { yPercent: 240 });
      gsap.set(stageRef.current, { autoAlpha: 0 });
      gsap.set(frameRef.current, { scale: 0.96 });
    },
    { scope: rootRef },
  );

  // Bar ⇄ pull tag. The tag drops in on its cord, settles, then sways.
  useGSAP(
    () => {
      gsap.to(barRef.current, { yPercent: away ? -140 : 0, autoAlpha: away ? 0 : 1, duration: 0.8, ease: EASE, overwrite: true });
      hangTlRef.current?.kill();

      if (!away) {
        gsap.to(pullRef.current, {
          yPercent: -110,
          duration: 0.9,
          ease: "back.out(1.4)",
          overwrite: true,
          onComplete: () => gsap.set(pullRef.current, { autoAlpha: 0 }),
        });
        return;
      }

      gsap.to(pullRef.current, { yPercent: -10, autoAlpha: 1, duration: 0.9, ease: "back.out(1.4)", overwrite: true });
      gsap.set(hangRef.current, { rotation: 0 });
      if (prefersReducedMotion()) return;
      hangTlRef.current = gsap
        .timeline()
        .to(hangRef.current, {
          keyframes: {
            "0%": { rotation: 9 },
            "18%": { rotation: -6 },
            "36%": { rotation: 3.8 },
            "54%": { rotation: -2.2 },
            "72%": { rotation: 1.1 },
            "88%": { rotation: -0.5 },
            "100%": { rotation: 0 },
            easeEach: "power1.inOut",
          },
          duration: 2.2,
          ease: "none",
        })
        .to(hangRef.current, { rotation: -0.9, duration: 1.05, ease: "sine.inOut" })
        .to(hangRef.current, { rotation: 0.9, duration: 2.1, ease: "sine.inOut", repeat: -1, yoyo: true });
    },
    { dependencies: [away], scope: rootRef },
  );

  // Props panel slides in each time it opens.
  useGSAP(
    () => {
      if (!panelOpen || !panelRef.current) return;
      gsap.fromTo(
        panelRef.current,
        { autoAlpha: 0, x: 28, scale: 0.985 },
        { autoAlpha: 1, x: 0, scale: 1, duration: 1, ease: EASE, overwrite: true },
      );
    },
    { dependencies: [panelOpen], scope: rootRef },
  );

  // Shortcuts sheet pops in / out.
  useGSAP(
    () => {
      if (keysOpen) {
        gsap.fromTo(
          keysRef.current,
          { autoAlpha: 0, y: -10, scale: 0.94 },
          { autoAlpha: 1, y: 0, scale: 1, duration: 0.55, ease: EASE, overwrite: true },
        );
      } else {
        gsap.to(keysRef.current, { autoAlpha: 0, y: -6, scale: 0.96, duration: 0.26, ease: "power2.in", overwrite: true });
      }
    },
    { dependencies: [keysOpen], scope: rootRef },
  );

  // Device stage fades in, the frame settles and resizes to the device.
  useGSAP(
    () => {
      const isDev = dev !== "full";
      const wasFull = prevDevRef.current === "full";
      prevDevRef.current = dev;
      document.documentElement.toggleAttribute("data-pc-dev", isDev);
      gsap.to(stageRef.current, { autoAlpha: isDev ? 1 : 0, duration: 0.6, ease: EASE, overwrite: true });
      gsap.to(frameRef.current, { scale: isDev ? 1 : 0.96, duration: 0.9, ease: EASE });
      if (isDev) fit(!wasFull);
    },
    { dependencies: [dev], scope: rootRef },
  );

  /* ---------- listeners ---------- */
  useEffect(() => {
    const onKeyDown = (e) => api.current.onKey(e);
    const onResize = () => {
      if (isCompact()) api.current.setDev("full");
      else api.current.fit(false);
    };
    const onHide = () => api.current.hideTip();
    const t = timers.current;
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onHide);
    window.addEventListener("scroll", onHide, true);
    window.addEventListener("resize", onResize);
    api.current.scheduleIdle();
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onHide);
      window.removeEventListener("scroll", onHide, true);
      window.removeEventListener("resize", onResize);
      clearTimeout(t.idle);
      clearTimeout(t.toast);
      clearTimeout(t.tip);
      if (rmRef.current) simulateReducedMotion(false);
      document.documentElement.removeAttribute("data-pc-dev");
    };
  }, []);

  // Edited props follow into the device iframe.
  useEffect(() => {
    lastValuesRef.current = cloneable(demo?.values);
    postValues();
  }, [demo?.values]);

  return (
    <div
      ref={rootRef}
      data-demo-header=""
      className="font-avenir text-[#cfcfcf]"
      onPointerOver={onTipOver}
      onPointerLeave={hideTip}
      onFocus={onTipFocus}
      onBlur={hideTip}
    >
      {/* device stage */}
      <div
        ref={stageRef}
        aria-hidden={dev === "full"}
        className="invisible fixed inset-0 z-100 grid place-items-center bg-[#0c0c0c] px-6 pt-21 pb-14 opacity-0 max-lg:px-4 max-lg:pt-19 max-lg:pb-12 max-md:px-3 max-md:pt-17.5 max-md:pb-11"
      >
        <div
          ref={frameRef}
          className="relative overflow-hidden bg-[#111] shadow-[0_0_0_1px_rgba(244,244,244,.1),0_0_0_10px_#161616,0_0_0_11px_rgba(244,244,244,.08),0_60px_120px_-30px_#000]"
        >
          <iframe
            ref={iframeRef}
            title={`${title} device preview`}
            loading="eager"
            onLoad={() => {
              frameReadyRef.current = true;
              postValues();
            }}
            className="absolute top-0 left-0 border-0 bg-white"
          />
        </div>
        <p className={`${LABEL} absolute bottom-5 left-1/2 -translate-x-1/2 text-[#6a6a6a]`}>{dims}</p>
      </div>

      {/* bar */}
      <div className="pointer-events-none fixed inset-x-0 top-4 z-100 flex justify-center max-lg:top-3 max-md:top-2.5">
        <header
          ref={barRef}
          inert={away}
          aria-hidden={away || undefined}
          onPointerEnter={wake}
          onFocus={wake}
          className="pointer-events-auto flex items-center gap-1.5 whitespace-nowrap bg-[rgba(18,18,18,.78)] p-1.5 shadow-[inset_0_0_0_1px_rgba(244,244,244,.1),0_20px_60px_-20px_rgba(0,0,0,.7)] backdrop-blur-[18px] backdrop-saturate-[1.4]"
        >
          <Link href={backHref} aria-label={`Back to ${title}`} data-tip="Back to the effect page" className={BTN}>
            <Icon name="back" />
            <span className="text-[15px] -mt-0.75 text-[#f1f1f1] max-md:hidden">{title}</span>
          </Link>

          <span
            className={`mr-1.5 ml-0.5 inline-flex h-6 items-center px-2.25 text-[1vw] max-md:hidden ${
              tier === "pro" ? "bg-[#FF6B00] text-[#141414]" : "bg-[rgba(244,244,244,.9)] text-[#1D1D1D]"
            }`}
          >
            {tier === "pro" ? "Pro" : "Free"}
          </span>

          <span className={SEP} aria-hidden="true" />

          <div role="radiogroup" aria-label="Preview size" className="flex gap-1 max-lg:hidden">
            {DEVICE_BUTTONS.map((d) => (
              <button
                key={d.id}
                type="button"
                role="radio"
                aria-checked={dev === d.id}
                aria-label={d.label}
                data-tip={d.tip}
                data-key={d.key}
                onClick={() => setDev(d.id)}
                className={BTN}
              >
                <Icon name={d.id} />
              </button>
            ))}
          </div>

          <span className={`${SEP} max-lg:hidden`} aria-hidden="true" />

          {onReplay ? (
            <button type="button" aria-label="Replay the animation" data-tip="Replay the animation" data-key="R" onClick={replay} className={BTN}>
              <span ref={replayIconRef} className="inline-flex">
                <Icon name="replay" />
              </span>
            </button>
          ) : null}
          <button
            type="button"
            aria-pressed={rm}
            aria-label="Preview reduced motion"
            data-tip="Preview reduced motion"
            data-key="M"
            onClick={() => setReducedMotion(!rmRef.current)}
            className={BTN}
          >
            <Icon name="rm" />
          </button>
          {hasProps ? (
            <button
              type="button"
              aria-pressed={panelOpen}
              aria-label="Edit props"
              data-tip="Edit props"
              data-key="P"
              onClick={() => setPanel(!panelOpenRef.current)}
              className={BTN}
            >
              <Icon name="props" />
            </button>
          ) : null}
          <button
            type="button"
            aria-pressed={keysOpen}
            aria-label="Keyboard shortcuts"
            data-tip="Keyboard shortcuts"
            data-key="?"
            onClick={() => toggleKeys()}
            className={`${BTN} max-lg:hidden`}
          >
            <Icon name="keys" />
          </button>

          {/* {onCopyCode ? (
            <button
              type="button"
              aria-label="Copy your props as JSX"
              data-tip="Copies your edited props as JSX. Grab the component code from the effect page."
              data-sound-kind="primary"
              onClick={copy}
              onPointerEnter={() => setCopyHovered(true)}
              onPointerLeave={() => setCopyHovered(false)}
              className={buttonClassName({
                className:
                  "ml-1 h-9.5 py-0! text-sm! [--btn-pad:16px]! [--btn-gap:8px]! [--btn-square:6px]! [--btn-arrow:12px]! focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F4F4F4] max-md:hidden",
              })}
            >
              <ButtonChrome label="Copy props" hovered={copyHovered} />
            </button>
          ) : null} */}
        </header>
      </div>

      {/* pull tag: a real tag hanging on a cord */}
      <button
        ref={pullRef}
        type="button"
        inert={!away}
        aria-label="Show preview controls"
        data-tip="Show controls"
        onClick={onPullClick}
        onPointerEnter={() => hangTlRef.current?.pause()}
        onPointerLeave={() => hangTlRef.current?.resume()}
        onFocus={() => hangTlRef.current?.pause()}
        onBlur={() => hangTlRef.current?.resume()}
        className="group invisible fixed top-0 left-1/2 z-9020 cursor-pointer px-3 pb-2.5 opacity-0 [-webkit-tap-highlight-color:transparent] focus-visible:outline-none"
      >
        <span ref={hangRef} className="flex origin-top flex-col items-center">
          <span
            aria-hidden="true"
            className="relative z-2 -mb-2 block h-8 w-px bg-[linear-gradient(#5a5a5a,#6a6a6a)] transition-[height] duration-700 ease-[cubic-bezier(.34,1.56,.64,1)] group-hover:h-5.5 group-focus-visible:h-5.5"
          />
          <span className="relative flex items-center gap-2.25 pt-3.25 bg-black/60 border border-white/10 backdrop-blur-lg pr-3.5 pb-2.25 pl-3 shadow-[inset_0_1px_0_rgba(255,255,255,.07)">
            <span
              aria-hidden="true"
              className="absolute top-1 left-1/2 -ml-0.75 size-1.5 rounded-full bg-[#0d0d0d] shadow-[0_0_0_1px_#6a6a6a,inset_0_1px_1px_rgba(0,0,0,.8)]"
            />
            <svg viewBox="0 0 16 24" aria-hidden="true" className="h-4.25 w-2.75">
              <defs>
                <linearGradient id="demo-header-beam" gradientUnits="userSpaceOnUse" x1="0" y1="-6" x2="0" y2="22" spreadMethod="repeat">
                  <stop offset="0" stopColor="#FF6B00" stopOpacity=".2" />
                  <stop offset=".3" stopColor="#FF6B00" stopOpacity=".2" />
                  <stop offset=".58" stopColor="#FF6B00" stopOpacity="1" />
                  <stop offset=".86" stopColor="#FF6B00" stopOpacity=".2" />
                  <stop offset="1" stopColor="#FF6B00" stopOpacity=".2" />
                  <animateTransform attributeName="gradientTransform" type="translate" from="0 0" to="0 28" dur="1.6s" repeatCount="indefinite" />
                </linearGradient>
              </defs>
              <g fill="none" stroke="url(#demo-header-beam)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 3.5l5 5 5-5" />
                <path d="M3 9.5l5 5 5-5" />
                <path d="M3 15.5l5 5 5-5" />
              </g>
            </svg>
            <span className="text-[1vw] max-md:text-[3vw] max-lg:text-[1.5vw] leading-none text-white">Controls</span>
          </span>
        </span>
      </button>

      {/* props panel */}
      {hasProps ? (
        <aside
          ref={panelRef}
          aria-label="Props"
          hidden={!panelOpen}
          data-lenis-prevent
          data-lenis-prevent-wheel
          data-lenis-prevent-touch
          className="fixed top-19.5 right-10 z-9021 max-lg:top-17.5 max-lg:right-6 max-md:top-16 flex h-fit max-h-[calc(100vh-94px)] min-h-80 w-[20vw] max-lg:w-[min(344px,calc(100vw-32px))] flex-col overflow-hidden bg-[#111] shadow-[inset_0_0_0_1px_rgba(244,244,244,.08),0_30px_80px_-20px_#000]"
        >
          <div
            data-tip="Drag to move"
            onPointerDown={onPanelPointerDown}
            onPointerMove={onPanelPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            className={`flex touch-none items-center justify-between border-b border-[rgba(244,244,244,.08)] py-2 pr-2 pl-[0.9rem] select-none ${dragging ? "cursor-grabbing" : "cursor-grab"}`}
          >
            {/* Same heading as the effect page's Playground panel. */}
            <p className="text-[1.1vw] tracking-normal text-white max-lg:text-[1.6vw] max-md:text-[3.3vw]">Tune the real props</p>
            <button type="button" aria-label="Close props" onClick={() => setPanel(false)} className={BTN}>
              ✕
            </button>
          </div>
          {/* the app's RemixerPanel fills the body edge to edge */}
          <div className="min-h-0 flex-auto overflow-y-auto overscroll-contain scrollbar-none *:animate-none! *:bg-transparent! [&::-webkit-scrollbar]:hidden">
            {/* compact: the same tight panel as the effect page's Playground. */}
            <RemixerPanel
              compact
              isExpanded
              groups={groups}
              values={demo.values}
              onChange={demo.onChange}
              onCopyCode={onCopyCode}
              onReset={demo.onReset}
              defaultOpenGroupId={demo.defaultOpenGroupId}
            />
          </div>
        </aside>
      ) : null}

      {/* shortcuts */}
      <div
        ref={keysRef}
        inert={!keysOpen}
        className="invisible fixed top-19.5 left-1/2 z-9021 max-lg:top-17.5 max-md:top-16 grid min-w-70 gap-3 bg-[rgba(18,18,18,.9)] px-5 py-4.5 opacity-0 shadow-[inset_0_0_0_1px_rgba(244,244,244,.1)] backdrop-blur-[18px]"
      >
        <p className={`${LABEL} text-[#8a8a8a]`}>Shortcuts</p>
        <dl className="m-0 grid gap-2">
          {[
            onReplay && ["R", "Replay"],
            hasProps && ["P", "Props"],
            ["1 2 3", "Desktop · Tablet · Phone"],
            ["M", "Reduced motion"],
            ...shortcuts,
            ["Esc", "Close"],
          ]
            .filter(Boolean)
            .map(([k, v]) => (
              <div key={k} className="flex justify-between gap-6 text-sm text-[#cfcfcf]">
                <dt className={`${CODE_FONT} bg-[rgba(244,244,244,.08)] px-1.75 py-0.5 text-xs text-white`}>{k}</dt>
                <dd className="m-0">{v}</dd>
              </div>
            ))}
        </dl>
      </div>

      {/* reduced-motion note */}
      {rm ? (
        <p
          role="status"
          className={`fixed left-1/2 z-9018 m-0 flex -translate-x-1/2 items-center gap-2.5 bg-[#1D1D1D] px-4 py-2.5 text-sm font-medium text-[#F4F4F4] shadow-[0_0_0_1px_rgba(244,244,244,.14),0_16px_40px_-12px_rgba(0,0,0,.6)] ${
            dev === "full" ? "bottom-5" : "top-19.5"
          }`}
        >
          <i aria-hidden="true" className="size-2 rounded-full bg-[#FF6B00]" />
          Reduced motion on: effects skip their travel
        </p>
      ) : null}

      {/* tooltip */}
      <div
        ref={tipRef}
        role="tooltip"
        aria-hidden="true"
        className="pointer-events-none invisible fixed top-0 left-0 z-9040 flex max-w-70 items-center gap-2.5 bg-[#2B2B2B] px-3 py-1.5 text-xs leading-[1.4] font-medium text-white opacity-0 shadow-[0_10px_15px_-3px_rgba(0,0,0,.1),0_4px_6px_-4px_rgba(0,0,0,.1)]"
      >
        <span ref={tipTextRef} />
        <kbd
          ref={tipKeyRef}
          className={`${CODE_FONT} grid h-5.5 min-w-5.5 shrink-0 place-items-center bg-white/10 px-1.5 text-[11px] leading-none font-semibold text-white`}
        />
      </div>

      {/* toast */}
      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(24px+env(safe-area-inset-bottom,0))] z-9030 flex justify-center px-4">
        <div
          ref={toastRef}
          role="status"
          aria-live="polite"
          className="max-w-full bg-[#1f1f1f] px-4.5 py-3 text-sm text-[#F4F4F4] shadow-[inset_0_0_0_1px_rgba(244,244,244,.1),0_20px_40px_-12px_#000]"
        >
          {toast}
        </div>
      </div>
    </div>
  );
}
