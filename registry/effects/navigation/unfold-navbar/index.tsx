// Built using Hyperiux Vault: https://vault.hyperiux.com
"use client";

import { useRef, useState, useSyncExternalStore, type ComponentPropsWithoutRef } from "react";
import Link from "next/link";
import Image from "next/image";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { CustomEase } from "gsap/CustomEase";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeToReducedMotion(callback: () => void) {
  const media = window.matchMedia(REDUCED_MOTION_QUERY);
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}

function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribeToReducedMotion,
    () => window.matchMedia(REDUCED_MOTION_QUERY).matches,
    () => false,
  );
}

gsap.registerPlugin(useGSAP, CustomEase);

if (!CustomEase.get("unfoldOut")) {
  CustomEase.create("unfoldOut", "M0,0 C0.3,0.9 0.1,1 1,1");
  CustomEase.create("unfoldInOut", "M0,0 C0.7,0 0.16,1 1,1");
}

const EASE_OUT = "unfoldOut";
const EASE_IN_OUT = "unfoldInOut";

const GROW_H = 0.58;
const GROW_W = 0.5;
const WIDEN_AT = GROW_H * 0.75;

const RM_GROW_H = 0.34;
const RM_GROW_W = 0.1;
const RM_WIDEN_AT = RM_GROW_H * 0.75;

const RM_SCALE = RM_GROW_H / GROW_H;

const CLOSE_CONTENT = 0.145;
const CLOSE_NARROW_AT = 0.058;
const CLOSE_NARROW = 0.36;
const CLOSE_DROP_AT = 0.378;
const CLOSE_DROP = 0.31;

const CONTENT_X = -16;

const TICK_REST = 5;
const TICK_SPREAD = 6.5;

const IMG_SCALE = 1.08;

const VIEWPORT_CAP = 0.96;

type LinkHoverProps = Omit<ComponentPropsWithoutRef<typeof Link>, 'children'> & {
  children: string
  staggerStep?: number
  showLine?: boolean
  arrow?: boolean
  reduced?: boolean
}

