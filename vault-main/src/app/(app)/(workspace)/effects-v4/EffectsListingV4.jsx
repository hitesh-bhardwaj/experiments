"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ArrowLeft, ArrowRight, Search, X } from "lucide-react";
import { AppVaultHeader } from "@/components/layout/AppVaultHeader";
import { useToastQueue, ToastViewport } from "@/components/ui/Toast";
import { emitWishlistChanged } from "@/lib/wishlistEvents";
import {
  effectCategories,
  effectsOverviewContent,
  getQuickCategoryLabel,
  resolveEffectCategoryId,
} from "@/lib/categories";
import { sortEffects } from "@/lib/effect-sort";
import FAQV3 from "@/homepage-v3/sections/FAQV3";
import ButtonV3 from "@/homepage-v3/components/ButtonV3";
import { CustomAnimationFormTrigger } from "@/components/WebsiteComps/modals/CustomAnimationFormModal";
import { FilterMenu } from "../effects/FilterMenu";
import { DISPLAY, EffectCardV4, LABEL, installCommand } from "./EffectCardV4";
import { PreviewDrawerV4 } from "./PreviewDrawerV4";

gsap.registerPlugin(useGSAP);

const PAGE = 24;
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
const COLUMN_ITEMS = [2, 3].map((n) => ({
  id: n,
  ariaLabel: `${n} columns`,
  label: (
    <span className="flex h-3.5 gap-0.5" aria-hidden="true">
      {Array.from({ length: n }, (_, i) => (
        <i key={i} className="block w-0.75 bg-current" />
      ))}
    </span>
  ),
}));

/* ---------- class tokens ---------- */
const GUTTER = "px-[3.4vw] max-[1025px]:px-[5vw] max-md:px-5";
const GRADIENT_TEXT =
  "bg-[linear-gradient(100deg,#B84300_0%,#ff5f00_22%,#FFB27A_42%,#FF7A14_60%,#C24E00_80%,#ff5f00_100%)] bg-size-[300%_100%] bg-clip-text text-transparent";
const CHIP =
  "inline-flex h-8 shrink-0 cursor-pointer items-center gap-2 px-3 text-[13px] transition-[background-color,color,box-shadow] duration-500";
const CHIP_OFF = "text-[#6B6B6B] shadow-[inset_0_0_0_1px_rgba(29,29,29,.1)] hover:shadow-[inset_0_0_0_1px_#ff5f00] hover:text-[#1D1D1D]";
const CHIP_ON = "bg-[#ff5f00] text-[#141414]";
const ARROW_BTN =
  "grid size-11 cursor-pointer place-items-center text-[#d0d0d0] shadow-[inset_0_0_0_1px_rgba(244,244,244,.14)] transition-colors duration-500 hover:bg-[rgba(244,244,244,.08)] hover:text-white disabled:pointer-events-none disabled:opacity-30 [&_svg]:size-4";

const countWord = (n) => (n === 1 ? "effect" : "effects");
const subscribeNever = () => () => {};

function readStoredCols() {
  try {
    const stored = Number(window.localStorage.getItem(COLS_KEY));
    return stored === 2 ? 2 : 3;
  } catch {
    return 3;
  }
}

