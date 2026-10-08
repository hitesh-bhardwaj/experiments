"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Check, Copy, Download, Eye, Heart, Lock } from "lucide-react";
import { getEffectHref, getEffectPreviewHref, getQuickCategoryLabel, resolveEffectCategoryId } from "@/lib/categories";
import { Tooltip } from "@/components/ui/Tooltip";
import { resolveEffectVideoUrl, resolveMediaUrl, resizeR2ImageUrl } from "@/lib/media";
import { useAutoplayPreviewVideo } from "@/hooks/useAutoplayPreviewVideo";
import { twMerge } from "tailwind-merge";

// Site fonts: body is Neue Haas, h1–h4 get Aeonik from globals.css, code is Geist Mono.
export const DISPLAY = "font-normal tracking-tight";
export const MONO = "font-mono";
export const LABEL = "text-[0.76vw] max-lg:text-[1.4vw] max-md:text-[2.8vw] uppercase tracking-normal";

const NEW_WINDOW_MS = 1000 * 60 * 60 * 24 * 30;
// Text sizes in vw: desktop · tablet (max-lg) · mobile (max-md).
const T10 = "text-[0.73vw] max-lg:text-[1.3vw] max-md:text-[2.7vw]";
const T11 = "text-[0.76vw] max-lg:text-[1.4vw] max-md:text-[2.8vw]";
const T12 = "text-[0.87vw] max-lg:text-[1.5vw] max-md:text-[3.2vw]";
const T14 = "text-[0.97vw] max-lg:text-[1.7vw] max-md:text-[3.6vw]";

const BADGE = `inline-flex h-6 items-center gap-1.5 px-2.25 ${T10} uppercase tracking-normal backdrop-blur-lg`;
// The dark action buttons on a card (Save, Copy install, Preview); the drawer reuses it.
export const ICON_BTN =
  `inline-flex h-8.5 min-w-8.5 cursor-pointer items-center justify-center gap-2 px-2.5 ${T12} text-foreground/90 bg-background/70 ring-1 ring-inset ring-foreground/12 backdrop-blur-lg transition-colors duration-500 hover:bg-grey/90 hover:text-foreground [&_svg]:size-3.5`;

export const isNewEffect = (effect) => !!effect?.addedAt && Date.now() - effect.addedAt < NEW_WINDOW_MS;
export const installCommand = (effect) => `npx hyperiux add ${effect.name}`;
export const effectCategoryLabel = (effect) => getQuickCategoryLabel(resolveEffectCategoryId(effect) || "components");

export function resolveCover(effect) {
  const raw = effect?.coverImage || effect?.imageSrc;
  if (!raw || raw === "/assets/img/image01.webp" || raw === "image01") return null;
  const resolved = resolveMediaUrl(raw, { defaultDirectory: "vault-listing-images", defaultExtension: "png" });
  if (!resolved || resolved === "/assets/img/image01.webp") return null;
  if (resolved.startsWith("/")) return resolved;
  return resizeR2ImageUrl(resolved, { width: 1200, height: 675 });
}

// `className` overrides the default size (tailwind-merge), e.g. the drawer's button-height badge.
export function TierBadge({ tier, className = "" }) {
  return tier === "pro" ? (
    <span className={twMerge(`${BADGE} bg-primary text-background`, className)}>Pro</span>
  ) : (
    <span className={twMerge(`${BADGE} bg-light/90 border border-black/10 text-ink`, className)}>Free</span>
  );
}

export function NewBadge() {
  return <span className={`${BADGE} bg-green-500 text-white`}>New</span>;
}

/**
 * One effect in the vault grid. `small` drops the hover actions (trending row,
 * related effects); `dark` switches the meta text for dark backgrounds.
 * Clicking the card opens the preview drawer (the title is plain text, not a link).
 */
