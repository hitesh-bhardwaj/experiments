"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useLenis } from "lenis/react";
import { RouteFade } from "@/components/layout/RouteFade";
import { useVaultLayout } from "@/components/layout/VaultLayout";
import { useFadeUp } from "@/components/Animations/gsapAnimations";
import { TableOfContents } from "@/components/ui/TableOfContents";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import DocsPageFooter from "./DocsPageFooter";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

// Dark header above the white sheet (Docs prototype's .dd-top): title + lede per page
const DOCS_HERO = {
  "/docs": { title: "Introduction", lede: "Effects for the parts of your site that people actually remember." },
  "/docs/installation": { title: "Installation Guide", lede: "Install the effect. Own the files." },
  "/docs/cli": { title: "Vault CLI", lede: "Creative code should not arrive wearing a disguise." },
  "/docs/mcp": { title: "Hyperiux MCP Server", lede: "Give your AI coding assistant live, accurate knowledge of the entire Hyperiux Vault effect catalog." },
  "/docs/dependencies": { title: "Dependencies", lede: "Bring the engine you need. Not the whole garage." },
  "/docs/license": { title: "License", lede: "Use the code. Ship the work. Do not repackage the Vault." },
};

// Read time + section count, measured from the rendered page (prototype: ~200 wpm)
function useDocMeta(containerRef, key) {
  const [meta, setMeta] = useState({ read: "", secs: "" });
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;
    const raf = requestAnimationFrame(() => {
      const words = (el.innerText || "").trim().split(/\s+/).filter(Boolean).length;
      const secs = el.querySelectorAll("h2").length;
      setMeta({ read: `${Math.max(1, Math.round(words / 200))} min read`, secs: `${secs} section${secs === 1 ? "" : "s"}` });
    });
    return () => cancelAnimationFrame(raf);
  }, [containerRef, key]);
  return meta;
}

// Opens the header search (SearchBar listens for ⌘K / Ctrl+K)
function openDocsSearch() {
  const mac = /mac/i.test(navigator.platform || navigator.userAgent);
  document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: mac, ctrlKey: !mac, bubbles: true }));
}

function DocsHero({ pathname, meta }) {
  const hero = DOCS_HERO[pathname?.replace(/\/$/, "") || "/docs"];
  return (
    <section className="pb-[10vw]">
      <Breadcrumb />
      {hero && (
        <div className="mt-7 max-w-[980px] space-y-[1.5vw]">
          <h1 className="fadeup font-aeonik t96 font-normal leading-[1.02] text-white">{hero.title}</h1>
          <p className="fadeup max-w-[40vw] font-avenir text-[1.2vw] leading-[1.3] tracking-[-.02em] text-[#d6d6d6]">{hero.lede}</p>
          {/* Read time · sections · search, hidden for now
          <div className="fadeup mt-[30px] flex flex-wrap items-center gap-x-3.5 gap-y-2.5 text-[13px] uppercase tracking-[.08em] text-[#8a8a8a]">
            {meta.read && <span>{meta.read}</span>}
            {meta.read && <span aria-hidden="true">·</span>}
            {meta.secs && <span>{meta.secs}</span>}
            {meta.secs && <span aria-hidden="true">·</span>}
            <button
              type="button"
              onClick={openDocsSearch}
              className="inline-flex h-9 items-center gap-2.5 pr-2 pl-3 text-[13px] font-medium normal-case tracking-normal text-[#cfcfcf] shadow-[inset_0_0_0_1px_rgba(244,244,244,.14)] transition-[background-color,color,box-shadow] duration-500 hover:bg-[rgba(244,244,244,.06)] hover:text-white hover:shadow-[inset_0_0_0_1px_rgba(255,107,0,.5)]"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="size-3.5">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
              <span>Search the docs</span>
              <span className="px-1.5 py-0.5 font-mono text-[11px] text-[#8a8a8a] shadow-[inset_0_0_0_1px_rgba(244,244,244,.14)]">⌘ K</span>
            </button>
          </div>
          */}
        </div>
      )}
    </section>
  );
}

