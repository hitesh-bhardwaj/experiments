// Built using Hyperiux Vault: https://vault.hyperiux.com
"use client";

import type { MouseEvent as ReactMouseEvent, ReactNode } from "react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import gsap from "gsap";
import { CustomEase } from "gsap/CustomEase";

gsap.registerPlugin(CustomEase);

const EASE_OUT_NAME = "perspectiveShiftOut";
const EASE_IN_OUT_NAME = "perspectiveShiftInOut";
if (!CustomEase.get(EASE_OUT_NAME)) {
  CustomEase.create(EASE_OUT_NAME, "M0,0 C0.3,0.9 0.1,1 1,1");
  CustomEase.create(EASE_IN_OUT_NAME, "M0,0 C0.7,0 0.16,1 1,1");
}

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

const PAGE_TILT = 0.72;
const GLYPH = 0.45;
const RULE_WIPE = 0.6;
const CLOSE_SPAN = 0.58;
const LINK_OUT = 0.22;
const DRAWER_SLIDE = 0.55;
const SUBLINK_IN = 0.45;
const SUBLINK_STAGGER = 0.05;
const SUB_OFFSET = -20;
const SWAP_OUT = 0.16;
const ACC_SPAN = 0.46;
const ACC_ITEM = 0.32;
const ACC_STAGGER = 0.045;
const LINKS_START = 0.2736;

const RM_SCALE = 0.55;
const RM_STAGGER = 0.012;
const RM_SLIDE = "-4%";
const RM_OFFSET = -4;

type Phase = "closed" | "opening" | "open" | "closing";

interface SubItem {
  label: string;
  href: string;
}

interface NavItem {
  label: string;
  href: string;
  key?: string;
  items?: SubItem[];
}

const NAV_ITEMS: NavItem[] = [
  {
    label: "Effects",
    href: "#",
    key: "effects",
    items: [
      { label: "Text", href: "#" },
      { label: "Navigation", href: "#" },
      { label: "Buttons", href: "#" },
      { label: "Transitions", href: "#" },
      { label: "Backgrounds", href: "#" },
    ],
  },
  {
    label: "Components",
    href: "#",
    key: "components",
    items: [
      { label: "Carousels", href: "#" },
      { label: "Cursor", href: "#" },
      { label: "Loaders", href: "#" },
      { label: "Scroll", href: "#" },
      { label: "WebGL", href: "#" },
    ],
  },
  { label: "Docs", href: "#" },
  { label: "Pricing", href: "#" },
  { label: "Home", href: "#" },
];

const SUB_LINKS: SubItem[] = [
  { label: "All Effects", href: "#" },
  { label: "Documentation", href: "#" },
  { label: "Pricing", href: "#" },
];

const SOCIALS: SubItem[] = [
  { label: "GitHub", href: "#" },
  { label: "X", href: "#" },
  { label: "LinkedIn", href: "#" },
  { label: "Instagram", href: "#" },
];

const CONTACT_EMAIL = "hello@hyperiux.com";

const CharRoll = ({
  text,
  stagger = 0.007,
  reduced = false,
}: {
  text: string;
  stagger?: number;
  reduced?: boolean;
}) => {
  if (reduced) {
    return (
      <span aria-hidden="true" className="relative inline-block align-bottom leading-[1.2]">
        {text}
      </span>
    );
  }

  return (
    <span
      aria-hidden="true"
      className="relative inline-block overflow-hidden align-bottom leading-[1.2]"
    >
      {[...text].map((char, i) => (
        <span
          key={i}
          className="relative inline-block whitespace-pre text-shadow-[0_1.2em_currentColor] transition-transform duration-500 ease-[cubic-bezier(0.625,0.05,0,1)] group-hover/row:translate-y-[-1.2em] group-focus-visible/row:translate-y-[-1.2em]"
          style={stagger ? { transitionDelay: `${i * stagger}s` } : undefined}
        >
          {char === " " ? " " : char}
        </span>
      ))}
    </span>
  );
};

const PROPERTY_REGISTRATION = `
@property --shift-rule { syntax: "<number>"; inherits: false; initial-value: 0; }
@property --shift-seam { syntax: "<number>"; inherits: false; initial-value: 0; }
`;

const inert = (href: string) => (e: ReactMouseEvent) => {
  if (!href || href === "#") e.preventDefault();
};

const CaretIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" className="block h-full w-full">
    <path
      d="M6 3.5L10.5 8L6 12.5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export interface PerspectiveShiftMenuProps {
  animationSpeed?: number;
  tiltAngle?: number;
  linkStagger?: number;
  charStagger?: number;
  panelWidth?: number;
  drawerWidth?: number;
  panelColor?: string;
  textColor?: string;
  voidColor?: string;
  dimOpacity?: number;
  children?: ReactNode;
}