export function LinkHover({
  children,
  className = '',
  staggerStep = 0.015,
  showLine = false,
  arrow = false,
  reduced = false,
  ...props
}: LinkHoverProps) {

  if (reduced) {
    return (
      <Link {...props} className={`inline-flex items-center gap-[0.35em] no-underline ${className}`}>
        <span className="leading-[1.2]">{children}</span>
        {arrow && (
          <svg viewBox="0 0 14 14" fill="none" aria-hidden="true" className="h-[0.8em] w-[0.8em] flex-none">
            <path
              d="M3 11L11 3M11 3H5M11 3V9"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </Link>
    )
  }

  return (
    <Link
      {...props}
      className={`group/link-hover inline-flex items-center gap-[0.35em] no-underline ${className}`}
    >
      <span className="sr-only">{children}</span>
      <span aria-hidden="true" className="relative inline-block overflow-hidden align-middle leading-[1.2]">
        {[...children].map((char, index) => (
          <span
            key={index}
            className="relative inline-block whitespace-pre transition-transform duration-500 ease-[cubic-bezier(0.625,0.05,0,1)] group-hover/link-hover:translate-y-[-1.2em] group-focus-visible/link-hover:translate-y-[-1.2em]"
            style={{
              textShadow: '0 1.2em currentColor',
              transitionDelay: `${index * staggerStep}s`,
            }}
          >
            {char === ' ' ? ' ' : char}
          </span>
        ))}
        {showLine && (
          <span className="pointer-events-none absolute inset-x-0 bottom-0 h-px origin-right scale-x-0 bg-current transition-transform duration-[0.4s] ease-[cubic-bezier(0.625,0.05,0,1)] group-hover/link-hover:origin-left group-hover/link-hover:scale-x-100 group-focus-visible/link-hover:origin-left group-focus-visible/link-hover:scale-x-100" />
        )}
      </span>
      {arrow && (
        <svg
          viewBox="0 0 14 14"
          fill="none"
          aria-hidden="true"
          className="h-[0.8em] w-[0.8em] flex-none transition-transform duration-300 ease-[cubic-bezier(0.625,0.05,0,1)] group-hover/link-hover:translate-x-[0.15em] group-hover/link-hover:translate-y-[-0.15em]"
        >
          <path
            d="M3 11L11 3M11 3H5M11 3V9"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </Link>
  )
}

type Phase = "closed" | "opening" | "open" | "closing";

export interface UnfoldNavbarProps {
  backgroundColor?: string;
  textColor?: string;
  mutedColor?: string;
  animationSpeed?: number;
  charStagger?: number;
  showLinkUnderline?: boolean;
  showNumbers?: boolean;
  dimInactiveLinks?: boolean;
  showFeature?: boolean;


  items?: { label: string; href: string }[];

  secondary?: { label: string; href: string }[];

  featureImage?: string;

  featureCaption?: string;

  featureHref?: string;

  position?: { top?: string; right?: string; bottom?: string; left?: string };

  direction?: "right";
}

const DEFAULT_ITEMS = [
  { label: "Components", href: "#" },
  { label: "Templates", href: "#" },
  { label: "Pricing", href: "#" },
  { label: "Docs", href: "#" },
];

const DEFAULT_SECONDARY = [
  { label: "Changelog", href: "#" },
  { label: "Showcase", href: "#" },
  { label: "Support", href: "#" },
  { label: "GitHub", href: "#" },
];

const DEFAULT_FEATURE_IMAGE =
  "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/v-01.jpg";

const UnfoldNavbar = ({
  backgroundColor = "#ebebeb",
  textColor = "#111111",
  mutedColor = "rgba(0,0,0,0.5)",
  animationSpeed = 1,
  charStagger = 0.015,
  showLinkUnderline = false,
  showNumbers = false,
  dimInactiveLinks = true,
  showFeature = true,
  items = DEFAULT_ITEMS,
  secondary = DEFAULT_SECONDARY,
  featureImage = DEFAULT_FEATURE_IMAGE,
  featureCaption = "Latest Release",
  featureHref = "#",
  position,
  direction = "right",
}: UnfoldNavbarProps) => {
  const reducedMotion = usePrefersReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const tileImgRef = useRef<HTMLSpanElement>(null);
  const rollerRef = useRef<HTMLSpanElement>(null);

  const [phase, setPhase] = useState<Phase>("closed");
  const phaseRef = useRef<Phase>("closed");

  const openTl = useRef<gsap.core.Timeline | null>(null);
  const closeTl = useRef<gsap.core.Timeline | null>(null);
  const hoverTl = useRef<gsap.core.Timeline | null>(null);
  const lastFocused = useRef<Element | null>(null);

  const api = useRef<{ open: () => void; close: () => void } | null>(null);

  useGSAP(
    () => {
      const root = rootRef.current;
      const body = bodyRef.current;
      const surface = surfaceRef.current;
      if (!root || !body || !surface) return;

      const q = gsap.utils.selector(root);
      const ticks = q<SVGRectElement>("[data-tick]");
      const numerals = q("[data-numeral]");
      const labels = q("[data-label]");
      const subs = q("[data-sub]");
      const caption = q("[data-caption]")[0];
      const img = tileImgRef.current;
      const roller = rollerRef.current;

      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const growH = reduced ? RM_GROW_H : GROW_H;
      const growW = reduced ? RM_GROW_W : GROW_W;
      const widenAt = reduced ? RM_WIDEN_AT : WIDEN_AT;

      const beat = (value: number) => (reduced ? value * RM_SCALE : value);

      const styles = getComputedStyle(root);
      const closed = parseFloat(styles.getPropertyValue("--un-closed")) || 95;
      const radiusClosed =
        parseFloat(styles.getPropertyValue("--un-radius-closed")) || 36;
      const radiusOpen =
        parseFloat(styles.getPropertyValue("--un-radius-open")) || 20;

      const setPhaseBoth = (next: Phase) => {
        phaseRef.current = next;
        setPhase(next);
      };

      const reset = () => {
        gsap.set(body, {
          width: closed,
          height: closed,
          borderRadius: radiusClosed,
        });
        gsap.set([...numerals, ...labels, ...subs], {
          autoAlpha: 0,
          x: CONTENT_X,
        });
        if (caption) gsap.set(caption, { autoAlpha: 0, y: 8 });
        if (img) gsap.set(img, { autoAlpha: 0, scale: IMG_SCALE });
        if (roller) gsap.set(roller, { yPercent: 0 });

        if (ticks.length) gsap.set(ticks, { clearProps: "transform" });
        if (ticks[0])
          gsap.set(ticks[0], { svgOrigin: "12 12", smoothOrigin: false, y: -TICK_REST, rotation: 0 });
        if (ticks[1])
          gsap.set(ticks[1], { svgOrigin: "12 12", smoothOrigin: false, scaleX: 1, autoAlpha: 1 });
        if (ticks[2])
          gsap.set(ticks[2], { svgOrigin: "12 12", smoothOrigin: false, y: TICK_REST, rotation: 0 });
      };

      const wasOpen = phaseRef.current === "open" || phaseRef.current === "opening";
      setPhaseBoth("closed");
      reset();
      surface.setAttribute("inert", "");
      gsap.set(surface, { visibility: "hidden" });

      const buildOpen = () => {

        const probe = document.createElement("div");
        probe.style.cssText =
          "position:absolute;visibility:hidden;pointer-events:none;width:var(--un-open-w);height:var(--un-open-h)";
        root.appendChild(probe);
        const probeRect = probe.getBoundingClientRect();
        probe.remove();

        const w = Math.round(Math.min(probeRect.width, window.innerWidth * VIEWPORT_CAP));
        const h = Math.round(Math.min(probeRect.height, window.innerHeight * VIEWPORT_CAP));

        const tl = gsap.timeline({
          paused: true,
          defaults: { force3D: true },
          onStart: () => {
            surface.removeAttribute("inert");
            gsap.set(surface, { visibility: "visible" });
            setPhaseBoth("opening");
          },
          onComplete: () => {
            setPhaseBoth("open");
            const first = root.querySelector<HTMLAnchorElement>("[data-row]");
            if (first && document.hasFocus()) first.focus();
          },
        });

        tl.to(body, { height: h, duration: growH, ease: EASE_IN_OUT, force3D: false }, 0);

        tl.to(
          body,
          { width: w, borderRadius: radiusOpen, duration: growW, ease: EASE_IN_OUT, force3D: false },
          widenAt,
        );

        if (ticks[0]) tl.to(ticks[0], { y: -TICK_SPREAD, duration: growH, ease: EASE_IN_OUT }, 0);
        if (ticks[2]) tl.to(ticks[2], { y: TICK_SPREAD, duration: growH, ease: EASE_IN_OUT }, 0);
        if (ticks[0])
          tl.to(ticks[0], { rotation: -45, y: 0, duration: beat(0.4), ease: EASE_OUT }, widenAt);
        if (ticks[2])
          tl.to(ticks[2], { rotation: 45, y: 0, duration: beat(0.4), ease: EASE_OUT }, widenAt);
        if (ticks[1])
          tl.to(ticks[1], { scaleX: 0, autoAlpha: 0, duration: beat(0.3), ease: EASE_OUT }, widenAt);

        numerals.forEach((el, i) => {
          tl.to(el, { autoAlpha: 1, x: 0, duration: beat(0.22), ease: EASE_OUT, overwrite: "auto" }, beat(0.585 + 0.05 * i));
        });
        labels.forEach((el, i) => {
          tl.to(el, { autoAlpha: 1, x: 0, duration: beat(0.3), ease: EASE_OUT, overwrite: "auto" }, beat(0.615 + 0.05 * i));
        });
        subs.forEach((el, i) => {
          tl.to(el, { autoAlpha: 1, x: 0, duration: beat(0.24), ease: EASE_OUT, overwrite: "auto" }, beat(0.825 + 0.028 * i));
        });
        if (img)
          tl.to(img, { autoAlpha: 1, scale: 1, duration: beat(0.44), ease: EASE_OUT, overwrite: "auto" }, beat(0.705));
        if (caption)
          tl.to(caption, { autoAlpha: 1, y: 0, duration: beat(0.26), ease: EASE_OUT, overwrite: "auto" }, beat(0.885));

        return tl.timeScale(Math.max(0.1, animationSpeed));
      };

      const open = () => {
        if (phaseRef.current === "open" || phaseRef.current === "opening") return;
        if (phaseRef.current === "closing") closeTl.current?.kill();
        lastFocused.current = document.activeElement;
        openTl.current?.kill();
        openTl.current = buildOpen();
        openTl.current.restart();
      };

      const close = () => {
        if (phaseRef.current === "closed" || phaseRef.current === "closing") return;
        if (phaseRef.current === "opening") openTl.current?.kill();
        hoverTl.current?.kill();
        closeTl.current?.kill();

        const tl = gsap.timeline({
          paused: true,
          defaults: { ease: EASE_OUT, force3D: true },
          onStart: () => setPhaseBoth("closing"),
          onComplete: () => {
            surface.setAttribute("inert", "");
            gsap.set(surface, { visibility: "hidden" });
            reset();
            setPhaseBoth("closed");
            const prev = lastFocused.current as HTMLElement | null;
            if (prev && document.hasFocus()) prev.focus();
          },
        });

        tl.to([...numerals, ...labels, ...subs], {
          autoAlpha: 0,
          x: -10,
          duration: beat(CLOSE_CONTENT),
          overwrite: "auto",
        }, 0);
        if (caption)
          tl.to(caption, { autoAlpha: 0, y: -6, duration: beat(CLOSE_CONTENT), overwrite: "auto" }, 0);
        if (img)
          tl.to(img, { autoAlpha: 0, scale: IMG_SCALE, duration: beat(CLOSE_CONTENT), overwrite: "auto" }, 0);

        tl.to(
          body,
          { width: closed, borderRadius: radiusClosed, duration: reduced ? RM_GROW_W : CLOSE_NARROW, ease: EASE_IN_OUT, force3D: false, overwrite: "auto" },
          beat(CLOSE_NARROW_AT),
        );
        if (ticks[0]) tl.to(ticks[0], { rotation: 0, y: -TICK_SPREAD, duration: beat(0.306) }, beat(CLOSE_NARROW_AT));
        if (ticks[2]) tl.to(ticks[2], { rotation: 0, y: TICK_SPREAD, duration: beat(0.306) }, beat(CLOSE_NARROW_AT));
        if (ticks[1]) tl.to(ticks[1], { scaleX: 1, autoAlpha: 1, duration: beat(0.216) }, beat(CLOSE_NARROW_AT));

        tl.to(
          body,
          { height: closed, duration: beat(CLOSE_DROP), ease: EASE_IN_OUT, force3D: false, overwrite: "auto" },
          beat(CLOSE_DROP_AT),
        );
        if (ticks[0]) tl.to(ticks[0], { y: -TICK_REST, duration: beat(0.2635) }, beat(CLOSE_DROP_AT));
        if (ticks[2]) tl.to(ticks[2], { y: TICK_REST, duration: beat(0.2635) }, beat(CLOSE_DROP_AT));

        tl.timeScale(Math.max(0.1, animationSpeed));
        closeTl.current = tl;
        tl.restart();
      };

      api.current = { open, close };
      if (wasOpen) open();

      const onKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") close();
      };
      const onPointerDown = (e: PointerEvent) => {
        const anchor = root.querySelector("[data-anchor]");
        if (!anchor) return;
        if (phaseRef.current !== "open" && phaseRef.current !== "opening") return;
        if (!anchor.contains(e.target as Node)) close();
      };
      let resizeId: number;
      const onResize = () => {
        window.clearTimeout(resizeId);

        resizeId = window.setTimeout(() => close(), 150);
      };

      document.addEventListener("keydown", onKeyDown);
      document.addEventListener("pointerdown", onPointerDown);
      window.addEventListener("resize", onResize);

      return () => {
        openTl.current?.kill();
        closeTl.current?.kill();
        hoverTl.current?.kill();
        api.current = null;
        document.removeEventListener("keydown", onKeyDown);
        document.removeEventListener("pointerdown", onPointerDown);
        window.removeEventListener("resize", onResize);
        window.clearTimeout(resizeId);
      };
    },
    { scope: rootRef, dependencies: [animationSpeed, showNumbers, showFeature, items, secondary, reducedMotion], revertOnUpdate: true },
  );

  const toggle = () => {
    if (phaseRef.current === "open" || phaseRef.current === "opening") api.current?.close();
    else api.current?.open();
  };

  const onTileEnter = () => {
    if (phaseRef.current !== "open") return;
    hoverTl.current?.kill();
    const tl = gsap.timeline();
    if (tileImgRef.current)
      tl.to(tileImgRef.current, { scale: 1.04, duration: 0.6, ease: "expo.out", overwrite: "auto" }, 0);
    if (rollerRef.current)
      tl.to(rollerRef.current, { yPercent: -50, duration: 0.35, ease: EASE_OUT, overwrite: "auto" }, 0);
    hoverTl.current = tl;
  };

  const onTileLeave = () => {
    if (phaseRef.current !== "open") return;
    hoverTl.current?.kill();
    const tl = gsap.timeline();
    if (tileImgRef.current)
      tl.to(tileImgRef.current, { scale: 1, duration: 0.6, ease: "expo.out", overwrite: "auto" }, 0);
    if (rollerRef.current)
      tl.to(rollerRef.current, { yPercent: 0, duration: 0.35, ease: EASE_OUT, overwrite: "auto" }, 0);
    hoverTl.current = tl;
  };

  const isOpen = phase === "open" || phase === "opening";

  return (
    <div
      ref={rootRef}
      data-phase={phase}
      data-dim-links={dimInactiveLinks && !reducedMotion}

      style={
        {
          color: textColor,
          "--un-text": textColor,
          "--un-muted": mutedColor,
          "--un-radius-open": "20px",
          ...(!showFeature ? { "--un-tile-w": "0px", "--un-open-w": "min(calc(100vw - 32px), calc(var(--un-gutter) + var(--un-gap) * 2 + var(--un-index-w) + var(--un-pad) + var(--un-slack)))" } : {}),
          "--un-gutter": "var(--un-closed)",

          "--un-slack": "2px",
        } as React.CSSProperties
      }

      className="group/unfold pointer-events-none absolute inset-0 text-[#111] [--un-closed:72px] [--un-radius-closed:36px] [--un-pad:24px] [--un-gap:24px] [--un-tile-w:408px] [--un-index-w:288px] [--un-open-h:min(620px,94vh)] [--un-open-w:calc(var(--un-gutter)+var(--un-gap)*2+var(--un-index-w)+var(--un-tile-w)+var(--un-pad)+var(--un-slack))] max-[1025px]:[--un-open-w:min(780px,calc(100vw-48px))] max-[1025px]:[--un-open-h:min(620px,calc(100dvh-48px))] max-md:[--un-open-w:calc(100vw-32px)] max-md:[--un-open-h:min(620px,calc(100dvh-32px))] max-[1025px]:[--un-closed:52px] max-[1025px]:[--un-radius-closed:26px] max-[1025px]:[--un-gap:20px] max-[1025px]:[--un-pad:20px] max-[1025px]:[--un-index-w:236px] max-[1025px]:[--un-tile-w:300px] max-md:[--un-closed:44px] max-md:[--un-radius-closed:22px] max-md:[--un-gap:16px] max-md:[--un-pad:16px]"
    >

      <div
        aria-hidden
        data-overlay
        className={`pointer-events-none fixed inset-0 z-190 bg-black/40 transition-opacity duration-300 ease-out ${
          isOpen ? "opacity-100" : "opacity-0"
        }`}
      />

      <div
        data-anchor
        data-direction={direction}
        style={
          position
            ? {
                top: position.top,
                right: position.right,
                bottom: position.bottom,
                left: position.left,
                transform: [
                  position.top === "50%" ? "translateY(-50%)" : "",
                  position.left === "50%" ? "translateX(-50%)" : "",
                ]
                  .filter(Boolean)
                  .join(" "),
              }
            : undefined
        }
        className={`pointer-events-auto fixed z-200 ${
          position
            ? ""
            : "top-1/2 left-20 -translate-y-1/2 max-[1025px]:left-6 max-md:left-4"
        }`}
      >
        <div
          ref={bodyRef}
          style={{ backgroundColor }}
          className="relative box-border max-h-[96vh] max-w-[96vw] overflow-hidden bg-[#ebebeb] will-change-[width,height,border-radius] after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit] after:border after:border-black/12 after:content-['']"
        >
          <button
            type="button"
            onClick={toggle}
            aria-expanded={isOpen}
            aria-controls="unfold-surface"
            aria-label={isOpen ? "Close navigation" : "Open navigation"}

            className="absolute top-1/2 left-9 z-2 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center justify-center border-none bg-transparent p-0 text-(--un-text) focus-visible:rounded-lg duration-300 ease-in-out hover:scale-[0.8] max-[1025px]:left-6.5 max-[1025px]:h-9 max-[1025px]:w-9 max-md:left-5.5 max-md:h-8 max-md:w-8"
          >

            <svg viewBox="0 0 24 24" fill="none" aria-hidden className="h-12 w-12 overflow-visible max-[1025px]:h-9 max-[1025px]:w-9 max-md:h-7 max-md:w-7">

              <rect data-tick="0" x="4" y="11.1" width="16" height="1.8" rx="0.9" fill="currentColor" />
              <rect data-tick="1" x="4" y="11.1" width="16" height="1.8" rx="0.9" fill="currentColor" />
              <rect data-tick="2" x="4" y="11.1" width="16" height="1.8" rx="0.9" fill="currentColor" />
            </svg>
          </button>
          <div
            ref={surfaceRef}
            id="unfold-surface"
            aria-label="Site navigation"

            className="invisible absolute top-0 left-0 box-border flex h-(--un-open-h) w-(--un-open-w) py-6 pr-[calc(var(--un-gutter)+1.5rem)] pl-0 max-[1025px]:py-5 max-[1025px]:pr-5 max-md:overflow-y-auto max-md:py-4 max-md:pr-4"
          >

            <div aria-hidden className="relative w-(--un-gutter) flex-none">
              <span className="absolute inset-y-0 right-0 w-px bg-white/12" />
            </div>

            <div className="flex min-w-0 flex-1 gap-6 pl-6 max-[1025px]:gap-5 max-[1025px]:pl-5 max-md:flex-col max-md:gap-4.5 max-md:pl-3">
              <nav
                aria-label="Site navigation"
                className="group/index flex w-(--un-index-w) min-w-0 flex-none flex-col justify-center max-md:min-h-0 max-md:w-full max-md:flex-1 max-md:justify-start"
              >
                <div className="flex flex-col gap-1.5">
                  {items.map((item, i) => (
                    <div
                      key={item.label}
                      className="group/row flex min-w-0 items-baseline gap-3.5 no-underline"
                    >

                      {showNumbers && <span
                        data-numeral
                        aria-hidden
                        className="w-4.5 flex-none text-left text-[11px] tracking-[0.06em] text-(--un-muted) transition-colors group-data-[dim-links=true]/unfold:group-hover/index:group-[:not(:hover)]/row:text-(--un-muted) group-hover/row:text-(--un-text)"
                      >
                        {String(i + 1).padStart(2, "0")}
                      </span>}
                      <LinkHover
                        data-row
                        href={item.href}
                        reduced={reducedMotion}
                        staggerStep={charStagger}
                        showLine={showLinkUnderline}
                      onClick={(e) => {
                        if (item.href === "#") e.preventDefault();
                        api.current?.close();
                      }}
                        data-label
                        className="flex-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#fd551d] whitespace-nowrap text-[40px] leading-[1.08] font-light tracking-[-0.03em] text-(--un-text) transition-colors group-data-[dim-links=true]/unfold:group-hover/index:group-[:not(:hover)]/row:text-(--un-muted) group-hover/row:text-(--un-text) max-[1025px]:text-[32px] max-md:text-[clamp(24px,7.2vw,30px)]"
                      >
                        {item.label}
                      </LinkHover>
                    </div>
                  ))}
                </div>

                <div className="flex flex-col gap-2.25 pt-7.5 max-md:mt-auto max-md:pt-6">
                  {secondary.map((item) => (
                    <Link
                      key={item.label}
                      data-sub
                      href={item.href}
                      onClick={(e) => {
                        if (item.href === "#") e.preventDefault();
                        api.current?.close();
                      }}
                      className="w-fit text-[13px] tracking-[0.01em] text-(--un-muted) no-underline transition-colors duration-300 ease-out hover:text-black focus-visible:text-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#fd551d]"
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </nav>

              {showFeature && <a
                href={featureHref}
                onClick={(e) => {
                  if (featureHref === "#") e.preventDefault();
                }}
                onMouseEnter={onTileEnter}
                onMouseLeave={onTileLeave}
                className="group/tile flex w-(--un-tile-w) flex-none flex-col no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#fd551d] max-[1025px]:min-w-0 max-[1025px]:flex-1 max-md:order-first max-md:min-h-0 max-md:w-full max-md:flex-1"
              >
                <span className="relative min-h-0 w-full flex-1 overflow-hidden rounded-lg max-md:min-h-30">
                  <span ref={tileImgRef} className="absolute inset-0 block h-full w-full">
                    <Image
                      src={featureImage}
                      alt={featureCaption}
                      fill
                      sizes="408px"
                      className="h-full w-full object-cover"
                    />
                  </span>
                  <span
                    aria-hidden
                    className="absolute bottom-3.5 left-3.5 h-4 overflow-hidden"
                  >
                    <span ref={rollerRef} className="flex flex-col will-change-transform">
                      <span className="flex h-4 items-center gap-1.5 text-white" />
                      <span className="flex h-4 items-center gap-1.5 text-white">
                        <svg viewBox="0 0 14 14" fill="none" aria-hidden className="h-3 w-3 flex-none">
                          <path d="M3 11L11 3M11 3H5M11 3V9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span className="text-xs font-medium text-white tracking-[0.02em]">View</span>
                      </span>
                    </span>
                  </span>
                </span>
                <span
                  data-caption
                  className="flex-none pt-3 text-xs tracking-[0.02em] text-(--un-muted) transition-colors group-hover/tile:text-(--un-text)"
                >
                  {featureCaption}
                </span>
              </a>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UnfoldNavbar;
