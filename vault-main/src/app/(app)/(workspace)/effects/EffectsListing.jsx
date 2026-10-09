"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/dist/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { AnimatePresence, motion } from "motion/react";
import { Search, X } from "lucide-react";
import { AppVaultHeader } from "@/components/layout/AppVaultHeader";
import { useVaultLayout } from "@/components/layout/VaultLayout";
import {
  effectCategories,
  effectsOverviewContent,
  getEffectCategoryBySlug,
  getEffectCategoryContent,
  getEffectCategoryHref,
  getEffectCategoryMetadata,
  getQuickCategoryLabel,
  resolveEffectCategoryId,
} from "@/lib/categories";
import { getFeaturedEffectsByCategory, getOverviewFeaturedEffects } from "@/lib/featured-effects";
import { sortEffects } from "@/lib/effect-sort";
import FAQ from "@/homepage/sections/FAQ";
import Button from "@/homepage/components/Button";
import { FilterMenu } from "./FilterMenu";
import { DISPLAY, EffectCard, LABEL } from "./EffectCard";
import { Modal, useEffectCardActions } from "./useEffectCardActions";
import { PreviewDrawer } from "./PreviewDrawer";
import { CustomAnimationCta } from "./CustomAnimationCta";
import { SliderArrowButton } from "@/components/ui/SliderArrowButton";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import HeadAnim from "@/components/Animations/HeadAnim";
import Copy from "@/components/Animations/Copy";
import { MEDIA } from "@/lib/breakpoints";
import RollNumber from "@/components/Pricing/exploded/RollNumber";
import RollText from "@/components/Pricing/exploded/RollText";

gsap.registerPlugin(useGSAP, ScrollTrigger);

// Effects load in batches of 30; the next batch comes in from the "Show more" button.
const PAGE = 30;
const COLS_KEY = "hyperiux-effects-v4-cols";
// "trend" is the default (server) order; the rest live in the filter dropdown.
const SORTS = {
  trend: "Trending",
  "free-first": "Free first",
  recent: "Newest",
  az: "A to Z",
  za: "Z to A",
};
const SORT_OPTIONS = ["free-first", "recent", "az", "za"];
const sortLabel = (id) => SORTS[id] || SORTS.trend;
const TIERS = [
  { id: "all", label: "All" },
  { id: "free", label: "Free" },
  { id: "pro", label: "Pro" },
];
// Card widths for the catalogue (flex-wrap, gap-x 1.4vw): 2 or 3 per row on desktop
const GRID_COLS = { 2: "w-[calc((100%-1.4vw)/2)]", 3: "w-[calc((100%-2.8vw)/3)]" };
// Two- and three-pane window icons for the column switch.
const COLUMN_ICONS = {
  2: (
    <>
      <rect x="3.5" y="4.5" width="7.5" height="15" />
      <rect x="13" y="4.5" width="7.5" height="15" />
    </>
  ),
  3: (
    <>
      <rect x="2.5" y="4.5" width="5" height="15" />
      <rect x="9.5" y="4.5" width="5" height="15" />
      <rect x="16.5" y="4.5" width="5" height="15" />
    </>
  ),
};
const COLUMN_ITEMS = [2, 3].map((n) => ({
  id: n,
  ariaLabel: `${n} cards per row`,
  label: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="size-4" aria-hidden="true">
      {COLUMN_ICONS[n]}
    </svg>
  ),
}));
// Same card layout animation as the /effects grid.
const CARD_LAYOUT_TRANSITION = { layout: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } };

/* ---------- text sizes (vw: desktop · tablet · mobile) ---------- */
const T11 = "text-[0.76vw] max-lg:text-[1.4vw] max-md:text-[2.9vw]";
const T13 = "text-[0.9vw] max-lg:text-[1.6vw] max-md:text-[3.3vw]";
const T14 = "text-[0.97vw] max-lg:text-[1.7vw] max-md:text-[3.6vw]";
const T15 = "text-[1.04vw] max-lg:text-[1.8vw] max-md:text-[3.8vw]";
const T16 = "text-[1.1vw] max-lg:text-[1.95vw] max-md:text-[4.1vw]";
const T18 = "text-[1.25vw] max-lg:text-[2.2vw] max-md:text-[4.4vw]";
const T20 = "text-[1.4vw] max-lg:text-[2.4vw] max-md:text-[5vw]";
const T28 = "text-[1.95vw] max-lg:text-[3.4vw] max-md:text-[7vw]";

/* ---------- class tokens ---------- */
// The standard section wrapper: capped width + page gutter
const WRAP = "mx-auto w-full max-w-[1536px] px-[4.5vw] max-md:px-[6vw]";

const CHIP =
  `inline-flex h-8 shrink-0 cursor-pointer items-center gap-[0.5vw] px-3 ${T13} transition-[background-color,color,box-shadow] duration-500 max-md:gap-[2vw]`;
const CHIP_OFF = "text-black/60 ring-1 ring-inset ring-black/10 hover:text-ink hover:ring-primary";
const CHIP_ON = "bg-primary text-background";