export function EffectsListingV4({ effects = [], trendingEffects = [], featuredNames = [], userPlan = "free" }) {
  const searchParams = useSearchParams();
  const { isSignedIn } = useUser();
  const isProUser = userPlan === "pro";
  const { toast, showToast, dismissToast } = useToastQueue();

  /* ---------- filter state (seeded from the URL so links are shareable) ---------- */
  const [tier, setTier] = useState(() => (["free", "pro"].includes(searchParams.get("tier")) ? searchParams.get("tier") : "all"));
  const [featured, setFeatured] = useState(() => searchParams.get("featured") === "1");
  const [category, setCategory] = useState(() => searchParams.get("category") || null);
  const [stack, setStack] = useState(() => (searchParams.get("stack") ? searchParams.get("stack").split(",") : []));
  const [query, setQuery] = useState(() => searchParams.get("q") || "");
  const [sort, setSort] = useState(() => (SORTS[searchParams.get("sort")] ? searchParams.get("sort") : "trend"));
  const [cols, setCols] = useState(3);
  const [shown, setShown] = useState(PAGE);
  const [wishlist, setWishlist] = useState([]);
  const [drawerEffect, setDrawerEffect] = useState(null);
  const [signInPrompt, setSignInPrompt] = useState(false);
  const [upgradeDismissed, setUpgradeDismissed] = useState(false);
  const justUpgraded = searchParams.get("upgraded") === "true";
  // Portals need <body>; false on the server and during hydration.
  const mounted = useSyncExternalStore(subscribeNever, () => true, () => false);

  const rootRef = useRef(null);
  const gridRef = useRef(null);
  const sheetRef = useRef(null);
  const searchRef = useRef(null);
  const countRef = useRef(null);
  const trendRef = useRef(null);
  const sentinelRef = useRef(null);
  const [trendEdges, setTrendEdges] = useState({ start: true, end: false });

  /* ---------- derived data ---------- */
  const featuredSet = useMemo(() => new Set(featuredNames), [featuredNames]);
  const wishlistSet = useMemo(() => new Set(wishlist), [wishlist]);
  const freeCount = useMemo(() => effects.filter((e) => e.tier !== "pro").length, [effects]);

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
    category && { id: "category", label: getQuickCategoryLabel(category), clear: () => setCategory(null) },
    ...stack.map((tag) => ({ id: `stack:${tag}`, label: tag, clear: () => setStack((s) => s.filter((t) => t !== tag)) })),
    query.trim() && { id: "q", label: `“${query.trim()}”`, clear: () => setQuery("") },
  ].filter(Boolean);

  const clearAll = useCallback(() => {
    setTier("all");
    setFeatured(false);
    setCategory(null);
    setStack([]);
    setQuery("");
  }, []);

  /* ---------- effects ---------- */
  // Restore the column choice after hydration (localStorage isn't on the server).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCols(readStoredCols());
  }, []);

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
    if (category) params.set("category", category);
    if (stack.length) params.set("stack", stack.join(","));
    if (query.trim()) params.set("q", query.trim());
    if (sort !== "trend") params.set("sort", sort);
    const next = params.toString();
    window.history.replaceState(window.history.state, "", `${window.location.pathname}${next ? `?${next}` : ""}`);
  }, [tier, featured, category, stack, query, sort]);

  useEffect(() => {
    if (!isSignedIn) return;
    fetch("/api/wishlist")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setWishlist((data || []).map((item) => item.effect_slug || item.name || item)))
      .catch(() => {});
  }, [isSignedIn]);


  // Load the next page before the visitor reaches the bottom.
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore) return undefined;
    const observer = new IntersectionObserver(([entry]) => entry.isIntersecting && setShown((n) => n + PAGE), { rootMargin: "800px 0px" });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, shown]);

  /* ---------- GSAP ---------- */
  // Hero entrance, stat count-up, and the slow flow on the orange words.
  useGSAP(
    () => {
      gsap.from("[data-v4-hero] > *", { autoAlpha: 0, y: 40, duration: 1.2, ease: "expo.out", stagger: 0.08, clearProps: "opacity,visibility,transform" });
      gsap.utils.toArray("[data-v4-count]").forEach((el) => {
        const target = Number(el.dataset.v4Count);
        const counter = { v: 0 };
        gsap.to(counter, { v: target, duration: 1.6, delay: 0.3, ease: "expo.out", onUpdate: () => (el.textContent = Math.round(counter.v)) });
      });
      gsap.to("[data-v4-gradient]", { backgroundPosition: "100% 50%", duration: 9, ease: "sine.inOut", repeat: -1, yoyo: true });
    },
    { scope: rootRef },
  );

  // Cards rise in whenever the result set changes.
  useGSAP(
    () => {
      const cards = gsap.utils.toArray(gridRef.current?.children || []).slice(0, 12);
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

  const copyInstall = useCallback(
    async (effect) => {
      const command = installCommand(effect);
      try {
        await navigator.clipboard.writeText(command);
        showToast({ title: "Install command copied", description: command });
      } catch {
        showToast({ title: "Copy this command", description: command });
      }
    },
    [showToast],
  );

  const toggleWishlist = useCallback(
    async (effect) => {
      if (!isSignedIn) {
        setSignInPrompt(true);
        return;
      }
      try {
        const res = await fetch("/api/wishlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ effect }),
        });
        if (!res.ok) return;
        const data = await res.json();
        setWishlist((prev) => (data.saved ? [...new Set([...prev, effect.name])] : prev.filter((name) => name !== effect.name)));
        showToast({
          title: `${effect.title} ${data.saved ? "saved" : "removed"}`,
          description: data.saved ? "You'll find it in your dashboard's Saved Effects." : "It's no longer in your dashboard's Saved Effects.",
        });
        emitWishlistChanged(data.saved);
      } catch (error) {
        console.error(error);
      }
    },
    [isSignedIn, showToast],
  );

  const canInstall = (effect) => effect.tier !== "pro" || isProUser;
  const closeDrawer = useCallback(() => setDrawerEffect(null), []);

  const updateTrendEdges = () => {
    const row = trendRef.current;
    if (!row) return;
    setTrendEdges({ start: row.scrollLeft < 8, end: row.scrollLeft > row.scrollWidth - row.clientWidth - 8 });
  };

  const faqItems = useMemo(
    () =>
      (effectsOverviewContent.faqs || []).map((item, index) => ({
        id: `v4-faq-${index + 1}`,
        question: item.question,
        answer: item.answer,
        defaultOpen: index === 0,
      })),
    [],
  );
  const cta = effectsOverviewContent.cta;

  const cardProps = (effect, index) => ({
    effect,
    priority: index < 4,
    isWishlisted: wishlistSet.has(effect.name),
    canInstall: canInstall(effect),
    onOpen: setDrawerEffect,
    onToggleWishlist: toggleWishlist,
    onCopyInstall: copyInstall,
  });

  return (
    <div ref={rootRef} className="relative text-[#F4F4F4]">
      <AppVaultHeader showSearch totalEffects={effects.length} effects={effects} />

      {/* ---------- hero ---------- */}
      <section className={`${GUTTER} pt-36 pb-20 max-[1025px]:pt-32 max-[1025px]:pb-14 max-md:pt-28`}>
        <nav aria-label="Breadcrumb" className={`${LABEL} flex gap-2.5 text-[#7d7d7d]`}>
          <Link href="/" className="transition-colors duration-500 hover:text-white">
            Vault
          </Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page" className="text-[#ff5f00]">
            Effects
          </span>
        </nav>

        <div data-v4-hero className="mt-7 grid grid-cols-[minmax(0,1.2fr)_minmax(0,.8fr)] items-end gap-12 max-[1025px]:grid-cols-1 max-[1025px]:gap-10">
          <h1 className={`${DISPLAY} max-w-[12ch] text-[6vw] leading-[1.02] max-[1025px]:text-[9vw] max-md:text-[13vw]`}>
            Browse the{" "}
            <span data-v4-gradient className={`${GRADIENT_TEXT} pb-[.08em]`}>
              vault.
            </span>
          </h1>

          <div className="grid gap-6.5">
            <p className="max-w-[46ch] text-base leading-relaxed text-[#bdbdbd]">
              Production-ready interaction effects for React and Next.js. Preview any of them live, then copy or install with one command.
            </p>
            <div className={`${LABEL} flex flex-wrap gap-x-7.5 gap-y-2.5`}>
              {[
                [effects.length, "Effects"],
                [freeCount, "Free"],
                [categoryOptions.length, "Categories"],
              ].map(([value, label]) => (
                <p key={label}>
                  <b data-v4-count={value} className={`${DISPLAY} block text-[2.4vw] leading-none tracking-[-.04em] text-[#F4F4F4] tabular-nums normal-case max-[1025px]:text-[4.5vw] max-md:text-[8vw]`}>
                    {value}
                  </b>
                  <span className="text-[#8a8a8a]">{label}</span>
                </p>
              ))}
            </div>
            <label className="relative flex h-15 items-center gap-3 bg-[rgba(20,20,20,.7)] pr-2.5 pl-5 shadow-[inset_0_0_0_1px_rgba(244,244,244,.12)] backdrop-blur-md transition-shadow duration-700 focus-within:shadow-[inset_0_0_0_1px_rgba(255,95,0,.6),0_24px_60px_-24px_rgba(255,95,0,.45)]">
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
                className="h-full min-w-0 flex-1 bg-transparent text-base text-[#F4F4F4] outline-none placeholder:text-[#6d6d6d]"
              />
            </label>
          </div>
        </div>
      </section>

      {/* ---------- trending ---------- */}
      {trendingEffects.length > 0 && (
        <section aria-labelledby="v4-trending" className={`${GUTTER} pb-28 max-[1025px]:pb-20`}>
          <div className="mb-5.5 flex items-end justify-between">
            <h2 id="v4-trending" className={`${DISPLAY} text-[2.2vw] tracking-[-.03em] max-[1025px]:text-[4vw] max-md:text-[7vw]`}>
              Trending this week
            </h2>
            <div className="flex gap-1.5 max-md:hidden">
              <button type="button" aria-label="Previous" disabled={trendEdges.start} onClick={() => trendRef.current?.scrollBy({ left: -trendRef.current.clientWidth * 0.9, behavior: "smooth" })} className={ARROW_BTN}>
                <ArrowLeft />
              </button>
              <button type="button" aria-label="Next" disabled={trendEdges.end} onClick={() => trendRef.current?.scrollBy({ left: trendRef.current.clientWidth * 0.9, behavior: "smooth" })} className={ARROW_BTN}>
                <ArrowRight />
              </button>
            </div>
          </div>
          <div
            ref={trendRef}
            onScroll={updateTrendEdges}
            className="grid snap-x snap-mandatory auto-cols-[calc((100%-28px)/3)] grid-flow-col gap-3.5 overflow-x-auto pb-1 scrollbar-none max-[1025px]:auto-cols-[45%] max-md:auto-cols-[82%]"
          >
            {trendingEffects.map((effect, index) => (
              <EffectCardV4 key={effect.name} {...cardProps(effect, index)} small dark className="snap-start" />
            ))}
          </div>
        </section>
      )}

      {/* ---------- catalogue sheet ---------- */}
      <div ref={sheetRef} id="v4-grid" className="relative scroll-mt-4 bg-[#F4F4F4] text-[#1D1D1D] max-md:mx-0">
        <div className={`${GUTTER} pt-12 pb-24 max-md:pt-8 max-md:pb-16`}>
          {/* summary + view controls (sticky on desktop; tablet/mobile have a fixed header) */}
          <div className="sticky top-0 h-[18vh] z-5 mx-[-3.4vw] flex flex-wrap items-end justify-between gap-4 bg-[#F4F4F4] px-[3.4vw] pt-4.5 pb-4 shadow-[0_1px_0_rgba(29,29,29,.08)] max-[1025px]:static max-[1025px]:shadow-none max-[1025px]:-mx-[5vw] max-[1025px]:px-[5vw] max-md:-mx-5 max-md:px-5">
            <p aria-live="polite" className={`${DISPLAY} text-xl tracking-[-.02em]`}>
              <b ref={countRef} className="font-medium tabular-nums">
                {filtered.length}
              </b>{" "}
              <span className="text-[#6B6B6B]">{countWord(filtered.length)}</span>
              {context && <span className="ml-2.5 text-[15px] text-[#6B6B6B]">· {context}</span>}
            </p>

            <div className="flex flex-wrap items-center gap-2.5">
              <SlidingSegment label="Tier" items={TIERS} value={tier} onChange={setTier} itemClassName="w-14" />
              <button
                type="button"
                aria-pressed={featured}
                onClick={() => setFeatured((v) => !v)}
                className={`inline-flex h-9.5 cursor-pointer items-center px-4 text-sm transition-[background-color,color,box-shadow] duration-500 ${
                  featured ? CHIP_ON : `bg-white ${CHIP_OFF}`
                }`}
              >
                Featured
              </button>
              <FilterMenu
                tone="light"
                options={SORT_OPTIONS}
                activeFilter={sort === "trend" ? null : sort}
                getLabel={sortLabel}
                onSelect={setSort}
                onClear={() => setSort("trend")}
              />
              <SlidingSegment
                label="Columns"
                items={COLUMN_ITEMS}
                value={cols}
                onChange={(n) => {
                  setCols(n);
                  try {
                    window.localStorage.setItem(COLS_KEY, String(n));
                  } catch {
                    /* storage unavailable */
                  }
                }}
                itemClassName="w-8.5"
                className="max-[1025px]:hidden"
              />
            </div>
          </div>

          {/* categories */}
          <div className="flex flex-wrap gap-1.5 pt-5 pb-3">
            <button type="button" aria-pressed={!category} onClick={() => setCategory(null)} className={`${CHIP} ${!category ? CHIP_ON : CHIP_OFF}`}>
              All
            </button>
            {categoryOptions.map((c) => (
              <button
                key={c.id}
                type="button"
                aria-pressed={category === c.id}
                onClick={() => setCategory(category === c.id ? null : c.id)}
                className={`${CHIP} ${category === c.id ? CHIP_ON : CHIP_OFF}`}
              >
                {getQuickCategoryLabel(c.id)}
                <span className={`font-geist-mono text-[11px] tabular-nums ${category === c.id ? "text-[#141414]/70" : "text-[#B4B4B4]"}`}>{c.count}</span>
              </button>
            ))}
          </div>

          {/* built with + active filters */}
          <div className="grid gap-3 pt-2 pb-6">
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
                    className="inline-flex h-7.5 cursor-pointer items-center gap-2 bg-[#1D1D1D] pr-2 pl-3 text-[13px] text-[#F4F4F4] transition-colors duration-500 hover:bg-[#3a3a3a]"
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
              <b className={`${DISPLAY} text-[28px] tracking-[-.03em]`}>Nothing matches that, yet.</b>
              <p className="max-w-[40ch] text-[#6B6B6B]">Try a broader search, or clear a filter. New effects land in the vault regularly.</p>
              <button
                type="button"
                onClick={clearAll}
                className={`${LABEL} h-11 cursor-pointer px-5 shadow-[inset_0_0_0_1px_rgba(29,29,29,.1)] transition-shadow duration-500 hover:shadow-[inset_0_0_0_1px_#ff5f00]`}
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div ref={gridRef} className={`grid gap-x-3.5 gap-y-8 ${GRID_COLS[cols]} max-[1025px]:grid-cols-2 max-md:grid-cols-1 max-md:gap-y-10`}>
              {visible.map((effect, index) => (
                <EffectCardV4 key={effect.name} {...cardProps(effect, index)} />
              ))}
            </div>
          )}

          {hasMore && (
            <div className="mt-16 flex flex-col items-center gap-3">
              <div ref={sentinelRef} aria-hidden="true" />
              <p className={`${LABEL} text-[#6B6B6B]`}>
                Showing {visible.length} of {filtered.length}
              </p>
              <div className="h-0.5 w-55 overflow-hidden bg-[rgba(29,29,29,.1)]">
                <i className="block h-full origin-left bg-[#ff5f00] transition-transform duration-700" style={{ transform: `scaleX(${visible.length / filtered.length})` }} />
              </div>
              <button
                type="button"
                onClick={() => setShown((n) => n + PAGE)}
                className={`${LABEL} mt-1 h-11 cursor-pointer px-5 shadow-[inset_0_0_0_1px_rgba(29,29,29,.1)] transition-shadow duration-500 hover:shadow-[inset_0_0_0_1px_#ff5f00]`}
              >
                Show more effects
              </button>
            </div>
          )}
        </div>

        {/* upgrade band */}
        {!isProUser && (
          <section className={`${GUTTER} pb-24 max-md:pb-16`}>
            <div className="relative grid grid-cols-[minmax(0,1.3fr)_auto] items-center gap-8 overflow-hidden bg-[#1D1D1D] p-14 text-[#F4F4F4] max-[1025px]:grid-cols-1 max-[1025px]:p-10 max-md:p-7">
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_90%_at_100%_100%,rgba(255,95,0,.45),transparent_60%),radial-gradient(40%_60%_at_0%_0%,rgba(255,255,255,.05),transparent_60%)]"
              />
              <div className="relative">
                <h2 className={`${DISPLAY} max-w-[18ch] text-[2.6vw] leading-[1.02] max-[1025px]:text-[5vw] max-md:text-[8vw]`}>
                  Everything in the vault.{" "}
                  <span data-v4-gradient className={GRADIENT_TEXT}>
                    One plan.
                  </span>
                </h2>
                <p className="mt-3.5 max-w-[48ch] text-[#bdbdbd]">
                  Pro unlocks every component, section and template, with template credits and new drops as they land. Everything you copy stays in your repo.
                </p>
              </div>
              <div className="relative flex flex-wrap gap-2">
                <ButtonV3 text="See plans" href="/pricing" />
                <ButtonV3
                  text="Browse free effects"
                  href="#v4-grid"
                  variant="outline"
                  preventDefault
                  onClick={() => {
                    setTier("free");
                    scrollToGrid();
                  }}
                />
              </div>
            </div>
          </section>
        )}
      </div>

      {/* ---------- FAQ + custom work CTA (from the current listing) ---------- */}
      <div className={GUTTER}>
        {faqItems.length > 0 && <FAQV3 faqItems={faqItems} translateTop={false} />}
        {cta && (cta.heading || cta.buttonText) && (
          <section className="mx-auto my-[5vw] w-full bg-[#272727] px-10 text-center max-[1025px]:px-6 max-md:my-[15vw] max-md:px-[7vw]">
            <div className="mx-auto flex w-full max-w-6xl flex-col items-center py-15">
              {cta.heading && <h2 className="text-[4vw] font-medium max-md:text-[7vw]">{cta.heading}</h2>}
              {cta.description && <p className="mx-auto mt-4 max-w-3xl text-lg text-muted">{cta.description}</p>}
              {cta.buttonText && (
                <CustomAnimationFormTrigger>
                  <div className="mt-6">
                    <ButtonV3 preventDefault={false} text={cta.buttonText} href={cta.buttonLink || "#"} className="mx-auto w-fit" />
                  </div>
                </CustomAnimationFormTrigger>
              )}
            </div>
          </section>
        )}
      </div>

      <PreviewDrawerV4
        effect={drawerEffect}
        effects={effects}
        canInstall={drawerEffect ? canInstall(drawerEffect) : false}
        isWishlisted={drawerEffect ? wishlistSet.has(drawerEffect.name) : false}
        onClose={closeDrawer}
        onOpen={setDrawerEffect}
        onToggleWishlist={toggleWishlist}
        onCopyInstall={copyInstall}
      />

      <ToastViewport toast={toast} onDismiss={dismissToast} />

      {mounted &&
        createPortal(
          <>
            <Modal open={signInPrompt} onClose={() => setSignInPrompt(false)} title="Sign in required">
              Create a free account or sign in to save effects and pick up right where you left off.
              <ButtonV3 text="Sign In" href="/sign-in?redirect_url=/effects-v4" />
            </Modal>
            <Modal open={justUpgraded && !upgradeDismissed} onClose={() => setUpgradeDismissed(true)} title="Welcome to Pro">
              Your upgrade is confirmed and the full vault is unlocked. Explore every Pro effect and start shipping right away.
              <ButtonV3 text="Explore effects" href="/effects-v4" />
            </Modal>
          </>,
          document.body,
        )}
    </div>
  );
}

function Modal({ open, onClose, title, children }) {
  const [text, action] = Array.isArray(children) ? children : [children, null];
  return (
    <div
      onClick={onClose}
      className={`fixed inset-0 z-9999 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm transition-opacity duration-300 ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
        className={`relative flex w-[35vw] flex-col items-center gap-6 border border-white/20 bg-[#0e0e0e] p-10 text-center shadow-2xl transition-transform duration-300 max-[1025px]:w-[70%] max-[1025px]:p-6 max-md:w-full ${open ? "scale-100" : "scale-95"}`}
      >
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="absolute top-5 right-5 grid size-10 cursor-pointer place-items-center border border-white/20 bg-white/10 text-white/70 transition-colors duration-500 hover:border-[#ff5f00] hover:bg-[#ff5f00] hover:text-white max-[1025px]:hidden"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
        <h2 className="text-2xl font-medium text-white">{title}</h2>
        <p className="w-[80%] text-sm text-white/60 max-[1025px]:w-full">{text}</p>
        {action}
      </div>
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
            className={`relative z-1 grid h-8 cursor-pointer place-items-center text-sm transition-colors duration-500 ${itemClassName} ${
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
