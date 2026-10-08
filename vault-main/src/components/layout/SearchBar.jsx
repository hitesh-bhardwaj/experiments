"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useLenis } from "lenis/react";
import { isRouteLoading } from "@/components/ui/RouteLoading";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { X } from "lucide-react";
import { getEffectHref } from "@/lib/categories";
import { prefersReducedMotion } from "@/lib/motion";
import { navCategoryColumns, navDocsItems } from "@/utils/Links";

gsap.registerPlugin(useGSAP);


const OPEN_DURATION = 0.7;
const CLOSE_DURATION = 0.5;
const OPEN_EASE = "power3.out";
const CLOSE_EASE = "power2.in";
// Reduced motion still shows the change, just as a short fade
const REDUCED_MOTION_FADE = 0.2;

const PANEL_CLOSED_SCALE = 0.8;

const HOME_ICON_SRC = "/svgs/menu/home.svg";

const FALLBACK_CATEGORY_ICON = "/svgs/menu/Featured.svg";
const FALLBACK_DOC_ICON = "/svgs/menu/Introduction.svg";

const FLAT_CATEGORY_ITEMS = navCategoryColumns.flat();

const DOC_ICON_BY_HREF = Object.fromEntries(
  navDocsItems.map((item) => [item.href, item.icon])
);

const CATEGORY_ICON_BY_HREF = Object.fromEntries(
  FLAT_CATEGORY_ITEMS.map((item) => [item.href, item.icon])
);

const CATEGORY_ICON_BY_LABEL = Object.fromEntries(
  FLAT_CATEGORY_ITEMS.map((item) => [normalizeIconKey(item.label), item.icon])
);

const CATEGORY_ICON_BY_SLUG = Object.fromEntries(
  FLAT_CATEGORY_ITEMS.map((item) => {
    const slug = item.href.split("/").filter(Boolean).at(-1);
    return [normalizeIconKey(slug), item.icon];
  })
);

const CATEGORY_ICON_ALIASES = {
  featured: "/svgs/menu/Featured.svg",

  text: "/svgs/menu/Text.svg",
  "text-animation": "/svgs/menu/Text.svg",
  "text-animations": "/svgs/menu/Text.svg",

  background: "/svgs/menu/Background.svg",
  backgrounds: "/svgs/menu/Background.svg",

  button: "/svgs/menu/Button.svg",
  buttons: "/svgs/menu/Button.svg",

  carousel: "/svgs/menu/carousel.svg",
  carousels: "/svgs/menu/carousel.svg",

  scroll: "/svgs/menu/Scroll.svg",
  "scroll-effect": "/svgs/menu/Scroll.svg",
  "scroll-effects": "/svgs/menu/Scroll.svg",

  component: "/svgs/menu/Component.svg",
  components: "/svgs/menu/Component.svg",

  nav: "/svgs/menu/Navigation.svg",
  navigation: "/svgs/menu/Navigation.svg",

  cursor: "/svgs/menu/Cursor.svg",
  cursors: "/svgs/menu/Cursor.svg",
  "cursor-effect": "/svgs/menu/Cursor.svg",
  "cursor-effects": "/svgs/menu/Cursor.svg",

  transition: "/svgs/menu/Transtion.svg",
  transitions: "/svgs/menu/Transtion.svg",
  "page-transition": "/svgs/menu/Transtion.svg",
  "page-transitions": "/svgs/menu/Transtion.svg",

  loader: "/svgs/menu/loader.svg",
  loaders: "/svgs/menu/loader.svg",

  webgl: "/svgs/menu/webGL.svg",
  "webgl-effect": "/svgs/menu/webGL.svg",
  "webgl-effects": "/svgs/menu/webGL.svg",

  other: "/svgs/menu/Featured.svg",
  others: "/svgs/menu/Featured.svg",
};

