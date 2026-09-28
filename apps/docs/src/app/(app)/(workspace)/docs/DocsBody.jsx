"use client";

import { useCallback, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { RouteFade } from "@/components/layout/RouteFade";
import { useVaultLayout } from "@/components/layout/VaultLayout";
import { useFadeUp } from "@/components/Animations/gsapAnimations";
import { TableOfContents } from "@/components/ui/TableOfContents";
import { Breadcrumb } from "@/components/ui/Breadcrumb";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
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

          <Breadcrumb />

          <div className="grid gap-10 grid-cols-[minmax(0,1fr)_320px] max-[1025px]:grid-cols-1">
            <div
              ref={contentRef}
              className="max-[1025px]:px-0 [&_h1]:text-[4vw] [&_h1]:font-semibold [&_h1]:leading-[1.05] [&_h1]:text-white [&_h2]:text-[clamp(1.45rem,2vw,2rem)] [&_h2]:font-normal [&_h2]:leading-[1.12] [&_h2]:tracking-[-0.04em] [&_h2]:text-white [&_h3]:text-[clamp(1.05rem,1.45vw,1.35rem)] [&_h3]:font-normal [&_h3]:leading-[1.15] [&_h3]:tracking-[-0.03em] [&_h3]:text-white [&_p]:text-[clamp(0.95rem,1.05vw,1.05rem)] [&_p]:leading-[1.72] [&_p]:text-white [&_li]:text-[clamp(0.95rem,1.05vw,1.05rem)] [&_li]:leading-[1.65] [&_li]:text-white [&_strong]:text-white [&_.docs-heading2-line]:bg-white/20 [&_li::marker]:text-white max-md:[&_h1]:text-[4vw]"
            >
              {children}
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
