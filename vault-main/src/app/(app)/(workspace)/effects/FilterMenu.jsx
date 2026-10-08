"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { prefersReducedMotion } from "@/lib/motion";
import { createPortal } from "react-dom";
import { ChevronDown, X } from "lucide-react";
import { EFFECT_SORT_OPTIONS, FILTER_OPTIONS } from "@/lib/effect-sort";
import { BREAKPOINTS } from "@/lib/breakpoints";

export { FILTER_OPTIONS };

export function FilterMenu({
  activeFilter,

  categoryFilter,
  getLabel,
  onSelect,
  onClear,
  options = FILTER_OPTIONS,
  variant = "icon",
  panelClassName = "",
  // "light" restyles the trigger and panel for light surfaces (the v4 listing sheet).
  tone = "dark",
}) {
  const light = tone === "light";
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [menuPos, setMenuPos] = useState(null);
  const [hoveredCat, setHoveredCat] = useState(null);
  const menuRef = useRef(null);
  const buttonRef = useRef(null);
  const panelRef = useRef(null);

  // SSR-safe mounted flag - the panel is portaled via createPortal, which
  // needs document.body and so can only run after mount.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  // Clear the hovered category whenever the menu closes - derived purely
  // from `open`, which is already available during render.
  if (!open && hoveredCat !== null) {
    setHoveredCat(null);
  }

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event) => {
      if (
        !menuRef.current?.contains(event.target) &&
        !panelRef.current?.contains(event.target)
      ) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    let handleReposition = null;

    if (menuPos) {
      handleReposition = (event) => {
        if (panelRef.current?.contains(event.target)) return;
        setOpen(false);
      };

      window.addEventListener("scroll", handleReposition, true);
      window.addEventListener("resize", handleReposition);
    }

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);

      if (handleReposition) {
        window.removeEventListener("scroll", handleReposition, true);
        window.removeEventListener("resize", handleReposition);
      }
    };
  }, [open, menuPos]);

  const handleToggle = () => {
    setOpen((isOpen) => {
      const next = !isOpen;

      if (
        next &&
        typeof window !== "undefined" &&
        window.innerWidth < BREAKPOINTS.lg
      ) {
        const rect = buttonRef.current?.getBoundingClientRect();

        if (rect) {
          setMenuPos({
            top: rect.bottom + 8,
            left: rect.left,
          });
        }
      } else {
        setMenuPos(null);
      }

      return next;
    });
  };

  // The panel slides down open (clip reveal), then its rows fade in
  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!open || !panel || prefersReducedMotion()) return undefined;
    const rows = Array.from(panel.children);
    const tl = gsap.timeline();
    tl.fromTo(panel, { clipPath: "inset(0 0 100% 0)" }, { clipPath: "inset(0 0 0% 0)", duration: 0.45, ease: "power3.out", clearProps: "clipPath" });
    tl.fromTo(rows, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: "power2.out", stagger: 0.03, clearProps: "opacity" }, 0.2);
    return () => tl.kill();
  }, [open]);

  const panel = open ? (
    <div
      ref={panelRef}
      role="menu"
      style={
        menuPos
          ? {
            top: menuPos.top,
            left: menuPos.left,
          }
          : undefined
      }
      className={[
        light
          ? "space-y-1.5 min-w-44 border border-black/10 bg-foreground p-1.5 shadow-[0_1.4vw_2.8vw_-1.4vw_color-mix(in_srgb,black_35%,transparent)]"
          : "space-y-1.5 min-w-44 border border-white/10 bg-black/20  p-1.5",
        menuPos ? "fixed z-9999" : "absolute left-0 top-[calc(100%+0.5vw)] z-30",
        panelClassName,
      ]
        .filter(Boolean)
        .join(" ")}
      onMouseLeave={() => setHoveredCat(null)}
    >
      {options.map((cat, index) => {
        const isSelected = (categoryFilter ?? activeFilter) === cat;
        const highlighted = hoveredCat ? hoveredCat === cat : isSelected;
        const showDivider =
          EFFECT_SORT_OPTIONS.includes(cat) &&
          !EFFECT_SORT_OPTIONS.includes(options[index - 1]);

        return (
          <div key={cat} className="flex flex-col gap-1.5">
            {showDivider && (
              <span
                aria-hidden="true"
                className={`block h-px w-full ${light ? "bg-black/10" : "bg-foreground/10"}`}
              />
            )}
            <button
              type="button"
              role="menuitem"
              onMouseEnter={() => setHoveredCat(cat)}
              onClick={() => {
                onSelect(cat);
                setOpen(false);
              }}
              className={`group relative isolate flex w-full items-center  px-4 py-2.5 text-left cursor-pointer ${light ? "text-sm" : "max-md:text-[4vw] text-[1vw]"}`}
            >
              <span
                aria-hidden="true"
                className={`absolute inset-0 z-0 origin-top bg-primary transition-transform duration-300 ease-out motion-reduce:transition-none ${highlighted ? "scale-y-100" : "scale-y-0"
                  }`}
              />
              <span
                className={`relative z-10 leading-none transition-colors duration-200 ${highlighted ? "text-background" : light ? "text-ink" : "text-foreground"
                  }`}
              >
                {getLabel(cat)}
              </span>
            </button>
          </div>
        );
      })}
    </div>
  ) : null;

  return (
    <div ref={menuRef} className="relative shrink-0">
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Filter effects"
        className={
          light
            ? `relative flex h-9.5 cursor-pointer items-center justify-center gap-2 px-4 text-sm transition-colors duration-300 ${activeFilter
              ? "bg-primary text-background"
              : "bg-foreground text-ink ring-1 ring-inset ring-black/10 transition-shadow hover:ring-primary"
            }`
            : `
          px-6 py-3  relative max-md:px-7 max-md:py-3
          backdrop-blur-lg flex items-center gap-2 justify-center
          cursor-pointer transition-colors duration-300 text-[1vw] max-md:text-[4vw] max-lg:text-[2.5vw]
          ${activeFilter
              ? "bg-primary text-background hover:bg-primary"
              : "bg-black/20 backdrop-blur-lg text-foreground hover:text-background hover:bg-primary"
            }
        `}
      >
        {variant === "label" ? (
          <>
            <span className="leading-none">{getLabel(categoryFilter)}</span>
            <ChevronDown
              className={`h-4 w-4 shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""
                }`}
            />
          </>
        ) : (
          <>
            <svg width="16" height="12" viewBox="0 0 16 12" fill="none" xmlns="http://www.w3.org/2000/svg" className={light ? "h-3 w-4" : "max-md:h-[4vw] h-[1vw] max-lg:h-[2.5vw]"}>
              <g clipPath="url(#clip0_491_803)">
                <rect width="16" height="2" rx="1" fill="currentColor" />
                <rect x="3" y="5" width="10" height="2" rx="1" fill="currentColor" />
                <rect x="5.5" y="10" width="5" height="2" rx="1" fill="currentColor" />
              </g>
              <defs>
                <clipPath id="clip0_491_803">
                  <rect width="16" height="12" fill="white" />
                </clipPath>
              </defs>
            </svg>

            {activeFilter ? (
              <>
                <span className="leading-none">{getLabel(activeFilter)}</span>
                {onClear && (
                  <span
                    role="button"
                    tabIndex={0}
                    aria-label="Clear filter"
                    onClick={(event) => {
                      event.stopPropagation();
                      onClear();
                    }}
                    onKeyDown={(event) => {
                      if (event.key !== "Enter" && event.key !== " ") return;
                      event.preventDefault();
                      event.stopPropagation();
                      onClear();
                    }}
                    className="flex shrink-0 items-center justify-center hover:bg-black/10"
                  >
                    <X className="h-3.5 w-3.5" />
                  </span>
                )}
              </>
            ) : null}
          </>
        )}
      </button>

      {panel &&
        (menuPos && mounted
          ? createPortal(panel, document.body)
          : panel)}
    </div>
  );
}
