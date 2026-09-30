"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter } from "next/navigation";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import RemixerPanel from "@/components/remixer-panel/RemixerPanel";
import type { RemixerGroup, RemixerValue, RemixerValues } from "@/components/remixer-panel/types";
import { getEffectRouteSlug } from "@/lib/effect-slugs";
import { useInteraction } from "@/homepage-v3/components/InteractionProvider";
import { mountPreviewChrome } from "./src/preview-chrome";
import "./src/preview-chrome.css";

type Chrome = ReturnType<typeof mountPreviewChrome>;

interface PreviewChromeProps {
  registry: any;
  groups: RemixerGroup[];
  values: RemixerValues;
  hasProps: boolean;
  onChange: (id: string, value: RemixerValue) => void;
  onCopyCode?: () => string;
  onReset: () => void;
  onReplay: () => void;
  defaultOpenGroupId?: string;
}

// Same lookup DemoHeader uses: the demo slug → /effects/<category>/<effect>.
function useEffectArticleHref(fallback = "/effects") {
  const pathname = usePathname()?.replace(/\/$/, "") || "";
  const demoSlug = pathname.startsWith("/demo/") ? pathname.slice(6).split("/")[0] : "";
  const [href, setHref] = useState(fallback);

  useEffect(() => {
    if (!demoSlug) return;
    let active = true;
    fetch("/api/effects/search-index")
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data) => {
        const slug = getEffectRouteSlug(demoSlug);
        const effect = data.effects?.find(
          (e: any) => e.effectSlug === slug || e.slug === slug || e.name === slug,
        );
        if (active && effect?.categorySlug && effect?.effectSlug) {
          setHref(`/effects/${effect.categorySlug}/${effect.effectSlug}`);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [demoSlug]);

  return href;
}

// JSON-safe copy, so the values can cross postMessage into the device iframe.
function cloneable(values: RemixerValues) {
  try {
    return JSON.parse(JSON.stringify(values));
  } catch {
    return {};
  }
}

// The Live-preview control bar for demo pages: device sizes, replay, reduced
// motion, props, shortcuts and copy. The vanilla module owns the markup; the
// app's RemixerPanel is portalled into its props panel so the controls stay the
// ones every registry already describes.
export default function PreviewChrome({
  registry,
  groups,
  values,
  hasProps,
  onChange,
  onCopyCode,
  onReset,
  onReplay,
  defaultOpenGroupId,
}: PreviewChromeProps) {
  const router = useRouter();
  const { sound } = useInteraction() ?? {};
  const backHref = useEffectArticleHref();
  const [chrome, setChrome] = useState<Chrome | null>(null);

  // The module reads these once on mount; keep the latest in refs.
  const replayRef = useRef(onReplay);
  const copyRef = useRef(onCopyCode);
  useEffect(() => {
    replayRef.current = onReplay;
    copyRef.current = onCopyCode;
  }, [onReplay, onCopyCode]);

  useEffect(() => {
    const c = mountPreviewChrome({
      title: registry?.title ?? "Effect",
      tier: registry?.tier === "pro" ? "pro" : "free",
      backHref,
      onBack: (href: string) => router.push(href),
      hasProps: hasProps && groups.length > 0,
      onCopy: onCopyCode ? () => copyRef.current?.() ?? "" : null,
      onReplay: () => {
        replayRef.current();
        requestAnimationFrame(() => ScrollTrigger.refresh());
      },
      sound,
    });
    setChrome(c);
    return () => {
      c.destroy();
      setChrome(null);
    };
    // Remount only when the page identity changes; backHref is patched below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registry?.name, hasProps, sound]);

  // backHref resolves after mount - patch the link in place.
  useEffect(() => {
    chrome?.root.querySelector<HTMLAnchorElement>(".pc-back")?.setAttribute("href", backHref);
  }, [chrome, backHref]);

  useEffect(() => {
    chrome?.postValues(cloneable(values));
  }, [chrome, values]);

  if (!chrome || !hasProps || !groups.length) return null;

  return createPortal(
    <RemixerPanel
      isExpanded
      groups={groups}
      values={values}
      onChange={onChange}
      onCopyCode={onCopyCode}
      onReset={onReset}
      defaultOpenGroupId={defaultOpenGroupId}
    />,
    chrome.panelBody,
  );
}