function RouteAnimationSync({ syncKey, containerRef }) {
  useFadeUp(containerRef, [syncKey]);

  useEffect(() => {
    const refreshCall = gsap.delayedCall(0.2, () => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          ScrollTrigger.refresh(true);
        });
      });
    });

    return () => {
      refreshCall.kill();
    };
  }, [syncKey]);

  return null;
}

export default function DocsBody({ children }) {
  const contentRef = useRef(null);
  const routeContentRef = useRef(null);
  const routeTweenRef = useRef(null);

  const pathname = usePathname();
  const router = useRouter();
  const { startNavigation } = useVaultLayout();
  const meta = useDocMeta(contentRef, pathname);
  const lenis = useLenis();

  // In-page links (href="#id") glide to their target like the TOC, instead of jumping
  const onContentClick = useCallback(
    (event) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.target.closest?.('a[href^="#"]');
      const id = link ? decodeURIComponent(link.getAttribute("href").slice(1)) : "";
      const el = id && document.getElementById(id);
      if (!el) return;

      event.preventDefault();
      const targetTop = el.getBoundingClientRect().top + window.scrollY - window.innerHeight * 0.2;
      window.history.pushState(null, "", `#${id}`);

      if (lenis) {
        lenis.scrollTo(targetTop, { duration: 1.15, easing: (t) => 1 - Math.pow(1 - t, 3), force: true });
      } else {
        window.scrollTo({ top: targetTop, behavior: "smooth" });
      }
    },
    [lenis]
  );

  const navigateWithDocsFade = useCallback(
    (href) => {
      if (!href || href === pathname) return true;

      startNavigation(href);
      router.push(href, { scroll: false });
      return true;
    },
    [pathname, router, startNavigation]
  );

  useEffect(() => {
    const handleDocsRouteRequest = (event) => {
      const href = event.detail?.href;

      if (!href || !href.startsWith("/docs")) return;

      event.preventDefault();
      navigateWithDocsFade(href);
    };

    window.addEventListener("hyperiux:docs-route-request", handleDocsRouteRequest);

    return () => {
      window.removeEventListener(
        "hyperiux:docs-route-request",
        handleDocsRouteRequest
      );
    };
  }, [navigateWithDocsFade]);

  useEffect(() => {
    routeTweenRef.current?.kill();

    const routeContent = routeContentRef.current;

    if (routeContent) {
      gsap.killTweensOf(routeContent);

      gsap.set(routeContent, {
        autoAlpha: 1,
        y: 0,
        clearProps: "transform",
      });
    }

    const refreshCall = gsap.delayedCall(0.25, () => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          ScrollTrigger.refresh(true);
        });
      });
    });

    const routeTween = routeTweenRef.current;

    return () => {
      routeTween?.kill();
      refreshCall.kill();
    };
  }, [pathname]);

  return (
    <div className="mx-auto w-full pt-25">
      <RouteFade
        key={pathname}
        motionKey={pathname}
        className="relative min-h-screen"
      >
        <div ref={routeContentRef}>
          <RouteAnimationSync syncKey={pathname} containerRef={contentRef} />

          <DocsHero pathname={pathname} meta={meta} />

          {/* White sheet (Docs prototype's .sheet), square-edged, under the content, the
              docs footer and the TOC column. Code blocks stay dark. */}
          {/* Full width: the negative margins cancel the docs layout's side padding (px-14 / 6vw / 7vw) */}
          <div data-sound-flow="off" className="docs-sheet grid gap-10 grid-cols-[minmax(0,1fr)_320px] max-lg:grid-cols-1 -mx-14 max-lg:-mx-[6vw] max-md:mx-[-7vw] px-[clamp(20px,3.4vw,56px)] py-[4vw]">
            <div ref={contentRef} className="min-w-0" onClick={onContentClick}>
              <div className="blog-content">
                {children}
              </div>
              <DocsPageFooter />
            </div>
            {/* TOC lives in the sheet's right column, sticky at the vertical centre */}
            <aside className="sticky top-1/2 h-fit -translate-y-1/2 self-start justify-self-end max-lg:hidden">
              <TableOfContents containerRef={contentRef} watchKey={pathname} hideNearFooter />
            </aside>
          </div>
        </div>

      </RouteFade>
    </div>
  );
}
