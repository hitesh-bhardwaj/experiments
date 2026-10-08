"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { motion } from "motion/react";
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
import FAQV3 from "@/homepage-v3/sections/FAQV3";
import ButtonV3 from "@/homepage-v3/components/ButtonV3";
import { FilterMenu } from "./FilterMenu";
import { DISPLAY, EffectCardV4, LABEL } from "./EffectCardV4";
import { Modal, useEffectCardActions } from "./useEffectCardActions";
import { PreviewDrawerV4 } from "./PreviewDrawerV4";
import { CustomAnimationCta } from "./CustomAnimationCta";
import { SliderArrowButton } from "@/components/ui/SliderArrowButton";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import HeadAnim from "@/components/Animations/HeadAnim";
import Copy from "@/components/Animations/Copy";
import { MEDIA } from "@/lib/breakpoints";

gsap.registerPlugin(useGSAP);

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
const GRID_COLS = { 2: "grid-cols-2", 3: "grid-cols-3" };
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
const T11 = "text-[0.76vw] max-lg:text-[1.4vw] max-md:text-[2.8vw]";
const T13 = "text-[0.9vw] max-lg:text-[1.6vw] max-md:text-[3.3vw]";
const T14 = "text-[0.97vw] max-lg:text-[1.7vw] max-md:text-[3.6vw]";
const T15 = "text-[1.04vw] max-lg:text-[1.8vw] max-md:text-[3.8vw]";
const T16 = "text-[1.1vw] max-lg:text-[1.95vw] max-md:text-[4.1vw]";
const T18 = "text-[1.25vw] max-lg:text-[2.2vw] max-md:text-[4.4vw]";
const T20 = "text-[1.4vw] max-lg:text-[2.4vw] max-md:text-[5vw]";
const T28 = "text-[1.95vw] max-lg:text-[3.4vw] max-md:text-[7vw]";

/* ---------- class tokens ---------- */
const GUTTER = "px-[3.4vw] max-lg:px-[5vw] max-md:px-5";

const CHIP =
  `inline-flex h-8 shrink-0 cursor-pointer items-center gap-2 px-3 ${T13} transition-[background-color,color,box-shadow] duration-500`;
