// Built using Hyperiux Vault: https://vault.hyperiux.com
"use client";

import { useEffect, useRef, useState, type CSSProperties, type ComponentPropsWithoutRef } from "react";
import Image from "next/image";
import Link from "next/link";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { CustomEase } from "gsap/CustomEase";

gsap.registerPlugin(useGSAP, CustomEase);

if (!CustomEase.get("morphingDockOut")) {
  CustomEase.create("morphingDockOut", "M0,0 C0.3,0.9 0.1,1 1,1");
  CustomEase.create("morphingDockInOut", "M0,0 C0.7,0 0.16,1 1,1");
}

const EASE_OUT = "morphingDockOut";
const EASE_IN_OUT = "morphingDockInOut";

const RISE = 0.46;
const WIDEN = 0.4;
const WIDEN_AT = RISE * 0.75;

const VIEW_OUT = 0.2;
const CLOSE_WIDTH = WIDEN * 0.7;
const CLOSE_CONTENT = 0.16;
const CLOSE_NARROW_AT = 0.08;
const SWAP = 0.16;

const MORPH = 0.52;
const MORPH_IN = 0.42;
const MORPH_IN_AT = 0.1;

const LINKS_AT = 0.465;
const LINKS_STEP = 0.03;
const PANEL_AT = 0.545;

const CAPSULE_OPEN = { y: 2, height: 16 };
const CAPSULE_SHUT = { y: 6, height: 8 };

const PANEL_X = 32;

// The scrim sits softly over the image at rest and deepens behind a descriptor.
const OVERLAY_REST = 0.45;
const OVERLAY_ACTIVE = 1;
const OVERLAY_FADE = 0.34;

type Phase = "closed" | "opening" | "open" | "closing";
type View = "nav" | "contact";

export interface MorphingDockProps {
  duration?: number;
  backgroundColor?: string;
  textColor?: string;
  hoverColor?: string;
  staggerStep?: number;
  showLine?: boolean;
  items?: { label: string; href: string; blurb: string }[];
  contactLabel?: string;
  email?: string;
  emailNote?: string;
  brand?: string;
  ctaLabel?: string;
  ctaHref?: string;
  teaserImage?: string;
  teaserHref?: string;
  /** Expanded nav panel width in viewport units. */
  expandedWidth?: number;
  /** Expanded nav panel height in viewport units. */
  expandedHeight?: number;
}

const DEFAULT_ITEMS = [
  { label: "Components", href: "#", blurb: "Drop-in motion primitives" },
  { label: "Templates", href: "#", blurb: "Full pages, wired and ready" },
  { label: "Showcase", href: "#", blurb: "Built with Hyperiux in the wild" },
  { label: "Docs", href: "#", blurb: "Guides, props and recipes" },
];

const DEFAULT_TEASER =
  "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/v-10.jpg";

type LinkButtonProps = Omit<ComponentPropsWithoutRef<typeof Link>, "children"> & {
  children: string;
  staggerStep?: number;
  showLine?: boolean;
};

export function LinkButton({
  children,
  className = "",
  staggerStep = 0.01,
  showLine = true,
  ...props
}: LinkButtonProps) {
  return (
    <Link {...props} className={`group/link-button focus-visible:outline-transparent text-[var(--morphing-dock-text,#d2d2d2)] hover:text-[var(--morphing-dock-hover,#ffffff)] focus-visible:text-[var(--morphing-dock-hover,#ffffff)] ${className}`}>
      <span className="sr-only">{children}</span>
      <span aria-hidden="true" className="relative inline-block overflow-hidden align-middle leading-[1.2]">
        {[...children].map((char, index) => (
          <span
            key={index}
            className="relative inline-block whitespace-pre transition-transform duration-[var(--morphing-dock-char-duration,0.6s)] ease-[cubic-bezier(0.625,0.05,0,1)] group-hover/link-button:translate-y-[-1.3em] group-focus-visible/link-button:translate-y-[-1.3em] group-active/link-button:translate-y-[-1.3em] motion-reduce:transform-none motion-reduce:transition-none"
            style={{
              textShadow: "0 1.3em currentColor",
              transitionDelay: `${index * staggerStep}s`,
            }}
          >
            {char}
          </span>
        ))}
        {showLine && (
          <span className="pointer-events-none absolute inset-x-0 bottom-0 h-px origin-right scale-x-0 bg-current transition-transform duration-[var(--morphing-dock-line-duration,0.5s)] ease-[cubic-bezier(0.625,0.05,0,1)] group-hover/link-button:origin-left group-hover/link-button:scale-x-100 group-focus-visible/link-button:origin-left group-focus-visible/link-button:scale-x-100 group-active/link-button:origin-left group-active/link-button:scale-x-100 motion-reduce:transition-none" />
        )}
      </span>
    </Link>
  );
}

