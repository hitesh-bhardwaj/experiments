// Built using Hyperiux Vault: https://vault.hyperiux.com
"use client";
import { useSyncExternalStore } from "react";
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
} from "react";
import { gsap } from "gsap";

function usePrefersReducedMotion() {
  return useSyncExternalStore(
    (callback) => {
      if (typeof window === "undefined") return () => {};

      const mediaQueryList = window.matchMedia("(prefers-reduced-motion: reduce)");
      mediaQueryList.addEventListener("change", callback);

      return () => mediaQueryList.removeEventListener("change", callback);
    },
    () => (typeof window === "undefined" ? false : window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false),
    () => false
  );
}

export interface DisplacementNavbarLink {
  label: string;
  href?: string;
}

type LinkHoverProps = Omit<
  ComponentPropsWithoutRef<"a">,
  "children"
> & {
  children: string;
  staggerStep?: number;
  showLine?: boolean;
  arrow?: boolean;
  reduced?: boolean;
};

export function LinkHover({
  children,
  className = "",
  staggerStep = 0.015,
  showLine = true,
  arrow = false,
  reduced = false,
  ...props
}: LinkHoverProps) {
  if (reduced) {
    return (
      <a
        {...props}
        className={`inline-flex items-center gap-[0.35em] no-underline ${className}`}
      >
        <span className="leading-[1.2]">{children}</span>
        {arrow && (
          <svg
            viewBox="0 0 14 14"
            fill="none"
            aria-hidden="true"
            className="h-[0.8em] w-[0.8em] flex-none"
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
      </a>
    );
  }

  return (
    <a
      {...props}
      className={`group/link-hover inline-flex items-center gap-[0.35em] no-underline ${className}`}
    >
      <span className="sr-only">{children}</span>
      <span
        aria-hidden="true"
        className="relative inline-block overflow-hidden align-middle leading-[1.2]"
      >
        {[...children].map((char, index) => (
          <span
            key={index}
            className="relative inline-block whitespace-pre transition-transform duration-500 ease-[cubic-bezier(0.625,0.05,0,1)] group-hover/link-hover:translate-y-[-1.2em] group-focus-visible/link-hover:translate-y-[-1.2em]"
            style={{
              textShadow: "0 1.2em currentColor",
              transitionDelay: `${index * staggerStep}s`,
            }}
          >
            {char === " " ? " " : char}
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
    </a>
  );
}

export interface DisplacementNavbarMedia {
  src: string;
  caption: string;
}

export interface DisplacementNavbarProps {
  primaryLinks?: DisplacementNavbarLink[];
  infoLinks?: DisplacementNavbarLink[];
  media?: DisplacementNavbarMedia[];
  email?: string;
  socials?: DisplacementNavbarLink[];
  cities?: string;
  className?: string;
  children?: React.ReactNode;
  openDuration?: number;
  closeDuration?: number;
  contentStagger?: number;
  imageSwapDuration?: number;
  shelfBackground?: string;
  pageGradientFrom?: string;
  pageGradientTo?: string;
  pageBackground?: string;
  linkColor?: string;
  mutedColor?: string;
  hairlineColor?: string;
  charStagger?: number;
  showLinkUnderline?: boolean;
  dimInactiveLinks?: boolean;
  showMedia?: boolean;
}

const defaultPrimaryLinks: DisplacementNavbarLink[] = [
  { label: "Components" },
  { label: "Templates" },
  { label: "Showcase" },
  { label: "Docs" },
];

const defaultInfoLinks: DisplacementNavbarLink[] = [
  { label: "About" },
  { label: "Pricing" },
  { label: "Changelog" },
  { label: "Contact" },
];

const defaultSocials: DisplacementNavbarLink[] = [
  { label: "X" },
  { label: "GitHub" },
  { label: "Discord" },
];

const defaultMedia: DisplacementNavbarMedia[] = [
  {
    src: "https://picsum.photos/seed/img01/1600/1200",
    caption: "Drop-in motion primitives",
  },
  {
    src: "https://picsum.photos/seed/img02/1600/1200",
    caption: "Full pages, wired and ready",
  },
  {
    src: "https://picsum.photos/seed/img03/1600/1200",
    caption: "Built with Hyperiux in the wild",
  },
  {
    src: "https://picsum.photos/seed/img04/1600/1200",
    caption: "Guides, props and recipes",
  },
];

const EASE = "expo.out";
const IMG_PARK_SCALE = 1.08;
const MARK_DURATION = 0.45;

const MARK_UNSPIN_LEAD = 0.11;
const MARK_BLOCK_WIDTH = "100%";
const MARK_BLOCK_HEIGHT = "2px";
const PAGE_CONTENT_DIM = 0.8;

const RM_EASE = "power1.out";
const RM_OPEN_DURATION = 0.2;
const RM_CLOSE_DURATION = 0.16;
const RM_CONTENT_DURATION = 0.15;
const RM_IMG_FADE = 0.2;

const DisplacementNavbar = ({
  primaryLinks = defaultPrimaryLinks,
  infoLinks = defaultInfoLinks,
  media = defaultMedia,
  
  email = "hello@hyperiux.com",
  socials = defaultSocials,
  cities = "Remote / Worldwide",
  className = "",
  children,
  openDuration = 0.65,
  closeDuration = 0.65,
  contentStagger = 0.055,
  imageSwapDuration = 0.5,
  shelfBackground = "#151515",
  pageGradientFrom = "#0D47A1",
  pageGradientTo = "#E3F2FD",
  pageBackground,
  linkColor = "#f4f3f1",
  mutedColor = "rgba(244,243,241,0.38)",
  hairlineColor = "rgba(244,243,241,0.14)",
  charStagger = 0.01,
  showLinkUnderline = true,
  dimInactiveLinks = true,
  showMedia = true,
}: DisplacementNavbarProps) => {
  const resolvedPageBackground =
    pageBackground ??
    `linear-gradient(160deg, ${pageGradientFrom} 0%, ${pageGradientTo} 100%)`;

  const wrapRef = useRef<HTMLDivElement | null>(null);
  const barRef = useRef<HTMLDivElement | null>(null);
  const barLineRef = useRef<HTMLSpanElement | null>(null);
  const markLineRef = useRef<HTMLSpanElement | null>(null);
  const markBlockRef = useRef<HTMLSpanElement | null>(null);
  const markMiddleRef = useRef<HTMLSpanElement | null>(null);
  const shelfRef = useRef<HTMLDivElement | null>(null);
  const pageRef = useRef<HTMLDivElement | null>(null);
  const primaryNavRef = useRef<HTMLDivElement | null>(null);
  const pageContentRef = useRef<HTMLDivElement | null>(null);
  const contentRefs = useRef<HTMLElement[]>([]);
  const imageRefs = useRef<HTMLDivElement[]>([]);
  const captionRef = useRef<HTMLSpanElement | null>(null);

  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const scrollYRef = useRef(0);
  const scrollLockStylesRef = useRef<{
    htmlOverflow: string;
    bodyOverflow: string;
    bodyPosition: string;
    bodyTop: string;
    bodyWidth: string;
    bodyPaddingRight: string;
  } | null>(null);
  const activeMediaRef = useRef(0);

  const [isOpen, setIsOpen] = useState(false);
  const phase = useRef<"closed" | "opening" | "open" | "closing">("closed");

  const reducedMotion = usePrefersReducedMotion();
  const reducedRef = useRef(reducedMotion);
  const timingRef = useRef({
    openDuration,
    closeDuration,
    contentStagger,
    imageSwapDuration,
  });

  useEffect(() => {
    reducedRef.current = reducedMotion;
    timingRef.current = {
      openDuration,
      closeDuration,
      contentStagger,
      imageSwapDuration,
    };
  });

  const registerContent = useCallback(
    (node: HTMLElement | null, index: number) => {
      if (node) contentRefs.current[index] = node;
    },
    [],
  );

  const registerImage = useCallback(
    (node: HTMLDivElement | null, index: number) => {
      if (node) imageRefs.current[index] = node;
    },
    [],
  );

  const markOffsets = useCallback(() => {
    const h = markLineRef.current?.parentElement?.offsetHeight ?? 14;
    return { line: -h * 0.28, block: h * 0.28, nudge: h * 0.38 };
  }, []);

  useLayoutEffect(() => {
    const marks = markOffsets();
    gsap.set(markLineRef.current, {
      xPercent: -50,
      yPercent: -50,
      y: marks.line,
      rotation: 0,
    });
    gsap.set(markBlockRef.current, {
      xPercent: -50,
      yPercent: -50,
      y: marks.block,
      rotation: 0,
      width: MARK_BLOCK_WIDTH,
      height: MARK_BLOCK_HEIGHT,
    });
    gsap.set(markMiddleRef.current, {
      xPercent: -50,
      yPercent: -50,
      y: 0,
      autoAlpha: 1,
    });
    gsap.set(pageContentRef.current, { autoAlpha: 1 });
    gsap.set(barLineRef.current, { scaleX: 0 });
    gsap.set(shelfRef.current, {
      y: -(
        (shelfRef.current?.offsetHeight ?? 0) + (barRef.current?.offsetHeight ?? 0)
      ),
    });
    gsap.set(contentRefs.current, { autoAlpha: 0, y: reducedMotion ? 0 : -18 });
    imageRefs.current.forEach((el, i) => {
      if (reducedMotion) {
        gsap.set(el, {
          yPercent: 0,
          autoAlpha: i === 0 ? 1 : 0,
          zIndex: i === 0 ? 1 : 0,
          scale: 1,
        });
      } else {
        gsap.set(el, {
          yPercent: i === 0 ? 0 : 101,
          autoAlpha: 1,
          zIndex: i === 0 ? 1 : 0,
          scale: IMG_PARK_SCALE,
        });
      }
    });
  }, [markOffsets, reducedMotion]);

  const swapMedia = useCallback(
    (index: number) => {
      if (index === activeMediaRef.current) return;
      const images = imageRefs.current;
      const next = images[index];
      const prev = images[activeMediaRef.current];
      if (!next) return;
      const direction = index > activeMediaRef.current ? 1 : -1;
      activeMediaRef.current = index;
      const swapDur = timingRef.current.imageSwapDuration;

      if (reducedRef.current) {
        gsap.killTweensOf(images);
        images.forEach((el) => {
          if (el !== next && el !== prev)
            gsap.set(el, { autoAlpha: 0, yPercent: 0, zIndex: 0 });
        });
        gsap.set(next, { yPercent: 0, zIndex: 2 });
        if (prev) gsap.set(prev, { zIndex: 1 });
        gsap.to(next, {
          autoAlpha: 1,
          duration: RM_IMG_FADE,
          ease: RM_EASE,
          overwrite: "auto",
        });
        if (prev)
          gsap.to(prev, {
            autoAlpha: 0,
            duration: RM_IMG_FADE,
            ease: RM_EASE,
            overwrite: "auto",
          });
      } else {
        gsap.killTweensOf(images, "yPercent");
        images.forEach((el) => {
          if (el !== next && el !== prev)
            gsap.set(el, { yPercent: 101 * direction, zIndex: 0 });
        });
        gsap.set(next, { yPercent: -100 * direction, zIndex: 2 });
        if (prev) gsap.set(prev, { zIndex: 1 });

        gsap.to(next, {
          yPercent: 0,
          duration: swapDur,
          ease: EASE,
          overwrite: "auto",
        });
        if (prev)
          gsap.to(prev, {
            yPercent: 100 * direction,
            duration: swapDur,
            ease: EASE,
            overwrite: "auto",
          });
      }

      if (captionRef.current) {
        gsap.killTweensOf(captionRef.current);
        if (reducedRef.current) {
          captionRef.current.textContent = media[index]?.caption ?? "";
          gsap.fromTo(
            captionRef.current,
            { autoAlpha: 0 },
            {
              autoAlpha: 1,
              duration: RM_IMG_FADE,
              ease: RM_EASE,
              overwrite: "auto",
            },
          );
        } else {
          gsap.to(captionRef.current, {
            autoAlpha: 0,
            duration: 0.12,
            ease: "power1.out",
            onComplete: () => {
              if (captionRef.current)
                captionRef.current.textContent = media[index]?.caption ?? "";
              gsap.to(captionRef.current, {
                autoAlpha: 1,
                duration: 0.24,
                ease: "power1.out",
              });
            },
          });
        }
      }
    },
    [media],
  );

  const unlockScroll = useCallback(() => {
    const styles = scrollLockStylesRef.current;
    if (!styles) return;

    document.documentElement.style.overflow = styles.htmlOverflow;
    document.body.style.overflow = styles.bodyOverflow;
    document.body.style.position = styles.bodyPosition;
    document.body.style.top = styles.bodyTop;
    document.body.style.width = styles.bodyWidth;
    document.body.style.paddingRight = styles.bodyPaddingRight;
    scrollLockStylesRef.current = null;
    window.scrollTo(0, scrollYRef.current);
  }, []);

  const open = useCallback(() => {
    if (phase.current === "open" || phase.current === "opening") return;
    timelineRef.current?.kill();

    const barH = barRef.current?.offsetHeight ?? 0;
    const shelfH = shelfRef.current?.offsetHeight ?? 0;
    const distance = shelfH + barH;
    scrollYRef.current = window.scrollY;

    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    scrollLockStylesRef.current = {
      htmlOverflow: document.documentElement.style.overflow,
      bodyOverflow: document.body.style.overflow,
      bodyPosition: document.body.style.position,
      bodyTop: document.body.style.top,
      bodyWidth: document.body.style.width,
      bodyPaddingRight: document.body.style.paddingRight,
    };
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollYRef.current}px`;
    document.body.style.width = "100%";
    if (scrollbar > 0) document.body.style.paddingRight = `${scrollbar}px`;

    if (shelfRef.current) {
      shelfRef.current.style.visibility = "visible";
      shelfRef.current.style.pointerEvents = "auto";
    }

    phase.current = "opening";
    setIsOpen(true);

    const tl = gsap.timeline({
      defaults: { force3D: true, overwrite: "auto" },
      onComplete: () => {
        phase.current = "open";
      },
    });
    timelineRef.current = tl;

    const rm = reducedRef.current;
    const t = timingRef.current;
    const ease = rm ? RM_EASE : EASE;
    const openDur = rm ? RM_OPEN_DURATION : t.openDuration;
    const markDur = rm ? RM_OPEN_DURATION : MARK_DURATION;

    tl.to(pageRef.current, { y: distance, duration: openDur, ease }, 0);
    tl.to(
      pageContentRef.current,
      { autoAlpha: PAGE_CONTENT_DIM, duration: openDur, ease },
      0,
    );
    tl.to(shelfRef.current, { y: 0, duration: openDur, ease }, 0);
    tl.to(
      barLineRef.current,
      {
        scaleX: 1,
        duration: rm ? openDur : Math.max(openDur, 0.1) * 1.2,
        ease,
      },
      0,
    );
    tl.to(
      markLineRef.current,
      { y: 0, rotation: 45, duration: markDur, ease },
      0,
    );
    tl.to(
      markBlockRef.current,
      {
        y: 0,
        rotation: -45,
        width: "100%",
        height: 2,
        duration: markDur,
        ease,
      },
      0,
    );
    tl.to(
      markMiddleRef.current,
      { autoAlpha: 0, scaleX: 0, duration: markDur, ease },
      0,
    );
    tl.to(
      contentRefs.current,
      rm
        ? {
            autoAlpha: 1,
            y: 0,
            duration: RM_CONTENT_DURATION,
            stagger: 0,
            ease,
          }
        : {
            autoAlpha: 1,
            y: 0,
            duration: 0.5,
            stagger: t.contentStagger,
            ease,
          },
      rm ? 0.05 : 0.195,
    );
    if (!rm) {
      tl.to(
        imageRefs.current,
        { scale: 1, duration: openDur, ease: EASE },
        0.195,
      );
    }
  }, []);

  const close = useCallback(() => {
    if (phase.current === "closed" || phase.current === "closing") return;
    timelineRef.current?.kill();

    phase.current = "closing";
    setIsOpen(false);

    const tl = gsap.timeline({
      defaults: { force3D: true, overwrite: "auto" },
      onComplete: () => {
        if (shelfRef.current) {
          shelfRef.current.style.visibility = "hidden";
          shelfRef.current.style.pointerEvents = "none";
        }
        phase.current = "closed";
        unlockScroll();
      },
    });
    timelineRef.current = tl;

    const rm = reducedRef.current;
    const t = timingRef.current;
    const ease = rm ? RM_EASE : EASE;
    const closeDur = rm ? RM_CLOSE_DURATION : t.closeDuration;
    const markDur = rm ? RM_CLOSE_DURATION : MARK_DURATION;

    gsap.set(contentRefs.current, { autoAlpha: 0, y: rm ? 0 : -18 });
    if (!rm) {
      tl.to(
        imageRefs.current,
        { scale: IMG_PARK_SCALE, duration: closeDur, ease: EASE },
        0,
      );
    }
    tl.to(pageRef.current, { y: 0, duration: closeDur, ease }, 0);
    tl.to(
      pageContentRef.current,
      { autoAlpha: 1, duration: closeDur, ease },
      0,
    );
    tl.to(
      shelfRef.current,
      {
        y: -(
          (shelfRef.current?.offsetHeight ?? 0) +
          (barRef.current?.offsetHeight ?? 0)
        ),
        duration: closeDur,
        ease,
      },
      0,
    );
    tl.to(
      barLineRef.current,
      {
        scaleX: 0,
        duration: rm ? closeDur : Math.max(closeDur, 0.1) * 1.2,
        ease,
      },
      0,
    );
    const marks = markOffsets();
    const markAt = rm ? 0 : MARK_UNSPIN_LEAD;
    tl.to(
      markLineRef.current,
      { y: marks.line, rotation: 0, duration: markDur, ease },
      markAt,
    );
    tl.to(
      markBlockRef.current,
      {
        y: marks.block,
        rotation: 0,
        width: MARK_BLOCK_WIDTH,
        height: MARK_BLOCK_HEIGHT,
        duration: markDur,
        ease,
      },
      markAt,
    );
    tl.to(
      markMiddleRef.current,
      { autoAlpha: 1, scaleX: 1, duration: markDur, ease },
      markAt,
    );
  }, [markOffsets, unlockScroll]);

  const toggle = useCallback(() => {
    if (phase.current === "open" || phase.current === "opening") close();
    else open();
  }, [open, close]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === "Escape" &&
        (phase.current === "open" || phase.current === "opening")
      )
        close();
    };
    const onPointerDown = (e: PointerEvent) => {
      if (phase.current !== "open" && phase.current !== "opening") return;
      const target = e.target as Node;
      if (
        barRef.current?.contains(target) ||
        shelfRef.current?.contains(target)
      )
        return;
      close();
    };
    const onGesture = () => {
      if (phase.current !== "open" && phase.current !== "opening") return;
      close();
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("wheel", onGesture, { passive: true });
    window.addEventListener("touchmove", onGesture, { passive: true });
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("wheel", onGesture);
      window.removeEventListener("touchmove", onGesture);
      unlockScroll();
    };
  }, [close, unlockScroll]);

  return (
    <div
      ref={wrapRef}
      data-menu-phase={isOpen ? "open" : "closed"}
      className={`relative min-h-screen ${className}`}
      style={{ backgroundColor: shelfBackground, color: linkColor }}
    >
      <header
        ref={barRef}
        className={`fixed top-0 left-0 right-0 z-30 backdrop-blur-md flex items-center justify-between h-[6vw] max-md:h-[20vw] max-lg:h-[12vw] px-[1.7vw] max-md:px-[5vw] max-lg:px-[2.6vw] transition-colors duration-300 ${isOpen ? "bg-transparent" : "bg-black/20"}`}
        style={{ color: linkColor }}
      >
        <a
          href="/"
          className="flex items-center gap-3 cursor-pointer "
        >
          <svg
            width="30"
            height="30"
            viewBox="0 0 58 65"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={` transition-all duration-300 motion-reduce:transition-none size-10 max-md:size-8`}
          >
            <path d="M0 0H9.02977V28.5943H0V0Z" fill="#ffffff" />
            <path
              d="M57.1895 64.7134H48.1597V36.1192H57.1895V64.7134Z"
              fill="#ffffff"
            />
            <path
              d="M0.0195312 36.1192V64.7135H9.0493V42.139L21.5405 37.4737V28.7449L0.0195312 36.1192Z"
              fill="#ffffff"
            />
            <path
              d="M48.1777 22.5746V0.00012207H57.3579V28.5944L34.332 37.8697V28.5944L48.1777 22.5746Z"
              fill="#ffffff"
            />
            <path
              d="M21.9912 29.0459L28.4868 26.8346C28.8573 26.7085 29.2624 26.7316 29.6161 26.8992L34.7834 29.3469M21.9912 29.0459L28.1616 32.2063M21.9912 29.0459V37.1727L28.1616 40.0321M34.7834 29.3469L28.1616 32.2063M34.7834 29.3469C34.7834 32.3443 34.7834 34.1753 34.7834 37.1727L28.1616 40.0321M28.1616 32.2063V40.0321"
              stroke="#ffffff"
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
              className={`transition-all duration-300 motion-reduce:transition-none`}
            >
              <path
                d="M315.441 6.10352e-05H306.862L320.055 15.9603L324.019 21.0695L306.862 42.139H315.591L332.597 21.0695L328.555 15.9603L315.441 6.10352e-05Z"
                fill="#ffffff"
              />
              <path
                d="M350.055 6.10352e-05H341.326L332.598 10.6853L336.962 15.9527L350.055 6.10352e-05Z"
                fill="#ffffff"
              />
              <path
                d="M349.905 42.139L341.176 42.139L332.598 31.7548L336.962 26.3369L349.905 42.139Z"
                fill="#ffffff"
              />
              <path
                d="M264.874 6.10352e-05H258.252V34.0122L269.088 42.139H289.555L300.391 34.0122V6.10352e-05H293.769V29.9349C293.769 30.4164 293.539 30.8688 293.149 31.152L287.543 35.2293C287.286 35.4164 286.976 35.5172 286.658 35.5172H271.985C271.667 35.5172 271.357 35.4164 271.1 35.2293L265.494 31.152C265.104 30.8688 264.874 30.4164 264.874 29.9349V6.10352e-05Z"
                fill="#ffffff"
              />
              <rect
                x="244.406"
                y="6.10352e-05"
                width="6.62183"
                height="42.1389"
                fill="#ffffff"
              />
              <path
                d="M195.043 0.000183105H228.002V6.62202H201.665V42.2896H195.043V0.000183105Z"
                fill="#ffffff"
              />
              <path
                d="M233.269 24.0796L237.182 18.1404V6.62202V0.000183105H195.043V6.62202H230.56V15.8023L225.594 24.0796H233.269Z"
                fill="#ffffff"
              />
              <path
                d="M221.078 17.7586H201.664V24.3804H217.466L229.205 42.139H237.163L221.078 17.7586Z"
                fill="#ffffff"
              />
              <path
                d="M182.401 24.3804V17.7585H162.235L153.205 27.9923H162.084L165.245 24.3804H182.401Z"
                fill="#ffffff"
              />
              <path
                d="M158.322 0H188.421V6.62183H161.031L152.904 15.9526V35.5171H188.421V42.1389H146.282V12.0397L158.322 0Z"
                fill="#ffffff"
              />
              <rect
                x="97.5234"
                y="17.7585"
                width="6.62183"
                height="24.3804"
                fill="#ffffff"
              />
              <path
                d="M139.662 0H97.5234V6.62183H133.041V17.7586H111.15L104.534 24.3804H133.643L139.662 18.0595V0Z"
                fill="#ffffff"
              />
              <path
                d="M55.3826 10.8357L55.3826 0H48.7607L48.7607 14.8991L66.5754 24.2299L66.5193 42.1389H73.1411V24.2299L90.8997 14.7486V0H84.2779V10.8357L69.8302 18.4786L55.3826 10.8357Z"
                fill="#ffffff"
              />
              <rect width="6.62183" height="42.1389" fill="#ffffff" />
              <rect
                x="35.5166"
                width="6.62183"
                height="42.1389"
                fill="#ffffff"
              />
              <rect
                x="6.62305"
                y="17.7585"
                width="28.8953"
                height="6.62183"
                fill="#ffffff"
              />
            </svg>
          </div>
        </a>

        <button
          type="button"
          onClick={toggle}
          onMouseEnter={() => {
            if (reducedMotion || phase.current !== "closed") return;
            const marks = markOffsets();
            gsap.to(markBlockRef.current, {
              y: marks.nudge,
              duration: 0.25,
              ease: EASE,
              overwrite: "auto",
            });
            gsap.to(markLineRef.current, {
              y: -marks.nudge,
              duration: 0.25,
              ease: EASE,
              overwrite: "auto",
            });
          }}
          onMouseLeave={() => {
            if (reducedMotion || phase.current !== "closed") return;
            const marks = markOffsets();
            gsap.to(markBlockRef.current, {
              y: marks.block,
              duration: 0.3,
              ease: EASE,
              overwrite: "auto",
            });
            gsap.to(markLineRef.current, {
              y: marks.line,
              duration: 0.3,
              ease: EASE,
              overwrite: "auto",
            });
          }}
          aria-expanded={isOpen}
          aria-controls="displacement-navbar-shelf"
          aria-label={isOpen ? "Close navigation" : "Open navigation"}
          className="group relative flex items-center justify-center w-[5vw] h-[5vw] max-md:w-[12vw] max-md:h-[12vw] max-lg:w-[5vw] max-lg:h-[5vw] mr-[-0.8vw] p-0 border-none bg-transparent cursor-pointer text-current"
        >
          <span
            className={`relative block w-[2.4vw] h-[1.6vw] max-md:w-[8vw] max-md:h-[8vw] max-lg:w-[3.5vw] max-lg:h-[3.5vw] transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none ${
              isOpen
                ? "group-hover:rotate-90 group-focus-visible:rotate-90"
                : ""
            }`}
          >
            <span
              ref={markLineRef}
              className="absolute top-1/2 left-1/2 w-full h-0.5 origin-center bg-current"
            />
            <span
              ref={markMiddleRef}
              className="absolute top-1/2 left-1/2 w-full h-0.5 origin-center bg-current"
            />
            <span
              ref={markBlockRef}
              className="absolute top-1/2 left-1/2 w-full h-0.5 origin-center bg-current"
            />
          </span>
        </button>

        <span
          ref={barLineRef}
          className="absolute left-[1.7vw] right-[1.7vw] max-md:left-[5vw] max-md:right-[5vw] max-lg:left-[2.6vw] max-lg:right-[2.6vw] bottom-0 h-px origin-center scale-x-0 pointer-events-none"
          style={{ backgroundColor: hairlineColor }}
        />
      </header>

      <div
        id="displacement-navbar-shelf"
        ref={shelfRef}
        aria-hidden={!isOpen}
        className="fixed top-[6vw] max-md:top-[20vw] max-lg:top-[12vw] left-0 right-0 z-25 invisible pointer-events-none border-b"
        style={
          {
            backgroundColor: shelfBackground,
            borderColor: hairlineColor,
            "--displacement-navbar-link": linkColor,
          } as React.CSSProperties
        }
      >
        <div className="py-[2.2vw] px-[1.7vw] max-md:py-[10vw] max-md:px-[5vw] max-lg:py-[4vw] max-lg:px-[2.6vw]">
          <div className="flex max-md:flex-col items-start gap-[4vw] max-md:gap-[10vw] max-lg:gap-[4vw]">
            <nav
              ref={primaryNavRef}
              aria-label="Site navigation"
              className="flex flex-col flex-none min-w-0"
              onMouseLeave={() => {
                if (reducedMotion || !dimInactiveLinks) return;
                contentRefs.current.forEach((el) => {
                  if (el?.dataset.role === "primary-link")
                    gsap.to(el, {
                      opacity: 1,
                      duration: 0.35,
                      ease: EASE,
                      overwrite: "auto",
                    });
                });
              }}
            >
              {primaryLinks.map((link, i) => (
                <div
                  key={link.label}
                  ref={(node) => registerContent(node, i)}
                  data-role="primary-link"
                  className="group relative flex w-fit items-baseline py-[0.7vw] max-md:py-[3.2vw] max-lg:py-[1.3vw]"
                  onMouseEnter={() => {
                    if (showMedia) swapMedia(i % media.length);
                    if (reducedMotion || !dimInactiveLinks) return;
                    contentRefs.current.forEach((el, idx) => {
                      if (el?.dataset.role === "primary-link") {
                        gsap.to(el, {
                          opacity: idx === i ? 1 : 0.4,
                          duration: 0.35,
                          ease: EASE,
                          overwrite: "auto",
                        });
                      }
                    });
                  }}
                >
                  <LinkHover
                    href={link.href ?? "#"}
                    reduced={reducedMotion}
                    staggerStep={charStagger}
                    showLine={showLinkUnderline}
                    className="w-fit text-[2.2vw] max-md:text-[7vw] max-lg:text-[3.4vw] font-light leading-[1.1] tracking-[-0.02em]"
                    style={{ color: linkColor }}
                  >
                    {link.label}
                  </LinkHover>
                </div>
              ))}
            </nav>

            <nav
              aria-label="Info"
              ref={(node) => registerContent(node, primaryLinks.length)}
              className="flex flex-col max-md:flex-row max-md:flex-wrap gap-[0.6vw] max-md:gap-y-[3.5vw] max-md:gap-x-[6vw] max-lg:gap-y-[1.5vw] max-lg:gap-x-[3vw] min-w-[8vw] flex-none mx-auto max-md:mx-0 pt-[0.7vw] max-md:pt-0"
            >
              <span
                className="w-full text-[0.65vw] max-md:text-[3vw] max-lg:text-[1.4vw] font-semibold tracking-[0.08em] uppercase"
                style={{ color: mutedColor }}
              >
                Info
              </span>
              {infoLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href ?? "#"}
                  className="w-fit no-underline text-[0.9vw] max-md:text-[3.5vw] max-lg:text-[1.7vw] font-normal tracking-[-0.01em] text-(--displacement-navbar-link) transition-colors duration-300 ease-out hover:text-white focus-visible:text-white"
                >
                  {link.label}
                </a>
              ))}
            </nav>

            {showMedia && (
              <figure
                ref={(node) => registerContent(node, primaryLinks.length + 1)}
                aria-hidden="true"
                className="m-0 w-[18vw] flex-none pt-[0.7vw] max-md:hidden"
              >
                <div className="relative aspect-3/2 overflow-hidden">
                  {media.map((item, i) => (
                    <div
                      key={item.src}
                      ref={(node) => registerImage(node, i)}
                      className="absolute inset-0 w-full h-full"
                    >
                      <img
                        src={item.src}
                        alt=""
                        className={`absolute inset-0 h-full w-full object-cover object-[50%_20%] ${
                          reducedMotion
                            ? ""
                            : "origin-[50%_20%] hover:scale-105 duration-300 transition-all ease-in-out"
                        }`}
                      />
                    </div>
                  ))}
                </div>
                <figcaption
                  ref={captionRef}
                  className="mt-[0.4vw] text-[0.65vw] tracking-[0.02em]"
                  style={{ color: mutedColor }}
                >
                  {media[0]?.caption}
                </figcaption>
              </figure>
            )}
          </div>

          <div
            ref={(node) =>
              registerContent(node, primaryLinks.length + (showMedia ? 2 : 1))
            }
            className="flex max-md:flex-col items-center max-md:items-start justify-between gap-[2vw] mt-[1.5vw] max-md:mt-[10vw] max-lg:mt-[4vw] pt-[0.85vw] max-md:pt-[7vw] max-lg:pt-[2.8vw] border-t text-[0.65vw] max-md:text-[3vw] max-lg:text-[1.4vw] max-md:gap-[5vw] max-lg:gap-[2.2vw]"
            style={{ borderColor: hairlineColor, color: mutedColor }}
          >
            <a
              href={`mailto:${email}`}
              className="w-fit text-sm no-underline text-(--displacement-navbar-link) opacity-80 transition-colors duration-300 ease-out hover:text-white hover:opacity-100 focus-visible:text-white focus-visible:opacity-100"
            >
              {email}
            </a>
            <span className="flex gap-[4vw] max-md:gap-[14vw] max-lg:gap-[6vw] ">
              {socials.map((social) => (
                <a
                  key={social.label}
                  href={social.href ?? "#"}
                  className="w-fit text-sm no-underline text-(--displacement-navbar-link) opacity-80 transition-colors duration-300 ease-out hover:text-white hover:opacity-100 focus-visible:text-white focus-visible:opacity-100"
                >
                  {social.label}
                </a>
              ))}
            </span>
            <span className="text-sm">{cities}</span>
          </div>
        </div>
      </div>

      <div
        ref={pageRef}
        className="relative z-20 min-h-screen pt-[4vw] max-md:pt-[16vw] max-lg:pt-[5.5vw] will-change-transform"
        style={{ background: resolvedPageBackground, color: "#111111" }}
      >
        <div ref={pageContentRef}>
          {children ?? (
            <div className="grid place-items-center min-h-[90vh] px-[1.7vw] max-md:px-[5vw] max-lg:px-[2.6vw]">
              <h1 className="m-0 text-[4vw] max-md:text-[9vw] max-lg:text-[4.5vw] font-light leading-[1.05] tracking-[-0.03em] text-center">
                Displacement Navbar
              </h1>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DisplacementNavbar;
