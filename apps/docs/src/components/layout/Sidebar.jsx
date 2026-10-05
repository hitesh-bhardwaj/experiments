"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronRight, PanelLeft } from "lucide-react";
import { effectCategories, getEffectCategoryHref } from "@/lib/categories";
import { getFeaturedEffects } from "@/lib/featured-effects";
import { useVaultLayout } from "./VaultLayout";
import { Tooltip } from "@/components/ui/Tooltip";
import {
  Overview,
  Documentation,
  Category,
  Legal,
  Github,
  Pricing,
  Npm,
  Mcp,
  TemplateIcon
} from "../WebsiteComps/Icons";
import Link from "next/link";

const DEFAULT_DOCS_TOP_LINKS = [
  { href: "/docs", label: "Introduction" },
  { href: "/docs/installation", label: "Installation" },
  { href: "/docs/cli", label: "CLI" },
  { href: "/docs/mcp", label: "MCP" },
  { href: "/docs/dependencies", label: "Dependencies" },
  { href: "/docs/license", label: "License" },
];

const DEFAULT_LEGAL_LINKS = [
  { href: "/legal/license-agreement", label: "License Agreement" },
  { href: "/legal/privacy-policy", label: "Privacy Policy" },
  { href: "/legal/refund-policy", label: "Refund Policy" },
  { href: "/legal/terms-of-service", label: "Terms of Service" },
];

function categoryLabel(category) {
  return category.name.replace("Website ", "").replace("Page ", "");
}

const TIER_CATEGORY_LINKS = [
  { id: "free", name: "Free Effects" },
  { id: "pro", name: "Pro Effects" },
];

function getPathSegments(pathname = "") {
  return pathname.split("/").filter(Boolean);
}

function getLastPathSegment(pathname = "") {
  const segments = getPathSegments(pathname);
  return segments[segments.length - 1] || "";
}