const DOC_SEARCH_ITEMS = [
  {
    href: "/",
    title: "Home",
    icon: HOME_ICON_SRC,
    description: "Return to the Hyperiux Vault landing page.",
    keywords: ["home", "landing", "index", "main"],
  },
  {
    href: "/docs",
    title: "Introduction",
    icon: DOC_ICON_BY_HREF["/docs"] || FALLBACK_DOC_ICON,
    description:
      "Overview of Hyperiux Vault, effects, categories, and workflow.",
    keywords: ["docs", "documentation", "intro", "overview", "vault"],
  },
  {
    href: "/docs/installation",
    title: "Installation Guide",
    icon: DOC_ICON_BY_HREF["/docs/installation"] || FALLBACK_DOC_ICON,
    description:
      "Install Hyperiux effects, initialize the CLI, and configure your project.",
    keywords: ["install", "installation", "setup", "init", "configuration"],
  },
  {
    href: "/docs/cli",
    title: "Hyperiux Vault CLI",
    icon: DOC_ICON_BY_HREF["/docs/cli"] || FALLBACK_DOC_ICON,
    description:
      "CLI commands for adding, upgrading, uninstalling, and managing effects.",
    keywords: ["cli", "command", "add", "upgrade", "doctor"],
  },
  {
    href: "/docs/dependencies",
    title: "Dependencies",
    icon: DOC_ICON_BY_HREF["/docs/dependencies"] || FALLBACK_DOC_ICON,
    description:
      "Dependency guidance for GSAP, Motion, Three.js, and generated effects.",
    keywords: ["dependencies", "gsap", "motion", "three", "packages"],
  },
  {
    href: "/docs/license",
    title: "License",
    icon: DOC_ICON_BY_HREF["/docs/license"] || FALLBACK_DOC_ICON,
    description: "Usage rights for Free Core and Vault Pro effects.",
    keywords: ["license", "licensing", "commercial", "pro", "free"],
  },
];

