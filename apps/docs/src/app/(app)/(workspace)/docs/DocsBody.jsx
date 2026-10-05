"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
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
    <section className="pb-[clamp(3rem,7vh,5rem)]">
      <Breadcrumb />
      {hero && (
        <div className="mt-7 max-w-[980px]">
          <h1 className="fadeup font-display text-[clamp(3rem,6.4vw,6.4rem)] font-normal leading-[1.02] tracking-[-.04em] text-white">{hero.title}</h1>
          <p className="fadeup mt-[22px] max-w-[44ch] font-display text-[clamp(1.3rem,2vw,1.75rem)] leading-[1.3] tracking-[-.02em] text-[#d6d6d6]">{hero.lede}</p>
          <div className="fadeup mt-[30px] flex flex-wrap items-center gap-x-3.5 gap-y-2.5 text-[13px] uppercase tracking-[.08em] text-[#8a8a8a]">
            {meta.read && <span>{meta.read}</span>}
            {meta.read && <span aria-hidden="true">·</span>}
            {meta.secs && <span>{meta.secs}</span>}
            {meta.secs && <span aria-hidden="true">·</span>}
            <button
              type="button"
              onClick={openDocsSearch}
              className="inline-flex h-9 items-center gap-2.5 rounded-lg pr-2 pl-3 text-[13px] font-medium normal-case tracking-normal text-[#cfcfcf] shadow-[inset_0_0_0_1px_rgba(244,244,244,.14)] transition-[background-color,color,box-shadow] duration-500 hover:bg-[rgba(244,244,244,.06)] hover:text-white hover:shadow-[inset_0_0_0_1px_rgba(255,107,0,.5)]"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="size-3.5">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
              <span>Search the docs</span>
              <span className="rounded-[5px] px-1.5 py-0.5 font-mono text-[11px] text-[#8a8a8a] shadow-[inset_0_0_0_1px_rgba(244,244,244,.14)]">⌘ K</span>
            </button>
          </div>
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
          <div className="docs-sheet grid gap-10 grid-cols-[minmax(0,1fr)_320px] max-[1025px]:grid-cols-1 px-[clamp(20px,3.4vw,56px)] pt-[clamp(4rem,9vh,6rem)] pb-[clamp(4rem,9vh,6rem)]">
            <div ref={contentRef} className="min-w-0">
              <div className="[&_h1]:text-[4vw] [&_h1]:font-semibold [&_h1]:leading-[1.05] [&_h1]:text-(--foreground) [&_h2]:text-[clamp(1.45rem,2vw,2rem)] [&_h2]:font-normal [&_h2]:leading-[1.12] [&_h2]:tracking-[-0.04em] [&_h2]:text-(--foreground) [&_h3]:text-[clamp(1.05rem,1.45vw,1.35rem)] [&_h3]:font-normal [&_h3]:leading-[1.15] [&_h3]:tracking-[-0.03em] [&_h3]:text-(--foreground) [&_p]:text-[clamp(0.95rem,1.05vw,1.05rem)] [&_p]:leading-[1.72] [&_p]:text-(--docs-body) [&_li]:text-[clamp(0.95rem,1.05vw,1.05rem)] [&_li]:leading-[1.65] [&_li]:text-(--docs-body) [&_strong]:text-(--foreground) [&_.docs-heading2-line]:bg-(--docs-line) [&_li::marker]:text-primary max-md:[&_h1]:text-[4vw]">
                {children}
              </div>
              <DocsPageFooter />
            </div>
          </div>
        </div>

        <aside className="h-fit fixed right-4 top-1/2 -translate-y-1/2 max-[1025px]:hidden">
          <TableOfContents
            containerRef={contentRef}
            watchKey={pathname}
            hideNearFooter
          />
        </aside>
      </RouteFade>
    </div>
  );
}
