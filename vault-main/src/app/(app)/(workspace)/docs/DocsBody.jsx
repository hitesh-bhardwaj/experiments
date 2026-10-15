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

function DocsHero({ pathname, meta }) {
  const hero = DOCS_HERO[pathname?.replace(/\/$/, "") || "/docs"];
  return (
    <section id="docs-hero" className="mx-auto w-full section-x flex flex-col gap-7 pb-[calc(var(--cvw)*10)] max-md:pb-[20vw]">
      <Breadcrumb />
      {hero && (
        <div className="flex w-[65%] flex-col gap-[calc(var(--cvw)*1.5)] max-md:w-full max-md:gap-[4vw]">
          <h1 className="fadeup type-display text-foreground">{hero.title}</h1>
          <p className="fadeup type-body-lg w-[70%] text-white/70 max-md:w-[90%]">{hero.lede}</p>
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
          <section id="docs-content" data-sound-flow="off" className="docs-sheet py-[calc(var(--cvw)*4)] max-md:pb-[10vh]">
            <div className="mx-auto w-full section-x flex items-start gap-[calc(var(--cvw)*3)] max-lg:flex-col">
              <div ref={contentRef} className="flex min-w-0 flex-1 flex-col gap-[calc(var(--cvw)*5)] max-lg:w-full max-md:gap-[15vw]" onClick={onContentClick}>
                <div className="blog-content">
                  {children}
                </div>
                <DocsPageFooter />
              </div>
              {/* TOC lives in the sheet's right column, sticky at the vertical centre */}
              <aside className="sticky top-1/2 flex h-fit w-[22%] shrink-0 -translate-y-1/2 justify-end max-lg:hidden">
                <TableOfContents containerRef={contentRef} watchKey={pathname} hideNearFooter />
              </aside>
            </div>
          </section>
        </div>

      </RouteFade>
    </div>
  );
}