function normalizeIconKey(value = "") {
  return value
    .toString()
    .trim()
    .toLowerCase()
    .replaceAll("_", "-")
    .replaceAll("&", "and")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

function normalizeSearchValue(value = "") {
  return value.toString().trim().toLowerCase();
}

function getEffectPrimaryCategory(effect) {
  const categories = effect.categories?.length
    ? effect.categories
    : [effect.category];

  return normalizeIconKey(categories.filter(Boolean)[0] || "featured");
}

function getEffectCategoryIcon(effect) {
  const primaryCategory = getEffectPrimaryCategory(effect);

  return (
    CATEGORY_ICON_ALIASES[primaryCategory] ||
    CATEGORY_ICON_BY_SLUG[primaryCategory] ||
    CATEGORY_ICON_BY_LABEL[primaryCategory] ||
    CATEGORY_ICON_BY_HREF[`/effects/${primaryCategory}`] ||
    FALLBACK_CATEGORY_ICON
  );
}

function getEffectCategoryLabel(effect) {
  const categories = effect.categories?.length
    ? effect.categories
    : [effect.category];

  return categories.filter(Boolean).join(", ");
}

function getSafeEffectHref(effect) {
  if (effect.href) return effect.href;
  return getEffectHref(effect);
}

function SearchResultIcon({ src, alt = "" }) {
  return (
    <div className="flex h-10 w-10 items-center justify-center  border border-neutral-800/60 bg-neutral-900 text-neutral-800 transition-colors group-hover:border-neutral-600">
      <Image
        src={src || FALLBACK_CATEGORY_ICON}
        alt={alt}
        width={24}
        height={24}
        className="h-5 w-5 object-contain opacity-70 transition-opacity group-hover:opacity-100"
      />
    </div>
  );
}

export function SearchBar({
  value = "",
  onChange,
  placeholder = "Search effects...",
  totalCount = 0,
  className = "",
}) {
  return (
    <div className={`relative ${className}`}>
      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400">
        <svg
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>

      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full  border border-neutral-200 bg-neutral-100 py-3.5 pl-12 pr-4 text-neutral-900 transition-all placeholder:text-neutral-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-neutral-900"
      />

      {totalCount > 0 && (
        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-neutral-400">
          {totalCount} effects
        </div>
      )}
    </div>
  );
}

export function GlobalSearch({ effects = [], externalOpen = 0 }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [query, setQuery] = useState("");
  const [globalEffects, setGlobalEffects] = useState([]);
  const [hasTriedGlobalFetch, setHasTriedGlobalFetch] = useState(false);
  const [isLoadingGlobalEffects, setIsLoadingGlobalEffects] = useState(false);

  const inputRef = useRef(null);
  const externalOpenRef = useRef(externalOpen);
  const backdropRef = useRef(null);
  const panelRef = useRef(null);
  const tweenRef = useRef(null);

  const [lastOpen, setLastOpen] = useState(isOpen);
  if (isOpen !== lastOpen) {
    setLastOpen(isOpen);
    // Only a real open -> closed edge animates out
    setIsExiting(!isOpen && lastOpen);
  }
  const isMounted = isOpen || isExiting;

  const openSearch = useCallback(() => {
    setIsOpen(true);
  }, []);

  const router = useRouter();
  const lenis = useLenis();

  const normalizedPassedEffects = useMemo(() => {
    return Array.isArray(effects) ? effects.filter(Boolean) : [];
  }, [effects]);

  const searchableEffects = useMemo(() => {
    if (normalizedPassedEffects.length > 0) return normalizedPassedEffects;
    if (globalEffects.length > 0) return globalEffects;
    return [];
  }, [globalEffects, normalizedPassedEffects]);

  useEffect(() => {
    if (!isOpen) return;
    if (normalizedPassedEffects.length > 0) return;
    if (hasTriedGlobalFetch || isLoadingGlobalEffects) return;

    let cancelled = false;

    async function loadGlobalEffects() {
      setIsLoadingGlobalEffects(true);

      try {
        const response = await fetch("/api/effects/search-index", {
          method: "GET",
          cache: "force-cache",
        });

        if (!response.ok) {
          throw new Error(`Search index failed with ${response.status}`);
        }

        const data = await response.json();

        if (!cancelled) {
          setGlobalEffects(Array.isArray(data?.effects) ? data.effects : []);
        }
      } catch (error) {
        console.warn("Failed to load global search index:", error);

        if (!cancelled) {
          setGlobalEffects([]);
        }
      } finally {
        if (!cancelled) {
          setHasTriedGlobalFetch(true);
          setIsLoadingGlobalEffects(false);
        }
      }
    }

    loadGlobalEffects();

    return () => {
      cancelled = true;
    };
  }, [
    hasTriedGlobalFetch,
    isLoadingGlobalEffects,
    isOpen,
    normalizedPassedEffects.length,
  ]);

  useGSAP(
    () => {
      const backdrop = backdropRef.current;
      const panel = panelRef.current;
      if (!backdrop || !panel) return;

      // A new tween always replaces the one in flight
      tweenRef.current?.kill();

      const reduced = prefersReducedMotion();

      if (isOpen) {
        const timeline = gsap.timeline();
        tweenRef.current = timeline;

        if (reduced) {
          gsap.set(panel, { scale: 1 });
          timeline
            .fromTo(
              backdrop,
              { opacity: 0 },
              { opacity: 1, duration: REDUCED_MOTION_FADE, ease: "none" }
            )
            .fromTo(
              panel,
              { opacity: 0 },
              { opacity: 1, duration: REDUCED_MOTION_FADE, ease: "none" },
              0
            );
          return;
        }

        timeline
          .fromTo(
            backdrop,
            { opacity: 0 },
            { opacity: 1, duration: OPEN_DURATION, ease: OPEN_EASE }
          )
          .fromTo(
            panel,
            { opacity: 0, scale: PANEL_CLOSED_SCALE },
            { opacity: 1, scale: 1, duration: OPEN_DURATION, ease: OPEN_EASE },
            0
          );

        return;
      }

      const duration = reduced ? REDUCED_MOTION_FADE : CLOSE_DURATION;
      const ease = reduced ? "none" : CLOSE_EASE;

      const timeline = gsap.timeline({ onComplete: () => setIsExiting(false) });
      tweenRef.current = timeline;

      timeline
        .to(backdrop, { opacity: 0, duration, ease })
        .to(
          panel,
          {
            opacity: 0,
            scale: reduced ? 1 : PANEL_CLOSED_SCALE,
            duration,
            ease,
          },
          0
        );
    },
    { dependencies: [isOpen], revertOnUpdate: false }
  );

  useEffect(() => () => void tweenRef.current?.kill(), []);

  // Stop smooth scroll while search is open; start it again only when search
  // closes (not on every run), so it can't restart Lenis the page-change loader stopped.
  const stoppedLenisRef = useRef(false);
  useEffect(() => {
    if (isOpen) {
      lenis?.stop?.();
      stoppedLenisRef.current = true;
    } else if (stoppedLenisRef.current) {
      if (!isRouteLoading()) lenis?.start?.();
      stoppedLenisRef.current = false;
    }
  }, [isOpen, lenis]);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (externalOpenRef.current === externalOpen) return;

    externalOpenRef.current = externalOpen;

    if (externalOpen) {
      requestAnimationFrame(() => {
        openSearch();
      });
    }
  }, [externalOpen, openSearch]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      const key = event.key.toLowerCase();

      if ((event.metaKey || event.ctrlKey) && key === "k") {
        event.preventDefault();
        openSearch();
      }

      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [openSearch]);

  useEffect(() => {
    if (!isOpen) return;

    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  }, [isOpen]);

  const normalizedQuery = normalizeSearchValue(query);

  const filteredEffects = useMemo(() => {
    return searchableEffects.filter((effect) => {
      if (!normalizedQuery) return true;

      const categories = effect.categories?.length
        ? effect.categories
        : [effect.category];

      const searchableText = [
        effect.name,
        effect.title,
        effect.description,
        effect.slug,
        effect.effectSlug,
        effect.categorySlug,
        effect.category,
        ...(categories || []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(normalizedQuery);
    });
  }, [normalizedQuery, searchableEffects]);

  const filteredDocs = useMemo(() => {
    return DOC_SEARCH_ITEMS.filter((item) => {
      if (!normalizedQuery) return true;

      return (
        item.title.toLowerCase().includes(normalizedQuery) ||
        item.description.toLowerCase().includes(normalizedQuery) ||
        item.keywords.some((keyword) => keyword.includes(normalizedQuery))
      );
    });
  }, [normalizedQuery]);

  const forceStartLenis = () => {
    if (typeof document !== "undefined") {
      document.body.style.removeProperty("overflow");
    }

    // Never while the page-change loader is up (it restarts Lenis itself)
    const start = () => {
      if (!isRouteLoading()) lenis?.start?.();
    };
    start();
    requestAnimationFrame(start);
    window.setTimeout(start, 80);
  };

  const closeSearch = () => {
    setIsOpen(false);
    setQuery("");
    forceStartLenis();
  };

  const handleSelect = (item) => {
    router.push(item.href);
    closeSearch();
  };

  const handleEffectSelect = (effect) => {
    router.push(getSafeEffectHref(effect));
    closeSearch();
  };

  if (!isMounted) return null;

  return (
    <div className="fixed inset-0 z-999 flex items-start justify-center pt-[20vh]">
      <div
        ref={backdropRef}
        style={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm will-change-[opacity]"
        onClick={closeSearch}
      />

      <div
        ref={panelRef}
        style={{ opacity: 0, transform: `scale(${PANEL_CLOSED_SCALE})` }}
        className="relative mx-4 flex h-113 w-full max-w-xl flex-col overflow-hidden  border border-neutral-800/60 bg-neutral-950/90 ring-1 ring-white/5 backdrop-blur-xl will-change-[transform,opacity] max-lg:h-140 max-md:h-113"
      >
        <div className="flex items-center gap-3 border-b border-neutral-800/50 bg-black/20 px-4 py-4">
          <svg
            className="h-5 w-5 text-neutral-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>

          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search anything in Vault..."
            className="flex-1 bg-transparent text-base text-white placeholder:text-neutral-500 focus:outline-none sm:text-lg"
          />
          <kbd className="space-x-2 h-8 items-center flex justify-center bg-foreground/20 px-1.5 py-0.5 text-xs text-current opacity-50 max-lg:hidden">
                 ESC
                </kbd>

          {/* <kbd className="hidden h-8 items-center justify-center  border border-neutral-800 bg-neutral-900 px-2 text-xs font-medium text-neutral-400 sm:inline-flex">
            ESC
          </kbd> */}

          <button
            type="button"
            aria-label="Close search"
            onClick={closeSearch}
            className="group flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center  border border-neutral-800 bg-neutral-900 text-neutral-400 transition-colors hover:border-neutral-700 hover:text-white"
          >
            <X className="h-4 w-4 transition-transform duration-300 group-hover:rotate-90" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto" data-lenis-prevent="true">
          {filteredDocs.length === 0 && filteredEffects.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center px-4 text-center text-neutral-500">
              <svg
                className="mb-4 h-12 w-12 text-neutral-700"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>

              <p>
                No results found for &quot;
                <span className="text-neutral-300">{query}</span>&quot;
              </p>

              {isLoadingGlobalEffects ? (
                <p className="mt-1 text-sm text-neutral-600">
                  Loading global effects quietly...
                </p>
              ) : (
                <p className="mt-1 text-sm text-neutral-600">
                  Try searching with a different term.
                </p>
              )}
            </div>
          ) : (
            <div className="p-2">
                {filteredDocs.map((item) => (
                    <button
                      key={item.href}
                      onClick={() => handleSelect({ ...item, type: "docs" })}
                      className="group relative flex w-full cursor-pointer items-center gap-4 px-3 py-3 text-left transition-colors duration-200 hover:bg-neutral-800/50"
                    >
                      <SearchResultIcon src={item.icon} alt={item.title} />

                      <div className="flex-1">
                        <div className="font-medium text-neutral-200 transition-colors group-hover:text-white">
                          {item.title}
                        </div>

                        <div className="mt-0.5 text-xs text-neutral-400 transition-colors group-hover:text-neutral-200">
                          Docs · {item.description}
                        </div>
                      </div>

                      <svg
                        className="h-5 w-5 -translate-x-2 text-neutral-600 opacity-0 transition-all group-hover:translate-x-0 group-hover:text-neutral-400 group-hover:opacity-100"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </button>
                ))}

                {filteredEffects.map((effect) => {
                  const categoryIcon = getEffectCategoryIcon(effect);
                  const categoryLabel = getEffectCategoryLabel(effect);

                  return (
                    <button
                      key={effect.name || getSafeEffectHref(effect)}
                      onClick={() => handleEffectSelect(effect)}
                      className="group relative flex w-full cursor-pointer items-center gap-4  px-3 py-3 text-left transition-colors duration-200 hover:bg-neutral-800/50"
                    >
                      <SearchResultIcon
                        src={categoryIcon}
                        alt={categoryLabel || effect.title}
                      />

                      <div className="flex-1">
                        <div className="font-medium text-neutral-200 transition-colors group-hover:text-white">
                          {effect.title}
                        </div>

                        <div className="mt-0.5 text-xs capitalize text-neutral-500 transition-colors group-hover:text-neutral-400">
                          {categoryLabel}
                        </div>
                      </div>

                      <svg
                        className="h-5 w-5 -translate-x-2 text-neutral-600 opacity-0 transition-all group-hover:translate-x-0 group-hover:text-neutral-400 group-hover:opacity-100"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </button>
                  );
                })}

                {isLoadingGlobalEffects && searchableEffects.length === 0 && (
                  <div className="px-3 py-3 text-center text-xs text-neutral-600">
                    Loading global effects...
                  </div>
                )}
              </div>
          )}
        </div>
      </div>
    </div>
  );
}