"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Copy, Download, Eye, Heart, Lock } from "lucide-react";
import { getEffectHref, getQuickCategoryLabel, resolveEffectCategoryId } from "@/lib/categories";
import { resolveEffectVideoUrl, resolveMediaUrl, resizeR2ImageUrl } from "@/lib/media";
import { useAutoplayPreviewVideo } from "@/hooks/useAutoplayPreviewVideo";

// Site fonts: body is Neue Haas, h1–h4 get Aeonik from globals.css, code is Geist Mono.
export const DISPLAY = "font-normal tracking-[-.035em]";
export const MONO = "font-mono";
export const LABEL = "text-[11px] uppercase tracking-[.14em]";

const NEW_WINDOW_MS = 1000 * 60 * 60 * 24 * 30;
const BADGE = `inline-flex h-6 items-center gap-1.5 px-2.25 ${LABEL} text-[10.5px] tracking-[.12em] backdrop-blur-md`;
const ICON_BTN =
  "inline-flex h-8.5 min-w-8.5 cursor-pointer items-center justify-center gap-2 px-2.5 text-[12.5px] text-[#e8e8e8] bg-[rgba(20,20,20,.72)] shadow-[inset_0_0_0_1px_rgba(244,244,244,.12)] backdrop-blur-md transition-colors duration-500 hover:bg-[rgba(40,40,40,.9)] hover:text-white [&_svg]:size-3.5";

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

export function TierBadge({ tier }) {
  return tier === "pro" ? (
    <span className={`${BADGE} bg-[#ff5f00] text-[#141414]`}>Pro</span>
  ) : (
    <span className={`${BADGE} bg-[rgba(244,244,244,.9)] text-[#1D1D1D]`}>Free</span>
  );
}

export function NewBadge() {
  return <span className={`${BADGE} bg-[rgba(99,214,154,.18)] text-[#7fe0b0]`}>New</span>;
}

/**
 * One effect in the vault grid. `small` drops the hover actions (trending row,
 * related effects); `dark` switches the meta text for dark backgrounds.
 * `compact` also drops the category badge for narrow cards (the category
 * still shows under the title). Clicking the card opens the preview drawer; the title is a real link to the
 * effect page so it can be opened in a new tab and crawled.
 */
export function EffectCardV4({
  effect,
  small = false,
  dark = false,
  compact = false,
  priority = false,
  sizes = "(max-width: 767px) 100vw, (max-width: 1025px) 50vw, 33vw",
  isWishlisted = false,
  canInstall = false,
  onOpen,
  onToggleWishlist,
  onCopyInstall,
  className = "",
}) {
  const [imageError, setImageError] = useState(false);
  const videoUrl = useMemo(() => resolveEffectVideoUrl(effect), [effect]);
  const cover = useMemo(() => resolveCover(effect), [effect]);
  const { cardRef, showVideo, shouldRenderVideo, videoProps } = useAutoplayPreviewVideo(videoUrl);

  const href = getEffectHref(effect);
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
      className={`group relative grid cursor-pointer gap-3.5 outline-none ${className}`}
    >
      <div className="relative aspect-video overflow-hidden bg-[#141414] transition-shadow duration-700 ease-[cubic-bezier(.16,1,.3,1)] group-hover:shadow-[0_30px_60px_-30px_rgba(255,95,0,.55)] group-focus-visible:shadow-[0_0_0_2px_#ff5f00]">
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
          <div className="absolute inset-0 bg-[#202020]" />
        )}
        {shouldRenderVideo && (
          <video
            {...videoProps}
            className={`absolute inset-0 size-full object-cover transition-opacity duration-500 ${showVideo ? "opacity-100" : "opacity-0"}`}
          />
        )}
        <span aria-hidden="true" className="pointer-events-none absolute inset-0 shadow-[inset_0_0_0_1px_rgba(244,244,244,.07)]" />

        <div className="pointer-events-none absolute inset-x-3 top-3 flex justify-between">
          <span className="flex gap-1.5">
            {!compact && <span className={`${BADGE} bg-[rgba(20,20,20,.6)] text-[#d8d8d8]`}>{category}</span>}
            {isNewEffect(effect) && <NewBadge />}
          </span>
          <TierBadge tier={effect.tier} />
        </div>

        {!small && (
          <div className="absolute inset-x-3 bottom-3 flex justify-end gap-1.5 opacity-0 transition-opacity duration-500 group-focus-within:opacity-100 group-hover:opacity-100 max-[1025px]:opacity-100">
            <button
              type="button"
              aria-label={isWishlisted ? `Remove ${effect.title} from saved` : `Save ${effect.title}`}
              aria-pressed={isWishlisted}
              onClick={(event) => {
                stop(event);
                onToggleWishlist?.(effect);
              }}
              className={`${ICON_BTN} ${isWishlisted ? "text-[#ff5f00]! [&_svg]:fill-[#ff5f00]" : ""}`}
            >
              <Heart />
            </button>
            {canInstall ? (
              <button
                type="button"
                onClick={(event) => {
                  stop(event);
                  onCopyInstall?.(effect);
                }}
                className={`${ICON_BTN} max-md:hidden`}
              >
                <Copy />
                <span>Copy install</span>
              </button>
            ) : (
              <Link href="/pricing" onClick={(event) => event.stopPropagation()} className={`${ICON_BTN} max-md:hidden`}>
                <Lock />
                <span>Pro</span>
              </Link>
            )}
            <button
              type="button"
              onClick={(event) => {
                stop(event);
                onOpen?.(effect);
              }}
              className={`${ICON_BTN} bg-[#ff5f00]! text-[#141414]! shadow-none! hover:bg-[#ff7a26]!`}
            >
              <Eye />
              <span>Preview</span>
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 gap-y-1">
        <h3 className={`${DISPLAY} truncate text-lg leading-tight font-medium tracking-[-.02em] max-md:text-base`}>
          <Link href={href} prefetch={false} className="transition-colors duration-300 hover:text-[#ff5f00]">
            {effect.title}
          </Link>
        </h3>
        <div className="col-start-2 row-span-2 flex max-w-40 flex-wrap justify-end gap-1">
          {deps.map((dep) => (
            <span
              key={dep}
              className={`${MONO} inline-flex h-5.5 items-center px-1.75 text-[11px] ${
                dark ? "text-[#8c8c8c] shadow-[inset_0_0_0_1px_rgba(244,244,244,.12)]" : "text-[#6B6B6B] shadow-[inset_0_0_0_1px_rgba(29,29,29,.1)]"
              }`}
            >
              {dep}
            </span>
          ))}
        </div>
        <p className={`flex items-center gap-3 text-sm ${dark ? "text-[#8c8c8c]" : "text-[#6B6B6B]"}`}>
          <span>{category}</span>
          {effect.installCount > 0 && (
            <span className="inline-flex items-center gap-1" title="CLI installs">
              <Download className="size-3" aria-hidden="true" />
              {effect.installCount}
            </span>
          )}
        </p>
      </div>
    </article>
  );
}