export function EffectCard({
  effect,
  small = false,
  dark = false,
  priority = false,
  sizes = "(max-width: 767px) 100vw, (max-width: 1025px) 50vw, 33vw",
  isWishlisted = false,
  canInstall = false,
  onOpen,
  onToggleWishlist,
  onCopyInstall,
  className = "",
  // Extra classes for the parts under the preview; they override the defaults (tailwind-merge).
  titleClassName = "",
  metaClassName = "",
  tagClassName = "",
}) {
  const [imageError, setImageError] = useState(false);
  // The copy icon turns into a tick for a moment after copying.
  const [copied, setCopied] = useState(false);
  const copiedTimerRef = useRef(0);
  useEffect(() => () => clearTimeout(copiedTimerRef.current), []);
  const videoUrl = useMemo(() => resolveEffectVideoUrl(effect), [effect]);
  const cover = useMemo(() => resolveCover(effect), [effect]);
  const { cardRef, showVideo, shouldRenderVideo, videoProps } = useAutoplayPreviewVideo(videoUrl);

  const category = effectCategoryLabel(effect);
  const deps = (effect.tags || []).slice(0, 3);

  const stop = (event) => {
    event.preventDefault();
    event.stopPropagation();
  };

  return (
    <article
      ref={cardRef}
      tabIndex={0}
      role="button"
      aria-label={`Preview ${effect.title}`}
      onClick={(event) => {
        if (event.target.closest("a,button")) return;
        onOpen?.(effect);
      }}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen?.(effect);
        }
      }}
      className={`group relative flex cursor-pointer flex-col gap-[1vw] outline-none max-md:gap-[3.5vw] ${className}`}
    >
      <div className="relative aspect-[16/8.6] overflow-hidden bg-dark-card transition-shadow duration-700 ease-[cubic-bezier(.16,1,.3,1)] group-hover:shadow-[0_1vw_2vw_-1.1vw_color-mix(in_srgb,black_35%,transparent)] group-focus-visible:ring-2 group-focus-visible:ring-primary">
        {cover && !imageError ? (
          <Image
            src={cover}
            alt={effect.title}
            fill
            sizes={sizes}
            priority={priority}
            loading={priority ? undefined : "lazy"}
            onError={() => setImageError(true)}
            className={`object-cover transition-[opacity,scale] duration-700 group-hover:scale-[1.03] ${showVideo ? "opacity-0" : "opacity-100"}`}
          />
        ) : (
          <div className="absolute inset-0 bg-grey" />
        )}
        {shouldRenderVideo && (
          <video
            {...videoProps}
            className={`absolute inset-0 size-full object-cover transition-opacity duration-500 ${showVideo ? "opacity-100" : "opacity-0"}`}
          />
        )}
        <span aria-hidden="true" className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-foreground/7" />

        {/* Only the tier sits on the preview; the category already shows under the title. */}
        <div className="pointer-events-none absolute top-3 right-3">
          <TierBadge tier={effect.tier} />
        </div>

        {!small && (
          <div className="absolute inset-x-3 bottom-3 flex justify-end gap-1.5 opacity-0 transition-opacity duration-500 group-focus-within:opacity-100 group-hover:opacity-100 max-lg:opacity-100">
            <Tooltip label={isWishlisted ? "Saved" : "Save"} hideOnClick>
              <button
                type="button"
                aria-label={isWishlisted ? `Remove ${effect.title} from saved` : `Save ${effect.title}`}
                aria-pressed={isWishlisted}
                onClick={(event) => {
                  stop(event);
                  onToggleWishlist?.(effect);
                }}
                className={`${ICON_BTN} ${isWishlisted ? "text-primary! [&_svg]:fill-primary [&_svg]:stroke-primary" : ""}`}
              >
                <Heart />
              </button>
            </Tooltip>
            {canInstall ? (
              <Tooltip label={copied ? "Copied" : "Copy install command"} className="max-md:hidden">
                <button
                  type="button"
                  aria-label={`Copy install command for ${effect.title}`}
                  onClick={(event) => {
                    stop(event);
                    onCopyInstall?.(effect);
                    setCopied(true);
                    clearTimeout(copiedTimerRef.current);
                    copiedTimerRef.current = setTimeout(() => setCopied(false), 1600);
                  }}
                  className={`${ICON_BTN} ${copied ? "text-primary!" : ""}`}
                >
                  {/* Copy and tick share one spot and cross-fade (scale + turn) into each other. */}
                  <span className="relative flex size-3.5 items-center justify-center" aria-hidden="true">
                    <Copy className={`absolute transition-[opacity,transform] duration-300 ease-out ${copied ? "scale-50 -rotate-45 opacity-0" : "scale-100 rotate-0 opacity-100"}`} />
                    <Check className={`absolute transition-[opacity,transform] duration-300 ease-out ${copied ? "scale-100 rotate-0 opacity-100" : "scale-50 rotate-45 opacity-0"}`} />
                  </span>
                </button>
              </Tooltip>
            ) : (
              <Tooltip label="Unlock with Pro" className="max-md:hidden">
                <Link href="/pricing" aria-label="Unlock with Pro" onClick={(event) => event.stopPropagation()} className={ICON_BTN}>
                  <Lock />
                </Link>
              </Tooltip>
            )}
           
            <Tooltip label="Live demo">
              <Link
                href={getEffectPreviewHref(effect)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Open the live demo of ${effect.title}`}
                onClick={(event) => event.stopPropagation()}
                className={`${ICON_BTN}`}
              >
                <Eye />
              </Link>
            </Tooltip>
             <Tooltip label="View Article">
              <Link
                href={getEffectHref(effect)}
                aria-label={`Open the ${effect.title} page`}
                onClick={(event) => event.stopPropagation()}
                className={`${ICON_BTN}  bg-primary! text-background! ring-0! hover:bg-primary-hover!`}
              >
                <ArrowUpRight />
              </Link>
            </Tooltip>
          </div>
        )}
      </div>

      <div className="flex items-start justify-between gap-[0.8vw] max-md:gap-[3vw]">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h3 className={twMerge(`${DISPLAY} text24 truncate font-aeonik leading-tight font-medium`, titleClassName)}>
            {effect.title}
          </h3>
          <p className={twMerge(`flex items-center gap-[0.8vw] ${T14} max-md:gap-[3vw] ${dark ? "text-foreground/50" : "text-black/60"}`, metaClassName)}>
            <span>{category}</span>
            {effect.installCount > 0 && (
              <span className="inline-flex items-center gap-1" title="CLI installs">
                <Download className="size-3" aria-hidden="true" />
                {effect.installCount}
              </span>
            )}
          </p>
        </div>
        {/* Tags never break mid-word: each chip stays on one line (ellipsis if a single tag is wider than the column). */}
        <div className="flex max-w-[45%] flex-wrap justify-end gap-1 max-lg:max-w-[55%]">
          {deps.map((dep) => (
            <span
              key={dep}
              className={twMerge(
                `${MONO} block h-5.5 max-w-full truncate whitespace-nowrap border px-1.75 py-0.5 ${T11} ${
                dark ? "text-foreground/50" : "text-black/60"
              }`,
                tagClassName,
              )}
            >
              {dep}
            </span>
          ))}
        </div>
      </div>
    </article>
  );
}
