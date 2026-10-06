"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Eye, Heart, Download } from "lucide-react";
import { Tooltip } from "@/components/ui/Tooltip";
import { TemplatePaywallModal } from "@/components/ui/TemplatePaywallModal";
import { ArrowIcon } from "../WebsiteComps/Icons";

// Dedicated card for Templates - forked from EffectCardNew.jsx rather than
// sharing it, since a Template has no hover-video preview and no registry
// entry to fetch dependency tags from. Keeps both components easy to reason
// about independently instead of one component branching on two concerns.
//
// Also deliberately skips EffectCardNew's IntersectionObserver-gated
// hasAppeared/opacity fade-in - confirmed via direct DOM inspection that it
// doesn't reliably fire even for cards already in the initial viewport,
// which is worth fixing on the original component separately. Templates is
// a small, largely-above-the-fold grid, not the large lazy-loading effects
// catalog that mechanism exists for, so it's not worth the risk here.

function formatLabel(value = "") {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatViewCount(value) {
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
  "(max-width: 840px) calc(100vw - 32px), (max-width: 1023px) calc(50vw - 40px), 640px";

export function TemplateCard({
  template,
  priority = false,
  isWishlisted = false,
  toggleWishlist,
  sizes = VAULT_GRID_SIZES,
  // Opt-in: callers that don't know per-user purchase state (admin viewing
  // someone else's history, the anonymous "top viewed" rank slider) just
  // omit these and get the exact same card as before. Callers that do (the
  // main /templates grid, Related Templates) pass showPurchase plus
  // whichever `hasAccess` a useTemplateAccess() lookup resolved for this
  // template.
  showPurchase = false,
  hasAccess = false,
}) {
  const [imageError, setImageError] = useState(false);
  const [isPaywallOpen, setIsPaywallOpen] = useState(false);

  const router = useRouter();
  const pathname = usePathname();
  const { isLoaded, isSignedIn } = useUser();
  const prefetchTimerRef = useRef(null);

  const templateHref = template.href || "#";
  const previewHref = template.previewHref || templateHref;
  const screenshots = Array.isArray(template.screenshots) ? template.screenshots : [];

  const handleMouseEnter = () => {
    if (templateHref === "#") return;
    // Same brush-past guard as EffectCardNew - delay so hovering past a
    // card while moving the cursor doesn't queue a prefetch per card.
    prefetchTimerRef.current = setTimeout(() => router.prefetch(templateHref), 120);
  };

  const handleMouseLeave = () => clearTimeout(prefetchTimerRef.current);

  useEffect(() => () => clearTimeout(prefetchTimerRef.current), []);

  const allTagLabels = useMemo(
    () => (Array.isArray(template.tags) ? template.tags : []).map(formatLabel).filter(Boolean),
    [template.tags]
  );
  const tagPills = allTagLabels.slice(0, 2);
  const extraTagCount = Math.max(allTagLabels.length - 2, 0);
  const viewCount = Number.isFinite(Number(template.viewCount))
    ? Number(template.viewCount)
    : 0;
  const viewCountLabel = formatViewCount(viewCount);
  const downloadHref = `/api/templates/${template.slug}/download`;

  // Same three-way branch as TemplateDetail's own Buy/Download button:
  // already-owned downloads directly, signed-out bounces through /sign-in
  // and back to wherever this card is rendered, signed-in-but-unpurchased
  // opens the paywall right here instead of navigating to the detail page.
  const handlePurchaseClick = (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (hasAccess) {
      window.location.href = downloadHref;
      return;
    }

    if (!isLoaded) return;

    if (!isSignedIn) {
      router.push(`/sign-in?redirect_url=${encodeURIComponent(pathname)}`);
      return;
    }

    setIsPaywallOpen(true);
  };

  return (
    <>
    <Link
      href={templateHref}
      prefetch={false}
      className="group relative block w-full cursor-pointer"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="pointer-events-none relative aspect-[570/630] flex flex-col px-[1.8vw] pt-[1.8vw] max-md:px-[4vw] max-md:pt-[4vw] overflow-hidden bg-[#161616]">
        <div className="w-full relative flex-1 overflow-hidden bg-[#202020]">
          {screenshots[0] && !imageError ? (
            <Image
              src={screenshots[0]}
              alt={template.title || template.slug || ""}
              fill
              sizes={sizes}
              quality={75}
              priority={priority}
              loading={priority ? undefined : "lazy"}
              onError={() => setImageError(true)}
              className="object-cover object-top"
            />
          ) : (
            <div className="h-full w-full bg-[#202020]" />
          )}

          {/* Richer preview for templates with more than one captured page -
              a small collage strip under the hero shot. Most templates ship
              with just screenshots[0]. */}
          {screenshots.length > 1 && (
            <div className="absolute inset-x-0 bottom-0 flex h-[42%] gap-[3%] p-[3%]">
              {screenshots.slice(1, 3).map((src, index) => (
                <div
                  key={src + index}
                  className="relative flex-1 overflow-hidden border border-black/40 bg-[#161616]"
                >
                  <Image src={src} alt="" fill sizes={sizes} quality={100} className="object-cover" />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="pointer-events-none shrink-0 py-[1.5vw] max-md:py-3 flex w-full items-center justify-between gap-3 font-geist-mono">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 max-md:gap-1.5">
            {tagPills.map((pill) => (
              <span
                key={pill}
                className="bg-[#2B2B2B] px-[0.4vw] py-[0.1vw] text18 text-white/90 max-md:px-3 max-md:py-1 max-md:text-[3.5vw]!"
              >
                {pill}
              </span>
            ))}
            {extraTagCount > 0 && (
              <Tooltip
                label={allTagLabels.slice(2).join(", ")}
                className="pointer-events-auto max-w-[10vw]"
              >
                <span className="cursor-default bg-[#2B2B2B] px-[0.8vw] py-[0.1vw] text18 font-medium text-white/70 max-md:px-3 max-md:py-1 max-md:text-[3.5vw]!">
                  +{extraTagCount}
                </span>
              </Tooltip>
            )}
          </div>
          {template.tier === "pro" && (
            showPurchase ? (
              // Real Buy/Download action in place of the old passive
              // price+"Pro" badge - pointer-events-auto to escape this
              // row's pointer-events-none (the row exists to let clicks
              // fall through to the card's own <Link>), and
              // stopPropagation via handlePurchaseClick so clicking it
              // triggers the purchase/download flow instead of navigating.
              <button
                type="button"
                data-no-card-link
                onClick={handlePurchaseClick}
                className="pointer-events-auto shrink-0 flex items-center gap-1.5 px-3 py-1.5 text18 font-medium bg-primary text-black transition-colors max-sm:px-4 max-sm:py-2 max-sm:text-[3.5vw]! hover:bg-[#ff7300]"
              >
                {hasAccess ? (
                  <>
                    <Download className="h-3.5 w-3.5 shrink-0 max-sm:h-4 max-sm:w-4" aria-hidden="true" />
                    Download
                  </>
                ) : (
                  `Buy $${template.pricing?.standaloneOneTime ?? "-"}`
                )}
              </button>
            ) : (
              // Callers that don't wire up purchase state (admin views, the
              // anonymous "top viewed" slider) still get the passive
              // price+"Pro" signal, just no actionable button.
              <div className="flex shrink-0 items-center gap-2 max-sm:gap-1.5">
                {template.pricing?.standaloneOneTime != null && (
                  <span className="text22 text-white max-sm:text-[3.5vw]!">
                    ${template.pricing.standaloneOneTime}
                  </span>
                )}
                <span className="shrink-0 bg-primary px-[0.8vw] py-[0.1vw] text18 text-white max-sm:px-4 max-sm:py-1 max-sm:text-[3.5vw]!">
                  Pro
                </span>
              </div>
            )
          )}
        </div>
      </div>

      <div className="pointer-events-none mt-4 relative flex items-start justify-between gap-4 px-3 pt-3 pb-1.5 max-[1025px]:pt-5 max-md:gap-3 max-md:px-2 max-md:pt-2">
        <span className="pointer-events-none max-sm:hidden absolute -top-px -left-px h-1.5 w-1.5 border-t border-l border-primary opacity-0 transition-opacity duration-300 group-hover:opacity-100 max-[1025px]:opacity-100 max-md:h-3 max-md:w-3" />
        <span className="pointer-events-none max-sm:hidden absolute -top-px -right-px h-1.5 w-1.5 border-t border-r border-primary opacity-0 transition-opacity duration-300 group-hover:opacity-100 max-[1025px]:opacity-100 max-md:h-3 max-md:w-3" />
        <span className="pointer-events-none max-sm:hidden absolute -bottom-px -left-px h-1.5 w-1.5 border-b border-l border-primary opacity-0 transition-opacity duration-300 group-hover:opacity-100 max-[1025px]:opacity-100 max-md:h-3 max-md:w-3" />
        <span className="pointer-events-none max-sm:hidden absolute -bottom-px -right-px h-1.5 w-1.5 border-b border-r border-primary opacity-0 transition-opacity duration-300 group-hover:opacity-100 max-[1025px]:opacity-100 max-md:h-3 max-md:w-3" />

        <div className="flex min-w-0 flex-col gap-0.5">
          <h3 className="truncate text-[1.25vw] max-md:text-[3vw] max-sm:text-[4.5vw] font-medium leading-[1.2]! text-white max-md:text-base">
            <span>{template.title}</span>
          </h3>
          <p className="text18 text-[#AEAEAE] max-md:text-xs">{formatLabel(template.category || "")}</p>
        </div>

        <div className="pointer-events-auto relative z-30 flex shrink-0 items-center gap-3 opacity-0 transition-opacity duration-300 max-md:gap-3 group-hover:opacity-100 max-[1025px]:opacity-100">
          {viewCount > 0 && (
            <span className="flex items-center gap-1.5 text-[1vw] text-white/55 max-sm:text-[3vw]!">
              {viewCountLabel}
              <Eye className="h-3 w-3 text-white/45 max-sm:h-3 max-sm:w-3" aria-hidden="true" />
            </span>
          )}

          <Tooltip label="Save">
            <button
              type="button"
              data-no-card-link
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleWishlist?.(template);
              }}
              className="flex h-8 w-8 cursor-pointer items-center justify-center bg-[#242424] text-white transition-colors hover:bg-white/10 max-[1025px]:h-11 max-[1025px]:w-11 max-md:h-9 max-md:w-9"
              aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
            >
              <Heart
                className={`h-4.5 w-4.5 max-[1025px]:h-5 max-[1025px]:w-5 max-md:h-4 max-md:w-4 ${
                  isWishlisted ? "fill-white" : ""
                }`}
              />
            </button>
          </Tooltip>

          <Tooltip label="Preview">
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
              <ArrowIcon className="h-4.5 w-4.5 max-md:h-3.5 max-md:w-3.5 group-hover/arrow:-translate-y-[180%] group-hover/arrow:translate-x-[180%] duration-300 ease-in-out" />
              <ArrowIcon className="h-4.5 w-4.5 max-md:h-3.5 max-md:w-3.5 absolute -translate-x-[180%] translate-y-[180%] group-hover/arrow:translate-x-0 group-hover/arrow:translate-y-0 duration-300 ease-in-out" />
            </div>
          </Tooltip>
        </div>
      </div>
    </Link>

    {showPurchase && (
      <TemplatePaywallModal
        template={template}
        open={isPaywallOpen}
        onClose={() => setIsPaywallOpen(false)}
        onPurchased={() => {
          setIsPaywallOpen(false);
          window.location.href = downloadHref;
        }}
      />
    )}
    </>
  );
}