const MorphingDock = ({
  items: suppliedItems = DEFAULT_ITEMS,
  duration = 1,
  backgroundColor = "#111111",
  textColor = "#d2d2d2",
  hoverColor = "#ffffff",
  staggerStep = 0.01,
  showLine = true,
  contactLabel = "Contact",
  email = "hello@hyperiux.com",
  emailNote = "Partnerships, press and support.",
  brand = "HYPERIUX",
  ctaLabel = "Get started",
  ctaHref = "#",
  teaserImage = DEFAULT_TEASER,
  teaserHref = "#",
  expandedWidth = 48,
  expandedHeight = 26,
}: MorphingDockProps) => {
  const expandedWidthValue = `${Math.min(95, Math.max(30, Number(expandedWidth) || 48))}vw`;
  const expandedHeightValue = `${Math.min(60, Math.max(15, Number(expandedHeight) || 26))}vw`;
  const items = Array.isArray(suppliedItems) && suppliedItems.every(
    (item) => item && typeof item.label === "string" && typeof item.href === "string" && typeof item.blurb === "string",
  ) ? suppliedItems : DEFAULT_ITEMS;
  const motionDuration = Number.isFinite(duration) ? Math.max(0.05, duration) : 1;
  const durationRef = useRef(motionDuration);
  const reducedMotionRef = useRef(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const dockRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const navViewRef = useRef<HTMLDivElement>(null);
  const contactViewRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const mediaRef = useRef<HTMLAnchorElement>(null);
  const mediaImgRef = useRef<HTMLSpanElement>(null);
  const mediaRollerRef = useRef<HTMLSpanElement>(null);
  const overlayRef = useRef<HTMLSpanElement>(null);
  const capsuleRef = useRef<SVGRectElement>(null);
  const triggerRollerRef = useRef<HTMLSpanElement>(null);

  const [phase, setPhase] = useState<Phase>("closed");
  const phaseRef = useRef<Phase>("closed");
  const viewRef = useRef<View>("nav");

  const openTl = useRef<gsap.core.Timeline | null>(null);
  const closeTl = useRef<gsap.core.Timeline | null>(null);
  const morphTl = useRef<gsap.core.Timeline | null>(null);
  const swapTl = useRef<gsap.core.Timeline | null>(null);
  const hoverTl = useRef<gsap.core.Timeline | null>(null);

  const activeBlurb = useRef<string | null>(null);
  const focusingFirst = useRef(false);
  const lastFocused = useRef<Element | null>(null);

  const api = useRef<{
    open: () => void;
    close: () => void;
    toNav: () => void;
    toContact: () => void;
    preview: (key: string | null) => void;
    hoverMedia: (on: boolean) => void;
  } | null>(null);

  useEffect(() => {
    durationRef.current = motionDuration;
    const rate = reducedMotionRef.current ? 1000 : 1 / motionDuration;
    [openTl, closeTl, morphTl, swapTl, hoverTl].forEach((ref) => ref.current?.timeScale(rate));
  }, [motionDuration]);

  useGSAP(
    () => {
      const root = rootRef.current;
      const dock = dockRef.current;
      const body = bodyRef.current;
      const surface = surfaceRef.current;
      const navView = navViewRef.current;
      const contactView = contactViewRef.current;
      if (!root || !dock || !body || !surface || !navView || !contactView) return;

      const createTimeline = (vars: gsap.TimelineVars) =>
        gsap.timeline(vars).timeScale(reducedMotionRef.current ? 1000 : 1 / durationRef.current);
      const q = gsap.utils.selector(root);
      const links = q<HTMLAnchorElement>("[data-link]");
      const blurbs = q<HTMLDivElement>("[data-blurb]");
      const panel = panelRef.current;
      const media = mediaRef.current;
      const mediaImg = mediaImgRef.current;
      const mediaRoller = mediaRollerRef.current;
      const overlay = overlayRef.current;
      const capsule = capsuleRef.current;
      const triggerRoller = triggerRollerRef.current;

      // Geometry lives in CSS custom properties so the breakpoints stay in
      // Tailwind; the timelines just read whatever the current values are.
      let dockW = 0;
      let dockH = 0;
      let navW = 0;
      let navH = 0;
      let contactW = 0;
      let contactH = 0;

      // Custom properties come back as authored ("28vw", "min(48vw,52rem)"),
      // so they have to be resolved through a real box before GSAP can tween
      // them as pixels - parseFloat alone would read "28vw" as 28px.
      const probe = document.createElement("div");
      probe.style.cssText =
        "position:absolute;visibility:hidden;pointer-events:none;height:0";
      root.appendChild(probe);

      const readW = (name: string, fallback: number) => {
        probe.style.width = `var(${name})`;
        const value = probe.getBoundingClientRect().width;
        return value > 0 ? value : fallback;
      };

      const readH = (name: string, fallback: number) => {
        probe.style.height = `var(${name})`;
        const value = probe.getBoundingClientRect().height;
        probe.style.height = "0";
        return value > 0 ? value : fallback;
      };

      const measure = () => {
        dockW = readW("--morphing-dock-dock-w", 298);
        dockH = readH("--morphing-dock-dock-h", 46);
        navW = readW("--morphing-dock-nav-w", 432);
        navH = readH("--morphing-dock-nav-h", 268);
        contactW = readW("--morphing-dock-contact-w", 288);
        contactH = readH("--morphing-dock-contact-h", 164);
      };
      measure();

      const isTouch = () =>
        window.matchMedia("(hover: none) and (pointer: coarse)").matches;

      const setPhaseBoth = (next: Phase) => {
        phaseRef.current = next;
        setPhase(next);
      };

      const blurbFor = (key: string) =>
        blurbs.find((blurb) => blurb.dataset.blurb === key);

      const resetPanel = () => {
        activeBlurb.current = null;
        swapTl.current?.kill();
        if (!panel) return;
        gsap.set(panel, { autoAlpha: 0, x: PANEL_X });
        if (blurbs.length) gsap.set(blurbs, { autoAlpha: 0, y: 10 });
        if (media) gsap.set(media, { autoAlpha: 1, y: 0 });
        if (overlay) gsap.set(overlay, { autoAlpha: OVERLAY_REST });
      };

      const hardReset = () => {
        gsap.killTweensOf(links);
        gsap.set(links, { autoAlpha: 0, xPercent: -30, x: 0 });
        gsap.set(navView, { autoAlpha: 1, scale: 1, xPercent: 0, zIndex: 1 });
        gsap.set(contactView, { autoAlpha: 0, scale: 1, xPercent: 0, zIndex: 1 });
        resetPanel();
        hoverTl.current?.kill();
        hoverTl.current = null;
        if (mediaImg) gsap.set(mediaImg, { scale: 1 });
        if (mediaRoller) gsap.set(mediaRoller, { yPercent: 0 });
        if (triggerRoller) gsap.set(triggerRoller, { yPercent: 0 });
        viewRef.current = "nav";
      };

      const buildOpen = () => {
        openTl.current?.kill();

        const tl = createTimeline({
          paused: true,
          defaults: { ease: EASE_OUT, force3D: true },
          onStart: () => {
            surface.removeAttribute("inert");
            surface.style.visibility = "visible";
            setPhaseBoth("opening");
          },
          onComplete: () => {
            setPhaseBoth("open");
            if (links.length && document.hasFocus()) {
              focusingFirst.current = true;
              links[0].focus();
              focusingFirst.current = false;
            }
          },
        });

        // Two-beat morph: the morphing dock rises first, then widens into the card.
        tl.to(body, { height: navH, duration: RISE, ease: EASE_IN_OUT, force3D: false }, 0);
        tl.to(body, { width: navW, duration: WIDEN, ease: EASE_IN_OUT, force3D: false }, WIDEN_AT);

        if (capsule)
          tl.to(capsule, { attr: CAPSULE_OPEN, duration: 0.5, ease: EASE_IN_OUT }, 0);
        if (triggerRoller)
          tl.to(triggerRoller, { yPercent: -50, duration: 0.4, ease: EASE_OUT }, 0.05);

        links.forEach((link, i) => {
          tl.to(
            link,
            { autoAlpha: 1, xPercent: 0, duration: 0.5, ease: EASE_OUT, overwrite: "auto" },
            LINKS_AT + LINKS_STEP * i,
          );
        });

        if (panel)
          tl.to(
            panel,
            { autoAlpha: 1, x: 0, duration: WIDEN * 0.7, ease: EASE_OUT, overwrite: "auto" },
            PANEL_AT,
          );
        if (media)
          tl.to(media, { autoAlpha: 1, duration: 0.24, ease: EASE_OUT, overwrite: "auto" }, PANEL_AT);

        openTl.current = tl;
        return tl;
      };

      const open = () => {
        if (phaseRef.current === "open" || phaseRef.current === "opening") return;
        if (phaseRef.current === "closing") closeTl.current?.pause();
        lastFocused.current = document.activeElement;
        morphTl.current?.kill();
        resetPanel();
        buildOpen().restart();
      };

      const close = () => {
        if (phaseRef.current === "closed" || phaseRef.current === "closing") return;
        if (phaseRef.current === "opening") openTl.current?.pause();
        morphTl.current?.kill();
        swapTl.current?.kill();
        activeBlurb.current = null;
        closeTl.current?.kill();

        const tl = createTimeline({
          paused: true,
          defaults: { ease: EASE_IN_OUT, force3D: true },
          onStart: () => setPhaseBoth("closing"),
          onComplete: () => {
            surface.setAttribute("inert", "");
            surface.style.visibility = "hidden";
            hardReset();
            setPhaseBoth("closed");
            const prev = lastFocused.current as HTMLElement | null;
            if (prev && document.hasFocus()) prev.focus();
          },
        });

        if (panel)
          tl.to(panel, { autoAlpha: 0, duration: CLOSE_CONTENT, overwrite: "auto" }, 0);

        if (viewRef.current === "nav") {
          links.forEach((link, i) => {
            tl.to(
              link,
              { autoAlpha: 0, xPercent: -20, duration: CLOSE_CONTENT, overwrite: "auto" },
              0.02 * i,
            );
          });
        } else {
          tl.to(
            contactView,
            { autoAlpha: 0, scale: 0.94, duration: 0.192, overwrite: "auto" },
            0,
          );
        }

        // Closing reverses the order: narrow first, then drop.
        tl.to(
          body,
          { width: dockW, duration: CLOSE_WIDTH, force3D: false },
          CLOSE_NARROW_AT,
        );
        tl.to(body, { height: dockH, duration: 0.322, force3D: false }, 0.29);

        if (capsule)
          tl.to(capsule, { attr: CAPSULE_SHUT, duration: 0.479 }, CLOSE_NARROW_AT);
        if (triggerRoller)
          tl.to(triggerRoller, { yPercent: 0, duration: 0.32 }, CLOSE_NARROW_AT);

        closeTl.current = tl;
        tl.restart();
      };

      const toContact = () => {
        if (phaseRef.current !== "open" || viewRef.current === "contact") return;
        viewRef.current = "contact";
        activeBlurb.current = null;
        swapTl.current?.kill();
        morphTl.current?.kill();

        gsap.set(contactView, { autoAlpha: 0, scale: 1.04, xPercent: 0 });
        gsap.set(navView, { zIndex: 2 });
        gsap.set(contactView, { zIndex: 1 });

        const tl = createTimeline({ defaults: { force3D: true } });
        tl.to(
          body,
          { width: contactW, height: contactH, duration: MORPH, ease: EASE_IN_OUT, force3D: false },
          0,
        );
        tl.to(
          navView,
          { autoAlpha: 0, scale: 0.94, duration: VIEW_OUT, ease: EASE_IN_OUT, overwrite: "auto" },
          0,
        );
        tl.to(
          contactView,
          { autoAlpha: 1, scale: 1, duration: MORPH_IN, ease: EASE_OUT, overwrite: "auto" },
          MORPH_IN_AT,
        );
        if (panel) {
          tl.set(panel, { autoAlpha: 0, x: PANEL_X }, 0.25);
          if (blurbs.length) tl.set(blurbs, { autoAlpha: 0, y: 10 }, 0.25);
        }
        morphTl.current = tl;
      };

      const toNav = () => {
        if (phaseRef.current !== "open" || viewRef.current === "nav") return;
        viewRef.current = "nav";
        morphTl.current?.kill();

        gsap.set(navView, { autoAlpha: 0, scale: 0.96, xPercent: 0 });
        gsap.set(contactView, { zIndex: 2 });
        gsap.set(navView, { zIndex: 1 });

        const tl = createTimeline({ defaults: { force3D: true } });
        tl.to(
          body,
          { width: navW, height: navH, duration: MORPH, ease: EASE_IN_OUT, force3D: false },
          0,
        );
        tl.to(
          contactView,
          { autoAlpha: 0, scale: 1.06, duration: VIEW_OUT, ease: EASE_IN_OUT, overwrite: "auto" },
          0,
        );
        tl.to(
          navView,
          { autoAlpha: 1, scale: 1, duration: MORPH_IN, ease: EASE_OUT, overwrite: "auto" },
          MORPH_IN_AT,
        );
        morphTl.current = tl;
      };

      // The preview panel never resizes - only its contents crossfade between
      // the teaser image and the hovered link's descriptor.
      const preview = (key: string | null) => {
        if (!panel || phaseRef.current !== "open" || viewRef.current !== "nav") return;
        if (isTouch()) return;
        if (activeBlurb.current === key) return;

        // The teaser image stays put in every state - only the descriptors
        // swap above it, so the panel never reads as empty. A null key means
        // "no link hovered", which simply clears every descriptor.
        const incoming = key ? blurbFor(key) : null;
        activeBlurb.current = key;

        const outgoing: Element[] = blurbs.filter((el) => el !== incoming);

        // A descriptor taking over drops the label, even if the pointer is
        // still resting on the image.
        if (mediaRoller && incoming) {
          hoverTl.current?.kill();
          gsap.to(mediaRoller, {
            yPercent: 0,
            duration: reducedMotionRef.current ? 0 : 0.35 * durationRef.current,
            ease: EASE_OUT,
            overwrite: "auto",
          });
        }

        swapTl.current?.kill();
        const tl = createTimeline({ defaults: { force3D: true } });

        // The scrim never disappears - it just crossfades between its resting
        // wash and the deeper state that carries a descriptor.
        if (overlay)
          tl.to(
            overlay,
            {
              autoAlpha: incoming ? OVERLAY_ACTIVE : OVERLAY_REST,
              duration: OVERLAY_FADE,
              ease: EASE_IN_OUT,
              overwrite: "auto",
            },
            0,
          );

        if (outgoing.length)
          tl.to(
            outgoing,
            {
              autoAlpha: 0,
              y: -8,
              duration: SWAP,
              ease: EASE_IN_OUT,
              overwrite: "auto",
            },
            0,
          );
        tl.set(outgoing, { y: 10 }, SWAP);
        if (incoming) {
          tl.set(incoming, { y: 10 }, 0.08);
          tl.to(
            incoming,
            { autoAlpha: 1, y: 0, duration: 0.3, ease: EASE_OUT, overwrite: "auto" },
            0.096,
          );
        }
        swapTl.current = tl;
      };

      // Scale always follows the pointer, but the label only rolls up when no
      // descriptor is showing - otherwise the two would overlap on the image.
      const hoverMedia = (on: boolean) => {
        if (phaseRef.current !== "open" || isTouch()) return;
        hoverTl.current?.kill();
        const label = on && activeBlurb.current === null;
        const tl = createTimeline({ defaults: { force3D: true } });
        if (mediaImg)
          tl.to(mediaImg, { scale: on ? 1.04 : 1, duration: 0.6, ease: "expo.out", overwrite: "auto" }, 0);
        if (mediaRoller)
          tl.to(mediaRoller, { yPercent: label ? -50 : 0, duration: 0.35, ease: EASE_OUT, overwrite: "auto" }, 0);
        hoverTl.current = tl;
      };

      api.current = { open, close, toNav, toContact, preview, hoverMedia };

      // Initial state
      surface.setAttribute("inert", "");
      surface.style.visibility = "hidden";
      gsap.set(body, { width: dockW, height: dockH });
      hardReset();
      setPhaseBoth("closed");
      if (capsule) gsap.set(capsule, { attr: CAPSULE_SHUT });

      const onKeyDown = (e: KeyboardEvent) => {
        if (e.key !== "Escape") return;
        if (phaseRef.current !== "open" && phaseRef.current !== "opening") return;
        if (viewRef.current === "contact") toNav();
        else close();
      };
      const onPointerDown = (e: PointerEvent) => {
        if (phaseRef.current !== "open" && phaseRef.current !== "opening") return;
        if (!dock.contains(e.target as Node)) close();
      };
      const onFocusOut = (e: FocusEvent) => {
        if (phaseRef.current !== "open" && phaseRef.current !== "opening") return;
        const next = e.relatedTarget as Node | null;
        if (next && !dock.contains(next)) close();
      };
      let resizeId: number;
      const onResize = () => {
        window.clearTimeout(resizeId);
        resizeId = window.setTimeout(() => {
          if (phaseRef.current === "open" || phaseRef.current === "opening") close();
          measure();
          if (phaseRef.current === "closed") gsap.set(body, { width: dockW, height: dockH });
        }, 150);
      };

      document.addEventListener("keydown", onKeyDown);
      document.addEventListener("pointerdown", onPointerDown);
      dock.addEventListener("focusout", onFocusOut);
      window.addEventListener("resize", onResize);

      const reduce = gsap.matchMedia();
      reduce.add("(prefers-reduced-motion: reduce)", () => {
        reducedMotionRef.current = true;
        [openTl, closeTl, morphTl, swapTl, hoverTl].forEach((ref) => ref.current?.timeScale(1000));
        return () => {
          reducedMotionRef.current = false;
          [openTl, closeTl, morphTl, swapTl, hoverTl].forEach((ref) => ref.current?.timeScale(1 / durationRef.current));
        };
      });

      return () => {
        document.removeEventListener("keydown", onKeyDown);
        document.removeEventListener("pointerdown", onPointerDown);
        dock.removeEventListener("focusout", onFocusOut);
        window.removeEventListener("resize", onResize);
        window.clearTimeout(resizeId);
        [openTl, closeTl, morphTl, swapTl, hoverTl].forEach((ref) => {
          ref.current?.kill();
          ref.current = null;
        });
        api.current = null;
        probe.remove();
        reduce.revert();
      };
    },

    {
      scope: rootRef,
      dependencies: [items, expandedWidthValue, expandedHeightValue],
      revertOnUpdate: true,
    },
  );

  const isOpen = phase === "open" || phase === "opening";

  const onLinkEnter = (key: string) => {
    if (phase !== "open") return;
    api.current?.preview(key);
  };

  const onLinkLeave = () => {
    // Leaving a link clears its descriptor, so the image reads clean again.
    api.current?.preview(null);
  };

  return (
    <div
      ref={rootRef}
      data-phase={phase}
      style={{
        "--morphing-dock-background": backgroundColor,
        "--morphing-dock-text": textColor,
        "--morphing-dock-hover": hoverColor,
        "--morphing-dock-char-duration": `${0.6 * motionDuration}s`,
        "--morphing-dock-line-duration": `${0.5 * motionDuration}s`,
        // Only the desktop tier reads these; the tablet and mobile classes set
        // the nav tokens from their own literals, so the sliders stop applying
        // below 1025px instead of pinning every breakpoint to one value.
        "--morphing-dock-nav-w-user": expandedWidthValue,
        "--morphing-dock-nav-h-user": expandedHeightValue,
      } as CSSProperties}
      className="[--morphing-dock-dock-w:min(30vw,32rem)] [--morphing-dock-dock-h:4vw] [--morphing-dock-nav-w:var(--morphing-dock-nav-w-user,min(48vw,52rem))] [--morphing-dock-nav-h:var(--morphing-dock-nav-h-user,26vw)] [--morphing-dock-contact-w:min(30vw,32rem)] [--morphing-dock-contact-h:14vw] max-[1025px]:[--morphing-dock-dock-w:min(94vw,35rem)] max-[1025px]:[--morphing-dock-dock-h:9vw] max-[1025px]:[--morphing-dock-nav-w:min(94vw,42.5rem)] max-[1025px]:[--morphing-dock-nav-h:52vw] max-[1025px]:[--morphing-dock-contact-w:min(94vw,35rem)] max-[1025px]:[--morphing-dock-contact-h:26vw] max-md:[--morphing-dock-dock-w:92vw] max-md:[--morphing-dock-dock-h:16vw] max-md:[--morphing-dock-nav-w:92vw] max-md:[--morphing-dock-nav-h:150vw] max-md:[--morphing-dock-contact-w:92vw] max-md:[--morphing-dock-contact-h:50vw]"
    >
      <div
        aria-hidden
        data-overlay
        className={`pointer-events-none fixed inset-0 z-190 bg-black/40 transition-opacity duration-300 ease-out ${
          isOpen ? "opacity-100" : "opacity-0"
        }`}
      />

      <div
        ref={dockRef}
        className="fixed bottom-16 left-1/2 z-200 -translate-x-1/2 max-[1025px]:bottom-12 max-md:bottom-6"
      >
        <div
          ref={bodyRef}
          className="relative box-border max-w-[96vw] overflow-hidden rounded-[2vw] border border-white/15 bg-(--morphing-dock-background) shadow-[0_1.5vw_4vw_rgba(0,0,0,0.45)] will-change-[width,height] max-[1025px]:rounded-[3.5vw] max-md:rounded-[6vw]"
        >
          {/* Everything above the persistent dock row */}
          <div
            ref={surfaceRef}
            id="morphing-dock-surface"
            className="invisible absolute inset-x-0 top-0 bottom-(--morphing-dock-dock-h)"
          >
            {/* View A - the nav list plus its preview panel */}
            <div
              ref={navViewRef}
              className="absolute bottom-0 left-0 box-border flex h-[calc(var(--morphing-dock-nav-h)-var(--morphing-dock-dock-h))] w-(--morphing-dock-nav-w) flex-row items-stretch gap-6 px-6 py-6 will-change-[transform,opacity] max-[1025px]:gap-5 max-md:flex-col max-md:justify-start max-md:gap-0 max-md:px-5 max-md:py-5"
            >
              <nav
                aria-label="Site navigation"
                className="flex min-w-0 basis-1/2 flex-col items-start justify-end gap-2.5 max-[1025px]:gap-3 max-md:basis-auto max-md:justify-start max-md:gap-4 max-md:pt-8"
              >
                {items.map((item) => (
                  <LinkButton
                    staggerStep={staggerStep}
                    showLine={showLine}
                    key={item.label}
                    data-link
                    href={item.href}
                    onMouseEnter={() => onLinkEnter(item.label)}
                    onMouseLeave={onLinkLeave}
                    onFocus={() => phase === "open" && api.current?.preview(item.label)}
                    onBlur={() => phase === "open" && api.current?.preview(null)}
                    onClick={(e) => {
                      if (item.href === "#") e.preventDefault();
                      api.current?.close();
                    }}
                    className="inline-block w-fit text-[2.4vw] leading-[1.15] font-light tracking-[-0.03em] whitespace-nowrap no-underline transition-colors duration-250 will-change-[transform,opacity] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-transparent max-[1025px]:text-[3.6vw] max-md:text-[6.5vw]"
                  >
                    {item.label}
                  </LinkButton>
                ))}

                <LinkButton
                    staggerStep={staggerStep}
                  showLine={showLine}
                  data-link
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    api.current?.toContact();
                  }}
                  className="inline-block w-fit text-sm font-normal tracking-[0.02em] no-underline transition-colors duration-250 will-change-[transform,opacity] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-transparent"
                >
                  {contactLabel}
                </LinkButton>
              </nav>

              {/* Preview panel - swaps contents, never resizes */}
              <div
                ref={panelRef}
                aria-hidden
                className="relative min-w-0 basis-1/2 will-change-[transform,opacity] max-[1025px]:h-[34vw] max-[1025px]:self-end max-md:order-first max-md:h-[50vw] max-md:basis-auto max-md:self-auto"
              >
                <Link
                  ref={mediaRef}
                  href={teaserHref}
                  onClick={(e) => {
                    if (teaserHref === "#") e.preventDefault();
                  }}
                  onMouseEnter={() => api.current?.hoverMedia(true)}
                  onMouseLeave={() => api.current?.hoverMedia(false)}
                  className="absolute inset-0 overflow-hidden rounded-lg will-change-[transform,opacity] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-transparent"
                >
                  <span ref={mediaImgRef} className="absolute inset-0 block h-full w-full will-change-transform">
                    <Image
                      src={teaserImage}
                      alt=""
                      fill
                      sizes="(max-width: 768px) 92vw, 35vw"
                      className="h-full w-full object-cover"
                    />
                  </span>

                  {/* Scrim: its own layer above the image and below the text,
                      so it can crossfade independently of any descriptor. */}
                  <span
                    ref={overlayRef}
                    aria-hidden
                    className="pointer-events-none absolute inset-0 rounded-lg bg-linear-to-t from-black/85 via-black/45 to-transparent"
                  />

                  <span
                    aria-hidden
                    className="pointer-events-none absolute bottom-3.5 left-3.5 h-4 overflow-hidden"
                  >
                    <span ref={mediaRollerRef} className="flex flex-col will-change-transform">
                      <span className="flex h-4 items-center gap-1.5 text-white" />
                      <span className="flex h-4 items-center gap-1.5 text-white">
                        <svg viewBox="0 0 14 14" fill="none" aria-hidden className="h-3 w-3 flex-none">
                          <path
                            d="M3 11L11 3M11 3H5M11 3V9"
                            stroke="currentColor"
                            strokeWidth="1.4"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        <span className="text-xs font-medium tracking-[0.02em]">Take a look</span>
                      </span>
                    </span>
                  </span>
                </Link>

                {items.map((item, i) => (
                  <div
                    key={item.label}
                    data-blurb={item.label}
                    className="pointer-events-none absolute inset-0 flex flex-col justify-end gap-2 p-4 will-change-[transform,opacity]"
                  >
                    <span className="text-[0.8vw] tracking-[0.08em] text-white/60 max-[1025px]:text-[1.4vw] max-md:text-[2.8vw]">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="text-sm leading-[1.45] tracking-[0.01em] text-white/90">
                      {item.blurb}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* View B - the contact card */}
            <div
              ref={contactViewRef}
              className="absolute bottom-0 left-0 box-border flex h-[calc(var(--morphing-dock-contact-h)-var(--morphing-dock-dock-h))] w-(--morphing-dock-contact-w) flex-col justify-between px-6 pt-5 pb-3 will-change-[transform,opacity] max-md:px-5 max-md:pt-4 max-md:pb-2.5"
            >
              <button
                type="button"
                onClick={() => api.current?.toNav()}
                aria-label="Back to navigation"
                className="flex cursor-pointer items-center gap-1.5 self-start border-none bg-transparent p-0 text-[0.9vw] text-white/50 transition-colors duration-250 hover:text-white/92 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-transparent max-[1025px]:text-[1.6vw] max-md:text-[3.2vw]"
              >
                <svg viewBox="0 0 16 16" fill="none" aria-hidden className="h-3.5 w-3.5 flex-none">
                  <path
                    d="M10 3L5 8L10 13"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span>Back</span>
              </button>

              <div className="flex flex-col gap-1.5">
                <Link
                  href={`mailto:${email}`}
                  className="text-xl font-light tracking-[-0.02em] whitespace-nowrap text-white/92 no-underline hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-transparent max-md:text-lg"
                >
                  {email}
                </Link>
                <span className="text-[0.9vw] text-white/50 max-[1025px]:text-[1.6vw] max-md:text-[3.2vw]">
                  {emailNote}
                </span>
              </div>
            </div>
          </div>

          {/* Dock row - always visible, always interactive */}
          <div className="absolute inset-x-0 bottom-0 box-border flex h-(--morphing-dock-dock-h) items-center gap-6 pr-2.5 pl-6 max-md:gap-3 max-md:pr-2 max-md:pl-4">
            <Link
              href="#"
              aria-label="Home"
              onClick={(e) => e.preventDefault()}
              className="flex h-9 flex-none items-center text-[1.05vw] font-medium tracking-[0.18em] whitespace-nowrap text-white/92 no-underline transition-opacity duration-200 hover:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-transparent max-[1025px]:text-[2.5vw] max-md:text-[4vw] max-md:tracking-[0.12em]"
            >
              {brand}
            </Link>

            <button
              type="button"
              onClick={() => (isOpen ? api.current?.close() : api.current?.open())}
              aria-expanded={isOpen}
              aria-controls="morphing-dock-surface"
              aria-label={isOpen ? "Close navigation" : "Open navigation"}
              className="flex h-11 flex-1 cursor-pointer items-center justify-center gap-2 border-none bg-transparent p-0 text-[1.05vw] font-normal tracking-[0.01em] whitespace-nowrap text-white/92 transition-opacity duration-200 hover:opacity-70 focus-visible:rounded-lg focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-transparent max-[1025px]:text-[1.8vw] max-md:text-[3.4vw]"
            >
              <svg viewBox="0 0 20 20" fill="none" aria-hidden className="h-5 w-5 flex-none overflow-visible">
                <rect
                  ref={capsuleRef}
                  x="2"
                  y="6"
                  width="16"
                  height="8"
                  rx="4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  fill="none"
                />
              </svg>
              <span aria-hidden className="block h-5 w-fit flex-none overflow-hidden">
                <span ref={triggerRollerRef} className="flex flex-col items-start will-change-transform">
                  <span className="block h-5 max-sm:text-[4vw] max-[1025px]:text-[2.8vw] leading-5 whitespace-nowrap">Menu</span>
                  <span className="block h-5 max-sm:text-[4vw] max-[1025px]:text-[2.8vw] leading-5 whitespace-nowrap">Close</span>
                </span>
              </span>
            </button>

            <LinkButton
                    staggerStep={staggerStep}
              href={ctaHref}
              showLine={false}
              onClick={(e) => {
                if (ctaHref === "#") e.preventDefault();
              }}
              className="flex h-10 max-sm:h-12 max-[1025px]:h-12  flex-none items-center rounded-full bg-white/10 px-5 text-[1.05vw] max-[1025px]:text-[2.8vw] font-medium whitespace-nowrap no-underline transition-colors duration-200 hover:bg-white/15   max-md:h-8 max-md:px-4  max-md:text-[4.5vw]"
            >
              {ctaLabel}
            </LinkButton>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MorphingDock;
