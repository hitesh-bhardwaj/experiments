"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { getEffectHref, getEffectPreviewHref } from "@/lib/categories";
import { resolveEffectVideoUrl, resolveMediaUrl, resizeR2ImageUrl } from "@/lib/media";
import { useAutoplayPreviewVideo } from "@/hooks/useAutoplayPreviewVideo";
import { Download, Eye, Heart } from "lucide-react";
import { Tooltip } from "@/components/ui/Tooltip";
import { ArrowIcon } from "../WebsiteComps/Icons";

function formatLabel(value = "") {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatInstallCount(value) {
  const count = Number.isFinite(Number(value)) ? Number(value) : 0;

  if (count >= 1000) {
    return new Intl.NumberFormat("en", {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(count);
  }

  return String(count);
}

const VAULT_GRID_SIZES =
  "(max-width: 639px) calc(100vw - 56px), (max-width: 1025px) calc(100vw - 64px), 30vw";

const LISTING_COVER_WIDTH = 1200;
const LISTING_COVER_HEIGHT = 675;

function resolveEffectCoverImage(effect) {
  const raw = effect?.coverImage || effect?.imageSrc;
  if (!raw || raw === "/assets/img/image01.webp" || raw === "image01") return null;

  const resolved = resolveMediaUrl(raw, {
    defaultDirectory: "vault-listing-images",
    defaultExtension: "png",
  });

  if (!resolved || resolved === "/assets/img/image01.webp") return null;
  if (resolved.startsWith("/")) return resolved;

  return resizeR2ImageUrl(resolved, {
    width: LISTING_COVER_WIDTH,
    height: LISTING_COVER_HEIGHT,
  });
}

export function EffectCard({
  effect,
  priority = false,
  isWishlisted = false,
  toggleWishlist,
  isProUser = false,
  sizes = VAULT_GRID_SIZES,
}) {
  const [registryDependencies, setRegistryDependencies] = useState(null);
  const [imageError, setImageError] = useState(false);

  const router = useRouter();
  const videoPreviewUrl = useMemo(() => resolveEffectVideoUrl(effect), [effect]);
  const { cardRef, hasAppeared, showVideo, shouldRenderVideo, videoProps } =
    useAutoplayPreviewVideo(videoPreviewUrl);
  const prefetchTimerRef = useRef(null);

  // Package dependencies (gsap, three, etc.) live in each effect's registry
  // manifest, not the effect object itself - fetch it once the card is on
  // screen rather than for every card in the grid up front.
  useEffect(() => {
    if (!hasAppeared || !effect?.name) return;

    let cancelled = false;

    fetch(`/r/${effect.name}.json`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled) setRegistryDependencies(data?.dependencies || []);
      })
      .catch(() => {
        if (!cancelled) setRegistryDependencies([]);
      });

    return () => {
      cancelled = true;
    };
  }, [hasAppeared, effect?.name]);

  const coverImage = useMemo(() => resolveEffectCoverImage(effect), [effect]);

  const effectHref = getEffectHref(effect);
  const previewHref = getEffectPreviewHref(effect);

  // Video playback (viewport-driven autoplay, shared concurrency cap,
  // tab-visibility pause, stall fallback) is handled entirely by
  // useAutoplayPreviewVideo above - this stays for the route prefetch only.
  const handleMouseEnter = () => {
    // Delay prefetch so brushing past a card while moving the cursor doesn't
    // queue a request for every card under the pointer.
    prefetchTimerRef.current = setTimeout(() => router.prefetch(effectHref), 120);
  };

  const handleMouseLeave = () => {
    clearTimeout(prefetchTimerRef.current);
  };

  useEffect(() => () => clearTimeout(prefetchTimerRef.current), []);

  const primaryCategoryLabel = useMemo(() => {
    const categories = (
      effect.categories?.length ? effect.categories : [effect.category]
    ).filter(Boolean);
    return formatLabel(categories[0] || "components");
  }, [effect.categories, effect.category]);

  const allDependencyLabels = useMemo(
    () =>
      (Array.isArray(effect.tags) && effect.tags.length > 0
        ? effect.tags
        : registryDependencies || effect.dependencies || []
      )
        .map(formatLabel)
        .filter(Boolean),
    [effect.tags, registryDependencies, effect.dependencies]
  );
  const dependencyPills = allDependencyLabels.slice(0, 2);
  const extraDependencyCount = Math.max(allDependencyLabels.length - 2, 0);
  const installCount = Number.isFinite(Number(effect.installCount))
    ? Number(effect.installCount)
    : 0;
  const installCountLabel = formatInstallCount(installCount);

  return (
    <Link
      href={effectHref}
      prefetch={false}
      ref={cardRef}
      style={{
        opacity: hasAppeared ? 1 : 0,
        transition: "opacity 0.55s cubic-bezier(0.22, 1, 0.36, 1)",
        willChange: hasAppeared ? "auto" : "opacity",
      }}
      className="group relative block w-full cursor-pointer  "
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >


      <div className="pointer-events-none  relative aspect-3/2  px-[1.8vw] pt-[1.8vw] max-md:px-[4vw] max-md:pt-[4vw] overflow-hidden  bg-black/20 backdrop-blur-lg max-md:aspect-4/3.5">
        <div className=" w-full relative h-[80%] overflow-hidden max-md:h-[70%]">
          {coverImage && !imageError ? (
            <Image
              src={coverImage}
              alt={effect.title || effect.name}
              fill
              sizes={sizes}
              quality={90}
              priority={priority}
              loading={priority ? undefined : "lazy"}
              onError={() => setImageError(true)}
              className={`object-cover ${
                showVideo ? "opacity-0" : "opacity-100"
              }`}
            />
          ) : (
            <div className="h-full w-full bg-[#202020]" />
          )}
          {shouldRenderVideo && (
            <video
              {...videoProps}
              className={`absolute inset-0 h-full w-full object-cover  ${
                showVideo ? "opacity-100" : "opacity-0"
              }`}
            />
          )}
        </div>

        <div className="pointer-events-none h-[20%]  flex w-full items-center justify-between gap-3 font-mono max-md:h-[30%] ">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 max-md:gap-1.5">
            {dependencyPills.map((pill) => (
              <span
                key={pill}
                className="bg-[#2B2B2B] px-[0.4vw] py-[0.1vw] text18 text-white/90 max-md:px-3 max-md:py-1 max-md:text-[3vw]!"
              >
                {pill}
              </span>
            ))}
            {extraDependencyCount > 0 && (
              <Tooltip
                label={allDependencyLabels.slice(2).join(" • ")}
                className="pointer-events-auto max-w-[10vw]"
              >
                <span className="cursor-default bg-[#2B2B2B] px-[0.8vw] py-[0.1vw] text18 font-medium text-white/70 max-md:px-3 max-md:py-1 max-md:text-[3vw]!">
                  +{extraDependencyCount}
                </span>
              </Tooltip>
            )}
          </div>
          {effect.tier === "pro" && (
            <span className="shrink-0 bg-primary px-[0.8vw] py-[0.1vw] text18 text-white max-sm:px-4 max-sm:py-1 max-sm:text-[3vw]!">
              Pro
            </span>
          )}
        </div>

         
      </div>

     
      <div className="pointer-events-none mt-4 relative flex items-start justify-between gap-4 px-3 pt-3 pb-1.5 max-[1025px]:pt-5 max-md:gap-3 max-md:px-2 max-md:pt-2">
        {/* <span className="pointer-events-none max-sm:hidden absolute -top-px -left-px h-1.5 w-1.5 border-t border-l border-primary opacity-0 transition-opacity duration-300 group-hover:opacity-100 max-[1025px]:opacity-100 max-md:h-3 max-md:w-3" />
        <span className="pointer-events-none max-sm:hidden absolute -top-px -right-px h-1.5 w-1.5 border-t border-r border-primary opacity-0 transition-opacity duration-300 group-hover:opacity-100 max-[1025px]:opacity-100 max-md:h-3 max-md:w-3" />
        <span className="pointer-events-none max-sm:hidden absolute -bottom-px -left-px h-1.5 w-1.5 border-b border-l border-primary opacity-0 transition-opacity duration-300 group-hover:opacity-100 max-[1025px]:opacity-100 max-md:h-3 max-md:w-3" />
        <span className="pointer-events-none max-sm:hidden absolute -bottom-px -right-px h-1.5 w-1.5 border-b border-r border-primary opacity-0 transition-opacity duration-300 group-hover:opacity-100 max-[1025px]:opacity-100 max-md:h-3 max-md:w-3" /> */}

        <div className="flex min-w-0 flex-col gap-0.5">
          <h3 className="truncate  text-[1.25vw] max-md:text-[3vw] max-sm:text-[4.5vw] font-medium leading-[1.2]! text-white max-md:text-base">
            <span>
              {effect.title}
            </span>
          </h3>
          <p className="text18 text-[#AEAEAE] max-md:text-xs">
            {primaryCategoryLabel}
          </p>
        </div>

        <div className="pointer-events-auto relative z-30 flex shrink-0 items-center gap-3 opacity-0 transition-opacity duration-300 max-md:gap-3 group-hover:opacity-100 max-[1025px]:opacity-100 ">
          {installCount > 0 && (
            <span className="flex items-center gap-1.5 text-[1vw]  text-white/55 max-sm:text-[3vw]!">
              {installCountLabel}
              <Download className="h-3 w-3 text-white/45 max-sm:h-3 max-sm:w-3" aria-hidden="true" />
            </span>
          )}

          <Tooltip label="Save">
            <button
              type="button"
              data-no-card-link
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleWishlist?.(effect);
              }}
              className="flex h-8 w-8 cursor-pointer items-center justify-center  bg-[#242424] text-white transition-colors hover:bg-white/10 max-[1025px]:h-11 max-[1025px]:w-11 max-md:h-9 max-md:w-9"
              aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
            >
              <Heart
                className={`h-4.5 w-4.5 max-[1025px]:h-5 max-[1025px]:w-5 max-md:h-4 max-md:w-4 ${
                  isWishlisted ? "fill-white" : ""
                }`}
              />
            </button>
          </Tooltip>

          <Tooltip label="Demo">
            <button
              type="button"
              data-no-card-link
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                window.open(previewHref, "_blank", "noopener,noreferrer");
              }}
              className="flex h-8 w-8 cursor-pointer items-center justify-center bg-[#242424] text-white transition-colors hover:bg-white/10 max-[1025px]:h-11 max-[1025px]:w-11 max-md:h-9 max-md:w-9"
              aria-label="Preview"
            >
              <Eye className="h-4.5 w-4.5 max-[1025px]:h-5 max-[1025px]:w-5 max-md:h-4 max-md:w-4" />
            </button>
          </Tooltip>

          <Tooltip label="View Detail">
            <div
              className="flex h-8 w-8 relative items-center justify-center bg-primary text-black max-[1025px]:h-11 max-[1025px]:w-11 max-md:h-9 max-md:w-9 group/arrow overflow-hidden arrow-container"
              aria-hidden="true"
            >
              <ArrowIcon className="h-4.5 w-4.5 max-md:h-3.5 max-md:w-3.5 group-hover/arrow:-translate-y-[180%] group-hover/arrow:translate-x-[180%] duration-300 ease-in-out"/>
              <ArrowIcon className="h-4.5 w-4.5 max-md:h-3.5 max-md:w-3.5 absolute -translate-x-[180%] translate-y-[180%] group-hover/arrow:translate-x-0 group-hover/arrow:translate-y-0 duration-300 ease-in-out"/>
            </div>
          </Tooltip>
        </div>
      </div>
    </Link>
  );
}
