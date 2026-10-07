"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Check, Download, Eye, Heart } from "lucide-react";
import { Tooltip } from "@/components/ui/Tooltip";
import { TemplatePaywallModal } from "@/components/ui/TemplatePaywallModal";
import { ICON_BTN } from "../effects/EffectCardV4";
import { BADGE, DISPLAY, T10, T13, T14, T16, T18, T20, catalogueLabel, catalogueOf, priceOf } from "./tokens";

const formatViews = (n) => (n >= 1000 ? new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(n) : String(n));

/**
 * One template in the v4 grid. From the v4 design: the browser-chrome frame
 * whose screenshot scrolls top to bottom on hover, the category/price/catalogue
 * badges and the "or 1 credit" price line. From the live TemplateCard: Save,
 * Preview, view count and the Buy / Download flow (with its paywall modal).
 *
 * The shot link and the action buttons are siblings rather than nested, so
 * there's no button inside an <a>.
 */
export function TemplateCardV4({ template, priority = false, isWishlisted = false, onToggleWishlist, hasAccess = false }) {
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [imageError, setImageError] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { isLoaded, isSignedIn } = useUser();

  const href = template.href || `/templates/${template.slug}`;
  const previewHref = template.previewHref || href;
  const downloadHref = `/api/templates/${template.slug}/download`;
  const shot = Array.isArray(template.screenshots) ? template.screenshots[0] : null;
  const price = priceOf(template);
  const views = Number(template.viewCount) || 0;
  const full = catalogueOf(template) === "full";

  // Same three-way branch as TemplateCard: owned downloads, signed-out signs in
  // and comes back here, signed-in opens the paywall in place.
  const onBuy = () => {
    if (hasAccess) {
      window.location.href = downloadHref;
      return;
    }
    if (!isLoaded) return;
    if (!isSignedIn) {
      router.push(`/sign-in?redirect_url=${encodeURIComponent(pathname)}`);
      return;
    }
    setPaywallOpen(true);
  };

  return (
    <article className="group grid gap-4">
      <div className="relative aspect-[16/11] overflow-hidden bg-[#dcdcdc] shadow-[inset_0_0_0_1px_rgba(29,29,29,.1)] transition-shadow duration-700 ease-[cubic-bezier(.16,1,.3,1)] hover:shadow-[0_30px_60px_-30px_rgba(255,95,0,.55)]">
        <Link href={href} prefetch={false} aria-label={template.title} className="absolute inset-0 block">
          {/* browser chrome */}
          <span aria-hidden="true" className="absolute inset-x-0 top-0 z-1 flex h-6.5 items-center gap-1.25 border-b border-black/6 bg-[#e9e9e9] px-2.5">
            <i className="size-1.75 rounded-full bg-[#c9c9c9]" />
            <i className="size-1.75 rounded-full bg-[#c9c9c9]" />
            <i className="size-1.75 rounded-full bg-[#c9c9c9]" />
            <span className={`ml-2.5 h-3.5 max-w-[46%] flex-1 truncate bg-[#f7f7f7] px-2 font-mono ${T10} leading-3.5 text-[#999]`}>
              vault.hyperiux.com{previewHref}
            </span>
          </span>

          {/* screenshot: pans from the top of the page to the bottom on hover */}
          <span className="absolute inset-x-0 top-6.5 bottom-0 block overflow-hidden bg-[#202020]">
            {shot && !imageError && (
              <Image
                src={shot}
                alt=""
                fill
                sizes="(max-width: 767px) 100vw, (max-width: 1025px) 50vw, 46vw"
                quality={75}
                priority={priority}
                onError={() => setImageError(true)}
                className="object-cover object-top transition-[object-position] duration-[6s] ease-[cubic-bezier(.45,0,.3,1)] group-hover:object-bottom group-focus-within:object-bottom"
              />
            )}
          </span>

          <span className="pointer-events-none absolute inset-x-3 top-9.5 z-1 flex justify-between gap-2">
            <span className="flex gap-1.5">
              <span className={`${BADGE} bg-[rgba(20,20,20,.6)] text-[#d8d8d8]`}>{template.category}</span>
              {price != null && <span className={`${BADGE} bg-[rgba(20,20,20,.72)] text-white`}>${price}</span>}
            </span>
            <span className={`${BADGE} ${full ? "bg-[#1D1D1D] text-[#FFB27A]" : "bg-[rgba(255,178,122,.95)] text-[#1D1D1D]"}`}>
              {catalogueLabel(template)}
            </span>
          </span>
        </Link>

        {/* hover actions (always shown on touch layouts) */}
        <div className="absolute right-3 bottom-3 z-2 flex gap-1.5 opacity-0 transition-opacity duration-500 group-hover:opacity-100 group-focus-within:opacity-100 max-[1025px]:opacity-100">
          <Tooltip label={isWishlisted ? "Saved" : "Save"}>
            <button
              type="button"
              onClick={() => onToggleWishlist?.(template)}
              aria-pressed={isWishlisted}
              aria-label={isWishlisted ? `Remove ${template.title} from saved` : `Save ${template.title}`}
              className={ICON_BTN}
            >
              <Heart className={isWishlisted ? "fill-[#ff5f00] text-[#ff5f00]" : ""} aria-hidden="true" />
            </button>
          </Tooltip>
          <Tooltip label="Live preview">
            <a href={previewHref} target="_blank" rel="noopener noreferrer" aria-label={`Live preview of ${template.title}`} className={ICON_BTN}>
              <Eye aria-hidden="true" />
            </a>
          </Tooltip>
        </div>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3 gap-y-1.5">
        <h3 className={`${DISPLAY} ${T20} font-medium`}>
          <Link href={href} prefetch={false} className="transition-colors duration-500 hover:text-[#ff5f00]">
            {template.title}
          </Link>
          {hasAccess && <Check className="ml-1.5 inline size-[0.9em] text-[#ff5f00]" aria-label="Owned" />}
        </h3>
        {price != null && (
          <span className={`${DISPLAY} ${T18} font-medium`}>
            ${price}
            <small className={`ml-1.5 font-normal text-[#6B6B6B] ${T13}`}>or 1 credit</small>
          </span>
        )}
        <p className={`col-span-full line-clamp-2 ${T16} text-[#6B6B6B]`}>{template.tagline}</p>
        <div className="col-span-full mt-2 flex items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {(template.tags || []).map((tag) => (
              <span key={tag} className={`inline-flex h-6 items-center px-2 font-mono ${T13} text-[#6B6B6B] shadow-[inset_0_0_0_1px_rgba(29,29,29,.12)]`}>
                {tag}
              </span>
            ))}
            {views > 0 && (
              <span className={`ml-1.5 inline-flex items-center gap-1 ${T13} text-[#8a8a8a]`}>
                <Eye className="size-3.5" aria-hidden="true" />
                {formatViews(views)}
              </span>
            )}
          </div>
          {template.tier === "pro" && (
            <button
              type="button"
              onClick={onBuy}
              className={`inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 bg-[#ff5f00] px-3.5 ${T14} text-[#141414] transition-colors duration-500 hover:bg-[#ff7300]`}
            >
              {hasAccess ? (
                <>
                  <Download className="size-3.5" aria-hidden="true" /> Download
                </>
              ) : (
                `Buy $${price ?? "-"}`
              )}
            </button>
          )}
        </div>
      </div>

      <TemplatePaywallModal
        template={template}
        open={paywallOpen}
        onClose={() => setPaywallOpen(false)}
        onPurchased={() => {
          setPaywallOpen(false);
          window.location.href = downloadHref;
        }}
      />
    </article>
  );
}