function NavIconLink({
  label,
  href,
  icon: Icon,
  isExpanded,
  isActive,
  onClick,
  external,
  onMouseEnter,
}) {
  const handleClick = (event) => {
    onClick?.(event);

    if (external) {
      event.currentTarget.blur();
    }
  };

  const link = (
    <Link
      href={href}
      scroll={false}
      onClick={handleClick}
      onMouseEnter={onMouseEnter}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      className={`group relative flex h-10 items-center gap-3 px-4 py-[1.5vw] text22 font-medium text-white/90 transition-[width,color] duration-300 ease-out hover:text-white ${
        isExpanded ? "w-[18vw]" : "w-[3.6vw]"
      }`}
    >
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 -z-10 origin-top bg-[#1C1C1C] transition-transform duration-300 ease-out motion-reduce:transition-none ${
          isActive ? "scale-y-100" : "scale-y-0 group-hover:scale-y-100"
        }`}
      />

      <Icon className="h-5 w-5 shrink-0" strokeWidth={1.7} />

      <span
        className={`truncate ${
          isExpanded ? "delay-100 opacity-100 duration-200" : "opacity-0"
        }`}
      >
        {label}
      </span>
    </Link>
  );

  if (isExpanded) return link;

  return (
    <Tooltip label={label} position="right" className="w-fit" hideOnClick={external}>
      {link}
    </Tooltip>
  );
}

function SectionButton({
  label,
  icon: Icon,
  isExpanded,
  isOpen,
  isActive,
  onClick,
  onMouseEnter,
}) {
  const button = (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      className={`group relative flex h-10 cursor-pointer items-center rounded-md px-4 py-[1.5vw] text-left text22 font-medium text-white/90 transition-[width,color] duration-300 ease-out hover:text-white ${
        isExpanded ? "w-[18vw]" : "w-[3.6vw]"
      } ${isExpanded ? "gap-3" : "gap-1.5"}`}
    >
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 -z-10 origin-top bg-[#1C1C1C] transition-transform duration-300 ease-out motion-reduce:transition-none ${
          isActive ? "scale-y-100" : "scale-y-0 group-hover:scale-y-100"
        }`}
      />

      <Icon className="h-5 w-5 shrink-0" strokeWidth={1.7} />

      <span
        className={`truncate ${
          isExpanded
            ? "min-w-0 flex-1 delay-100 opacity-100 duration-200"
            : "w-0 opacity-0"
        }`}
      >
        {label}
      </span>

      {isExpanded && (
        <motion.span
          animate={{ rotate: isOpen ? 90 : 0, x: isOpen ? 2 : 0 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="shrink-0"
        >
          <ChevronRight className="h-4 w-4" />
        </motion.span>
      )}
    </button>
  );

  if (isExpanded) return button;

  return (
    <Tooltip label={label} position="right" className="w-fit">
      {button}
    </Tooltip>
  );
}

export function Sidebar({
  effects = [],
  effectCounts = {},
  isExpanded = false,
  onToggle,
  activeCategory,
  topLinks = DEFAULT_DOCS_TOP_LINKS,
  legalLinks = DEFAULT_LEGAL_LINKS,
  disableInitialTransition = false,
  onOverviewNavigate,
  onCategoryNavigate,
  onDocumentationNavigate,
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const resolvedTopLinks = topLinks?.length ? topLinks : DEFAULT_DOCS_TOP_LINKS;
  const resolvedLegalLinks = legalLinks?.length
    ? legalLinks
    : DEFAULT_LEGAL_LINKS;

  const lastPathSegment = getLastPathSegment(pathname);

  const categoryNavigationItems = useMemo(
    () => [
      ...TIER_CATEGORY_LINKS,
      ...effectCategories.filter((category) => category.id !== "featured"),
    ],
    []
  );

  const categoryRouteSlugs = useMemo(
    () =>
      categoryNavigationItems.map((category) =>
        getEffectCategoryHref(category.id).split("/").filter(Boolean).pop()
      ),
    [categoryNavigationItems]
  );

  const isCategoryRoute =
    Boolean(lastPathSegment) && categoryRouteSlugs.includes(lastPathSegment);

  const isLegalRoute = resolvedLegalLinks.some((link) => {
    const [basePath] = link.href.split("#");

    return pathname === basePath;
  });

  // MCP has its own dedicated icon at the bottom of the sidebar (separate
  // from the Documentation dropdown, even though "/docs/mcp" is also listed
  // as one of Documentation's own sub-links) - being on that exact page
  // should only light up the MCP icon, not double up with the Documentation
  // section button too.
  const isMcpDocsRoute = pathname === "/docs/mcp";

  const initialOpenSection = isLegalRoute
    ? "legal"
    : pathname.startsWith("/docs") && !isMcpDocsRoute
      ? "docs"
      : isCategoryRoute
        ? "categories"
        : "";

  const [activeHash, setActiveHash] = useState("");
  const [fetchedEffects, setFetchedEffects] = useState([]);
  const [openSection, setOpenSection] = useState(initialOpenSection);
  const [hoveredSidebarKey, setHoveredSidebarKey] = useState("");
  const { startNavigation, scrollToTop } = useVaultLayout();

  // A single scrollToTop() call at click time can lose the race against
  // layout recalculation that happens shortly after the route actually
  // changes - GSAP's ScrollTrigger.refresh() re-measuring pinned/scrubbed
  // sections on the destination page (this app uses those extensively) can
  // itself nudge the scroll position, and that refresh is deliberately
  // staggered up to 360ms out (see VaultLayout's refreshScrollTrigger) to
  // catch content that resizes as it loads. One immediate call isn't
  // enough to guarantee "clicking a sidebar link always lands at the top" -
  // this re-asserts scroll=0 several times over the following beat so it
  // wins regardless of what else fires after it.
  const forceScrollToTop = () => {
    scrollToTop();
    requestAnimationFrame(scrollToTop);
    requestAnimationFrame(() => requestAnimationFrame(scrollToTop));
    window.setTimeout(scrollToTop, 150);
    window.setTimeout(scrollToTop, 400);
  };

  const previousRouteSectionRef = useRef(initialOpenSection);
  const categoryNavigationInProgressRef = useRef(false);

  const isLegalActive = resolvedLegalLinks.some((link) => {
    const [basePath, hash] = link.href.split("#");

    return pathname === basePath && (!hash || activeHash === `#${hash}`);
  });

  const isDocsActive =
    !isLegalActive &&
    !isMcpDocsRoute &&
    (pathname.startsWith("/docs") ||
      resolvedTopLinks.some((link) => {
        const [basePath, hash] = link.href.split("#");

        return pathname === basePath && (!hash || activeHash === `#${hash}`);
      }));

  const pathnameCategory = useMemo(() => {
    if (!pathname.startsWith("/effects/")) return "";

    return (
      categoryNavigationItems.find((category) => {
        const [categoryPath] = getEffectCategoryHref(category.id).split("?");

        return pathname === categoryPath;
      })?.id || ""
    );
  }, [categoryNavigationItems, pathname]);

  const currentCategory = isDocsActive || isLegalActive
    ? ""
    : activeCategory || searchParams.get("category") || pathnameCategory || "";

  const isOverviewActive =
    pathname === "/effects" && (!currentCategory || currentCategory === "all");

  const isTemplatesActive =
    pathname === "/templates" || pathname.startsWith("/templates/");

  const isCategoriesActive =
    !isDocsActive &&
    !isLegalActive &&
    (isCategoryRoute ||
      (pathname === "/effects" &&
        Boolean(currentCategory) &&
        currentCategory !== "all"));

  const isDocumentationActive = isDocsActive;

  const routeOpenSection = isLegalActive
    ? "legal"
    : isDocumentationActive
      ? "docs"
      : isCategoriesActive
        ? "categories"
        : "";


  useEffect(() => {
    const onHash = () => setActiveHash(window.location.hash || "");

    queueMicrotask(() => {
      onHash();
    });
    window.addEventListener("hashchange", onHash);

    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    if (effects.length) return;

    let isMounted = true;

    fetch("/r/index.json")
      .then((response) => (response.ok ? response.json() : null))
      .then((registry) => {
        if (!isMounted || !registry?.items) return;

        setFetchedEffects(registry.items);
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [effects]);

  // ponytail: removed an eager useEffect that called router.prefetch() for
  // every docs/legal/category link (~23 routes, each an RSC payload + full
  // page JS chunk) on every Sidebar mount - confirmed via a live network
  // trace to be firing in the same burst as the page's own content requests
  // and contending for bandwidth (reported as "/effects loading very slow").
  // next/link already prefetches each rendered <Link> lazily as it enters
  // the viewport (see the sidebar's own <Link> elements below) - this was a
  // redundant, strictly-worse duplicate of that, blasting everything upfront
  // instead of staggered as links actually scroll into view.

  /*
    Important:
    Only auto-sync when the route section changes:
    overview -> categories
    categories -> docs
    docs -> categories

    Do NOT sync on every category slug change:
    /effects/text-animations -> /effects/webgl-effects

    That prevents the dropdown from closing and reopening during category navigation.
  */
  useEffect(() => {
    const previousRouteSection = previousRouteSectionRef.current;

    if (previousRouteSection !== routeOpenSection) {
      queueMicrotask(() => {
        setOpenSection(routeOpenSection);
      });
      previousRouteSectionRef.current = routeOpenSection;
    }
  }, [routeOpenSection]);

  /*
    If the user clicks a category inside the already-open dropdown, keep it open
    during the fade-out, route push, and route fade-in.
  */
  useEffect(() => {
    if (!categoryNavigationInProgressRef.current) return;

    if (isCategoriesActive) {
      queueMicrotask(() => {
        setOpenSection("categories");
      });
      categoryNavigationInProgressRef.current = false;
    }
  }, [pathname, isCategoriesActive]);

  const sidebarEffects = effects.length ? effects : fetchedEffects;

  const featuredCount = useMemo(
    () => getFeaturedEffects(sidebarEffects).length,
    [sidebarEffects]
  );

  const computedTierCounts = useMemo(() => {
    return sidebarEffects.reduce(
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
  }, [sidebarEffects]);

  // Fallback for routes (e.g. /dashboard) that mount Sidebar without ever
  // computing/passing `effectCounts` from the server.
  const computedCategoryCounts = useMemo(() => {
    const counts = {};

    for (const effect of sidebarEffects) {
      const cats = effect.categories?.length
        ? effect.categories
        : [effect.category].filter(Boolean);

      for (const cat of cats) {
        counts[cat] = (counts[cat] || 0) + 1;
      }
    }

    return counts;
  }, [sidebarEffects]);

  const navigateOverview = (event) => {
    event?.preventDefault();

    categoryNavigationInProgressRef.current = false;
    setOpenSection("");
    startNavigation("/effects");
    forceScrollToTop();

    const wasHandled = onOverviewNavigate?.();

    if (wasHandled === true) return;

    router.push("/effects", { scroll: false });
  };

  // No sub-category tree yet (Hero/About/SaaS/etc, per the Figma design) -
  // that needs real Sanity-backed counts. This is a plain top-level link
  // until that data exists, same as "All Effects" today.
  const navigateTemplates = (event) => {
    event?.preventDefault();

    setOpenSection("");
    startNavigation("/templates");
    router.push("/templates", { scroll: false });
  };

  const navigateCategory = (event, categoryId) => {
    event?.preventDefault();

    categoryNavigationInProgressRef.current = true;
    setOpenSection("categories");
    const targetHref = getEffectCategoryHref(categoryId);
    startNavigation(targetHref);
    forceScrollToTop();

    const wasHandled = onCategoryNavigate?.(categoryId);

    if (wasHandled === true) return;

    router.push(targetHref, { scroll: false });
  };

  const navigateDocumentation = (event, href) => {
    event?.preventDefault();

    categoryNavigationInProgressRef.current = false;
    setOpenSection("docs");
    startNavigation(href);
    forceScrollToTop();

    if (typeof window !== "undefined") {
      const docsRouteEvent = new CustomEvent("hyperiux:docs-route-request", {
        cancelable: true,
        detail: { href },
      });

      const wasHandledByDocsBody = !window.dispatchEvent(docsRouteEvent);

      if (wasHandledByDocsBody) return;
    }

    const wasHandled = onDocumentationNavigate?.(href);

    if (wasHandled === true) return;

    router.push(href, { scroll: false });
  };

  const navigateLegal = (event, href) => {
    event?.preventDefault();

    categoryNavigationInProgressRef.current = false;
    setOpenSection("legal");
    startNavigation(href);
    forceScrollToTop();

    const wasHandled = onDocumentationNavigate?.(href);

    if (wasHandled === true) return;

    router.push(href, { scroll: false });
  };

  const toggle = () => {
    const nextValue = !isExpanded;

    if (!nextValue) {
      setOpenSection("");
    } else if (routeOpenSection) {
      setOpenSection(routeOpenSection);
    }

    onToggle?.(nextValue);
  };

  const toggleSection = (section) => {
    categoryNavigationInProgressRef.current = false;

    if (!isExpanded) {
      setOpenSection(section);
      onToggle?.(true);
      return;
    }

    setOpenSection((currentSection) =>
      currentSection === section ? "" : section
    );
  };

  return (
    <aside
      className={`sticky bottom-0 left-0 top-0 z-51 h-screen bg-black/20 backdrop-blur-lg text-white max-[1025px]:hidden ${
        disableInitialTransition
          ? "transition-none"
          : "transition-[width] duration-300 ease-out"
      } ${isExpanded ? "w-[20vw]" : "w-[5.5vw]"}`}
    >
      <button
        type="button"
        aria-label={isExpanded ? "Collapse sidebar" : "Expand sidebar"}
        onClick={toggle}
        className={`absolute top-6  z-50 bg-[#1C1C1C] hidden size-10 cursor-pointer items-center justify-center  text-white transition-[left,background-color,transform] duration-300 ease-out hover:bg-white/15 sm:flex ${
          isExpanded ? "left-[20.8vw]" : "left-[6.2vw]"
        }`}
      >
        <div className={isExpanded ? "" : "-scale-x-100"}>
          <PanelLeft className="h-4 w-4" />
        </div>
      </button>

      <div
        className={`flex h-full flex-col items-start border-r border-b border-white/10 py-3 pl-3 pr-1 transition-all duration-300 ${
          isExpanded ? "overflow-hidden" : "overflow-visible"
        }`}
      >
        <div className="mb-10 flex h-16 w-full items-center justify-start overflow-hidden border-b border-white/10 px-3.5">
          <Link
            prefetch={false}
            href="/"
            scroll={false}
            onClick={() => {
              startNavigation("/");
              forceScrollToTop();
            }}
            className="flex min-w-0 items-center gap-3"
          >

           <Image
              src="/hyperiux.svg"
              alt="Hyperiux"
              width={28}
              height={28}
              className="h-7 w-7 shrink-0 text-primary"
            />
            
            <Image
              src="/hyperiux-wordmark.svg"
              alt="Hyperiux"
              width={128}
              height={37}
              className={`h-auto w-32 ${
                isExpanded
                  ? "delay-100 opacity-100 duration-200 text-primary"
                  : "opacity-0"
              }`}
            />
          </Link>
        </div>

        <nav
          data-lenis-prevent
          className={`flex w-full flex-1 min-h-0 flex-col pb-4 pr-1 sidebar-link-content ${
            isExpanded ? "overflow-y-auto overflow-x-hidden" : "overflow-visible"
          }`}
          onMouseLeave={() => setHoveredSidebarKey("")}
        >
          <NavIconLink
            label="All Effects"
            href="/effects"
            icon={Overview}
            isExpanded={isExpanded}
            isActive={hoveredSidebarKey ? hoveredSidebarKey === "overview" : isOverviewActive}
            onClick={navigateOverview}
            onMouseEnter={() => setHoveredSidebarKey("overview")}
          />


          <SectionButton
            label="Effect Categories"
            icon={Category}
            isExpanded={isExpanded}
            isOpen={openSection === "categories"}
            isActive={hoveredSidebarKey ? hoveredSidebarKey === "categories" : isCategoriesActive}
            onClick={() => toggleSection("categories")}
            onMouseEnter={() => setHoveredSidebarKey("categories")}
          />


          <AnimatePresence initial={false}>
            {isExpanded && openSection === "categories" && (
              <motion.div
                key="categories"
                initial={{ height: 0, opacity: 0, y: -6 }}
                animate={{ height: "auto", opacity: 1, y: 0 }}
                exit={{ height: 0, opacity: 0, y: -6 }}
                transition={{ duration: 0.24, ease: "easeOut" }}
                className="ml-7 max-h-[42vh] space-y-3 overflow-y-auto border-l border-white/12 pl-7 pr-3 sidebar-link-content"
              >
                {categoryNavigationItems.map((category,id) => {
                  const count =
                    effectCounts[category.id] ??
                    computedTierCounts[category.id] ??
                    computedCategoryCounts[category.id] ??
                    (category.id === "featured" ? featuredCount : 0);

                  const isActive = currentCategory === category.id;
                  const itemKey = `categories:${category.id}`;
                  const href = getEffectCategoryHref(category.id);

                  return (
                    <Link
                      key={category.id}
                      href={href}
                      scroll={false}
                      onClick={(event) => navigateCategory(event, category.id)}
                      onMouseEnter={() => setHoveredSidebarKey("categories")}
                      className={`relative flex w-full items-center justify-between gap-3  py-1 text-left text-sm transition-colors cursor-pointer ${
                        id === 0 ? "mt-[0.7vw]" : ""
                      } ${
                        id === effectCategories.length - 1 ? "mb-[0.7vw]" : ""
                      } ${
                        isActive
                          ? "text-white"
                          : "text-white/42 hover:text-white/75"
                      }`}
                    >
                      {isActive && (
                        <span className="absolute -left-5 h-2 w-2 animate-pulse rounded-full bg-primary" />
                      )}

                      <span className="flex min-w-0 items-center truncate">
                        <span className="truncate">
                          {categoryLabel(category)}
                        </span>
                      </span>

                      {count > 0 && (
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center bg-[#1C1C1C] text-center text-[0.65vw] text-white">
                          {count}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>


          <NavIconLink
            label="Templates"
            href="/templates"
            icon={TemplateIcon}
            isExpanded={isExpanded}
            isActive={hoveredSidebarKey ? hoveredSidebarKey === "templates" : isTemplatesActive}
            onClick={navigateTemplates}
            onMouseEnter={() => setHoveredSidebarKey("templates")}
          />

          <SectionButton
            label="Documentation"
            icon={Documentation}
            isExpanded={isExpanded}
            isOpen={openSection === "docs"}
            isActive={hoveredSidebarKey ? hoveredSidebarKey === "docs" : isDocumentationActive}
            onClick={() => toggleSection("docs")}
            onMouseEnter={() => setHoveredSidebarKey("docs")}
          />

          <AnimatePresence initial={false}>
            {isExpanded && openSection === "docs" && (
              <motion.div
                key="docs"
                initial={{ height: 0, opacity: 0, y: -6 }}
                animate={{ height: "auto", opacity: 1, y: 0 }}
                exit={{ height: 0, opacity: 0, y: -6 }}
                transition={{ duration: 0.24, ease: "easeOut" }}
                className="ml-7 space-y-1 overflow-hidden border-l border-white/12 pl-7"
              >
                {resolvedTopLinks.map((link, index) => {
                  const [basePath, hash] = link.href.split("#");

                  const isActive =
                    pathname === basePath &&
                    (!hash || activeHash === `#${hash}`);
                  const itemKey = `docs:${link.href}`;

                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      scroll={false}
                      onClick={(event) =>
                        navigateDocumentation(event, link.href)
                      }
                      onMouseEnter={() => setHoveredSidebarKey("docs")}
                      className={`relative flex w-full items-center rounded-full py-2 text-left text-sm transition-colors cursor-pointer ${
                        index === 0 ? "mt-[0.7vw]" : ""
                      } ${
                        index === resolvedTopLinks.length - 1 ? "mb-[0.7vw]" : ""
                      } ${
                        isActive
                          ? "text-white"
                          : "text-white/42 hover:text-white/75"
                      }`}
                    >
                      {isActive && (
                        <span className="absolute -left-5 h-2 w-2 animate-pulse rounded-full bg-primary" />
                      )}

                      {link.label}
                    </Link>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>

          <SectionButton
            label="Legal"
            icon={Legal}
            isExpanded={isExpanded}
            isOpen={openSection === "legal"}
            isActive={hoveredSidebarKey ? hoveredSidebarKey === "legal" : isLegalActive}
            onClick={() => toggleSection("legal")}
            onMouseEnter={() => setHoveredSidebarKey("legal")}
          />

          <AnimatePresence initial={false}>
            {isExpanded && openSection === "legal" && (
              <motion.div
                key="legal"
                initial={{ height: 0, opacity: 0, y: -6 }}
                animate={{ height: "auto", opacity: 1, y: 0 }}
                exit={{ height: 0, opacity: 0, y: -6 }}
                transition={{ duration: 0.24, ease: "easeOut" }}
                className="ml-7 space-y-1 overflow-hidden border-l border-white/12 pl-7"
              >
                {resolvedLegalLinks.map((link, index) => {
                  const [basePath, hash] = link.href.split("#");

                  const isActive =
                    pathname === basePath &&
                    (!hash || activeHash === `#${hash}`);
                  const itemKey = `legal:${link.href}`;

                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      scroll={false}
                      onClick={(event) => navigateLegal(event, link.href)}
                      onMouseEnter={() => setHoveredSidebarKey("legal")}
                      className={`relative flex w-full items-center rounded-full py-2 text-left text-sm transition-colors cursor-pointer ${
                        index === 0 ? "mt-[0.7vw]" : ""
                      } ${
                        index === resolvedLegalLinks.length - 1 ? "mb-[0.7vw]" : ""
                      } ${
                        isActive
                          ? "text-white"
                          : "text-white/42 hover:text-white/75"
                      }`}
                    >
                      {isActive && (
                        <span className="absolute -left-5 h-2 w-2 animate-pulse rounded-full bg-primary" />
                      )}

                      {link.label}
                    </Link>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>

          <NavIconLink
            label="Pricing"
            href="/pricing"
            icon={Pricing}
            isExpanded={isExpanded}
            isActive={hoveredSidebarKey ? hoveredSidebarKey === "pricing" : pathname === "/pricing"}
            onClick={() => {
              startNavigation("/pricing");
              forceScrollToTop();
            }}
            onMouseEnter={() => setHoveredSidebarKey("pricing")}
          />

          <NavIconLink
            label="Github"
            href="https://github.com/Hyperiux-Immersion-Labs/hyperiux-components"
            icon={Github}
            isExpanded={isExpanded}
            external
            isActive={hoveredSidebarKey === "github"}
            onMouseEnter={() => setHoveredSidebarKey("github")}
          />

          <NavIconLink
            label="NPM"
            href="https://www.npmjs.com/package/hyperiux"
            icon={Npm}
            isExpanded={isExpanded}
            external
            isActive={hoveredSidebarKey === "npm"}
            onMouseEnter={() => setHoveredSidebarKey("npm")}
          />

          <NavIconLink
            label="MCP"
            href="/docs/mcp"
            icon={Mcp}
            isExpanded={isExpanded}
            isActive={hoveredSidebarKey ? hoveredSidebarKey === "mcp" : pathname === "/docs/mcp"}
            onClick={(event) => navigateDocumentation(event, "/docs/mcp")}
            onMouseEnter={() => setHoveredSidebarKey("mcp")}
          />
        </nav>
      </div>
    </aside>
  );
}
