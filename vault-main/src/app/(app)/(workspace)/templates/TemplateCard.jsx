"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Download, Eye, Heart } from "lucide-react";
import { Tooltip } from "@/components/ui/Tooltip";
// Same hover-action slide and button style as the effect cards.
import { ACTION_SLIDE, CARD_BTN } from "../effects/EffectCard";
import { useTemplatePurchase } from "./useTemplatePurchase";
import { BADGE, DISPLAY, PRICE, T11, T13, T14, T16, T18, catalogueLabel, catalogueOf, priceOf } from "./tokens";

const formatViews = (n) => (n >= 1000 ? new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(n) : String(n));

/**
 * One template in the v4 grid. From the v4 design: the browser-chrome frame
 * whose full-page design scrolls top to bottom on hover, the category/price/catalogue
 * badges and the "or 1 credit" price line. From the live TemplateCard: Save,
 * live demo, view count and the Buy / Download flow.
 *
 * With `onOpen`, clicking the shot opens the preview drawer (like the effect
 * cards); without it, the shot links to the template page. The hover actions
 * match the effect cards: Save, View template, Live demo. Buy opens the "Get
 * this template" popup first (useTemplatePurchase).
 *
 * The shot and the action buttons are siblings rather than nested, so there's
 * no button inside an <a>.
 */
