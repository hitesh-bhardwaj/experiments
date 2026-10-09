"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Download, Eye, Heart, Lock } from "lucide-react";
import { getEffectHref, getEffectPreviewHref, getQuickCategoryLabel, resolveEffectCategoryId } from "@/lib/categories";
import { Tooltip } from "@/components/ui/Tooltip";
import { CopyButtonContent } from "@/components/ui/CodeBlock";
import { resolveEffectVideoUrl, resolveMediaUrl, resizeR2ImageUrl } from "@/lib/media";
import { useAutoplayPreviewVideo } from "@/hooks/useAutoplayPreviewVideo";
import { twMerge } from "tailwind-merge";

// Site fonts: body is Neue Haas, h1–h4 get Aeonik from globals.css, code is Geist Mono.
export const DISPLAY = "font-normal tracking-tight";
export const MONO = "font-mono";
export const LABEL = "text-[0.76vw] max-lg:text-[1.4vw] max-md:text-[2.8vw] uppercase tracking-normal";

const NEW_WINDOW_MS = 1000 * 60 * 60 * 24 * 30;
// Text sizes in vw: desktop · tablet (max-lg) · mobile (max-md).
const T10 = "text-[0.73vw] max-lg:text-[1.4vw] max-md:text-[2.9vw]";
const T11 = "text-[0.76vw] max-lg:text-[1.4vw] max-md:text-[2.9vw]";
const T12 = "text-[0.87vw] max-lg:text-[1.5vw] max-md:text-[3.2vw]";
const T14 = "text-[0.97vw] max-lg:text-[1.7vw] max-md:text-[3.6vw]";

// The Free / Pro badge sits on the preview image, with a barely-there shadow so it
// holds against any cover.
const BADGE = `inline-flex h-6 items-center gap-1.5 px-2.25 ${T10} uppercase tracking-normal backdrop-blur-lg shadow-[0_0.1vw_0.4vw_color-mix(in_srgb,black_8%,transparent)]`;
// The dark action buttons on a card (Save, Copy install, Preview); the drawer reuses it.
export const ICON_BTN =
  `inline-flex h-8.5 min-w-8.5 cursor-pointer items-center justify-center gap-2 px-2.5 ${T12} text-foreground/90 bg-background/70 ring-1 ring-inset ring-foreground/12 backdrop-blur-lg transition-colors duration-500 hover:bg-grey/90 hover:text-foreground [&_svg]:size-3.5`;

// A hover action's slide: from just below the preview's bottom edge (its 0.75rem inset
// plus its own height, so the clipped frame hides it) up into place, and back. Ease-out
// coming in, ease-in going out (the timing on the hovered state drives the entrance,
// the resting one the exit); will-change keeps it on the GPU.
const ACTION_SLIDE =
  "translate-y-[calc(100%+0.75rem)] will-change-transform transition-transform duration-350 ease-[cubic-bezier(.55,0,1,.45)] group-hover/preview:translate-y-0 group-hover/preview:ease-[cubic-bezier(.22,1,.36,1)] group-focus-within/preview:translate-y-0 group-focus-within/preview:ease-[cubic-bezier(.22,1,.36,1)] max-lg:translate-y-0 motion-reduce:transition-none";
// The card's action buttons: no backdrop blur - a blur re-rendered every frame under
// a moving button (inside the lifted preview) made the slide flicker and pop - and a
// slightly more opaque fill instead.
const CARD_BTN = twMerge(ICON_BTN, "backdrop-blur-none bg-background/85");

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
      // Only a click on the preview block (video / image) opens it - not the title or
      // tags, and not the action buttons inside the block. Enter / Space on the focused
      // card still open it.
      onClick={(event) => {
        if (event.target.closest("a,button") || !event.target.closest("[data-card-preview]")) return;
        onOpen?.(effect);
      }}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen?.(effect);
        }
      }}
      className={`group relative flex flex-col gap-[1vw] outline-none max-md:gap-[3.5vw] ${className}`}
    >
      {/* Hover - over this preview block only (group/preview), not the title or tags: it
          comes a touch towards the viewer (translateZ in perspective) with a soft shadow
          behind it, and the action buttons slide up into it. */}
      <div data-card-preview className="group/preview relative aspect-[16/8.6] cursor-pointer overflow-hidden bg-dark-card duration-500 transition-all transform-[perspective(1200px)_translateZ(0)] hover:transform-[perspective(1200px)_translateZ(1vw)] hover:shadow-[0_1.2vw_2.4vw_-1.2vw_color-mix(in_srgb,black_35%,transparent)] group-focus-visible:ring-2 group-focus-visible:ring-primary">
        {cover && !imageError ? (
          <Image
            src={cover}
            alt={effect.title}
            fill
            sizes={sizes}
            priority={priority}
            loading={priority ? undefined : "lazy"}
            onError={() => setImageError(true)}
            className={`object-cover transition-opacity duration-700 ${showVideo ? "opacity-0" : "opacity-100"}`}
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
          // Each action slides up from below the preview's (clipped) frame on hover, one after
          // another, and slides back down the same way on hover-off. Always shown on touch
          // layouts (max-lg).
          <div className="absolute inset-x-3 bottom-3 flex justify-end gap-1.5">
            <Tooltip label={isWishlisted ? "Saved" : "Save"} hideOnClick className={`${ACTION_SLIDE} delay-0`}>
              <button
                type="button"
                aria-label={isWishlisted ? `Remove ${effect.title} from saved` : `Save ${effect.title}`}
                aria-pressed={isWishlisted}
                onClick={(event) => {
                  stop(event);
                  onToggleWishlist?.(effect);
                }}
                className={`${CARD_BTN} ${isWishlisted ? "text-primary! [&_svg]:fill-primary [&_svg]:stroke-primary" : ""}`}
              >
                <Heart />
              </button>
            </Tooltip>
            {canInstall ? (
              <Tooltip label={copied ? "Copied" : "Copy install command"} className={`${ACTION_SLIDE} delay-40`}>
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
                  className={`${CARD_BTN} ${copied ? "text-primary!" : ""}`}
                >
                  <CopyButtonContent copied={copied} iconOnly />
                </button>
              </Tooltip>
            ) : (
              <Tooltip label="Unlock with Pro" className={`${ACTION_SLIDE} delay-40`}>
                <Link href="/pricing" aria-label="Unlock with Pro" onClick={(event) => event.stopPropagation()} className={CARD_BTN}>
                  <Lock />
                </Link>
              </Tooltip>
            )}
           
            <Tooltip label="Live demo" className={`${ACTION_SLIDE} delay-80`}>
              <Link
                href={getEffectPreviewHref(effect)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Open the live demo of ${effect.title}`}
                onClick={(event) => event.stopPropagation()}
                className={` ${CARD_BTN}`}
              >
                <Eye />
              </Link>
            </Tooltip>
            <Tooltip label="View Article" className={`${ACTION_SLIDE} delay-120`}>
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
          <h4 className={twMerge(`text-[1.25vw] max-md:text-[4vw] max-lg:text-[2.2vw] truncate`, titleClassName)}>
            {effect.title}
          </h4>
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
                `font-avenir block h-5.5 max-w-full truncate whitespace-nowrap border px-1.75 py-0.5 ${T11} ${
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
