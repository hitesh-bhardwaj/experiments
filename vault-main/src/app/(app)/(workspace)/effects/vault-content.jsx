"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "motion/react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useVaultLayout } from "@/components/layout/VaultLayout";
import { GridDots } from "@/components/grid-dots";
import { AppVaultHeader as VaultHeader } from "@/components/layout/AppVaultHeader";
import { RouteFade } from "@/components/layout/RouteFade";
import { EffectCard } from "@/components/ui/EffectCardNew";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { useToastQueue, ToastViewport } from "@/components/ui/Toast";
import { emitWishlistChanged } from "@/lib/wishlistEvents";
import {
  effectsOverviewContent,
  effectCategories,
  freeEffectsContent,
  proEffectsContent,
  getEffectCategory,
  getEffectCategoryBySlug,
  getEffectCategoryHref,
  getQuickCategoryLabel,
  resolveEffectCategoryId,
} from "@/lib/categories";

import HeadAnim from "@/components/Animations/HeadAnim";
import { getFeaturedEffects } from "@/lib/featured-effects";
import {
  EFFECT_CATEGORY_FILTER_OPTIONS,
  EFFECT_SORT_OPTIONS,
  FILTER_OPTIONS,
  sortEffects,
} from "@/lib/effect-sort";
import Button from "@/components/WebsiteComps/Button";
import LinkButton from "@/components/WebsiteComps/LinkButton";
import { useFadeUp, useFadeIn } from "@/components/Animations/gsapAnimations";
import Copy from "@/components/Animations/Copy";
import { CustomAnimationFormTrigger } from "@/components/WebsiteComps/modals/CustomAnimationFormModal";
import { useUser } from "@clerk/nextjs";
import FAQV3 from "@/homepage-v3/sections/FAQV3";
import { FilterMenu } from "./FilterMenu";
import TrendingRightNow from "@/homepage-v3/sections/TrendingRightNow";
import ButtonV3 from "@/homepage-v3/components/ButtonV3";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

function RouteAnimationSync({ syncKey }) {
  const refreshCallRef = useRef(null);

  useEffect(() => {
    refreshCallRef.current?.kill();

    refreshCallRef.current = gsap.delayedCall(0.12, () => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          ScrollTrigger.refresh(true);
        });
      });
    });

    return () => {
      refreshCallRef.current?.kill();
    };
  }, [syncKey]);

  return null;
}

// Effects listing opens the sidebar by default when the grid is on 2
// columns, overriding any closed state persisted from other pages. Waits
// for isSidebarReady because VaultLayout restores the persisted value a
// couple of animation frames after mount, which would otherwise clobber
// this override if it ran first. Only fires once so a manual close
// afterwards is respected.
//
// "Once" is tracked per browser session (sessionStorage), not per component
// mount - VaultContent itself remounts on every /effects <-> /effects/[slug]
// navigation (they're different page modules, e.g. clicking a category chip
// or a sidebar category/Overview link), which used to reset a mount-local
// ref and made this default re-fire on every such navigation: closing the
// sidebar, then clicking any category, would force it back open and drop
// the grid back to 2 columns (via SidebarGridSync below) even though the
// user had just closed it and/or chosen 3 columns.
const EFFECTS_SIDEBAR_DEFAULT_SESSION_KEY = "hyperiux-effects-sidebar-default-applied";