const CHIP_OFF = "text-[#6B6B6B] shadow-[inset_0_0_0_1px_rgba(29,29,29,.1)] hover:shadow-[inset_0_0_0_1px_#ff5f00] hover:text-[#1D1D1D]";
const CHIP_ON = "bg-[#ff5f00] text-[#141414]";

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
export function EffectsListingV4({
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
  const [stack, setStack] = useState(() => (searchParams.get("stack") ? searchParams.get("stack").split(",") : []));
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
  const countRef = useRef(null);
  const trendRef = useRef(null);
  const [trendEdges, setTrendEdges] = useState({ start: true, end: false });

  /* ---------- derived data ---------- */
  const featuredSet = useMemo(() => new Set(featuredNames), [featuredNames]);
  // Hero stats describe the page's scope (everything, or this category / tier / featured).
  const heroStats = useMemo(() => {
    const inScope = effects.filter((effect) => {
      if (scope === "free") return effect.tier !== "pro";
      if (scope === "pro") return effect.tier === "pro";
      if (scope === "featured") return featuredNames.includes(effect.name);
      if (scopeCategory) return resolveEffectCategoryId(effect) === scopeCategory;
      return true;
    });
    const free = inScope.filter((e) => e.tier !== "pro").length;
    const pro = inScope.length - free;
    const categories = new Set(inScope.map((e) => resolveEffectCategoryId(e)).filter(Boolean)).size;
    return [
      [inScope.length, "Effects"],
      free > 0 && free < inScope.length && [free, "Free"],
      scope && pro > 0 && pro < inScope.length && [pro, "Pro"],
      categories > 1 && [categories, "Categories"],
    ].filter(Boolean);
  }, [effects, scope, scopeCategory, featuredNames]);

  const categoryOptions = useMemo(() => {
    const counts = {};
    for (const effect of effects) {
      const id = resolveEffectCategoryId(effect);
      if (id) counts[id] = (counts[id] || 0) + 1;
    }
    return effectCategories.filter((c) => c.id !== "featured" && counts[c.id]).map((c) => ({ id: c.id, name: c.name, count: counts[c.id] }));
  }, [effects]);

  // The libraries effects are built with, most common first.
  const stackOptions = useMemo(() => {
    const counts = {};
    for (const effect of effects) for (const tag of effect.tags || []) counts[tag] = (counts[tag] || 0) + 1;
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([tag]) => tag);
  }, [effects]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = effects.filter((effect) => {
      if (tier === "free" && effect.tier === "pro") return false;
      if (tier === "pro" && effect.tier !== "pro") return false;
      if (featured && !featuredSet.has(effect.name)) return false;
      const catId = resolveEffectCategoryId(effect);
      if (category && catId !== category) return false;
      if (stack.length && !stack.some((tag) => effect.tags?.includes(tag))) return false;
      if (q) {
        const haystack = [effect.title, effect.name, catId, effect.description, ...(effect.tags || []), effect.tier].join(" ").toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
    if (sort === "free-first") return [...list].sort((a, b) => (a.tier === "pro") - (b.tier === "pro"));
    return sort === "trend" ? list : sortEffects(list, sort);
  }, [effects, tier, featured, featuredSet, category, stack, query, sort]);

  const visible = filtered.slice(0, shown);
  const hasMore = shown < filtered.length;
  const filterKey = [tier, featured, category, stack.join(","), query.trim(), sort].join("|");
  const categoryName = categoryOptions.find((c) => c.id === category)?.name;
  const context = featured ? "Featured" : categoryName || (tier !== "all" ? `${tier === "free" ? "Free" : "Pro"} effects` : "");

  const actives = [
    tier !== "all" && { id: "tier", label: tier === "free" ? "Free" : "Pro", clear: () => setTier("all") },
    featured && { id: "featured", label: "Featured", clear: () => setFeatured(false) },
    category && { id: "category", label: getQuickCategoryLabel(category), clear: () => selectCategory(null) },
    ...stack.map((tag) => ({ id: `stack:${tag}`, label: tag, clear: () => setStack((s) => s.filter((t) => t !== tag)) })),
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
    setStack([]);
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
    if (stack.length) params.set("stack", stack.join(","));
    if (query.trim()) params.set("q", query.trim());
    if (sort !== "trend") params.set("sort", sort);
    const next = params.toString();
    const path = scope ? getEffectCategoryHref(scope) : "/effects";
    window.history.replaceState(window.history.state, "", `${path}${next ? `?${next}` : ""}`);
  }, [tier, featured, category, stack, query, sort, scope]);

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




  /* ---------- hero stats: optical alignment ---------- */
  // Each glyph carries its own left side-bearing, and the big number's is wider than
  // the small label's - so their boxes line up but their ink doesn't. Measure where
  // the ink of the number's first digit and the label's first letter actually starts
  // (canvas actualBoundingBoxLeft, in each element's real font and size) and shift the
  // number by the difference. Uses the final value, so the count-up doesn't move it.
  // Re-runs once the web fonts load and on resize (the sizes are in vw).
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    const ctx = document.createElement("canvas").getContext("2d");
    const inkLeft = (el, text) => {
      const cs = getComputedStyle(el);
      ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
      return -ctx.measureText(text).actualBoundingBoxLeft;
    };
    const align = () => {
      root.querySelectorAll("[data-v4-count]").forEach((number) => {
        const label = number.nextElementSibling;
        if (!label) return;
        number.style.marginLeft = "0px";
        const offset = inkLeft(number, String(number.dataset.v4Count).charAt(0)) - inkLeft(label, label.textContent.trim().charAt(0));
        number.style.marginLeft = `${-offset}px`;
      });
    };
    align();
    document.fonts?.ready.then(align);
    window.addEventListener("resize", align);
    return () => window.removeEventListener("resize", align);
  }, [heroStats]);

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

  // Stat count-up - on load (after the fade) and again whenever the page changes.
  const firstCount = useRef(true);
  useGSAP(
    () => {
      const delay = firstCount.current ? 0.5 : 0.15;
      firstCount.current = false;
      gsap.utils.toArray("[data-v4-count]").forEach((el) => {
        const target = Number(el.dataset.v4Count);
        const counter = { v: 0 };
        gsap.to(counter, { v: target, duration: 1.6, delay, ease: "expo.out", onUpdate: () => (el.textContent = Math.round(counter.v)) });
      });
    },
    { dependencies: [scope], scope: rootRef },
  );

  // Cards rise in whenever the result set changes.
  useGSAP(
    () => {
      const cards = [...(gridRef.current?.children || [])].slice(0, 12).map((wrapper) => wrapper.firstElementChild);
      if (!cards.length) return;
      gsap.fromTo(
        cards,
        { autoAlpha: 0, y: 24 },
        { autoAlpha: 1, y: 0, duration: 1, stagger: 0.04, ease: "expo.out", clearProps: "opacity,visibility,transform" },
      );
    },
    { dependencies: [filterKey], scope: rootRef },
  );

  // Result count tweens to its new value.
  const lastCount = useRef(filtered.length);
  useGSAP(
    () => {
      const counter = { v: lastCount.current };
      lastCount.current = filtered.length;
      gsap.to(counter, {
        v: filtered.length,
        duration: 0.8,
        ease: "expo.out",
        onUpdate: () => countRef.current && (countRef.current.textContent = Math.round(counter.v)),
      });
    },
    { dependencies: [filtered.length] },
  );

  /* ---------- actions ---------- */
  const scrollToGrid = () => sheetRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  const closeDrawer = useCallback(() => setDrawerEffect(null), []);

  // One card (plus the row gap) per arrow click.
  const scrollTrending = (dir) => {
    const row = trendRef.current;
    const card = row?.firstElementChild;
    if (!card) return;
    const gap = parseFloat(getComputedStyle(row).columnGap) || 0;
    row.scrollBy({ left: dir * (card.getBoundingClientRect().width + gap), behavior: "smooth" });
  };

  const updateTrendEdges = () => {
    const row = trendRef.current;
    if (!row) return;
    setTrendEdges({ start: row.scrollLeft < 8, end: row.scrollLeft > row.scrollWidth - row.clientWidth - 8 });
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

  const cardProps = (effect, index) => ({
    effect,
    priority: index < 4,
    onOpen: setDrawerEffect,
    ...cardActions(effect),
  });

  return (
    <div ref={rootRef} className="relative text-[#F4F4F4]">
      <AppVaultHeader showSearch totalEffects={effects.length} effects={effects} />

      {/* ---------- hero ---------- */}
      <section className={`${GUTTER} pt-36 pb-20 max-lg:pt-32 max-lg:pb-14 max-md:pt-28`}>
        <div data-v4-fade>
          <Breadcrumb />
        </div>

        <div data-v4-hero className="mt-7 grid grid-cols-[minmax(0,1.25fr)_minmax(0,.75fr)] items-end gap-12 max-lg:grid-cols-1 max-lg:gap-10">
          {/* Same entrances as the effect page: chars for the title, lines for the copy. */}
          {/* Keyed by page: SplitText owns the heading's text nodes, so a new page gets a
              fresh heading (and runs its entrance again) instead of a stale update. */}
          <HeadAnim key={scope || "all"} rotate={0} animateOnScroll={false}>
            <h1 className={`${DISPLAY} max-w-[45vw] text-[6vw] leading-[0.9]! max-lg:max-w-none max-lg:text-[9vw] max-md:text-[13vw]`}>
              {scope ? (
                <HeroTitle name={content?.name} />
              ) : (
                <>
                  Browse the <span className="gradient-text-animate">Vault.</span>
                </>
              )}
            </h1>
          </HeadAnim>

          <div className="grid gap-6.5">
            {(scope
              ? [].concat(content?.description || [])
              : ["Production-ready interaction effects for React and Next.js. Preview any of them live, then copy or install with one command."]
            ).map((paragraph, index) => (
              <Copy key={`${scope || "all"}-${index}`} animateOnScroll={false} delay={0.3 + index * 0.15}>
                <p className={`max-w-[32vw] ${T16} text-[#bdbdbd] max-lg:max-w-[70vw] max-md:max-w-none`}>{paragraph}</p>
              </Copy>
            ))}
            <div data-v4-fade className={`${LABEL} flex flex-wrap gap-x-7.5 gap-y-2.5`}>
              {heroStats.map(([value, label]) => (
                <p key={`${scope || "all"}-${label}`}>
                  {/* margin-left is set by alignStatInk() so the digit's ink lines up with the label's. */}
                  <b data-v4-count={value} className={`${DISPLAY} block text-[2.4vw] leading-none text-[#F4F4F4] tabular-nums normal-case max-lg:text-[4.5vw] max-md:text-[8vw]`}>
                    {value}
                  </b>
                  <span className="text-white/60 normal-case tracking-normal text-[1vw]">{label}</span>
                </p>
              ))}
            </div>
            {/* <label className="relative flex h-15 items-center gap-3 bg-[rgba(20,20,20,.7)] pr-2.5 pl-5 shadow-[inset_0_0_0_1px_rgba(244,244,244,.12)] backdrop-blur-md transition-shadow duration-700 focus-within:shadow-[inset_0_0_0_1px_rgba(255,95,0,.6),0_24px_60px_-24px_rgba(255,95,0,.45)]">
              <span className="sr-only">Search effects</span>
              <Search className="size-4.5 shrink-0 text-[#8a8a8a]" aria-hidden="true" />
              <input
                ref={searchRef}
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && scrollToGrid()}
                placeholder="Search effects, categories or libraries"
                autoComplete="off"
                className="h-full min-w-0 flex-1 bg-transparent text-[1.1vw] max-lg:text-[1.95vw] max-md:text-[4.1vw] text-[#F4F4F4] outline-none placeholder:text-[#6d6d6d]"
              />
            </label> */}
          </div>
        </div>
      </section>

      {/* ---------- trending ---------- */}
      {trendingEffects.length > 0 && (
        <section data-v4-fade aria-labelledby="v4-trending" className={`${GUTTER} pb-28 max-lg:pb-20`}>
          <div className="mb-5.5 flex items-end justify-between">
            <h2 id="v4-trending" className={`${DISPLAY} text-[2.2vw] max-lg:text-[4vw] max-md:text-[7vw]`}>
              Trending this week
            </h2>
            <div className="flex gap-1.5 max-md:hidden">
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
            className="grid snap-x snap-mandatory auto-cols-[calc((100%-28px)/3)] grid-flow-col gap-3.5 overflow-x-hidden overflow-y-hidden pb-1 scrollbar-none max-lg:overflow-x-auto max-lg:auto-cols-[45%] max-md:auto-cols-[82%]"
          >
            {trendingEffects.map((effect, index) => (
              <EffectCardV4 key={effect.name} {...cardProps(effect, index)} small dark className="snap-start" tagClassName="text-white border-white/30" metaClassName="text-white/80" />
            ))}
          </div>
        </section>
      )}

      {/* ---------- catalogue sheet ---------- */}
      {/* Hover and mouse-swish sounds are muted on the light catalogue sheet (see wireSoundUI in homepage-v3/lib/sound.js). */}
      {/* data-vault-header-scroll-away: the desktop header slides away as the sheet (and so the
          sticky controls at its top) reaches 10% from the top - see VaultHeader. The sheet is the
          marker rather than the sticky bar, because a stuck element reports the wrong position. */}
      <div ref={sheetRef} id="v4-grid" data-v4-fade data-sound-hover="off" data-sound-flow="off" data-vault-header-scroll-away className="relative scroll-mt-4 bg-[#F4F4F4] text-[#1D1D1D] max-md:mx-0">
        <div className={`${GUTTER}  pb-24 max-md:pt-8 max-md:pb-16`}>
          {/* summary + view controls (sticky on desktop; tablet/mobile have a fixed header) */}
          <div className="sticky top-[-2%] h-fit z-5 mx-[-3.4vw] flex flex-wrap items-end justify-between gap-4 bg-[#F4F4F4] px-[3.5vw] pt-10 pb-4 shadow-[0_1px_0_rgba(29,29,29,.08)] max-lg:static max-lg:shadow-none max-lg:mx-[-5vw] max-lg:px-[5vw] max-md:-mx-5 max-md:px-5">
            <p aria-live="polite" className={`${DISPLAY} ${T20} tracking-[-.02em]`}>
              <span ref={countRef} className="font-medium tabular-nums">
                {filtered.length}
              </span>{" "}
              <span className="text-[#6B6B6B]">{countWord(filtered.length)}</span>
              {context && <span className={`ml-2.5 ${T15} text-[#6B6B6B]`}>· {context}</span>}
            </p>

            <div className="flex flex-wrap items-center gap-2.5">
              <SlidingSegment label="Tier" items={TIERS} value={tier} onChange={setTier} itemClassName="w-14" />
              <button
                type="button"
                aria-pressed={featured}
                onClick={() => setFeatured((v) => !v)}
                className={`inline-flex h-9.5 cursor-pointer items-center px-4 ${T14} transition-[background-color,color,box-shadow] duration-500 ${
                  featured ? CHIP_ON : `bg-white ${CHIP_OFF}`
                }`}
              >
                Featured
              </button>
              <FilterMenu
                tone="light"
                // Open leftwards from the button's right edge on desktop (it sits near the screen edge).
                panelClassName="lg:left-auto! lg:right-0"
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

          {/* categories: each chip shows its category's page in place (see selectCategory) */}
          <div className="flex flex-wrap gap-1.5 pt-6 pb-3">
            {[{ id: null, label: "All" }, ...categoryOptions.map((c) => ({ id: c.id, label: getQuickCategoryLabel(c.id), count: c.count }))].map((c) => {
              const active = c.id ? category === c.id : !category;
              const inner = (
                <>
                  {c.label}
                  {c.count != null && (
                    <span className={`font-mono mt-0.5 ${T11} tabular-nums ${active ? "text-black" : "text-black/50"}`}>{c.count}</span>
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

          {/* built with + active filters */}
          <div className="grid gap-3 pt-2 pb-10">
            {stackOptions.length > 0 && (
              <div className="flex flex-wrap items-center gap-3">
                <span className={`${LABEL} text-[#6B6B6B]`}>Built with</span>
                <div className="flex flex-wrap gap-1.5">
                  {stackOptions.map((tag) => {
                    const on = stack.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        aria-pressed={on}
                        onClick={() => setStack((s) => (on ? s.filter((t) => t !== tag) : [...s, tag]))}
                        className={`${CHIP} ${on ? CHIP_ON : CHIP_OFF}`}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            {actives.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                {actives.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={a.clear}
                    aria-label={`Remove filter ${a.label}`}
                    className={`inline-flex h-7.5 cursor-pointer items-center gap-2 bg-[#1D1D1D] pr-2 pl-3 ${T13} text-[#F4F4F4] transition-colors duration-500 hover:bg-[#3a3a3a]`}
                  >
                    {a.label}
                    <X className="size-3" aria-hidden="true" />
                  </button>
                ))}
                {actives.length > 1 && (
                  <button type="button" onClick={clearAll} className={`${LABEL} ml-2 h-7.5 cursor-pointer text-[#6B6B6B] underline decoration-[#ff5f00]/0 underline-offset-4 transition-colors duration-500 hover:text-[#1D1D1D] hover:decoration-[#ff5f00]`}>
                    Clear all
                  </button>
                )}
              </div>
            )}
          </div>

          {/* grid */}
          {filtered.length === 0 ? (
            <div className="grid justify-items-center gap-3.5 px-4 py-20 text-center">
              <b className={`${DISPLAY} ${T28} tracking-[-.03em]`}>Nothing matches that, yet.</b>
              <p className={`max-w-[30vw] ${T16} text-[#6B6B6B] max-lg:max-w-[60vw] max-md:max-w-none`}>Try a broader search, or clear a filter. New effects land in the vault regularly.</p>
              <button
                type="button"
                onClick={clearAll}
                className={`${LABEL} h-11 cursor-pointer px-5 shadow-[inset_0_0_0_1px_rgba(29,29,29,.1)] transition-shadow duration-500 hover:shadow-[inset_0_0_0_1px_#ff5f00]`}
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div ref={gridRef} className={`grid gap-x-5 gap-y-10 ${GRID_COLS[cols]} max-lg:grid-cols-2 max-md:grid-cols-1 max-md:gap-y-10`}>
              {visible.map((effect, index) => (
                <motion.div key={effect.name} layout transition={CARD_LAYOUT_TRANSITION}>
                  <EffectCardV4 {...cardProps(effect, index)} tagClassName="border-black/20" />
                </motion.div>
              ))}
            </div>
          )}

          {hasMore && (
            <div className="mt-16 flex flex-col items-center gap-3">
              <p aria-live="polite" className={` text-[#6B6B6B]`}>
                Showing {visible.length} of {filtered.length}
              </p>
              <div className="h-0.5 w-55 overflow-hidden bg-[rgba(29,29,29,.1)]">
                <i className="block h-full origin-left bg-[#ff5f00] transition-transform duration-700" style={{ transform: `scaleX(${visible.length / filtered.length})` }} />
              </div>
              <button
                type="button"
                onClick={() => setShown((n) => n + PAGE)}
                className={` mt-1 h-11 cursor-pointer border border-[rgba(29,29,29,.12)] bg-[rgba(29,29,29,.02)] px-5 text-[#1D1D1D] transition-colors duration-500 hover:border-[#ff5f00]`}
              >
                Show More Effects
              </button>
            </div>
          )}
        </div>

        {/* upgrade band */}
        {!isProUser && (
          <section className={`${GUTTER} pb-24 max-md:pb-16`}>
            <div className="relative grid grid-cols-[minmax(0,1.3fr)_auto] gap-8 overflow-hidden bg-[#1D1D1D] p-10 py-12 text-[#F4F4F4] max-lg:grid-cols-1 max-lg:p-10 max-md:p-7">
             
              <div className="relative">
                <h2 className={`${DISPLAY} max-w-[45vw] text-[3vw] leading-[1.02] max-lg:max-w-none max-lg:text-[5vw] max-md:text-[8vw]`}>
                  Everything in the vault.{" "}
                   <span className="gradient-text-animate">
                    One plan.
                  </span>
                </h2>
                <p className={`mt-3.5 max-w-[45vw] ${T18} text-white/80 max-lg:max-w-[70vw] max-md:max-w-none`}>
                  Pro unlocks every component, section and template, with template credits and new drops as they land. Everything you copy stays in your repo.
                </p>
              </div>
              <div className="relative flex flex-wrap gap-2 h-fit mt-2">
                <ButtonV3 text="See plans" href="/pricing" />
               
              </div>
            </div>
          </section>
        )}
      </div>

      {/* ---------- FAQ + custom work CTA (from the current listing) ---------- */}
      <div data-v4-fade className="w-full h-full pb-[5vw] bg-white px-[3.4vw]" >
        {faqItems.length > 0 && <FAQV3 faqItems={faqItems} translateTop={false} />}
        <CustomAnimationCta cta={cta} className="mt-[2vw]" />
      </div>

      <PreviewDrawerV4
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
              <ButtonV3 text="Explore effects" href="/effects" />
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
    <div role="group" aria-label={label} className={`relative flex gap-0.5 bg-[#e6e6e6] p-0.75 ${className}`}>
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute top-0.75 bottom-0.75 left-0.75 bg-[#1D1D1D] transition-transform duration-500 ease-[cubic-bezier(.16,1,.3,1)] ${itemClassName}`}
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
            className={`relative z-1 grid h-8 cursor-pointer place-items-center ${T14} transition-colors duration-500 ${itemClassName} ${
              active ? "text-[#F4F4F4]" : "text-[#6B6B6B] hover:text-[#1D1D1D]"
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