// small: no hover actions (save, live demo, article) - e.g. the detail page's "More templates".
export function TemplateCard({ template, priority = false, isWishlisted = false, onToggleWishlist, onOpen, hasAccess = false, small = false }) {
  const [imageError, setImageError] = useState(false);
  const { buy, modals } = useTemplatePurchase();

  const href = template.href || `/templates/${template.slug}`;
  const previewHref = template.previewHref || href;
  // The whole desktop design (from the exploded-view exports) when there is one,
  // else the listing screenshot. Taller pages pan for longer, about 1.6s per screen.
  const page = template.fullShot;
  const shot = page?.src || (Array.isArray(template.screenshots) ? template.screenshots[0] : null);
  const panSeconds = page ? Math.min(16, Math.max(6, (page.height / page.width) * 1.6)) : 6;
  const price = priceOf(template);
  const views = Number(template.viewCount) || 0;
  const full = catalogueOf(template) === "full";

  return (
    <article className="group flex flex-col gap-4">
      {/* Hover - over this shot only (group/preview), like the effect cards: it comes a
          touch towards the viewer with a soft shadow, the page inside pans down, and the
          action buttons slide up into it. */}
      <div className="group/preview relative aspect-16/11 overflow-hidden bg-black/10 ring-1 ring-inset ring-black/10 transition-all duration-500 transform-[perspective(1200px)_translateZ(0)] hover:transform-[perspective(1200px)_translateZ(1vw)] hover:shadow-[0_1.2vw_2.4vw_-1.2vw_color-mix(in_srgb,black_35%,transparent)]">
        <ShotTarget href={href} onOpen={onOpen && (() => onOpen(template))} label={template.title}>
          {/* pans down the page only while the cursor is over the image (not the text
              below), then eases back to the top when it leaves */}
          <span className="absolute inset-x-0 top-0 bottom-0 block overflow-hidden bg-grey">
            {shot && !imageError && (
              <Image
                src={shot}
                alt=""
                fill
                sizes="(max-width: 767px) 100vw, (max-width: 1025px) 50vw, 46vw"
                quality={75}
                priority={priority}
                onError={() => setImageError(true)}
                style={{ "--pan": `${panSeconds}s` }}
                className="object-cover object-top transition-[object-position] duration-[1.6s] ease-in-out group-hover/preview:object-bottom group-hover/preview:duration-(--pan) group-hover/preview:ease-in-out group-focus-within/preview:object-bottom group-focus-within/preview:duration-(--pan)"
              />
            )}
          </span>

          <span className="pointer-events-none absolute inset-x-3 top-4 z-1 flex justify-between gap-2">
            <span className="flex gap-1.5">
              <span className={`${BADGE} bg-background/60 text-foreground/85 border-foreground/20 border`}>{template.category}</span>
            </span>
            <span className={`${BADGE} ${full ? "bg-foreground text-background border-black/20 border" : "bg-primary text-background"}`}>
              {catalogueLabel(template)}
            </span>
          </span>
        </ShotTarget>

        {/* hover actions: slide up one after another (always shown on touch layouts) */}
        {!small && (
        <div className="absolute right-3 bottom-3 z-2 flex gap-1.5">
          <Tooltip label={isWishlisted ? "Saved" : "Save"} className={`${ACTION_SLIDE} delay-0`}>
            <button
              type="button"
              onClick={() => onToggleWishlist?.(template)}
              aria-pressed={isWishlisted}
              aria-label={isWishlisted ? `Remove ${template.title} from saved` : `Save ${template.title}`}
              className={`${CARD_BTN} ${isWishlisted ? "text-primary! [&_svg]:fill-primary [&_svg]:stroke-primary" : ""}`}
            >
              <Heart aria-hidden="true" />
            </button>
          </Tooltip>
         
          <Tooltip label="Live demo" className={`${ACTION_SLIDE} delay-40`}>
            <a
              href={previewHref}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Open the live demo of ${template.title}`}
              className={CARD_BTN}
            >
              <Eye aria-hidden="true" />
            </a>
          </Tooltip>
          <Tooltip label="View Article" className={`${ACTION_SLIDE} delay-80`}>
            <Link href={href} prefetch={false} aria-label={`Open the ${template.title} page`} className={`${CARD_BTN} bg-primary! text-background! ring-0! hover:bg-primary-hover!`}>
              <ArrowUpRight aria-hidden="true" />
            </Link>
          </Tooltip>
        </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="type-h3 flex min-w-0 flex-wrap items-center gap-2">
            <Link href={href} prefetch={false} className="transition-colors duration-500 hover:text-primary">
              {template.title}
            </Link>
            {/* Same "Yours" tag as the preview drawer, in the light section's colours. */}
            {hasAccess && (
              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 ${T11} bg-black/5 font-normal text-ink ring-1 ring-inset ring-black/15`}>
                Yours <span className="text-primary">✓</span>
              </span>
            )}
          </h3>
          {price != null && (
            <span className={`${DISPLAY} ${T18} flex shrink-0 items-baseline gap-1.5 font-medium`}>
              <span className={PRICE}>${price}</span>
              <small className={`font-normal text-black/60 ${T13}`}>or 1 credit</small>
            </span>
          )}
        </div>
        <p className={`line-clamp-2 ${T14} text-black/60 w-[70%]`}>{template.tagline}</p>
        <div className="flex items-center justify-between gap-3 pt-4">
          <div className="flex flex-wrap items-center gap-1.5">
            {(template.tags || []).map((tag) => (
              <span key={tag} className={`inline-flex h-6 items-center px-2 font-avenir ${T13} text-black/60 ring-1 ring-inset ring-black/10`}>
                {tag}
              </span>
            ))}
            {views > 0 && (
              <span className={`inline-flex items-center gap-1 pl-1.5 ${T13} text-black/50`}>
                <Eye className="size-3.5" aria-hidden="true" />
                {formatViews(views)}
              </span>
            )}
          </div>
          {template.tier === "pro" && (
            <button
              type="button"
              onClick={() => buy(template, hasAccess)}
              className={`inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 bg-primary px-3.5 ${T14} text-background transition-colors duration-500 hover:bg-primary-hover`}
            >
              {hasAccess ? (
                <>
                  <Download className="size-3.5" aria-hidden="true" /> Download
                </>
              ) : (
                "Buy Template"
              )}
            </button>
          )}
        </div>
      </div>

      {modals}
    </article>
  );
}

/** The card's shot: opens the preview drawer when there is one, else links to the template page. */
function ShotTarget({ href, onOpen, label, children }) {
  if (!onOpen) {
    return (
      <Link href={href} prefetch={false} aria-label={label} className="absolute inset-0 block">
        {children}
      </Link>
    );
  }
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Preview ${label}`}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen();
        }
      }}
      className="absolute inset-0 block cursor-pointer outline-none"
    >
      {children}
    </div>
  );
}