function EffectsGridDefaults({ gridColumns, isSidebarReady, toggleSidebar }) {
  useEffect(() => {
    if (!isSidebarReady || typeof window === "undefined") return;
    if (window.sessionStorage.getItem(EFFECTS_SIDEBAR_DEFAULT_SESSION_KEY)) return;

    window.sessionStorage.setItem(EFFECTS_SIDEBAR_DEFAULT_SESSION_KEY, "true");

    if (gridColumns === 2) {
      toggleSidebar(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSidebarReady]);

  return null;
}

// 3 columns is too cramped once the sidebar takes up space, so opening it
// from anywhere - the sidebar's own toggle, not just the grid density
// buttons below - drops the grid to 2 columns. Only reacts to isSidebarOpen
// itself (not gridColumns) so it doesn't fight the density buttons, which
// already set both values together in the same click.
// Persisted the same way VaultLayout persists isSidebarOpen - VaultContent
// remounts on every /effects <-> /effects/[slug] navigation (see
// EffectsGridDefaults above), and gridColumns is plain useState, so without
// this a 3-column choice silently reverted to the useState(2) default the
// moment the user clicked into any category or back to "All Effects".
const GRID_COLUMNS_STORAGE_KEY = "hyperiux-effects-grid-columns";

function getStoredGridColumns() {
  if (typeof window === "undefined") return 2;

  return window.localStorage.getItem(GRID_COLUMNS_STORAGE_KEY) === "3" ? 3 : 2;
}

function SidebarGridSync({ isSidebarOpen, gridColumns, setGridColumns }) {
  useEffect(() => {
    if (isSidebarOpen && gridColumns === 3) {
      setGridColumns(2);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSidebarOpen]);

  return null;
}

function SkeletonBlock({ className = "" }) {
  return (
    <div
      className={[
        "relative overflow-hidden bg-[#272727]",
        "before:absolute before:inset-0 before:-translate-x-full",
        "before:animate-[shimmer_1.4s_infinite]",
        "before:bg-linear-to-r before:from-transparent before:via-white/10 before:to-transparent",
        className,
      ].join(" ")}
    />
  );
}



function EffectsGridSkeleton() {
  // Fixed to the viewport (not the document flow) so it stays centered on
  // screen while the effects are loading, even if the user scrolls the
  // still-loading page - previously this was a normal h-96 block sitting
  // wherever it fell in the page's content flow, so scrolling carried it
  // away like any other element.
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none">
      <GridDots size={56} squareSize={8} className="text-primary" />
    </div>
  );
}

export function VaultContent({
  effects: incomingEffects,
  initialEffects: incomingInitialEffects = [],
  featuredEffects: incomingFeaturedEffects = [],
  trendingEffects: incomingTrendingEffects = [],
  effectCounts: incomingEffectCounts,
  initialCategory = "all",
  userPlan = "free",
  isLoading = false,
}) {
  const { isSidebarOpen, isSidebarReady, toggleSidebar } = useVaultLayout();
  const { isSignedIn } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchParamString = searchParams.toString();

  const justUpgraded = searchParams.get("upgraded") === "true";
  const [showWishlistToast, setShowWishlistToast] = useState(false);
  const [upgradeToastDismissed, setUpgradeToastDismissed] = useState(false);
  const [mounted, setMounted] = useState(false);

  // SSR-safe mounted flag - `mounted` gates a createPortal() call further
  // down, which needs document.body and so can only run after mount.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const animationSearchParamString = useMemo(() => {
    const params = new URLSearchParams(searchParamString);

    params.delete("waitlist");
    params.delete("custom-animation-form");
    params.delete("upgraded");
    params.delete("filter");
    params.delete("sort");

    return params.toString();
  }, [searchParamString]);

  const routeKey = `${pathname}${animationSearchParamString ? `?${animationSearchParamString}` : ""
    }`;

  const safeEffects = useMemo(
    () => (Array.isArray(incomingEffects) ? incomingEffects : []),
    [incomingEffects]
  );
  const safeEffectCounts = useMemo(
    () =>
      incomingEffectCounts &&
        typeof incomingEffectCounts === "object" &&
        !Array.isArray(incomingEffectCounts)
        ? incomingEffectCounts
        : {},
    [incomingEffectCounts]
  );

  const categoryPageRef = useRef(null);
  const routeTweenRef = useRef(null);

  useFadeUp(categoryPageRef, [routeKey]);
  useFadeIn(categoryPageRef, [routeKey]);

  // testing purpose - set to 0 in production, any positive ms to show skeleton
  const TEST_SKELETON_DELAY = 0;
  const [hasPassedSkeletonDelay, setHasPassedSkeletonDelay] = useState(
    TEST_SKELETON_DELAY === 0
  );

  useEffect(() => {
    if (TEST_SKELETON_DELAY === 0) return;

    setHasPassedSkeletonDelay(false);

    const timeoutId = window.setTimeout(() => {
      setHasPassedSkeletonDelay(true);
    }, TEST_SKELETON_DELAY);

    return () => window.clearTimeout(timeoutId);
  }, [routeKey]);

  const isProUser = userPlan === "pro";
  const isEffectsLoading =
    isLoading || !hasPassedSkeletonDelay || !Array.isArray(incomingEffects);

  const isCountsLoading =
    isLoading ||
    !hasPassedSkeletonDelay ||
    !incomingEffectCounts ||
    typeof incomingEffectCounts !== "object";

  const [searchQuery, setSearchQuery] = useState("");
  const [wishlist, setWishlist] = useState([]);
  const [gridColumns, setGridColumns] = useState(() => getStoredGridColumns());
  const { toast: wishlistToast, showToast: showWishlistSavedToast, dismissToast: dismissWishlistToast } = useToastQueue();
  const [dropdownFilter, setDropdownFilter] = useState(null);

  useEffect(() => {
    window.localStorage.setItem(GRID_COLUMNS_STORAGE_KEY, String(gridColumns));
  }, [gridColumns]);

  const featuredEffects = useMemo(
    () =>
      incomingFeaturedEffects?.length > 0
        ? incomingFeaturedEffects
        : getFeaturedEffects(safeEffects),
    [incomingFeaturedEffects, safeEffects]
  );

  const featuredEffectNames = useMemo(
    () => new Set(featuredEffects.map((effect) => effect.name)),
    [featuredEffects]
  );

  const trendingEffects = useMemo(
    () =>
      incomingTrendingEffects?.length > 0
        ? incomingTrendingEffects
        : featuredEffects,
    [incomingTrendingEffects, featuredEffects]
  );

  const categoryFromUrl = useMemo(() => {
    const queryCategory = new URLSearchParams(searchParamString).get("category");

    if (queryCategory) {
      return queryCategory === "all" ? initialCategory : queryCategory;
    }

    const [, rootSegment, categorySlug] = pathname.split("/");

    if (rootSegment !== "effects" || !categorySlug) {
      return initialCategory;
    }

    return getEffectCategoryBySlug(categorySlug)?.id || initialCategory;
  }, [initialCategory, pathname, searchParamString]);

  const categoryFilter = categoryFromUrl;
  const urlSortFilter = useMemo(() => {
    const requestedSort = new URLSearchParams(searchParamString).get("sort");

    return EFFECT_SORT_OPTIONS.includes(requestedSort) ? requestedSort : null;
  }, [searchParamString]);

  const urlCollectionFilter = useMemo(() => {
    const requestedFilter = new URLSearchParams(searchParamString).get("filter");

    return EFFECT_CATEGORY_FILTER_OPTIONS.includes(requestedFilter)
      ? requestedFilter
      : null;
  }, [searchParamString]);

  const activeDropdownFilter = dropdownFilter ?? urlCollectionFilter;

  const dropdownCategoryFilter = EFFECT_CATEGORY_FILTER_OPTIONS.includes(activeDropdownFilter)
    ? activeDropdownFilter
    : null;

  const dropdownSortFilter = EFFECT_SORT_OPTIONS.includes(activeDropdownFilter)
    ? activeDropdownFilter
    : null;

  const routeCollectionFilter = EFFECT_CATEGORY_FILTER_OPTIONS.includes(categoryFilter)
    ? categoryFilter
    : null;
  const effectiveCollectionFilter = dropdownCategoryFilter || routeCollectionFilter;
  const effectiveCategoryFilter = EFFECT_CATEGORY_FILTER_OPTIONS.includes(categoryFilter)
    ? "all"
    : categoryFilter;
  const effectiveSortFilter = dropdownCategoryFilter
    ? null
    : dropdownSortFilter || (!activeDropdownFilter ? urlSortFilter : null);

  const refreshAfterCategoryChange = useCallback(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        ScrollTrigger.refresh();
      });
    });
  }, []);

  const getCategoryUrl = useCallback(
    (nextCategory) => {
      const resolvedCategory = nextCategory || "all";
      const collectionFilter = EFFECT_CATEGORY_FILTER_OPTIONS.includes(activeDropdownFilter)
        ? activeDropdownFilter
        : EFFECT_CATEGORY_FILTER_OPTIONS.includes(categoryFilter)
          ? categoryFilter
          : null;

      const params = new URLSearchParams(searchParamString);

      params.delete("category");
      params.delete("waitlist");
      params.delete("custom-animation-form");
      params.delete("sort");

      if (
        collectionFilter &&
        !EFFECT_CATEGORY_FILTER_OPTIONS.includes(resolvedCategory)
      ) {
        params.set("filter", collectionFilter);
      } else {
        params.delete("filter");
      }

      const nextQuery = params.toString();
      const categoryHref = getEffectCategoryHref(resolvedCategory);

      return nextQuery ? `${categoryHref}?${nextQuery}` : categoryHref;
    },
    [activeDropdownFilter, categoryFilter, searchParamString]
  );

  const navigateWithRouteFade = useCallback(
    (href) => {
      if (!href || typeof window === "undefined") {
        return true;
      }

      const currentUrl = `${pathname}${searchParamString ? `?${searchParamString}` : ""
        }`;

      if (href === currentUrl) {
        return true;
      }

      const page = categoryPageRef.current;

      setSearchQuery("");

      routeTweenRef.current?.kill();

      if (!page) {
        router.push(href, { scroll: false });
        return true;
      }

      routeTweenRef.current = gsap.to(page, {
        autoAlpha: 0,
        y: 0,
        duration: 0.32,
        ease: "power2.inOut",
        onComplete: () => {
          router.push(href, { scroll: false });

          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              ScrollTrigger.refresh();
            });
          });
        },
      });

      return true;
    },
    [pathname, router, searchParamString]
  );

  useEffect(() => {
    const page = categoryPageRef.current;

    routeTweenRef.current?.kill();

    if (page) {
      gsap.set(page, {
        autoAlpha: 1,
        y: 0,
      });
    }

    refreshAfterCategoryChange();

    return () => {
      routeTweenRef.current?.kill();
    };
  }, [routeKey, refreshAfterCategoryChange]);

  const handleCategoryLinkClick = useCallback(
    (nextCategory) => {
      const resolvedCategory = nextCategory === categoryFilter ? "all" : nextCategory || "all";
      const href = getCategoryUrl(resolvedCategory);

      return navigateWithRouteFade(href);
    },
    [categoryFilter, getCategoryUrl, navigateWithRouteFade]
  );

  const handleFilterSelect = useCallback(
    (nextFilter) => {
      setDropdownFilter(nextFilter);
      setSearchQuery("");

      const params = new URLSearchParams(searchParamString);

      params.delete("waitlist");
      params.delete("custom-animation-form");

      if (nextFilter === "none") {
        params.delete("filter");
        params.delete("sort");
      } else if (EFFECT_CATEGORY_FILTER_OPTIONS.includes(nextFilter)) {
        params.set("filter", nextFilter);
        params.delete("sort");
      } else if (EFFECT_SORT_OPTIONS.includes(nextFilter)) {
        params.set("sort", nextFilter);
        params.delete("filter");
      }

      const nextQuery = params.toString();
      if (typeof window !== "undefined") {
        window.history.replaceState(
          window.history.state,
          "",
          `${pathname}${nextQuery ? `?${nextQuery}` : ""}`
        );
      }

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          ScrollTrigger.refresh(true);
        });
      });

      return true;
    },
    [pathname, searchParamString]
  );

  const showAllEffects = useCallback(() => {
    return navigateWithRouteFade("/effects");
  }, [navigateWithRouteFade]);

  const quickCategories = useMemo(() => {
    const knownCategories = effectCategories
      .filter(
        (category) =>
          category.id !== "featured" && safeEffectCounts?.[category.id]
      )
      .map((category) => category.id);

    const extraCategories = Object.keys(safeEffectCounts || {}).filter(
      (id) =>
        id &&
        id !== "all" &&
        id !== "featured" &&
        !knownCategories.includes(id) &&
        safeEffectCounts[id]
    );

    return ["featured", "free", "pro", ...knownCategories, ...extraCategories];
  }, [safeEffectCounts]);

  const categoryChips = useMemo(
    () => quickCategories.filter((cat) => !FILTER_OPTIONS.includes(cat)),
    [quickCategories]
  );

  // "none" stays a valid clear sentinel (see activeFilter below) but isn't
  // shown as a pickable row - clearing happens via the cross next to the
  // active filter's label instead.
  const dropdownFilterOptions = useMemo(
    () => FILTER_OPTIONS.filter((option) => option !== "none"),
    []
  );

  const activeFilter =
    activeDropdownFilter === "none"
      ? null
      : activeDropdownFilter || urlSortFilter || (FILTER_OPTIONS.includes(categoryFilter)
        ? categoryFilter
        : null);

  // Free/Pro counts in the filter dropdown need to reflect whichever
  // category is currently active (e.g. "Free (12)" while filtered to
  // Backgrounds, not the site-wide free-effects total) - safeEffectCounts.
  // free/.pro are server-computed ALL-CATEGORIES totals (see
  // getEffectTierCounts() in page.js), so that shortcut is only valid when
  // no category filter is applied. Any specific category always derives its
  // counts from the actual (already fully loaded, unpaginated) effects
  // list instead.
  const tierFilterCounts = useMemo(() => {
    if (
      effectiveCategoryFilter === "all" &&
      typeof safeEffectCounts.free === "number" &&
      typeof safeEffectCounts.pro === "number"
    ) {
      return {
        free: safeEffectCounts.free,
        pro: safeEffectCounts.pro,
      };
    }

    const categoryEffects =
      effectiveCategoryFilter === "all"
        ? safeEffects
        : safeEffects.filter(
          (effect) => resolveEffectCategoryId(effect) === effectiveCategoryFilter
        );

    return categoryEffects.reduce(
      (counts, effect) => {
        if (effect.tier === "pro") {
          counts.pro += 1;
        } else {
          counts.free += 1;
        }

        return counts;
      },
      { free: 0, pro: 0 }
    );
  }, [effectiveCategoryFilter, safeEffectCounts, safeEffects]);

  const getQuickCategoryLabel = useCallback((cat) => {
    if (cat === "none") return "None";
    if (cat === "free") return `Free (${tierFilterCounts.free})`;
    if (cat === "pro") return `Pro (${tierFilterCounts.pro})`;
    if (cat === "featured") return "Featured";
    if (cat === "az") return "A-Z";
    if (cat === "za") return "Z-A";
    if (cat === "recent") return "Recently Added";
    if (cat === "webgl") return "WebGL";
    return cat.charAt(0).toUpperCase() + cat.slice(1);
  }, [tierFilterCounts]);

  useEffect(() => {
    if (!isSignedIn) return;

    async function loadWishlist() {
      try {
        const res = await fetch("/api/wishlist");

        if (!res.ok) return;

        const data = await res.json();

        setWishlist(
          (data || []).map((item) => item.effect_slug || item.name || item)
        );
      } catch (err) {
        console.error(err);
      }
    }

    loadWishlist();
  }, [isSignedIn]);

  const toggleWishlist = async (effect) => {
    if (!isSignedIn) {
      setShowWishlistToast(true);
      return;
    }

    try {
      const slug = effect.name;

      const res = await fetch("/api/wishlist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ effect }),
      });

      if (!res.ok) {
        const data = await res.json();
        console.error(data);
        return;
      }

      const data = await res.json();

      if (data.saved) {
        setWishlist((prev) => (prev.includes(slug) ? prev : [...prev, slug]));
        showWishlistSavedToast({
          title: `${effect.title || effect.name} saved`,
          description: "You'll find it in your dashboard's Saved Effects.",
        });
      } else {
        setWishlist((prev) => prev.filter((x) => x !== slug));
        showWishlistSavedToast({
          title: `${effect.title || effect.name} removed`,
          description: "It's no longer in your dashboard's Saved Effects.",
        });
      }

      emitWishlistChanged(data.saved);
    } catch (err) {
      console.error(err);
    }
  };

  const filteredEffects = useMemo(() => {
    if (isEffectsLoading) return [];

    const nextEffects = safeEffects.filter((effect) => {
      if (effectiveCollectionFilter === "free") {
        if (effect.tier === "pro") return false;
      } else if (effectiveCollectionFilter === "pro") {
        if (effect.tier !== "pro") return false;
      } else if (effectiveCollectionFilter === "featured") {
        if (!featuredEffectNames.has(effect.name)) return false;
      }

      if (effectiveCategoryFilter !== "all") {
        if (resolveEffectCategoryId(effect) !== effectiveCategoryFilter) return false;
      }

      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const catId = resolveEffectCategoryId(effect);

        return (
          effect.name.toLowerCase().includes(query) ||
          effect.title.toLowerCase().includes(query) ||
          catId?.toLowerCase().includes(query) ||
          effect.description?.toLowerCase().includes(query)
        );
      }

      return true;
    });

    return sortEffects(nextEffects, effectiveSortFilter);
  }, [
    safeEffects,
    effectiveCollectionFilter,
    effectiveCategoryFilter,
    effectiveSortFilter,
    searchQuery,
    featuredEffectNames,
    isEffectsLoading,
  ]);

  const totalEffects = useMemo(() => {
    if (isEffectsLoading) return 0;

    return safeEffects.filter(
      (effect) => {
        if (effectiveCollectionFilter === "free" && effect.tier === "pro") {
          return false;
        }

        if (effectiveCollectionFilter === "pro" && effect.tier !== "pro") {
          return false;
        }

        if (
          effectiveCollectionFilter === "featured" &&
          !featuredEffectNames.has(effect.name)
        ) {
          return false;
        }

        if (effectiveCategoryFilter !== "all") {
          return resolveEffectCategoryId(effect) === effectiveCategoryFilter;
        }

        return true;
      }
    ).length;
  }, [
    safeEffects,
    effectiveCollectionFilter,
    effectiveCategoryFilter,
    featuredEffectNames,
    isEffectsLoading,
  ]);

  // Memoized (not just a plain const) so the FAQ-items memo below gets a
  // dependency the compiler can actually trust as stable across renders -
  // getEffectCategory()'s return value isn't something it can otherwise
  // prove is immutable.
  const activeCategoryContent = useMemo(() => {
    if (categoryFilter === "all") return effectsOverviewContent;
    if (categoryFilter === "free") return freeEffectsContent;
    if (categoryFilter === "pro") return proEffectsContent;
    return getEffectCategory(categoryFilter);
  }, [categoryFilter]);

  const activeCategoryName = activeCategoryContent?.name || categoryFilter;

  const activeCategoryDescription =
    activeCategoryContent?.description ||
    "Explore free effects from the Hyperiux vault, ready to install, remix, and use in real projects.";

  const activeCategoryDescriptions = Array.isArray(activeCategoryDescription)
    ? activeCategoryDescription
    : [activeCategoryDescription];

  const activeCategoryFaqItems = useMemo(
    () =>
      (activeCategoryContent?.faqs || []).map((item, index) => ({
        id: `${categoryFilter}-faq-${index + 1}`,
        question: item.question,
        answer: item.answer,
        defaultOpen: index === 0,
      })),
    [activeCategoryContent, categoryFilter]
  );

  return (
    <>
      <EffectsGridDefaults
        gridColumns={gridColumns}
        isSidebarReady={isSidebarReady}
        toggleSidebar={toggleSidebar}
      />
      <SidebarGridSync
        isSidebarOpen={isSidebarOpen}
        gridColumns={gridColumns}
        setGridColumns={setGridColumns}
      />
      <VaultHeader
        showSearch
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        totalEffects={totalEffects}
        effects={safeEffects}
      />

      <RouteFade
        key={routeKey}
        motionKey={routeKey}
        ref={categoryPageRef}
        className="relative min-h-screen text-foreground effects-comp border-b border-white/10"
      >

        <RouteAnimationSync syncKey={routeKey} />

        <div>
          <div
            key={`category-intro-${categoryFilter}`}
            className=" px-14 pt-28 pb-12  space-y-8 max-md:px-7 max-md:pt-32 max-md:pb-16"
          >
            <Breadcrumb className="fadeup" />

            <HeadAnim animateOnScroll={false} delay={0.3} animationKey={routeKey}>
              <h1
                className="mb-4 w-[80%] leading-normal t96 font-display font-normal text-foreground max-md:w-[90%] max-md:text-4xl"
                style={{ lineHeight: "1.3" }}
              >
                {activeCategoryName}
              </h1>
            </HeadAnim>

            <div className="category-fadeup  flex max-w-[55vw] flex-col text-lg text-muted max-[1025px]:max-w-full max-md:text-base">
              {activeCategoryDescriptions.map((description, index) => (
                <Copy
                  key={`${categoryFilter}-description-${index}`}
                  delay={0.6}
                  animationKey={`${routeKey}-${index}`}
                >
                  <p className="mt-3">
                    {description}
                  </p>
                </Copy>
              ))}
            </div>
          </div>
        </div>

        <div className="category-fadeup fadeup " data-fadeup-delay="0.5">
          <TrendingRightNow effects={trendingEffects} />
        </div>

        <div className="mx-auto px-14 pb-7 pt-20 max-md:px-0 max-[1025px]:pt-10">
          <div
            className="relative max-[1025px]:w-full flex items-start gap-4 fadein"
            data-fadein-delay="0.4"
          >
            <div className="relative min-w-0 flex-1">
              <div
                className="pointer-events-none absolute right-0 top-0 bottom-0 z-10 hidden w-12 max-[1025px]:block"
                style={{
                  background:
                    "linear-gradient(to left, var(--background, #000) 0%, transparent 100%)",
                }}
              />


              <div
                className={[
                  "category-fadeup flex items-center gap-2.5",
                  "flex-wrap",
                  "max-[1025px]:flex-nowrap max-[1025px]:overflow-x-auto max-[1025px]:px-6",
                  "scrollbar-thin [scrollbar-color:#CC4C04_transparent]",
                  "[&::-webkit-scrollbar]:h-1",
                  "[&::-webkit-scrollbar-track]:bg-white/10 [&::-webkit-scrollbar-track]:",
                  "[&::-webkit-scrollbar-thumb]:bg-[#CC4C04] [&::-webkit-scrollbar-thumb]:",
                  "max-[1025px]:pb-3",
                ].join(" ")}

              >
                {/* Filter dropdown: featured / free / pro / sorting */}
                <FilterMenu
                  activeFilter={activeFilter}
                  getLabel={getQuickCategoryLabel}
                  onSelect={handleFilterSelect}
                  onClear={() => handleFilterSelect("none")}
                  options={dropdownFilterOptions}
                />

                {/* Divider between filters and categories */}
                {/* <span
                    aria-hidden="true"
                    className="mx-1 h-7 w-px shrink-0 self-center bg-white/15 max-md:h-6"
                  /> */}

                {categoryChips.map((cat) => {
                  const isSelected = categoryFilter === cat;
                  const label = getQuickCategoryLabel(cat);
                  const href = getCategoryUrl(isSelected ? "all" : cat);

                  return (
                    <Link
                      key={cat}
                      href={href}
                      scroll={false}
                      onClick={(event) => {
                        event.preventDefault();
                        handleCategoryLinkClick(cat);
                      }}
                      aria-current={isSelected ? "page" : undefined}
                      aria-label={
                        isSelected
                          ? `Clear ${label} category filter`
                          : `Filter by ${label}`
                      }
                      className={`
                          px-6 py-3 text-[1vw] max-md:text-[4vw] max-[1025px]:text-[2.5vw] text-center relative max-md:px-7 max-md:py-3
                          backdrop-blur-[6px] font-geistMono group flex items-center justify-center gap-2 cursor-pointer
                          transition-colors duration-300 
                          ${isSelected
                          ? "bg-[#ff5f00] text-black hover:text-black hover:bg-[#ff5f00]"
                          : "bg-black/20 backdrop-blur-lg text-[#FFFFFF] hover:text-black hover:bg-[#ff5f00]"
                        }
                        `}
                    >
                      <span className="leading-none">{label}</span>
                      {isSelected && (
                        <X className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
            <div className="flex items-center gap-4 max-[1025px]:hidden">
              <p>Layout</p>
              {/* Grid density viewer: 2 or 3 cards per row */}
              <div className="relative shrink-0 max-[1025px]:hidden flex items-end gap-1  bg-[#161616] p-1">
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute top-1 left-1 h-8 w-10  bg-[#FF5F00] transition-transform duration-300 ease-out"
                  style={{
                    transform: `translateX(${gridColumns === 3 ? "calc(2.5rem + 0.25rem)" : "0"})`,
                  }}
                />

                {[2, 3].map((cols) => {
                  const isActive = gridColumns === cols;

                  return (
                    <button
                      key={cols}
                      type="button"
                      onClick={() => {
                        setGridColumns(cols);
                        // Switching to 3 columns closes the sidebar; switching
                        // back to 2 leaves the sidebar as-is (it does not
                        // reopen on its own).
                        if (cols === 3) {
                          toggleSidebar(false);
                        }
                      }}
                      aria-label={`Show ${cols} cards per row`}
                      aria-pressed={isActive}
                      className={` ${isActive ? " text-black" : "text-foreground"}
                        relative z-10 flex h-8 w-10 items-center justify-center  text20 font-medium
                        transition-colors duration-300 cursor-pointer 
                        
                      `}
                    >
                      {cols}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="category-fadeup fadeup mx-auto relative px-14 pb-12 max-md:px-0">
          <div
            className={`flex flex-wrap items-center gap-3 transition-opacity duration-200 ${searchQuery
              ? "mb-8 min-h-10 opacity-100"
              : "mb-0 min-h-0 opacity-0 pointer-events-none"
              }`}
          >
            {searchQuery && (
              <span
                className="flex items-center gap-2 px-4 py-1.5 bg-[#555555]/33 backdrop-blur-md border border-border/50 text-foreground text-sm font-medium max-md:px-3 max-md:py-1.5 max-md:text-xs"
                style={{ borderRadius: "56px" }}
              >
                <span>&quot;{searchQuery}&quot;</span>

                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="hover:text-white transition-colors"
                >
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </span>
            )}
          </div>

          {isEffectsLoading ? (
            // Portaled straight to document.body (mounted-gated, same as the
            // two modals below) rather than rendered inline here - RouteFade's
            // root node gets `gsap.set(page, { y: 0, ... })` applied to it,
            // and any transform on an ancestor (even y:0) makes that ancestor
            // the containing block for `position: fixed` descendants instead
            // of the real viewport. Rendered inline, "fixed" was actually
            // anchoring to RouteFade's own (scrolling) box, not the screen -
            // which is exactly why it still scrolled. document.body has no
            // transform, so a fixed child of it always tracks the viewport.
            mounted && createPortal(<EffectsGridSkeleton />, document.body)
          ) : filteredEffects.length === 0 ? (
            <div className="py-20 text-center max-md:px-4 max-md:py-14">
              <div className="mb-6 text-6xl max-md:mb-4 max-md:text-4xl">
                🔍
              </div>

              <h3
                className="mb-3 font-display text-3xl font-normal text-foreground max-md:text-2xl"
                style={{ lineHeight: "1.1" }}
              >
                No effects found
              </h3>

              <p className=" text-base text-muted max-md:text-sm">
                Try adjusting your search or filter criteria
              </p>
            </div>
          ) : (
            <EffectsGrid
              filteredEffects={filteredEffects}
              initialEffects={incomingInitialEffects}
              wishlist={wishlist}
              toggleWishlist={toggleWishlist}
              isProUser={isProUser}
              isSidebarOpen={isSidebarOpen}
              animationKey={routeKey}
              columns={gridColumns}
            />
          )}

          {!isEffectsLoading && (
            <div className="relative text-foreground w-full mx-auto max-[1025px]:w-full">
              {activeCategoryFaqItems.length > 0 && (
                <div key={`category-faq-${categoryFilter}`}>
                  <FAQV3 faqItems={activeCategoryFaqItems} translateTop={false} />
                </div>
              )}

              {activeCategoryContent?.cta &&
                (activeCategoryContent?.cta.heading ||
                  activeCategoryContent?.cta.buttonText) && (
                  <section
                    key={`category-cta-${categoryFilter}`}
                    className="category-fadeup fadeup w-full bg-[#272727]  max-sm:w-[90%] text-center my-[5vw] mx-auto max-[1025px]:px-6 max-md:px-[7vw] px-10 max-md:mt-[20vw] "
                  >
                    <div className="mx-auto w-full flex flex-col items-center max-w-6xl  py-15">
                      {activeCategoryContent.cta.heading && (
                        <h2 className="text-[4vw] font-medium text-foreground max-md:text-[7vw]">
                          {activeCategoryContent.cta.heading}
                        </h2>
                      )}

                      {activeCategoryContent.cta.description && (
                        <p className="mt-4 mx-auto max-w-3xl text20 text-muted">
                          {activeCategoryContent.cta.description}
                        </p>
                      )}

                      {activeCategoryContent.cta.buttonText && (
                        <CustomAnimationFormTrigger>
                          <div className="mt-6 ">
                            <ButtonV3
                              preventDefault={false}
                              text={activeCategoryContent.cta.buttonText}
                              href={activeCategoryContent.cta.buttonLink || "#"}
                              variant="white"
                              className="shrink-0 w-fit max-md:w-[90%] mx-auto max-md:pl-[6vw]! max-md:pr-[10vw]! bg-white"
                              scaleClass="group-hover:scale-[100]"
                            />
                          </div>
                        </CustomAnimationFormTrigger>
                      )}
                    </div>
                  </section>
                )}
            </div>
          )}
        </div>
      </RouteFade>

      <ToastViewport toast={wishlistToast} onDismiss={dismissWishlistToast} />

      {mounted && createPortal(
        <>
          {/* Pro upgrade success modal */}
          <div
            className={`fixed inset-0 z-9999 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 transition-opacity duration-300 ${justUpgraded && !upgradeToastDismissed ? "opacity-100" : "pointer-events-none opacity-0"}`}
            onClick={() => setUpgradeToastDismissed(true)}
          >
            <div
              className={`flex w-[35vw]  max-md:w-full max-[1025px]:w-[70%] flex-col gap-6 items-center border border-white/20 bg-[#0e0e0e] p-10 max-[1025px]:p-6 shadow-2xl transition-transform duration-300 relative ${justUpgraded && !upgradeToastDismissed ? "scale-100" : "scale-95"}`}
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                aria-label="Close"
                onClick={() => setUpgradeToastDismissed(true)}
                className="max-[1025px]:hidden group absolute right-5 top-5 flex h-10 w-10 items-center justify-center border border-white/20 bg-white/10 text-xl leading-none text-white/70 transition-all duration-500 ease-in-out hover:border-[#ff5f00] hover:bg-[#ff5f00] hover:text-white "
              >
                <div className="relative flex h-4 w-4 items-center justify-center duration-500 ease-in-out group-hover:rotate-90">
                  <span className="h-px w-4 rotate-45 bg-white" />
                  <span className="absolute h-px w-4 -rotate-45 bg-white" />
                </div>
              </button>

              <div className="flex items-start justify-between gap-3">
                <h2 className="text-2xl font-medium text-white">Welcome to Pro</h2>
              </div>
              <p className="text-sm text-white/60 text-center w-[80%] max-[1025px]:w-full">
                Your upgrade is confirmed and the full vault is unlocked. Explore
                every Pro effect and start shipping right away.
              </p>
              <Link href="/effects" className="inline-flex w-fit items-center gap-1.5  bg-[#ff5f00] px-4 py-2 text-sm font-medium text-white hover:bg-[#e05500] transition-colors">
                Explore effects
              </Link>
            </div>
          </div>

          {/* Wishlist sign-in modal */}
          <div
            className={`fixed inset-0 z-9999 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 transition-opacity duration-300 ${showWishlistToast ? "opacity-100" : "pointer-events-none opacity-0"}`}
            onClick={() => setShowWishlistToast(false)}
          >
            <div
              className={`flex w-[35vw]  max-md:w-full max-[1025px]:w-[70%] flex-col gap-8 items-center  border border-white/20 bg-[#0e0e0e] p-10 max-[1025px]:p-6 shadow-2xl transition-transform duration-300 relative ${showWishlistToast ? "scale-100" : "scale-95"}`}
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                aria-label="Close"
                onClick={() => setShowWishlistToast(false)}
                className="max-[1025px]:hidden group absolute right-5 top-5 flex h-10 w-10 items-center justify-center  border border-white/20 bg-white/10 text-xl leading-none text-white/70 transition-all duration-500 ease-in-out hover:border-[#ff5f00] hover:bg-[#ff5f00] hover:text-white "
              >
                <div className="relative flex h-4 w-4 items-center justify-center duration-500 ease-in-out group-hover:rotate-90">
                  <span className="h-px w-4 rotate-45 bg-white" />
                  <span className="absolute h-px w-4 -rotate-45 bg-white" />
                </div>
              </button>

              <div className="flex items-start justify-between gap-3">
                <h2 className="text-2xl font-medium text-white">Sign in required</h2>
              </div>
              <p className="text-sm text-white/60 text-center w-[80%] max-[1025px]:w-full">
                Create a free account or sign in to save effects to your
                wishlist and pick up right where you left off.
              </p>
              <ButtonV3 text="Sign In" href="/sign-in?redirect_url=/effects" />


            </div>
          </div>
        </>,
        document.body
      )}
    </>
  );
}

const BATCH_SIZE = 18;
// Keeps the cards' entrance well behind the heading/description (delay 0.3s)
// so they clearly follow it rather than firing at the same time.
const CARD_ENTRANCE_BASE_DELAY = 1;

// Inner component - keyed by filteredEffectsKey so state resets automatically on filter change
function EffectsGridInner({
  filteredEffects,
  initialEffects = [],
  wishlist,
  toggleWishlist,
  isProUser,
  animationKey,
  columns = 3,
}) {
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);
  const [loadedCards, setLoadedCards] = useState(() => {
    const initialMap = {};
    if (Array.isArray(initialEffects)) {
      for (const effect of initialEffects) {
        if (effect?.name) initialMap[effect.name] = effect;
      }
    }
    return initialMap;
  });
  const [isLoadingBatch, setIsLoadingBatch] = useState(false);

  const gridRef = useRef(null);
  const sentinelRef = useRef(null);
  const isFetchingRef = useRef(false);

  const visibleEffects = filteredEffects.slice(0, visibleCount);
  const hasMore = visibleCount < filteredEffects.length;

  // Fetch full card data for any effects currently in visible range that aren't loaded yet
  useEffect(() => {
    const neededSlugs = visibleEffects
      .map((e) => e.name)
      .filter((slug) => slug && !loadedCards[slug]);

    if (neededSlugs.length === 0 || isFetchingRef.current) return;

    let cancelled = false;
    isFetchingRef.current = true;
    setIsLoadingBatch(true);

    fetch(`/api/effects/list?slugs=${encodeURIComponent(neededSlugs.join(","))}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data?.effects) return;
        setLoadedCards((prev) => {
          const next = { ...prev };
          for (const card of data.effects) {
            if (card?.name) next[card.name] = card;
          }
          return next;
        });
      })
      .catch((err) => console.error("Error loading effects batch:", err))
      .finally(() => {
        if (!cancelled) {
          isFetchingRef.current = false;
          setIsLoadingBatch(false);
        }
      });

    return () => {
      cancelled = true;
      isFetchingRef.current = false;
    };
  }, [visibleEffects, loadedCards]);

  // Load next batch when the sentinel enters the viewport
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + BATCH_SIZE, filteredEffects.length));
        }
      },
      { rootMargin: "1000px 0px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [filteredEffects.length]);

  // Animate only newly-mounted cards (those without .card-entered yet)
  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;

    const cards = Array.from(
      grid.querySelectorAll(".effect-card-shell:not(.card-entered)")
    );
    if (!cards.length) return;

    cards.forEach((card, i) => {
      card.style.setProperty(
        "--card-delay",
        `${CARD_ENTRANCE_BASE_DELAY + (i % BATCH_SIZE) * 0.06}s`
      );
    });

    const raf = requestAnimationFrame(() => {
      cards.forEach((card) => card.classList.add("card-entered"));
    });

    return () => cancelAnimationFrame(raf);
  }, [visibleEffects.length, animationKey]);

  const baseColsClass = columns === 2 ? "grid-cols-2" : "grid-cols-3";

  return (
    <>
      <div
        ref={gridRef}
        className={`grid gap-6 rounded-xl max-[1025px]:pt-6 max-md:pt-0 ${baseColsClass} max-[1025px]:grid-cols-1 max-md:px-[7vw] max-md:grid-cols-1 max-[1025px]:gap-10`}
      >
        {visibleEffects.map((effect, i) => {
          const fullEffect = loadedCards[effect.name] || effect;
          return (
            <motion.div
              key={effect.name}
              layout
              transition={{ layout: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } }}
            >
              <div className="effect-card-shell">
                <EffectCard
                  effect={fullEffect}
                  priority={i < 4}
                  isWishlisted={wishlist.includes(effect.name)}
                  toggleWishlist={toggleWishlist}
                  isProUser={isProUser}
                />
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Sentinel - triggers the next 18 batch before user reaches bottom */}
      {hasMore && <div ref={sentinelRef} className="h-1" aria-hidden="true" />}

      {/* Loading state indicator during batch fetch */}
      {isLoadingBatch && (
        <div className="flex justify-center py-10">
          <GridDots size={56} squareSize={8} className="text-primary" />
        </div>
      )}

      {/* Manual fallback - covers slow IntersectionObserver support or scroll
          that never reaches the sentinel (short viewports, trackpads, etc). */}
      {hasMore && !isLoadingBatch && (
        <div className="flex justify-center pt-10">
          <LinkButton
            text="Load More"
            shimmer
            tilted={false}
            onClick={() =>
              setVisibleCount((prev) => Math.min(prev + BATCH_SIZE, filteredEffects.length))
            }
          />
        </div>
      )}
    </>
  );
}

function EffectsGrid({
  filteredEffects,
  initialEffects,
  wishlist,
  toggleWishlist,
  isProUser = false,
  isSidebarOpen = false,
  animationKey,
  columns = 3,
}) {
  const filteredEffectsKey = filteredEffects
    .map((effect) => effect.name)
    .join("|");

  return (
    <EffectsGridInner
      key={filteredEffectsKey}
      filteredEffects={filteredEffects}
      initialEffects={initialEffects}
      wishlist={wishlist}
      toggleWishlist={toggleWishlist}
      isProUser={isProUser}
      animationKey={animationKey}
      columns={columns}
    />
  );
}
