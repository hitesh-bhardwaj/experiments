"use client";

import { createContext, useContext, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLenis } from "lenis/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Sidebar } from "./Sidebar";
import { getEffectCategoryHref } from "@/lib/categories";
import { GridDots } from "@/components/grid-dots";

const VaultLayoutContext = createContext({
  isSidebarOpen: true,
  isSidebarReady: false,
  isNavigating: false,
  toggleSidebar: () => {},
  startNavigation: () => {},
  scrollToTop: () => {},
});

export function useVaultLayout() {
  return useContext(VaultLayoutContext);
}

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const SIDEBAR_EXPANDED_STORAGE_KEY = "hyperiux-sidebar-expanded";

const DOCS_TOP_LINKS = [
  { href: "/docs", label: "Introduction" },
  { href: "/docs/installation", label: "Installation" },
  { href: "/docs/cli", label: "CLI" },
  { href: "/docs/dependencies", label: "Dependencies" },
  { href: "/docs/license", label: "License" },
];

function getStoredSidebarExpanded() {
  if (typeof window === "undefined") return false;

  const v = window.localStorage.getItem(SIDEBAR_EXPANDED_STORAGE_KEY);

  return v === null ? true : v === "true";
}

function setStoredSidebarExpanded(value) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(
    SIDEBAR_EXPANDED_STORAGE_KEY,
    value ? "true" : "false"
  );
}

function RouteChangeWatcher({ isSidebarReady, onRouteChange }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchParamString = searchParams.toString();

  const routeChangeKey = useMemo(() => {
    const params = new URLSearchParams(searchParamString);

    params.delete("waitlist");
    params.delete("custom-animation-form");

    const query = params.toString();

    return `${pathname}${query ? `?${query}` : ""}`;
  }, [pathname, searchParamString]);

  useEffect(() => {
    if (!isSidebarReady) return;

    onRouteChange();
  }, [routeChangeKey, isSidebarReady, onRouteChange]);

  return null;
}

function SidebarFallback({ isExpanded }) {
  return (
    <aside
      className={`sticky bottom-0 left-0 top-0 h-screen border-r border-white/10 bg-[#060606] text-foreground max-[1025px]:hidden ${
        isExpanded ? "w-[288px]" : "w-22"
      }`}
    >
      <div className="flex h-full items-start justify-center px-2 py-3">
        <div className="h-29.5 w-full border-b border-white/10 bg-[#080808]" />
      </div>
    </aside>
  );
}