const PerspectiveShiftMenu = ({
  animationSpeed = 1,
  tiltAngle = 20,
  linkStagger = 0,
  charStagger = 0.007,
  panelWidth = 22,
  drawerWidth = 18,
  panelColor = "#ffffff",
  textColor = "#111111",
  voidColor = "#0e0e0e",
  dimOpacity = 0.4,
  children,
}: PerspectiveShiftMenuProps) => {
  const reducedMotion = usePrefersReducedMotion();
  const wrapRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const dimRef = useRef<HTMLDivElement>(null);
  const subpanelRef = useRef<HTMLDivElement>(null);
  const stackRef = useRef<HTMLDivElement>(null);
  const glyphTopRef = useRef<HTMLSpanElement>(null);
  const glyphMidRef = useRef<HTMLSpanElement>(null);
  const glyphBotRef = useRef<HTMLSpanElement>(null);
  const metaRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const openTl = useRef<gsap.core.Timeline | null>(null);
  const closeTl = useRef<gsap.core.Timeline | null>(null);
  const drawerTl = useRef<gsap.core.Timeline | null>(null);

  const phaseRef = useRef<Phase>("closed");
  const drawerOpen = useRef(false);
  const activeKey = useRef<string | null>(null);
  const renderedKey = useRef<string | null>(null);
  const pendingKey = useRef<string | null>(null);
  const scrollLock = useRef(0);

  const [phase, setPhase] = useState<Phase>("closed");
  const [openKey, setOpenKey] = useState<string | null>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const page = pageRef.current;
    const surface = surfaceRef.current;
    const dim = dimRef.current;
    const subpanel = subpanelRef.current;
    const stack = stackRef.current;
    if (!wrap || !page || !surface || !dim || !subpanel || !stack) return;

    const wrapEl = wrap;
    const pageEl = page;
    const surfaceEl = surface;
    const dimEl = dim;
    const subpanelEl = subpanel;
    const stackEl = stack;

    const ctx = gsap.context(() => {
      const labels = gsap.utils.toArray<HTMLElement>("[data-shift-label]", surfaceEl);
      const links = gsap.utils.toArray<HTMLElement>("[data-shift-link]", surfaceEl);
      const sublinks = gsap.utils.toArray<HTMLElement>("[data-shift-sublink]", surfaceEl);
      const carets = gsap.utils.toArray<HTMLElement>("[data-shift-caret]", surfaceEl);

      const caretFor = (label: HTMLElement) =>
        label.closest("[data-shift-link]")?.querySelector<HTMLElement>("[data-shift-caret]") ?? null;

      const isMobile = () => window.matchMedia("(max-width: 767px)").matches;
      const canHover = () => window.matchMedia("(hover: hover)").matches;

      const reduced = reducedMotion;
      const beat = (value: number) => (reduced ? value * RM_SCALE : value);

      const glyphOffset = () => {
        const box = glyphMidRef.current?.parentElement;
        if (!box) return 0;
        const barHeight = glyphMidRef.current?.offsetHeight ?? 0;
        return (box.offsetHeight - barHeight) / 2;
      };
      const stagger = reduced ? RM_STAGGER : linkStagger;
      const speed = Math.max(0.1, animationSpeed);
      const timeline = (vars?: gsap.TimelineVars) =>
        gsap.timeline(vars).timeScale(speed);
      const linksStart = reduced ? beat(LINKS_START) : LINKS_START;
      const subOffset = reduced ? RM_OFFSET : SUB_OFFSET;
      const drawerOff = (mobile: boolean) =>
        reduced ? RM_SLIDE : mobile ? "100%" : "-100%";

      const setPhaseState = (next: Phase) => {
        phaseRef.current = next;
        wrapEl.dataset.shiftPhase = next;
        setPhase(next);
      };

      const lockScroll = () => {
        scrollLock.current = window.scrollY;
        const gutter = window.innerWidth - document.documentElement.clientWidth;
        document.body.style.position = "fixed";
        document.body.style.top = `-${scrollLock.current}px`;
        document.body.style.left = "0";
        document.body.style.right = "0";
        document.body.style.width = "100%";
        if (gutter > 0) document.body.style.paddingRight = `${gutter}px`;
      };

      const unlockScroll = () => {
        document.body.style.position = "";
        document.body.style.top = "";
        document.body.style.left = "";
        document.body.style.right = "";
        document.body.style.width = "";
        document.body.style.paddingRight = "";
        window.scrollTo(0, scrollLock.current);
      };

      const listFor = (key: string) =>
        stackEl.querySelector<HTMLElement>(`[data-shift-sublist="${key}"]`);

      const labelsFor = (el: HTMLElement | null) =>
        el ? gsap.utils.toArray<HTMLElement>("[data-shift-sublabel]", el) : [];

      const rowsOf = (els: HTMLElement[]) =>
        els.map((el) => el.parentElement).filter(Boolean) as HTMLElement[];

      const alignOffset = (key: string) => {
        if (isMobile()) return null;
        const parent = surfaceEl.querySelector<HTMLElement>(`[data-shift-parent="${key}"]`);
        const list = listFor(key);
        const items = list?.querySelector<HTMLElement>("[data-shift-subitems]");
        if (!parent || !items) return null;
        const current = parseFloat(gsap.getProperty(stackEl, "y") as string) || 0;
        return current + (parent.getBoundingClientRect().top - items.getBoundingClientRect().top);
      };

      const accFor = (key: string) =>
        surfaceEl.querySelector<HTMLElement>(`[data-shift-acc="${key}"]`);

      const accItems = (el: HTMLElement | null) =>
        el ? gsap.utils.toArray<HTMLElement>("[data-shift-acc-item]", el) : [];

      const openAcc = (key: string) => {
        const panel = accFor(key);
        if (!panel) return;
        const items = accItems(panel);

        gsap.killTweensOf([panel, ...items]);
        const tl = timeline({ defaults: { ease: EASE_OUT_NAME } });

        gsap.set(panel, { height: "auto" });
        const target = panel.offsetHeight;
        gsap.set(panel, { height: 0 });
        gsap.set(items, { autoAlpha: 0, y: reduced ? 0 : 10 });

        tl.to(panel, {
          height: target,
          duration: beat(ACC_SPAN),
          ease: EASE_IN_OUT_NAME,
          onComplete: () => gsap.set(panel, { height: "auto" }),
        }, 0);
        tl.to(items, {
          autoAlpha: 1,
          y: 0,
          duration: beat(ACC_ITEM),
          stagger: reduced ? RM_STAGGER : ACC_STAGGER,
          overwrite: "auto",
        }, beat(0.08));
      };

      const closeAcc = (key: string | null) => {
        const panel = key ? accFor(key) : null;
        if (!panel) return;
        const items = accItems(panel);
        gsap.killTweensOf([panel, ...items]);
        const tl = timeline({ defaults: { ease: EASE_IN_OUT_NAME } });
        tl.to(items, {
          autoAlpha: 0,
          y: reduced ? 0 : -6,
          duration: beat(ACC_ITEM * 0.6),
          overwrite: "auto",
        }, 0);
        tl.to(panel, { height: 0, duration: beat(ACC_SPAN), ease: EASE_IN_OUT_NAME }, 0);
      };

      const resetAcc = () => {
        const panels = gsap.utils.toArray<HTMLElement>("[data-shift-acc]", surfaceEl);
        panels.forEach((panel) => {
          gsap.set(panel, { height: 0 });
          gsap.set(accItems(panel), { autoAlpha: 0, y: reduced ? 0 : 10 });
        });
      };

      const resetDrawer = () => {
        const allLabels = gsap.utils.toArray<HTMLElement>("[data-shift-sublabel]", stackEl);
        gsap.set(subpanelEl, {
          "--shift-seam": 0,
          x: drawerOff(isMobile()),
          opacity: reduced ? 0 : 1,
        });
        subpanelEl.style.visibility = "hidden";
        subpanelEl.setAttribute("aria-hidden", "true");
        if (allLabels.length) {
          gsap.set(allLabels, { autoAlpha: 0, xPercent: subOffset, force3D: true });
          gsap.set(rowsOf(allLabels), { "--shift-rule": 0 });
        }
      };

      const leanPage = (depth: number) => {
        if (isMobile()) return;
        if (reduced) return;
        gsap.to(pageEl, {
          rotationY: -tiltAngle - (tiltAngle / 5) * depth,
          duration: DRAWER_SLIDE,
          ease: EASE_OUT_NAME,
          overwrite: "auto",
          force3D: true,
        });
      };

      const buildOpen = () => {
        openTl.current?.kill();
        const mobile = isMobile();

        const tl = timeline({
          paused: true,
          defaults: { ease: EASE_OUT_NAME, force3D: true },
          onStart: () => {
            surfaceEl.removeAttribute("inert");
            surfaceEl.setAttribute("aria-hidden", "false");
            surfaceEl.style.visibility = "visible";
            setPhaseState("opening");
          },
          onComplete: () => {
            setPhaseState("open");
            if (pendingKey.current) {
              const key = pendingKey.current;
              pendingKey.current = null;
              openDrawer(key);
            }
          },
        });

        if (glyphTopRef.current) {
          tl.to(glyphTopRef.current, { y: 0, rotate: 45, duration: beat(GLYPH), ease: EASE_OUT_NAME }, 0);
        }
        if (glyphBotRef.current) {
          tl.to(glyphBotRef.current, { y: 0, rotate: -45, duration: beat(GLYPH), ease: EASE_OUT_NAME }, 0);
        }
        if (glyphMidRef.current) {
          tl.to(glyphMidRef.current, { autoAlpha: 0, scaleX: 0, duration: beat(GLYPH * 0.8), ease: EASE_OUT_NAME }, 0);
        }

        if (reduced) {
          tl.to(pageEl, {
            borderTopLeftRadius: 10,
            borderBottomLeftRadius: 10,
            duration: beat(PAGE_TILT),
          }, 0);
          tl.fromTo(
            surfaceEl,
            { x: RM_SLIDE, autoAlpha: 0 },
            { x: 0, autoAlpha: 1, duration: beat(0.62) },
            0,
          );
          tl.to(dimEl, { opacity: 1, duration: beat(0.612), ease: "power2.out", force3D: false }, 0);
        } else if (mobile) {
          tl.to(pageEl, {
            scale: 0.94,
            opacity: 0.55,
            borderTopLeftRadius: 10,
            borderBottomLeftRadius: 10,
            duration: PAGE_TILT,
          }, 0);
          tl.to(surfaceEl, { x: 0, duration: 0.62 }, 0);
          tl.to(dimEl, { opacity: 1, duration: 0.612, ease: "power2.out" }, 0);
        } else {
          tl.to(surfaceEl, { x: 0, duration: 0.62 }, 0);
          tl.to(pageEl, {
            rotationY: -tiltAngle,
            borderTopLeftRadius: 10,
            borderBottomLeftRadius: 10,
            duration: PAGE_TILT,
          }, 0);
          tl.to(dimEl, { opacity: 1, duration: 0.612, ease: "power2.out", force3D: false }, 0);
        }

        labels.forEach((el, i) => {
          const at = linksStart + i * stagger;
          tl.to(el, {
            autoAlpha: 1,
            xPercent: 0,
            duration: beat(0.52),
            overwrite: "auto",
          }, at);
          const caret = caretFor(el);
          if (caret) {
            tl.to(caret, {
              autoAlpha: 1,
              xPercent: 0,
              duration: beat(0.52),
              overwrite: "auto",
            }, at);
          }
        });

        if (links.length) {
          tl.to(links, { "--shift-rule": 1, duration: beat(RULE_WIPE), stagger }, linksStart);
        }

        const tail = linksStart + (labels.length - 1) * stagger + beat(0.26);
        const subGap = reduced ? 0.01 : 0.04;
        sublinks.forEach((el, i) => {
          tl.to(el, {
            autoAlpha: 1,
            xPercent: 0,
            duration: beat(0.38),
            overwrite: "auto",
          }, tail + subGap * i);
        });

        if (metaRef.current) {
          tl.to(metaRef.current, {
            opacity: 1,
            duration: beat(0.35),
            ease: "power3.out",
          }, tail + subGap * sublinks.length + beat(0.06));
        }

        openTl.current = tl;
        return tl;
      };

      const swapDrawer = (key: string) => {
        const list = listFor(key);
        if (!list) return;
        const outgoing = labelsFor(renderedKey.current ? listFor(renderedKey.current) : null);
        const incoming = labelsFor(list);

        activeKey.current = key;
        setOpenKey(key);
        drawerTl.current?.kill();

        const tl = timeline({ defaults: { ease: EASE_OUT_NAME, force3D: true } });
        tl.to(subpanelEl, { x: 0, autoAlpha: 1, duration: beat(DRAWER_SLIDE), overwrite: "auto" }, 0);
        leanPage(1);

        if (outgoing.length) {
          tl.to(outgoing, {
            autoAlpha: 0,
            xPercent: reduced ? -RM_OFFSET : 20,
            duration: beat(SWAP_OUT),
            ease: "power2.in",
            stagger: reduced ? RM_STAGGER : 0.02,
            overwrite: "auto",
          }, 0);
        }

        tl.call(() => {
          renderedKey.current = key;
          if (incoming.length) {
            gsap.set(incoming, { autoAlpha: 0, xPercent: subOffset, force3D: true });
            gsap.set(rowsOf(incoming), { "--shift-rule": 0 });
          }
          const offset = alignOffset(key);
          if (offset !== null) {
            gsap.to(stackEl, {
              y: offset,
              duration: beat(SUBLINK_IN),
              ease: EASE_OUT_NAME,
              overwrite: "auto",
              force3D: true,
            });
          }
        }, undefined, 0.18);

        if (incoming.length) {
          tl.to(incoming, {
            autoAlpha: 1,
            xPercent: 0,
            duration: beat(SUBLINK_IN),
            stagger: reduced ? RM_STAGGER : SUBLINK_STAGGER,
            overwrite: "auto",
          }, 0.2);
          tl.to(rowsOf(incoming), {
            "--shift-rule": 1,
            duration: beat(RULE_WIPE),
            stagger: reduced ? RM_STAGGER : SUBLINK_STAGGER,
          }, 0.2);
        }

        drawerTl.current = tl;
      };

      function openDrawer(key: string) {
        if (phaseRef.current === "opening") {
          pendingKey.current = key;
          return;
        }
        if (phaseRef.current !== "open") return;

        if (isMobile()) {
          if (drawerOpen.current && activeKey.current === key) {
            closeAcc(key);
            drawerOpen.current = false;
            activeKey.current = null;
            setOpenKey(null);
            return;
          }
          if (drawerOpen.current) closeAcc(activeKey.current);
          drawerOpen.current = true;
          activeKey.current = key;
          renderedKey.current = key;
          setOpenKey(key);
          openAcc(key);
          return;
        }

        if (drawerOpen.current && activeKey.current === key) {
          closeDrawer(false);
          return;
        }
        if (drawerOpen.current) {
          swapDrawer(key);
          return;
        }

        const list = listFor(key);
        if (!list) return;
        const incoming = labelsFor(list);

        drawerOpen.current = true;
        activeKey.current = key;
        renderedKey.current = key;
        setOpenKey(key);

        subpanelEl.removeAttribute("inert");
        subpanelEl.setAttribute("aria-hidden", "false");
        subpanelEl.style.visibility = "visible";

        const offset = alignOffset(key);
        if (offset !== null) gsap.set(stackEl, { y: offset });
        if (incoming.length) {
          gsap.set(incoming, { autoAlpha: 0, xPercent: subOffset, force3D: true });
        }

        drawerTl.current?.kill();
        const tl = timeline({ defaults: { ease: EASE_OUT_NAME, force3D: true } });
        tl.to(subpanelEl, { "--shift-seam": 1, duration: beat(DRAWER_SLIDE) }, 0);
        tl.to(subpanelEl, { x: 0, autoAlpha: 1, duration: beat(DRAWER_SLIDE) }, 0);

        if (incoming.length) {
          tl.to(incoming, {
            autoAlpha: 1,
            xPercent: 0,
            duration: beat(SUBLINK_IN),
            stagger: reduced ? RM_STAGGER : SUBLINK_STAGGER,
            overwrite: "auto",
          }, 0.12);
          tl.to(rowsOf(incoming), {
            "--shift-rule": 1,
            duration: beat(RULE_WIPE),
            stagger: reduced ? RM_STAGGER : SUBLINK_STAGGER,
          }, 0.12);
        }

        leanPage(1);
        drawerTl.current = tl;
      }

      function closeDrawer(withMenu: boolean) {
        if (!drawerOpen.current) return;
        const wasKey = activeKey.current;
        drawerOpen.current = false;
        activeKey.current = null;
        setOpenKey(null);

        if (isMobile()) {
          closeAcc(wasKey);
          return;
        }

        subpanelEl.setAttribute("aria-hidden", "true");

        const mobile = isMobile();
        drawerTl.current?.kill();

        const tl = timeline({
          defaults: { ease: EASE_IN_OUT_NAME, force3D: true },
          onComplete: resetDrawer,
        });
        tl.to(subpanelEl, { "--shift-seam": 0, duration: beat(0.33) }, 0);

        if (withMenu) {
          const off = reduced
            ? RM_SLIDE
            : mobile
              ? "-100%"
              : -(surfaceEl.offsetWidth + subpanelEl.offsetWidth);
          tl.to(subpanelEl, { x: off, duration: beat(CLOSE_SPAN) }, 0);
        } else {
          tl.to(subpanelEl, { x: drawerOff(mobile), duration: beat(DRAWER_SLIDE * 0.8) }, 0);
          leanPage(0);
        }

        drawerTl.current = tl;
      }

      function openMenu() {
        if (phaseRef.current === "open" || phaseRef.current === "opening") return;
        if (phaseRef.current === "closing") closeTl.current?.pause();

        drawerTl.current?.kill();
        drawerOpen.current = false;
        activeKey.current = null;
        renderedKey.current = null;
        pendingKey.current = null;
        setOpenKey(null);
        resetDrawer();
        resetAcc();
        lockScroll();
        buildOpen().restart();
      }

      function closeMenu() {
        if (phaseRef.current === "closed" || phaseRef.current === "closing") return;
        if (phaseRef.current === "opening") openTl.current?.pause();
        pendingKey.current = null;
        if (drawerOpen.current) closeDrawer(true);

        closeTl.current?.kill();
        const tl = timeline({
          paused: true,
          defaults: { ease: EASE_IN_OUT_NAME, force3D: true },
          onStart: () => setPhaseState("closing"),
          onComplete: () => {
            surfaceEl.setAttribute("inert", "");
            surfaceEl.setAttribute("aria-hidden", "true");
            surfaceEl.style.visibility = "hidden";
            gsap.set(surfaceEl, { x: reduced ? RM_SLIDE : "-100%" });
            gsap.set(links, { "--shift-rule": 0 });
            if (labels.length) {
              gsap.killTweensOf(labels);
              gsap.set(labels, { x: 0 });
            }
            if (carets.length) {
              gsap.killTweensOf(carets);
              gsap.set(carets, { x: 0 });
            }
            setPhaseState("closed");
            unlockScroll();
          },
        });

        labels.forEach((el, i) => {
          const at = (reduced ? 0.008 : 0.025) * i;
          tl.to(el, {
            autoAlpha: 0,
            xPercent: reduced ? RM_OFFSET : -18,
            duration: beat(LINK_OUT),
            ease: "power2.in",
            overwrite: "auto",
          }, at);
          const caret = caretFor(el);
          if (caret) {
            tl.to(caret, {
              autoAlpha: 0,
              xPercent: reduced ? RM_OFFSET : -18,
              duration: beat(LINK_OUT),
              ease: "power2.in",
              overwrite: "auto",
            }, at);
          }
        });

        if (sublinks.length) {
          tl.to(sublinks, {
            autoAlpha: 0,
            xPercent: reduced ? RM_OFFSET : -22,
            duration: beat(LINK_OUT * 0.8),
            ease: "power2.in",
          }, 0);
        }
        if (metaRef.current) {
          tl.to(metaRef.current, { opacity: 0, duration: beat(0.18), ease: "power2.out" }, 0);
        }
        const glyphSplay = glyphOffset();
        if (glyphTopRef.current) {
          tl.to(glyphTopRef.current, { y: -glyphSplay, rotate: 0, duration: beat(CLOSE_SPAN * 0.7) }, reduced ? 0 : 0.11);
        }
        if (glyphBotRef.current) {
          tl.to(glyphBotRef.current, { y: glyphSplay, rotate: 0, duration: beat(CLOSE_SPAN * 0.7) }, reduced ? 0 : 0.11);
        }
        if (glyphMidRef.current) {
          tl.to(glyphMidRef.current, { autoAlpha: 1, scaleX: 1, duration: beat(CLOSE_SPAN * 0.7) }, reduced ? 0 : 0.11);
        }

        const at = beat(LINK_OUT * 0.55);
        tl.to(
          surfaceEl,
          reduced
            ? { x: RM_SLIDE, autoAlpha: 0, duration: beat(CLOSE_SPAN) }
            : { x: "-100%", duration: CLOSE_SPAN },
          at,
        );
        tl.to(pageEl, {
          rotationY: 0,
          scale: 1,
          x: 0,
          opacity: 1,
          borderTopLeftRadius: 0,
          borderBottomLeftRadius: 0,
          duration: beat(CLOSE_SPAN),
          overwrite: "auto",
        }, at);
        tl.to(dimEl, { opacity: 0, duration: beat(CLOSE_SPAN * 0.7), ease: "power2.out" }, at);

        closeTl.current = tl;
        tl.restart();
      }

      const toggleMenu = () => {
        if (phaseRef.current === "open" || phaseRef.current === "opening") closeMenu();
        else openMenu();
      };

      gsap.set(pageEl, {
        rotationY: 0,
        scale: 1,
        x: 0,
        borderTopLeftRadius: 0,
        borderBottomLeftRadius: 0,
        transformOrigin: "right center",
      });
      gsap.set(dimEl, { opacity: 0 });
      gsap.set(surfaceEl, { x: reduced ? RM_SLIDE : "-100%" });
      gsap.set(labels, {
        autoAlpha: 0,
        xPercent: reduced ? RM_OFFSET : -18,
        force3D: true,
      });
      gsap.set(carets, {
        autoAlpha: 0,
        xPercent: reduced ? RM_OFFSET : -18,
        force3D: true,
      });
      gsap.set(links, { "--shift-rule": 0 });
      gsap.set(sublinks, {
        autoAlpha: 0,
        xPercent: reduced ? RM_OFFSET : -22,
        force3D: true,
      });
      if (metaRef.current) gsap.set(metaRef.current, { opacity: 0 });
      const glyphSplay = glyphOffset();
      if (glyphTopRef.current) {
        gsap.set(glyphTopRef.current, { yPercent: -50, y: -glyphSplay, rotate: 0, transformOrigin: "center center" });
      }
      if (glyphBotRef.current) {
        gsap.set(glyphBotRef.current, { yPercent: -50, y: glyphSplay, rotate: 0, transformOrigin: "center center" });
      }
      if (glyphMidRef.current) {
        gsap.set(glyphMidRef.current, { yPercent: -50, y: 0, autoAlpha: 1, scaleX: 1, transformOrigin: "center center" });
      }
      surfaceEl.setAttribute("inert", "");
      surfaceEl.setAttribute("aria-hidden", "true");
      surfaceEl.style.visibility = "hidden";
      resetDrawer();
      resetAcc();
      setPhaseState("closed");

      const trigger = triggerRef.current;
      trigger?.addEventListener("click", toggleMenu);

      const onKeyDown = (e: KeyboardEvent) => {
        if (e.key !== "Escape") return;
        if (drawerOpen.current) closeDrawer(false);
        else if (phaseRef.current === "open" || phaseRef.current === "opening") closeMenu();
      };
      document.addEventListener("keydown", onKeyDown);

      const onDimClick = () => {
        if (phaseRef.current === "open") closeMenu();
      };
      dimEl.addEventListener("click", onDimClick);

      const back = subpanelEl.querySelector<HTMLElement>("[data-shift-back]");
      const onBack = () => closeDrawer(false);
      back?.addEventListener("click", onBack);

      const parents = gsap.utils.toArray<HTMLElement>("[data-shift-parent]", surfaceEl);
      const parentCleanups = parents.map((el) => {
        const key = el.dataset.shiftParent as string;
        const hot = el.querySelector<HTMLElement>("[data-shift-label]") ?? el;

        const enter = () => {
          if (canHover() && !isMobile() && !(drawerOpen.current && activeKey.current === key)) {
            openDrawer(key);
          }
        };
        const leave = () => {
          if (pendingKey.current === key) pendingKey.current = null;
        };
        const click = () => {
          if (canHover() && !isMobile()) {
            if (pendingKey.current === key || activeKey.current === key) return;
          }
          openDrawer(key);
        };
        hot.addEventListener("mouseenter", enter);
        hot.addEventListener("mouseleave", leave);
        el.addEventListener("click", click);
        return () => {
          hot.removeEventListener("mouseenter", enter);
          hot.removeEventListener("mouseleave", leave);
          el.removeEventListener("click", click);
        };
      });

      const linkCleanups = links.map((el) => {
        const isParent = el.hasAttribute("data-shift-parent");

        const rowEnter = () => {
          if (phaseRef.current !== "open") return;
          if (!isParent && drawerOpen.current && canHover() && !isMobile()) closeDrawer(false);
        };
        el.addEventListener("mouseenter", rowEnter);

        return () => {
          el.removeEventListener("mouseenter", rowEnter);
        };
      });

      const onColumnLeave = (e: MouseEvent) => {
        if (!drawerOpen.current || !canHover() || isMobile()) return;
        const to = e.relatedTarget as Node | null;
        if (to && (surfaceEl.contains(to) || subpanelEl.contains(to))) return;
        closeDrawer(false);
      };
      surfaceEl.addEventListener("mouseleave", onColumnLeave);
      subpanelEl.addEventListener("mouseleave", onColumnLeave);

      let resizeId: ReturnType<typeof setTimeout>;
      const onResize = () => {
        clearTimeout(resizeId);
        resizeId = setTimeout(() => {
          if (phaseRef.current === "open" || phaseRef.current === "opening") closeMenu();
        }, 150);
      };
      window.addEventListener("resize", onResize);

      return () => {
        trigger?.removeEventListener("click", toggleMenu);
        document.removeEventListener("keydown", onKeyDown);
        dimEl.removeEventListener("click", onDimClick);
        back?.removeEventListener("click", onBack);
        parentCleanups.forEach((fn) => fn());
        linkCleanups.forEach((fn) => fn());
        surfaceEl.removeEventListener("mouseleave", onColumnLeave);
        subpanelEl.removeEventListener("mouseleave", onColumnLeave);
        window.removeEventListener("resize", onResize);
        clearTimeout(resizeId);
        unlockScroll();
      };
    }, wrapRef);

    return () => ctx.revert();
  }, [reducedMotion, animationSpeed, tiltAngle, linkStagger]);

  const lit = phase === "open" || phase === "opening";

  return (
    <>
      <style>{PROPERTY_REGISTRATION}</style>

      <header className="pointer-events-none fixed inset-x-0 top-0 z-300 flex items-center justify-between px-[2vw] backdrop-blur-sm max-lg:p-[3vw] max-md:p-[5vw] py-4">
        <a
          href="/"
          className={`flex items-center gap-3 cursor-pointer ${lit?"text-black":"text-white"}`}
        >
          <svg
            width="30"
            height="30"
            viewBox="0 0 58 65"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={` transition-all duration-300 ease-in-out motion-reduce:transition-none size-10 max-md:size-8  `}
          >
            <path d="M0 0H9.02977V28.5943H0V0Z" fill="#ffffff" className="fill-current" />
            <path
              d="M57.1895 64.7134H48.1597V36.1192H57.1895V64.7134Z"
              fill="#ffffff" className="fill-current"
            />
            <path
              d="M0.0195312 36.1192V64.7135H9.0493V42.139L21.5405 37.4737V28.7449L0.0195312 36.1192Z"
              fill="#ffffff" className="fill-current"
            />
            <path
              d="M48.1777 22.5746V0.00012207H57.3579V28.5944L34.332 37.8697V28.5944L48.1777 22.5746Z"
              fill="#ffffff" className="fill-current"
            />
            <path
              d="M21.9912 29.0459L28.4868 26.8346C28.8573 26.7085 29.2624 26.7316 29.6161 26.8992L34.7834 29.3469M21.9912 29.0459L28.1616 32.2063M21.9912 29.0459V37.1727L28.1616 40.0321M34.7834 29.3469L28.1616 32.2063M34.7834 29.3469C34.7834 32.3443 34.7834 34.1753 34.7834 37.1727L28.1616 40.0321M28.1616 32.2063V40.0321"
              stroke="#ffffff"
              className="stroke-current"
              strokeWidth="0.902977"
            />
          </svg>

          <div className="flex  items-center gap-2 w-full h-full">
            <svg
              width="156"
              height="45"
              viewBox="0 0 351 43"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className={`transition-all duration-300 ease-in-out motion-reduce:transition-none`}
            >
              <path
                d="M315.441 6.10352e-05H306.862L320.055 15.9603L324.019 21.0695L306.862 42.139H315.591L332.597 21.0695L328.555 15.9603L315.441 6.10352e-05Z"
                fill="#ffffff" className="fill-current"
              />
              <path
                d="M350.055 6.10352e-05H341.326L332.598 10.6853L336.962 15.9527L350.055 6.10352e-05Z"
                fill="#ffffff" className="fill-current"
              />
              <path
                d="M349.905 42.139L341.176 42.139L332.598 31.7548L336.962 26.3369L349.905 42.139Z"
                fill="#ffffff" className="fill-current"
              />
              <path
                d="M264.874 6.10352e-05H258.252V34.0122L269.088 42.139H289.555L300.391 34.0122V6.10352e-05H293.769V29.9349C293.769 30.4164 293.539 30.8688 293.149 31.152L287.543 35.2293C287.286 35.4164 286.976 35.5172 286.658 35.5172H271.985C271.667 35.5172 271.357 35.4164 271.1 35.2293L265.494 31.152C265.104 30.8688 264.874 30.4164 264.874 29.9349V6.10352e-05Z"
                fill="#ffffff" className="fill-current"
              />
              <rect
                x="244.406"
                y="6.10352e-05"
                width="6.62183"
                height="42.1389"
                fill="#ffffff" className="fill-current"
              />
              <path
                d="M195.043 0.000183105H228.002V6.62202H201.665V42.2896H195.043V0.000183105Z"
                fill="#ffffff" className="fill-current"
              />
              <path
                d="M233.269 24.0796L237.182 18.1404V6.62202V0.000183105H195.043V6.62202H230.56V15.8023L225.594 24.0796H233.269Z"
                fill="#ffffff" className="fill-current"
              />
              <path
                d="M221.078 17.7586H201.664V24.3804H217.466L229.205 42.139H237.163L221.078 17.7586Z"
                fill="#ffffff" className="fill-current"
              />
              <path
                d="M182.401 24.3804V17.7585H162.235L153.205 27.9923H162.084L165.245 24.3804H182.401Z"
                fill="#ffffff" className="fill-current"
              />
              <path
                d="M158.322 0H188.421V6.62183H161.031L152.904 15.9526V35.5171H188.421V42.1389H146.282V12.0397L158.322 0Z"
                fill="#ffffff" className="fill-current"
              />
              <rect
                x="97.5234"
                y="17.7585"
                width="6.62183"
                height="24.3804"
                fill="#ffffff" className="fill-current"
              />
              <path
                d="M139.662 0H97.5234V6.62183H133.041V17.7586H111.15L104.534 24.3804H133.643L139.662 18.0595V0Z"
                fill="#ffffff" className="fill-current"
              />
              <path
                d="M55.3826 10.8357L55.3826 0H48.7607L48.7607 14.8991L66.5754 24.2299L66.5193 42.1389H73.1411V24.2299L90.8997 14.7486V0H84.2779V10.8357L69.8302 18.4786L55.3826 10.8357Z"
                fill="#ffffff" className="fill-current"
              />
              <rect width="6.62183" height="42.1389" fill="#ffffff" className="fill-current" />
              <rect
                x="35.5166"
                width="6.62183"
                height="42.1389"
                fill="#ffffff" className="fill-current"
              />
              <rect
                x="6.62305"
                y="17.7585"
                width="28.8953"
                height="6.62183"
                fill="#ffffff" className="fill-current"
              />
            </svg>
          </div>
        </a>

        <button
          type="button"
          ref={triggerRef}
          data-shift-trigger
          aria-expanded={lit}
          aria-controls="perspective-shift-surface"
          aria-label={lit ? "Close navigation" : "Open navigation"}
          className="group/glyph pointer-events-auto relative z-301 flex h-11 w-11 cursor-pointer items-center justify-center border-none bg-transparent p-0"
        >
   
          <span
            className={`relative block h-[1.2vw] w-[1.7vw] transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none max-lg:h-[2.4vw] max-lg:w-[3.4vw] max-md:h-[4vw] max-md:w-[5.6vw] ${
              lit ? "group-hover/glyph:rotate-90 group-focus-visible/glyph:rotate-90" : ""
            }`}
            aria-hidden="true"
          >
            <span
              ref={glyphTopRef}
              style={lit ? { ["--shift-ink" as string]: textColor } : undefined}
              className={`absolute top-1/2 left-0 block h-[0.15vw] w-full origin-center bg-white transition-colors duration-350 max-lg:h-[0.3vw] max-md:h-[0.5vw] ${
                lit ? "max-md:bg-(--shift-ink)" : ""
              }`}
            />
            <span
              ref={glyphMidRef}
              style={lit ? { ["--shift-ink" as string]: textColor } : undefined}
              className={`absolute top-1/2 left-0 block h-[0.15vw] w-full origin-center bg-white transition-colors duration-350 max-lg:h-[0.3vw] max-md:h-[0.5vw] ${
                lit ? "max-md:bg-(--shift-ink)" : ""
              }`}
            />
            <span
              ref={glyphBotRef}
              style={lit ? { ["--shift-ink" as string]: textColor } : undefined}
              className={`absolute top-1/2 left-0 block h-[0.15vw] w-full origin-center bg-white transition-colors duration-350 max-lg:h-[0.3vw] max-md:h-[0.5vw] ${
                lit ? "max-md:bg-(--shift-ink)" : ""
              }`}
            />
          </span>
        </button>
      </header>

      <div
        ref={wrapRef}
        style={{ backgroundColor: voidColor }}
        className="relative w-full overflow-hidden perspective-distant perspective-origin-[50%_40%]"
      >
        <div
          ref={pageRef}
          className="relative w-full origin-right overflow-hidden bg-[#e8e6e1] will-change-transform"
        >
          {children}
        </div>

      </div>

        <div
          ref={dimRef}
          aria-hidden="true"
          style={{ backgroundColor: `rgba(0,0,0,${dimOpacity})` }}
          className={`fixed inset-0 z-50 ${
            phase === "open" ? "pointer-events-auto" : "pointer-events-none"
          }`}
        />

        <div
          id="perspective-shift-surface"
          ref={surfaceRef}
          role="dialog"
          aria-modal="true"
          aria-label="Site navigation"
          style={{ ["--shift-panel" as string]: `${panelWidth}vw`, ["--shift-drawer" as string]: `${drawerWidth}vw`, backgroundColor: panelColor, color: textColor }}
          className="invisible fixed top-0 left-0 z-200 flex h-screen w-(--shift-panel) flex-col justify-between px-[2.1vw] py-[5.2vw] max-lg:w-[38vw] max-lg:px-[3vw] max-lg:py-[7vw] max-md:w-full max-md:px-[5vw] max-md:py-[12vw]"
        >
          <nav
            aria-label="Main navigation"
            className="-ml-10 flex flex-1 flex-col overflow-y-auto pl-10 max-md:justify-end"
          >
            <ul className="mt-auto mb-0 list-none p-0">
              {NAV_ITEMS.map((item) => {
                const isParent = Boolean(item.items);
                const expanded = isParent && openKey === item.key;
        
                const shared =
                  "relative flex w-fit items-center gap-3 py-3.25 text-left no-underline after:absolute after:inset-x-0 after:bottom-0 after:h-px after:origin-left after:bg-current/12 after:[transform:scaleX(var(--shift-rule,0))] after:content-['']";

                const label = (
                  <span
                    data-shift-label
                    className="group/row w-fit text-[2.2vw] max-lg:text-[4vw] max-md:text-[7vw] leading-[1.2] font-light tracking-[-0.03em] text-current transition-colors duration-250"
                  >
                    <span className="sr-only">{item.label}</span>
                    <CharRoll text={item.label} stagger={charStagger} reduced={reducedMotion} />
                  </span>
                );

                const caret = (
                  <span
                    data-shift-caret
                    aria-hidden="true"
                    className={`h-4 w-4 ml-1 mt-2 shrink-0 transition-colors duration-300 ${
                      expanded ? "text-current" : "text-current/45"
                    }`}
                  >
                    <span
                      className={`block h-full text-black w-full transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none ${
                        expanded ? "rotate-90" : "rotate-0"
                      }`}
                    >
                      <CaretIcon />
                    </span>
                  </span>
                );

                return (
                  <li key={item.label} className="relative last:*:after:content-none">
                    {isParent ? (
                      <button
                        type="button"
                        data-shift-link
                        data-shift-parent={item.key}
                        aria-expanded={expanded}
                        aria-controls="perspective-shift-subpanel"
                        className={`${shared} cursor-pointer border-none bg-transparent font-[inherit] text-current/90 group`}
                      >
                        {label}
                        {caret}
                      </button>
                    ) : (
                      <a
                        href={item.href}
                        onClick={inert(item.href)}
                        data-shift-link
                        className={`${shared} text-current/90`}
                      >
                        <span
                          data-shift-label
                          className="group/row w-fit text-[2.4vw] max-lg:text-[4vw] max-md:text-[7vw] leading-[1.2] font-light tracking-[-0.03em] text-current transition-colors duration-250"
                        >
                          <span className="sr-only">{item.label}</span>
                          <CharRoll text={item.label} stagger={charStagger} reduced={reducedMotion} />
                        </span>
                      </a>
                    )}

                    {isParent && (
                      <div
                        data-shift-acc={item.key}
                        className="hidden h-0 overflow-hidden max-md:block"
                        aria-hidden={!expanded}
                      >
                        <ul className="m-0 flex max-h-[32vh] list-none flex-col gap-2 overflow-y-auto overscroll-contain p-0 pb-[4vw]">
                          {item.items?.map((sub) => (
                            <li key={sub.label}>
                              <a
                                href={sub.href}
                                onClick={inert(sub.href)}
                                data-shift-acc-item
                                className="group/sub block w-fit  text-[3.8vw] leading-[1.2] font-light tracking-[-0.01em] text-current/50 no-underline transition-colors duration-250 hover:text-current"
                              >
                                {sub.label}
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>

            <ul className="mt-5 mb-auto flex list-none flex-col gap-1 p-0">
              {SUB_LINKS.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    onClick={inert(link.href)}
                    data-shift-sublink
                    className="block py-0.5 text-[0.8rem] font-light tracking-[0.04em] text-current/45 no-underline transition-colors duration-220 hover:text-current"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div ref={metaRef} className="mt-auto flex flex-col gap-1.5 opacity-0">
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="text-[0.75rem] font-normal tracking-wider text-current/70 no-underline"
            >
              {CONTACT_EMAIL}
            </a>
            <span className="flex gap-3">
              {SOCIALS.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  onClick={inert(s.href)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[0.7rem] font-normal tracking-[0.06em] text-current/45 uppercase no-underline transition-colors duration-220 hover:text-current"
                >
                  {s.label}
                </a>
              ))}
            </span>
          </div>
        </div>

        <div
          id="perspective-shift-subpanel"
          ref={subpanelRef}
          aria-hidden="true"
          style={{ ["--shift-panel" as string]: `${panelWidth}vw`, ["--shift-drawer" as string]: `${drawerWidth}vw`, backgroundColor: panelColor, color: textColor }}
          className="invisible fixed top-0 left-(--shift-panel) z-150 flex h-screen w-(--shift-drawer) flex-col justify-start px-[2.1vw] py-[5.2vw] before:pointer-events-none before:absolute before:inset-y-0 before:left-0 before:w-px before:origin-bottom before:bg-current/12 before:transform-[scaleY(var(--shift-seam,0))] before:content-[''] max-lg:left-[38vw] max-lg:w-[30vw] max-lg:px-[3vw] max-lg:py-[7vw] max-md:left-0 max-md:z-210 max-md:w-full max-md:px-[5vw] max-md:py-[12vw]"
        >
          <button
            type="button"
            data-shift-back
            className="absolute top-[5vw] left-[5vw] hidden h-11 cursor-pointer items-center gap-2 border-none bg-transparent p-0 font-[inherit] text-[0.75rem] font-normal tracking-[0.06em] text-current/70 uppercase max-md:flex"
          >
            <span aria-hidden="true" className="h-3.5 w-3.5">
              <svg viewBox="0 0 16 16" fill="none" className="block h-full w-full">
                <path
                  d="M10 3.5L5.5 8L10 12.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <span>Back</span>
          </button>

          <div ref={stackRef} className="grid">
            {NAV_ITEMS.filter((i) => i.items).map((item) => (
              <div
                key={item.key}
                data-shift-sublist={item.key}
                className={`[grid-area:1/1] ${openKey === item.key ? "visible" : "invisible"}`}
              >
                <ul data-shift-subitems className="m-0 list-none p-0">
                  {item.items?.map((sub) => (
                    <li key={sub.label} className="relative last:*:after:content-none">
                      <a
                        href={sub.href}
                        onClick={inert(sub.href)}
                        className="group/sub relative block py-3 no-underline after:absolute after:inset-x-0 after:bottom-0 after:h-px after:origin-left after:bg-current/8 after:transform-[scaleX(var(--shift-rule,0))] after:content-['']"
                      >
                        <span
                          data-shift-sublabel
                          className="inline-block w-fit text-[1.15rem] leading-[1.2] font-medium tracking-[-0.01em] text-current/70 transition-colors duration-250 group-hover/sub:text-current"
                        >
                          {sub.label}
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
    </>
  );
};

export default PerspectiveShiftMenu;