// Active filter chips: scale + fade in/out, the rest slide into place
const FILTER_SPRING = { type: "spring", stiffness: 500, damping: 35, mass: 0.8 };

const countWord = (n) => (n === 1 ? "effect" : "effects");

function readStoredCols() {
  try {
    const stored = Number(window.localStorage.getItem(COLS_KEY));
    return stored === 2 ? 2 : 3;
  } catch {
    return 3;
  }
}

const TIER_SCOPES = ["free", "pro"];

/**
 * The effects listing. On /effects it shows everything; a category
 * route (/effects/[slug]) passes:
 *  - `scope`: the page's starting filter - "free" | "pro" | "featured" | a category id,
 *  - `content`: that page's copy from lib/categories (name, description, faqs, cta).
 * Category chips then switch between these pages client-side (selectCategory).
 */
export function EffectsListing({
  effects = [],
  trendingEffects: initialTrending = [],
  featuredNames = [],
  userPlan = "free",
  scope: initialScope = null,
  content: initialContent = effectsOverviewContent,
}) {
  const searchParams = useSearchParams();

  /* ---------- the page being shown ---------- */
  // Category chips switch the page in place - hero copy, stats, trending, cards, FAQ
  // and the URL (/effects/<category>) change, but nothing reloads or scrolls. The
  // server props describe the page that was first loaded.
  const [scope, setScope] = useState(initialScope);
  const content = useMemo(
    () => (scope === initialScope ? initialContent : scope ? getEffectCategoryContent(scope) : effectsOverviewContent),
    [scope, initialScope, initialContent],
  );
  const scopeCategory = scope && !TIER_SCOPES.includes(scope) && scope !== "featured" ? scope : null;
  const trendingEffects = useMemo(
    () =>
      scope === initialScope
        ? initialTrending
        : scopeCategory
          ? getFeaturedEffectsByCategory(effects, scopeCategory)
          : getOverviewFeaturedEffects(effects),
    [scope, initialScope, initialTrending, scopeCategory, effects],
  );
  // Save / copy install / Pro lock for every card and the drawer (shared with the effect page).
  const { isProUser, mounted, canInstall, isWishlisted, copyInstall, toggleWishlist, cardActions, overlays } =
    useEffectCardActions({ userPlan });

  /* ---------- filter state (seeded from the URL so links are shareable) ---------- */
  // `filter` is the old listing's query param (?filter=free|pro|featured) - still honoured
  // so existing links and bookmarks land on the same view.
  const legacyFilter = searchParams.get("filter");
  const [tier, setTier] = useState(() =>
    TIER_SCOPES.includes(searchParams.get("tier"))
      ? searchParams.get("tier")
      : TIER_SCOPES.includes(legacyFilter)
        ? legacyFilter
        : TIER_SCOPES.includes(scope)
          ? scope
          : "all",
  );
  const [featured, setFeatured] = useState(() => searchParams.get("featured") === "1" || legacyFilter === "featured" || scope === "featured");
  // On a category route the category comes from the route, not the query string.
  // ?category= is the old in-place filter link - still honoured on /effects.
  const [category, setCategory] = useState(() => scopeCategory || (initialScope ? null : searchParams.get("category")) || null);
  const [query, setQuery] = useState(() => searchParams.get("q") || "");
  const [sort, setSort] = useState(() => (SORTS[searchParams.get("sort")] ? searchParams.get("sort") : "trend"));
  const [cols, setCols] = useState(3);
  const [shown, setShown] = useState(PAGE);
  const [drawerEffect, setDrawerEffect] = useState(null);
  const [upgradeDismissed, setUpgradeDismissed] = useState(false);
  const justUpgraded = searchParams.get("upgraded") === "true";

  const rootRef = useRef(null);
  const gridRef = useRef(null);
  const sheetRef = useRef(null);
  const searchRef = useRef(null);
  const trendRef = useRef(null);
  const [trendEdges, setTrendEdges] = useState({ start: true, end: false });

  /* ---------- derived data ---------- */
  const featuredSet = useMemo(() => new Set(featuredNames), [featuredNames]);

  const categoryOptions = useMemo(() => {
    const counts = {};
    for (const effect of effects) {
      const id = resolveEffectCategoryId(effect);
      if (id) counts[id] = (counts[id] || 0) + 1;
    }
    return effectCategories.filter((c) => c.id !== "featured" && counts[c.id]).map((c) => ({ id: c.id, name: c.name, count: counts[c.id] }));
  }, [effects]);


  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = effects.filter((effect) => {
      if (tier === "free" && effect.tier === "pro") return false;
      if (tier === "pro" && effect.tier !== "pro") return false;
      if (featured && !featuredSet.has(effect.name)) return false;
      const catId = resolveEffectCategoryId(effect);
      if (category && catId !== category) return false;
      if (q) {
        const haystack = [effect.title, effect.name, catId, effect.description, ...(effect.tags || []), effect.tier].join(" ").toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
    if (sort === "free-first") return [...list].sort((a, b) => (a.tier === "pro") - (b.tier === "pro"));
    return sort === "trend" ? list : sortEffects(list, sort);
  }, [effects, tier, featured, featuredSet, category, query, sort]);

  const visible = filtered.slice(0, shown);
  const hasMore = shown < filtered.length;
  const filterKey = [tier, featured, category, query.trim(), sort].join("|");
  const categoryName = categoryOptions.find((c) => c.id === category)?.name;
  const context = featured ? "Featured" : categoryName || (tier !== "all" ? `${tier === "free" ? "Free" : "Pro"} effects` : "");

  const actives = [
    tier !== "all" && !TIER_SCOPES.includes(scope) && { id: "tier", label: tier === "free" ? "Free" : "Pro", clear: () => setTier("all") },
    featured && { id: "featured", label: "Featured", clear: () => setFeatured(false) },
    category && { id: "category", roll: true, label: getQuickCategoryLabel(category), clear: () => selectCategory(null) },
    query.trim() && { id: "q", label: `“${query.trim()}”`, clear: () => setQuery("") },
  ].filter(Boolean);

  // A category chip: show that category's page (or the overview for null) in place.
  // Leaving a Free / Pro / Featured page drops the filter that page started with.
  const selectCategory = (id) => {
    if (TIER_SCOPES.includes(scope)) setTier("all");
    if (scope === "featured") setFeatured(false);
    setCategory(id);
    setScope(id);
    window.history.pushState(window.history.state, "", `${getEffectCategoryHref(id || "all")}${window.location.search}`);
  };

  // Back / forward between pages switched in place: read the page from the URL.
  useEffect(() => {
    const onPopState = () => {
      const slug = window.location.pathname.replace(/^\/effects\/?/, "").split("/")[0];
      const next = !slug ? null : ["free", "pro", "featured"].includes(slug) ? slug : getEffectCategoryBySlug(slug)?.id;
      if (next === undefined) return;
      const nextCategory = next && !TIER_SCOPES.includes(next) && next !== "featured" ? next : null;
      setScope(next);
      setCategory(nextCategory);
      setTier(TIER_SCOPES.includes(next) ? next : "all");
      setFeatured(next === "featured");
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const clearAll = useCallback(() => {
    setTier("all");
    setFeatured(false);
    setCategory(null);
    setQuery("");
  }, []);

  /* ---------- columns ⇄ sidebar (same behaviour as /effects) ---------- */
  // 3 per row only fits with the sidebar closed: picking 3 closes it, and opening
  // the sidebar drops the grid back to 2. The cards animate to their new slots
  // through motion's `layout` (see the grid below), exactly like /effects.
  const { isSidebarOpen, toggleSidebar } = useVaultLayout();

  // Going to 3 with the sidebar open: close the sidebar first and switch the grid once
  // it has finished (its width transition is 300ms). Doing both at once had the cards'
  // layout animation aim at slots the widening container then moved - a visible jump.
  // The toggle itself shows the choice straight away (pendingCols).
  const [pendingCols, setPendingCols] = useState(null);
  const colsTimerRef = useRef(0);
  useEffect(() => () => clearTimeout(colsTimerRef.current), []);

  const chooseCols = (n) => {
    clearTimeout(colsTimerRef.current);
    if (n === 3 && isSidebarOpen && !window.matchMedia(MEDIA.tablet).matches) {
      setPendingCols(3);
      toggleSidebar(false);
      colsTimerRef.current = setTimeout(() => {
        setCols(3);
        setPendingCols(null);
      }, 340);
    } else {
      setPendingCols(null);
      setCols(n);
      if (n === 3) toggleSidebar(false);
    }
    try {
      window.localStorage.setItem(COLS_KEY, String(n));
    } catch {
      /* storage unavailable */
    }
  };

  // Restore the column choice after hydration (localStorage isn't on the server).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCols(readStoredCols());
  }, []);

  // Opening the sidebar from anywhere drops 3 per row to 2. Only reacts to the
  // sidebar itself, so it never fights the column switch above.
  useEffect(() => {
    if (!isSidebarOpen) return;
    // ...including a switch to 3 that was still waiting for the sidebar to close.
    clearTimeout(colsTimerRef.current);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPendingCols(null);
    setCols((c) => (c === 3 ? 2 : c));
  }, [isSidebarOpen]);

  // Any filter change starts the grid over from the first page.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShown(PAGE);
  }, [filterKey]);

  // Mirror the filters into the URL without a navigation.
  useEffect(() => {
    const params = new URLSearchParams();
    if (tier !== "all") params.set("tier", tier);
    if (featured) params.set("featured", "1");
    if (category && !scope) params.set("category", category);
    if (query.trim()) params.set("q", query.trim());
    if (sort !== "trend") params.set("sort", sort);
    const next = params.toString();
    const path = scope ? getEffectCategoryHref(scope) : "/effects";
    window.history.replaceState(window.history.state, "", `${path}${next ? `?${next}` : ""}`);
  }, [tier, featured, category, query, sort, scope]);

  // The tab title follows the page too (the first page keeps its server title).
  const initialTitleRef = useRef(null);
  useEffect(() => {
    initialTitleRef.current ??= document.title;
    if (scope === initialScope) {
      document.title = initialTitleRef.current;
      return;
    }
    const { title } = getEffectCategoryMetadata(scope || "all");
    const text = typeof title === "string" ? title : title?.absolute || title?.default;
    if (text) document.title = text;
  }, [scope, initialScope]);





  /* ---------- GSAP ---------- */
  // Page entrance (the title's chars and the paragraph's lines animate themselves via
  // HeadAnim / Copy; the rest fades in 0.5s after load), stat count-up, and the slow
  // flow on the orange words.
  useGSAP(
    () => {
      gsap.from("[data-v4-fade]", { autoAlpha: 0, duration: 1, delay: 0.5, ease: "power2.out", clearProps: "opacity,visibility" });
      gsap.to("[data-v4-gradient]", { backgroundPosition: "100% 50%", duration: 9, ease: "sine.inOut", repeat: -1, yoyo: true });
    },
    { scope: rootRef },
  );

  // Cards rise in whenever the result set changes.
  useGSAP(
    () => {
      const cards = [...(gridRef.current?.children || [])].slice(0, 12).map((wrapper) => wrapper.firstElementChild);
      if (!cards.length) return undefined;
      // Web Animations, not GSAP: GSAP first parses each card's current transform,
      // which forces a style recalculation per card on mount (slow on phones).
      const rises = cards.map((card, i) =>
        card.animate(
          [{ opacity: 0, transform: "translateY(24px)" }, { opacity: 1, transform: "none" }],
          { duration: 1000, delay: i * 40, easing: "cubic-bezier(0.16, 1, 0.3, 1)", fill: "backwards" },
        ),
      );
      return () => rises.forEach((rise) => rise.cancel());
    },
    { dependencies: [filterKey], scope: rootRef },
  );

  // Chips only animate their position when one is added or removed, not when the page shifts under them
  const activeKey = actives.map((a) => a.id).join("|");

  // The page name rolls when it changes (a stable element, so it only rolls on change)
  const contextTail = useMemo(
    () => (context ? <span className={`${T15} text-black/60`}>{context}</span> : <span aria-hidden="true">&nbsp;</span>),
    [context], // eslint-disable-line react-hooks/exhaustive-deps
  );

  // A filter, column or "show more" change resizes the grid, which moves everything
  // below it (the FAQ's reveal included). Re-measure the scroll triggers once the
  // cards' layout animation (0.5s) has settled, or those reveals fire in the wrong place.
  useEffect(() => {
    const id = setTimeout(() => ScrollTrigger.refresh(), 650);
    return () => clearTimeout(id);
  }, [filterKey, shown, cols, scope]);

  /* ---------- actions ---------- */
  const scrollToGrid = () => sheetRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  const closeDrawer = useCallback(() => setDrawerEffect(null), []);

  // Trending row, free mode: no snapping. Mouse drags, horizontal wheel/trackpad
  // and the arrows all move one target scroll position, and a rAF loop eases the
  // row toward it, so every input glides the same way; a drag released mid-flick
  // carries on with its speed. Touch (tablet/mobile) keeps the native scroll.
  const trendMotion = useRef({ target: 0, current: 0, raf: 0, drag: null });
  const setTrendTarget = useCallback((left) => {
    const row = trendRef.current;
    const m = trendMotion.current;
    if (!row) return;
    m.target = Math.max(0, Math.min(row.scrollWidth - row.clientWidth, left));
    if (m.raf) return;
    m.current = row.scrollLeft;
    let last = performance.now();
    const step = (now) => {
      // 14% of the way per 60fps frame, scaled so 120Hz screens glide at the same speed.
      m.current += (m.target - m.current) * (1 - Math.pow(0.86, Math.min(4, (now - last) / 16.67)));
      last = now;
      if (Math.abs(m.target - m.current) < 0.5) m.current = m.target;
      row.scrollLeft = m.current;
      m.raf = m.current === m.target ? 0 : requestAnimationFrame(step);
    };
    m.raf = requestAnimationFrame(step);
  }, []);
  // Where a new input starts from: the running target while gliding, else the row.
  const trendBase = () => (trendMotion.current.raf ? trendMotion.current.target : trendRef.current?.scrollLeft || 0);

  // One card (plus the row gap) per arrow click.
  const scrollTrending = (dir) => {
    const row = trendRef.current;
    const card = row?.firstElementChild;
    if (!card) return;
    const gap = parseFloat(getComputedStyle(row).columnGap) || 0;
    setTrendTarget(trendBase() + dir * (card.getBoundingClientRect().width + gap));
  };

  // Horizontal wheel / trackpad swipes scroll the row (vertical wheel still scrolls the page).
  useEffect(() => {
    const row = trendRef.current;
    const m = trendMotion.current;
    if (!row) return;
    const onWheel = (event) => {
      if (Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;
      event.preventDefault();
      setTrendTarget(trendBase() + event.deltaX);
    };
    row.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      row.removeEventListener("wheel", onWheel);
      cancelAnimationFrame(m.raf);
      m.raf = 0;
    };
  }, [setTrendTarget, trendingEffects]);

  // The click that ends a drag doesn't open the card under the cursor.
  const onTrendPointerDown = (event) => {
    if (event.pointerType !== "mouse" || event.button !== 0) return;
    trendMotion.current.drag = { x: event.clientX, left: trendBase(), moved: false, id: event.pointerId, lastX: event.clientX, lastT: performance.now(), vel: 0 };
  };
  const onTrendPointerMove = (event) => {
    const drag = trendMotion.current.drag;
    const row = trendRef.current;
    if (!drag || !row) return;
    const dx = event.clientX - drag.x;
    if (!drag.moved) {
      if (Math.abs(dx) < 5) return;
      drag.moved = true;
      row.setPointerCapture(drag.id);
      row.style.cursor = "grabbing";
    }
    // Pointer speed (px/ms), smoothed, for the throw on release.
    const now = performance.now();
    const dt = Math.max(1, now - drag.lastT);
    drag.vel = drag.vel * 0.6 + ((event.clientX - drag.lastX) / dt) * 0.4;
    drag.lastX = event.clientX;
    drag.lastT = now;
    setTrendTarget(drag.left - dx);
  };
  const endTrendDrag = () => {
    const m = trendMotion.current;
    const drag = m.drag;
    const row = trendRef.current;
    m.drag = null;
    if (!drag?.moved || !row) return;
    row.style.cursor = "";
    // Throw: keep going with the release speed (ignored if the pointer had stopped).
    if (performance.now() - drag.lastT < 80) setTrendTarget(m.target - drag.vel * 320);
    const swallow = (e) => {
      e.stopPropagation();
      e.preventDefault();
    };
    window.addEventListener("click", swallow, { capture: true, once: true });
    setTimeout(() => window.removeEventListener("click", swallow, { capture: true }), 0);
  };

  // Only re-render when an end is actually reached or left (this runs every scroll frame).
  const updateTrendEdges = () => {
    const row = trendRef.current;
    if (!row) return;
    const start = row.scrollLeft < 8;
    const end = row.scrollLeft > row.scrollWidth - row.clientWidth - 8;
    setTrendEdges((prev) => (prev.start === start && prev.end === end ? prev : { start, end }));
  };

  const faqItems = useMemo(
    () =>
      (content?.faqs || []).map((item, index) => ({
        id: `v4-faq-${content?.id || "all"}-${index + 1}`,
        question: item.question,
        answer: item.answer,
        defaultOpen: index === 0,
      })),
    [content],
  );
  const cta = content?.cta;

  // Only the Trending row is on screen at load: its first three covers load eagerly and
  // the first (the mobile LCP) is fetched first. The grid below lazy-loads.
  const cardProps = (effect, index, aboveFold = false) => ({
    effect,
    priority: aboveFold && index < 3,
    highPriority: aboveFold && index === 0,
    onOpen: setDrawerEffect,
    ...cardActions(effect),
  });

  return (
    <div ref={rootRef} className="relative text-light">
      <AppVaultHeader showSearch totalEffects={effects.length} effects={effects} />

      {/* ---------- hero ---------- */}
      <section id="effects-hero" className={`${WRAP} flex flex-col gap-7 pt-36 pb-20 max-lg:pt-32 max-lg:pb-14 max-md:pt-28`}>
        <div data-v4-fade>
          <Breadcrumb />
        </div>

        <div data-v4-hero className="flex justify-between gap-[3vw] max-lg:flex-col max-lg:items-stretch max-lg:gap-[5vw]">
          {/* Same entrances as the effect page: chars for the title, lines for the copy. */}
          {/* Keyed by page: SplitText owns the heading's text nodes, so a new page gets a
              fresh heading (and runs its entrance again) instead of a stale update. */}
          <HeadAnim key={scope || "all"} rotate={0} animateOnScroll={false}>
            <h1 className="type-display w-[58%] max-lg:w-full -mt-3">
              {scope ? (
                <HeroTitle name={content?.name} />
              ) : (
                <>
                  Browse the <span className="gradient-text-animate">Vault.</span>
                </>
              )}
            </h1>
          </HeadAnim>

          <div className="flex w-[25vw] flex-col gap-[1.6vw] max-lg:w-full max-md:gap-[6vw]">
            {(scope
              ? [].concat(content?.description || [])
              : ["Production-ready interaction effects for React and Next.js. Preview any of them live, then copy or install with one command."]
            ).map((paragraph, index) => (
              <Copy key={`${scope || "all"}-${index}`} animateOnScroll={false} delay={0.3 + index * 0.15}>
                <p className="type-body-lg w-full text-foreground/80 max-lg:w-[70%] max-md:w-full">{paragraph}</p>
              </Copy>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- trending ---------- */}
      {trendingEffects.length > 0 && (
        <section id="trending" data-v4-fade aria-labelledby="v4-trending" className={`${WRAP} flex flex-col gap-[2.5vw] pb-28 pt-4 max-lg:pb-20 max-lg:pt-16 max-lg:gap-8`}>
          <div className="flex items-end justify-between">
            <h2 id="v4-trending" className={`${DISPLAY} font-aeonik text-[2.2vw] max-lg:text-[4vw] max-md:text-[7vw]`}>
              Trending this week
            </h2>
            {/* Desktop / tablet: arrows beside the heading (phones: below the slider). */}
            <div className="flex gap-[0.4vw] max-md:hidden">
              <SliderArrowButton direction="prev" ariaLabel="Previous" disabled={trendEdges.start} onClick={() => scrollTrending(-1)} />
              <SliderArrowButton direction="next" ariaLabel="Next" disabled={trendEdges.end} onClick={() => scrollTrending(1)} />
            </div>
          </div>
          <div
            ref={trendRef}
            // overflow-y is set explicitly: with only overflow-x set the browser computes
            // overflow-y to auto, and the site's Lenis (allowNestedScroll) then treats this
            // row as a vertical scroller and traps the wheel inside it.
            onScroll={updateTrendEdges}
            onPointerDown={onTrendPointerDown}
            onPointerMove={onTrendPointerMove}
            onPointerUp={endTrendDrag}
            onPointerCancel={endTrendDrag}
            onDragStart={(event) => event.preventDefault()}
            // -m/p 1vw: room inside the clipped row for a card's hover lift (translateZ),
            // which the row's overflow would otherwise cut off; the negative margin keeps
            // the cards exactly where they were.
            className="mx-[-1vw] my-[-1vw] flex cursor-grab select-none gap-[1.3vw] overflow-x-hidden overflow-y-hidden px-[1vw] py-[1vw] scrollbar-none max-lg:gap-[1.4vw] max-lg:overflow-x-auto max-md:gap-[3.6vw]"
          >
            {trendingEffects.map((effect, index) => (
              <EffectCard key={effect.name} {...cardProps(effect, index, true)} small dark className="w-[calc((100%-1.8vw)/3)] shrink-0 max-lg:w-[45%] max-md:w-[82%]" tagClassName="text-foreground border-foreground/30" metaClassName="text-foreground/80" />
            ))}
          </div>
          {/* Phones: arrows below the slider, on the left. */}
          <div className="hidden gap-[2vw] max-md:flex">
            <SliderArrowButton direction="prev" ariaLabel="Previous" disabled={trendEdges.start} onClick={() => scrollTrending(-1)} />
            <SliderArrowButton direction="next" ariaLabel="Next" disabled={trendEdges.end} onClick={() => scrollTrending(1)} />
          </div>
        </section>
      )}

      {/* ---------- catalogue sheet ---------- */}
      {/* Hover and mouse-swish sounds are muted on the light catalogue sheet (see wireSoundUI in homepage/lib/sound.js). */}
      {/* data-vault-header-scroll-away: the desktop header slides away as the sheet (and so the
          sticky controls at its top) reaches 10% from the top - see VaultHeader. The sheet is the
          marker rather than the sticky bar, because a stuck element reports the wrong position. */}
      <div ref={sheetRef} id="v4-grid" data-v4-fade data-sound-hover="off" data-sound-flow="off" data-vault-header-scroll-away className="relative scroll-mt-4 bg-light text-ink">
        {/* summary + view controls (sticky on desktop; tablet/mobile have a fixed header).
            Full-width bar so its background covers the sheet edge to edge while stuck. */}
        <div className="sticky top-[-2%] z-5 h-fit border-b border-black/8 bg-light max-lg:static max-lg:border-b-0">
          <div className={`${WRAP} flex flex-wrap items-end justify-between gap-[1vw] pt-10 pb-4 max-md:gap-[8vw] max-md:pt-8`}>
            {/* A div, not a p: RollText renders a div, which a <p> can't contain. */}
            <div aria-live="polite" className={`${DISPLAY} ${T20} flex flex-wrap items-baseline font-aeonik tracking-tight`}>
              {/* Fixed-width slots, so nothing beside them moves when the count or page name changes */}
              <span className="flex w-[6vw] shrink-0 items-baseline gap-x-[0.4vw] max-lg:w-[14vw] max-md:w-[32vw] max-md:gap-x-[1.5vw]">
                <span className="relative -top-[0.05em] font-medium tabular-nums">
                  <RollNumber value={filtered.length} values={[0, effects.length]} />
                </span>
                <span className="text-black/60">{countWord(filtered.length)}</span>
              </span>
              {/* The dot stays put, only the name rolls */}
              <span className="flex shrink-0 items-baseline gap-x-[0.3vw] pl-[0.3vw] max-md:gap-x-[1vw]">
                <span aria-hidden="true" className={`${T15} text-black/60 transition-opacity duration-300 ${context ? "" : "opacity-0"}`}>·</span>
                <RollText text={contextTail} block className="w-[14vw] shrink-0 overflow-x-visible! overflow-y-clip! whitespace-nowrap max-lg:w-[24vw] max-md:w-[48vw]" />
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-[0.7vw] max-md:gap-[2.5vw]">
              {/* The Free / Pro pages are already one tier, so the All · Free · Pro toggle is left out there. */}
              {!TIER_SCOPES.includes(scope) && <SlidingSegment label="Tier" items={TIERS} value={tier} onChange={setTier} itemClassName="w-14" />}
              <button
                type="button"
                aria-pressed={featured}
                onClick={() => setFeatured((v) => !v)}
                className={`inline-flex h-9.5 cursor-pointer items-center px-4 ${T14} transition-[background-color,color,box-shadow] duration-500 ${
                  featured ? CHIP_ON : `bg-foreground ${CHIP_OFF}`
                }`}
              >
                Featured
              </button>
              <FilterMenu
                tone="light"
                // Opens leftwards from the button's right edge (it sits near the screen edge);
                // below lg alignRight keeps the fixed panel under it, 16px inside the screen.
                alignRight
                panelClassName="left-auto! right-0"
                options={SORT_OPTIONS}
                activeFilter={sort === "trend" ? null : sort}
                getLabel={sortLabel}
                onSelect={setSort}
                onClear={() => setSort("trend")}
              />
              <SlidingSegment
                label="Columns"
                items={COLUMN_ITEMS}
                value={pendingCols ?? cols}
                onChange={chooseCols}
                itemClassName="w-8.5"
                className="max-lg:hidden"
              />
            </div>
          </div>
        </div>

        <div className={`${WRAP} flex flex-col gap-[2.8vw] pt-6 pb-24 max-md:gap-[10vw] max-md:pb-16`}>
          <div className="flex flex-col gap-[0.8vw] max-md:gap-[3vw]">
            {/* categories: each chip shows its category's page in place (see selectCategory) */}
            <div className="flex flex-wrap gap-[0.4vw] max-md:gap-[1.5vw]">
              {[{ id: null, label: "All" }, ...categoryOptions.map((c) => ({ id: c.id, label: getQuickCategoryLabel(c.id), count: c.count }))].map((c) => {
                const active = c.id ? category === c.id : !category;
                const inner = (
                  <>
                    {c.label}
                    {c.count != null && (
                      <span className={`relative font-mono ${T11} tabular-nums ${active ? "text-background" : "text-black/50"}`}>{c.count}</span>
                    )}
                  </>
                );
                return (
                  <button
                    key={c.id || "all"}
                    type="button"
                    aria-pressed={active}
                    onClick={() => !active && selectCategory(c.id)}
                    className={`${CHIP} ${active ? CHIP_ON : CHIP_OFF}`}
                  >
                    {inner}
                  </button>
                );
              })}
            </div>

            {/* active filters */}
            <AnimatePresence initial={false}>
              {actives.length > 0 && (
                <motion.div
                  key="active-filters"
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-wrap items-center gap-[0.4vw] max-md:gap-[1.5vw]"
                >
                  <AnimatePresence initial={false} mode="popLayout">
                    {actives.map((a) => (
                      <motion.button
                        key={a.id}
                        layout
                        layoutDependency={activeKey}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={FILTER_SPRING}
                        type="button"
                        onClick={a.clear}
                        aria-label={`Remove filter ${a.label}`}
                        className={`group inline-flex h-7.5 cursor-pointer items-center gap-[0.5vw] bg-ink px-2.5 ${T13} text-light max-md:gap-[2vw] ${a.roll ? "w-[10vw] shrink-0 justify-between max-lg:w-[18vw] max-md:w-[34vw]" : ""}`}
                      >
                        {a.roll ? <RollText text={a.label} block className="min-w-0 flex-1 overflow-clip! whitespace-nowrap text-left" /> : a.label}
                        <X className="size-3 transition-transform duration-300 ease-in-out group-hover:rotate-90 motion-reduce:transition-none" aria-hidden="true" />
                      </motion.button>
                    ))}
                    {actives.length > 1 && (
                      <motion.button
                        key="clear-all"
                        layout
                        layoutDependency={activeKey}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={FILTER_SPRING}
                        type="button"
                        onClick={clearAll}
                        className={`group ${LABEL} h-7.5 cursor-pointer px-2 text-black/60 transition-colors duration-500 hover:text-ink`}
                      >
                        <span className="relative inline-block after:absolute after:inset-x-0 after:-bottom-1 after:h-px after:origin-right after:scale-x-0 after:bg-primary after:transition-transform after:duration-300 after:ease-out group-hover:after:origin-left group-hover:after:scale-x-100 motion-reduce:after:transition-none">Clear all</span>
                      </motion.button>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* grid */}
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-3.5 px-4 py-20 text-center">
              <b className="type-h2">Nothing matches that, yet.</b>
              <p className={`w-[33%] ${T16} text-black/60 max-lg:w-[66%] max-md:w-full`}>Try a broader search, or clear a filter. New effects land in the vault regularly.</p>
              <button
                type="button"
                onClick={clearAll}
                className={`${LABEL} h-11 cursor-pointer px-5 ring-1 ring-inset ring-black/10 transition-shadow duration-500 hover:ring-primary`}
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div ref={gridRef} className="flex flex-wrap gap-x-[1.4vw] gap-y-8">
              {visible.map((effect, index) => (
                <motion.div key={effect.name} layout transition={CARD_LAYOUT_TRANSITION} className={`${GRID_COLS[cols]} max-lg:w-[calc((100%-1.4vw)/2)] max-md:w-full`}>
                  <EffectCard {...cardProps(effect, index)} tagClassName="border-black/20" />
                </motion.div>
              ))}
            </div>
          )}

          {hasMore && (
            <div className="flex flex-col items-center gap-3">
              <p aria-live="polite" className="text-black/60">
                Showing {visible.length} of {filtered.length}
              </p>
              <div className="h-0.5 w-55 overflow-hidden bg-black/10">
                <i className="block h-full origin-left bg-primary transition-transform duration-700" style={{ transform: `scaleX(${visible.length / filtered.length})` }} />
              </div>
              <button
                type="button"
                onClick={() => setShown((n) => n + PAGE)}
                className="h-11 cursor-pointer border border-black/10 bg-black/2 px-5 text-ink transition-colors duration-500 hover:border-primary"
              >
                Show More Effects
              </button>
            </div>
          )}
        </div>

        {/* upgrade band */}
        {!isProUser && (
          <section id="upgrade" className={`${WRAP} pb-24 max-md:pb-16`}>
            <div className="relative flex items-start justify-between gap-6 overflow-hidden bg-ink px-10 py-12 text-light max-lg:flex-col max-lg:p-10 max-md:p-7">
              <div className="relative flex w-[70%] flex-col gap-6 max-lg:w-full">
                <h2 className="text-[4.2vw] max-lg:text-[5.5vw] max-md:text-[9vw]">
                  Everything in the vault.{" "}
                  <br/>
                  <span className="gradient-text-animate">
                    One plan.
                  </span>
                </h2>
                <p className="type-body-lg  text-light/80 w-[85%] max-md:w-full">
                  Pro unlocks every component, section and template, with template credits and new drops as they land. Everything you copy stays in your repo.
                </p>
              </div>
              <div className="relative flex h-fit flex-wrap gap-2 mt-5">
                <Button text="See Plans" href="/pricing" />
              </div>
            </div>
          </section>
        )}
      </div>

      {/* ---------- FAQ + custom work CTA (from the current listing) ---------- */}
      <div data-v4-fade className="flex h-full w-full flex-col gap-[2vw] bg-foreground pb-[5vw] max-lg:pb-14">
        {faqItems.length > 0 && <FAQ faqItems={faqItems} translateTop={false} />}
        <div className={WRAP}>
          <CustomAnimationCta cta={cta} />
        </div>
      </div>

      <PreviewDrawer
        effect={drawerEffect}
        effects={effects}
        canInstall={canInstall}
        isWishlisted={isWishlisted}
        onClose={closeDrawer}
        onOpen={setDrawerEffect}
        onToggleWishlist={toggleWishlist}
        onCopyInstall={copyInstall}
      />

      {overlays}

      {mounted &&
        createPortal(
          <>
            <Modal open={justUpgraded && !upgradeDismissed} onClose={() => setUpgradeDismissed(true)} title="Welcome to Pro">
              Your upgrade is confirmed and the full vault is unlocked. Explore every Pro effect and start shipping right away.
              <Button text="Explore effects" href="/effects" />
            </Modal>
          </>,
          document.body,
        )}
    </div>
  );
}

/**
 * A segmented control whose dark active block slides to the chosen option.
 * Every option shares `itemClassName`'s width, so the block can travel by
 * whole steps of (its own width + the 2px gap).
 */
function SlidingSegment({ label, items, value, onChange, itemClassName, className = "" }) {
  const index = Math.max(0, items.findIndex((item) => item.id === value));
  return (
    <div role="group" aria-label={label} className={`relative flex gap-0.5 bg-white p-0.75 ring-1 ring-inset ring-black/10  ${className}`}>
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute top-0.75 bottom-0.75 left-0.75 bg-ink transition-transform duration-500 ease-[cubic-bezier(.16,1,.3,1)] ${itemClassName}`}
        style={{ transform: `translateX(calc(${index} * (100% + 2px)))` }}
      />
      {items.map((item) => {
        const active = item.id === value;
        return (
          <button
            key={item.id}
            type="button"
            aria-pressed={active}
            aria-label={item.ariaLabel}
            onClick={() => onChange(item.id)}
            className={`relative z-1 flex h-8 cursor-pointer items-center justify-center ${T14} transition-colors duration-500 ${itemClassName} ${
              active ? "text-light" : "text-black/60 hover:text-ink"
            }`}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

// A category name with its last word in the animated brand gradient ("Text <Animations>").
function HeroTitle({ name = "" }) {
  const words = String(name).trim().split(/\s+/);
  const last = words.pop();
  return (
    <>
      {words.length > 0 && `${words.join(" ")} `}
      <span className="gradient-text-animate">{last}</span>
    </>
  );
}