export function VaultLayout({
  children,
  effectCounts = {},
  effects = [],
  totalEffects: propTotalEffects,
  activeCategory,
  onOverviewNavigate,
  onCategoryNavigate,
  onDocumentationNavigate,
}) {
  const pathname = usePathname();
  const router = useRouter();

  const totalEffects =
    propTotalEffects !== undefined ? propTotalEffects : effects.length;

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSidebarReady, setIsSidebarReady] = useState(false);
  const [allowSidebarTransition, setAllowSidebarTransition] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => setIsNavigating(false));
    return () => window.cancelAnimationFrame(frameId);
  }, [pathname]);

  const startNavigation = useCallback(
    (targetHref) => {
      if (targetHref && targetHref !== "#" && targetHref !== pathname) {
        setIsNavigating(true);
      }
    },
    [pathname]
  );

  const lenis = useLenis();
  const refreshTimeoutsRef = useRef([]);

  const isDocsRoute = pathname === "/docs" || pathname.startsWith("/docs/");

  const clearRefreshTimeouts = useCallback(() => {
    if (typeof window === "undefined") return;

    refreshTimeoutsRef.current.forEach((timeoutId) => {
      window.clearTimeout(timeoutId);
    });

    refreshTimeoutsRef.current = [];
  }, []);

  const forceStartLenis = useCallback(() => {
    if (typeof document !== "undefined") {
      document.body.style.removeProperty("overflow");
    }

    lenis?.start?.();

    if (typeof window !== "undefined") {
      requestAnimationFrame(() => {
        lenis?.start?.();
      });

      window.setTimeout(() => {
        lenis?.start?.();
      }, 80);
    }
  }, [lenis]);

  const scrollToTop = useCallback(() => {
    if (typeof window === "undefined") return;

    forceStartLenis();

    if (lenis) {
      lenis.scrollTo(0, {
        immediate: true,
        force: true,
      });
      return;
    }

    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "auto",
    });
  }, [forceStartLenis, lenis]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const previousScrollRestoration = window.history.scrollRestoration;

    window.history.scrollRestoration = "manual";
    scrollToTop();

    const rafOne = requestAnimationFrame(scrollToTop);
    const rafTwo = requestAnimationFrame(() => {
      requestAnimationFrame(scrollToTop);
    });

    const timeout = window.setTimeout(scrollToTop, 120);

    return () => {
      cancelAnimationFrame(rafOne);
      cancelAnimationFrame(rafTwo);
      window.clearTimeout(timeout);
      window.history.scrollRestoration = previousScrollRestoration;
    };
  }, [scrollToTop]);

  const refreshScrollTrigger = useCallback(
    (includeSidebarDelay = false) => {
      if (typeof window === "undefined") return;

      clearRefreshTimeouts();

      const runRefresh = () => {
        ScrollTrigger.refresh(true);
      };

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          runRefresh();

          refreshTimeoutsRef.current.push(
            window.setTimeout(runRefresh, 80),
            window.setTimeout(runRefresh, 180),
            window.setTimeout(runRefresh, 360)
          );

          if (includeSidebarDelay) {
            refreshTimeoutsRef.current.push(
              window.setTimeout(runRefresh, 520)
            );
          }
        });
      });
    },
    [clearRefreshTimeouts]
  );

  const handleRouteChange = useCallback(() => {
    forceStartLenis();
    scrollToTop();
    refreshScrollTrigger();

    if (typeof window === "undefined") return;

    requestAnimationFrame(() => {
      forceStartLenis();
      scrollToTop();
      refreshScrollTrigger();
    });
  }, [forceStartLenis, refreshScrollTrigger, scrollToTop]);

  useEffect(() => {
    let frameTwo;
    let frameThree;

    const frameOne = requestAnimationFrame(() => {
      setIsSidebarOpen(getStoredSidebarExpanded());
      setIsSidebarReady(true);

      frameTwo = requestAnimationFrame(() => {
        frameThree = requestAnimationFrame(() => {
          setAllowSidebarTransition(true);
          refreshScrollTrigger(true);
        });
      });
    });

    return () => {
      cancelAnimationFrame(frameOne);
      cancelAnimationFrame(frameTwo);
      cancelAnimationFrame(frameThree);
    };
  }, [refreshScrollTrigger]);

  useEffect(() => {
    return () => {
      clearRefreshTimeouts();
    };
  }, [clearRefreshTimeouts]);

  useEffect(() => {
    if (!isSidebarReady) return;

    setStoredSidebarExpanded(isSidebarOpen);
  }, [isSidebarOpen, isSidebarReady]);

  useEffect(() => {
    if (!isSidebarReady) return;

    refreshScrollTrigger(true);
  }, [isSidebarOpen, isSidebarReady, refreshScrollTrigger]);

  useEffect(() => {
    if (!isSidebarReady) return;

    const mediaQuery = window.matchMedia("(max-width: 767px)");

    const syncLenis = () => {
      if (isSidebarOpen && mediaQuery.matches) {
        lenis?.stop?.();
      } else {
        lenis?.start?.();
      }

      refreshScrollTrigger();
    };

    syncLenis();
    mediaQuery.addEventListener("change", syncLenis);

    return () => {
      mediaQuery.removeEventListener("change", syncLenis);
      lenis?.start?.();
    };
  }, [isSidebarOpen, isSidebarReady, lenis, refreshScrollTrigger]);

  // Opening / closing the sidebar animates the content column's width, so text above
  // the viewport re-wraps and the page height changes every frame. The browser's scroll
  // anchoring would normally hide that, but Lenis writes the scroll position itself, so
  // the page visibly jitters (worst mid-scroll). For the length of the transition (and
  // the ScrollTrigger refreshes after it) keep the element at the top of the viewport
  // where it was, by shifting Lenis's scroll state by however far the layout moved it.
  const anchorHoldRef = useRef(null);
  const holdScrollAnchor = useCallback(() => {
    if (typeof window === "undefined" || window.scrollY < 1) return;

    anchorHoldRef.current?.();

    const anchor = document
      .elementsFromPoint(window.innerWidth * 0.6, window.innerHeight * 0.3)
      .find(
        (el) =>
          el !== document.documentElement &&
          el !== document.body &&
          !el.closest("aside, header, [role='dialog']") &&
          getComputedStyle(el).position !== "fixed" &&
          el.getBoundingClientRect().height < window.innerHeight
      );
    if (!anchor) return;

    const root = document.documentElement;
    const previousAnchoring = root.style.overflowAnchor;
    root.style.overflowAnchor = "none";

    let lastTop = anchor.getBoundingClientRect().top;
    let lastScroll = window.scrollY;

    const tick = () => {
      if (!anchor.isConnected) return;
      // How far the layout moved the anchor, beyond what scrolling explains.
      const drift =
        anchor.getBoundingClientRect().top - lastTop + (window.scrollY - lastScroll);

      if (Math.abs(drift) >= 0.5) {
        if (lenis) {
          if (lenis.animate?.isRunning) {
            lenis.animate.value += drift;
            lenis.animate.from += drift;
            lenis.animate.to += drift;
          }
          lenis.targetScroll += drift;
          lenis.animatedScroll += drift;
        }
        window.scrollTo(0, window.scrollY + drift);
      }

      lastTop = anchor.getBoundingClientRect().top;
      lastScroll = window.scrollY;
    };

    // After Lenis's own update in the same tick (Lenis runs on the gsap ticker too).
    gsap.ticker.add(tick);
    const stopTimer = window.setTimeout(() => release(), 1000);
    const release = () => {
      gsap.ticker.remove(tick);
      window.clearTimeout(stopTimer);
      root.style.overflowAnchor = previousAnchoring;
      anchorHoldRef.current = null;
    };
    anchorHoldRef.current = release;
  }, [lenis]);

  useEffect(() => () => anchorHoldRef.current?.(), []);

  const toggleSidebar = useCallback((nextValue) => {
    holdScrollAnchor();
    setIsSidebarOpen((currentValue) =>
      typeof nextValue === "boolean" ? nextValue : !currentValue
    );

    refreshScrollTrigger(true);
  }, [holdScrollAnchor, refreshScrollTrigger]);

  const closeSidebar = () => {
    holdScrollAnchor();
    setIsSidebarOpen(false);
    refreshScrollTrigger(true);
  };

  const handleOverviewNavigate = () => {
    const wasHandled = onOverviewNavigate?.();

    if (wasHandled === true) {
      refreshScrollTrigger();
      return true;
    }

    router.push("/effects", { scroll: false });
    refreshScrollTrigger();

    return true;
  };

  const handleCategoryNavigate = (categoryId) => {
    const wasHandled = onCategoryNavigate?.(categoryId);

    if (wasHandled === true) {
      refreshScrollTrigger();
      return true;
    }

    const categoryHref = getEffectCategoryHref(categoryId);

    router.push(categoryHref, { scroll: false });
    refreshScrollTrigger();

    return true;
  };

  const handleDocumentationNavigate = (href) => {
    if (isDocsRoute && onDocumentationNavigate) {
      const wasHandled = onDocumentationNavigate(href);

      if (wasHandled === true) {
        refreshScrollTrigger();
        return true;
      }
    }

    router.push(href, { scroll: false });
    refreshScrollTrigger();

    return true;
  };

  // Render-prop API: `children` decides when to call `toggleSidebar`
  // (typically from an event handler it wires up), not synchronously here.
  const renderedChildren =
    typeof children === "function"
      ? // eslint-disable-next-line react-hooks/refs
        children({ isSidebarOpen, toggleSidebar, isSidebarReady })
      : children;

  const contextValue = useMemo(
    () => ({
      isSidebarOpen,
      isSidebarReady,
      isNavigating,
      toggleSidebar,
      startNavigation,
      scrollToTop,
    }),
    [
      isSidebarOpen,
      isSidebarReady,
      isNavigating,
      toggleSidebar,
      startNavigation,
      scrollToTop,
    ]
  );

  return (
    <VaultLayoutContext.Provider value={contextValue}>
      <div className="relative min-h-[200vh] text-foreground">
        <Suspense fallback={null}>
          <RouteChangeWatcher
            isSidebarReady={isSidebarReady}
            onRouteChange={handleRouteChange}
          />
        </Suspense>

        <div className="relative z-300 flex  min-h-[200vh] items-start">
          <Suspense fallback={<SidebarFallback isExpanded={isSidebarOpen} />}>
            <Sidebar
              effects={effects}
              effectCounts={effectCounts}
              totalEffects={totalEffects}
              isExpanded={isSidebarOpen}
              onToggle={toggleSidebar}
              onClose={closeSidebar}
              activeCategory={activeCategory}
              topLinks={DOCS_TOP_LINKS}
              onOverviewNavigate={handleOverviewNavigate}
              onCategoryNavigate={handleCategoryNavigate}
              onDocumentationNavigate={handleDocumentationNavigate}
              disableInitialTransition={!allowSidebarTransition}
            />
          </Suspense>

          <main className="relative min-w-0 flex-1">
            {isNavigating ? (
              <div className="absolute inset-x-0 top-0 flex h-screen items-center justify-center">
                <GridDots size={56} squareSize={8} className="text-primary" />
              </div>
            ) : (
              renderedChildren
            )}
          </main>
        </div>
      </div>
    </VaultLayoutContext.Provider>
  );
}
