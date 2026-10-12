"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Eye, Heart } from "lucide-react";
import Button from "@/homepage/components/Button";
import { Tooltip } from "@/components/ui/Tooltip";
// Same hover-action slide and button style as the effect cards.
import { ACTION_SLIDE, CARD_BTN } from "../effects/EffectCard";
import { useTemplatePurchase } from "./useTemplatePurchase";
import { BADGE, DISPLAY, PRICE, T11, T13, T14, T20, catalogueLabel, catalogueOf, priceOf } from "./tokens";

const formatViews = (n) => (n >= 1000 ? new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(n) : String(n));

/**
 * One template in the v4 grid: a white card holding the shot - its full-page design
 * scrolls top to bottom on hover, with the catalogue badge, tech tags and hover actions
 * on it - then the title and price ("or 1 credit"), category and view count, and the
 * description beside Buy / Download.
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

  // The page eases back to the top slowly when the cursor leaves, so the further it had
  // panned, the longer the return (a fixed 1.6s made long pans snap back). Read from
  // where the pan has got to right now: the first half returns at 0.8x the pan's pace,
  // anything past 50% a bit faster (0.45x), so long pans don't drag. At least 1s.
  const imageRef = useRef(null);
  const setResetDuration = () => {
    const img = imageRef.current;
    if (!img) return;
    const panned = (parseFloat(getComputedStyle(img).objectPosition.split(" ")[1]) || 0) / 100;
    const seconds = (Math.min(panned, 0.5) * 0.8 + Math.max(0, panned - 0.5) * 0.45) * panSeconds;
    img.style.setProperty("--reset", `${Math.max(1, seconds).toFixed(2)}s`);
  };

  return (
    // A white card on the light listing: the shot (catalogue badge, tech tags and the
    // hover actions on it), then title + price, category + views, and the description
    // beside Buy.
    // The whole card comes a touch towards the viewer with a soft shadow on hover. No
    // `group` here: Buy (Button) animates on any `.group:hover` above it, so it would
    // play whenever the card was hovered - it should only react to its own hover.
    <article className="flex flex-col gap-[1.1vw] bg-foreground p-[1.1vw] transition-[transform,box-shadow] duration-500 transform-[perspective(1200px)_translateZ(0)] hover:transform-[perspective(1200px)_translateZ(1vw)] hover:shadow-[0_1.2vw_2.4vw_-1.2vw_color-mix(in_srgb,black_35%,transparent)] max-lg:gap-4 max-lg:p-4 max-md:p-3.5">
      {/* Over the shot only (group/preview): the page inside pans down and the action
          buttons slide up into it. */}
      <div onPointerLeave={setResetDuration} className="group/preview relative aspect-16/10 overflow-hidden bg-black/10">
        <ShotTarget href={href} onOpen={onOpen && (() => onOpen(template))} label={template.title}>
          {/* pans down the page only while the cursor is over the image (not the text
              below), then eases back to the top when it leaves */}
          <span className="absolute inset-x-0 top-0 bottom-0 block overflow-hidden bg-grey">
            {shot && !imageError && (
              <Image
                src={shot}
                alt=""
                fill
                sizes="(max-width: 767px) 100vw, (max-width: 1025px) 50vw, 44vw"
                quality={75}
                priority={priority}
                ref={imageRef}
                onError={() => setImageError(true)}
                style={{ "--pan": `${panSeconds}s` }}
                className="object-cover object-top transition-[object-position] duration-[var(--reset,1.6s)] ease-in-out group-hover/preview:object-bottom group-hover/preview:duration-(--pan) group-hover/preview:ease-in-out group-focus-within/preview:object-bottom group-focus-within/preview:duration-(--pan)"
              />
            )}
          </span>

          {/* catalogue badge, top right */}
          <span className="pointer-events-none absolute top-3 right-3 z-1">
            <span className={`${BADGE} ${full ? "bg-foreground text-background border-black/20 border" : "bg-primary text-background"}`}>
              {catalogueLabel(template)}
            </span>
          </span>

          {/* tech tags, bottom left */}
          {(template.tags || []).length > 0 && (
            <span className="pointer-events-none absolute bottom-3 left-3 z-1 flex max-w-[55%] flex-wrap gap-1">
              {template.tags.map((tag) => (
                <span key={tag} className={`inline-flex items-center bg-background/80 px-1.5 py-0.5 font-avenir ${T11} text-foreground/85 backdrop-blur-lg`}>
                  {tag}
                </span>
              ))}
            </span>
          )}
        </ShotTarget>

        {/* hover actions, bottom right: slide up one after another (always shown on touch layouts) */}
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

      <div className="flex flex-col gap-[1.1vw] max-lg:gap-4">
        {/* title + category / views on the left, price + "or 1 credit" on the right */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-[0.3vw] max-lg:gap-1">
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
            <p className={`flex items-center gap-2.5 ${T13} text-black/50`}>
              {template.category}
              {views > 0 && (
                <span className="inline-flex items-center gap-1">
                  <Eye className="size-3.5" aria-hidden="true" />
                  {formatViews(views)}
                </span>
              )}
            </p>
          </div>
          {price != null && (
            <p className={`${DISPLAY} flex shrink-0 flex-col items-end gap-[0.2vw] max-lg:gap-0.5`}>
              <span className={`${PRICE} ${T20} leading-none text-ink`}>${price}</span>
              <small className={`${T13} text-black/50`}>or 1 credit</small>
            </p>
          )}
        </div>

        {/* description, with Buy beside it */}
        <div className="flex items-center justify-between gap-[2vw] max-md:flex-col max-md:items-start max-md:gap-4">
          <p className={`line-clamp-2 min-w-0 flex-1 ${T14} text-black/60`}>{template.tagline}</p>
          {template.tier === "pro" && (
            <Button
              text={hasAccess ? "Download" : "Buy Template"}
              preventDefault
              onClick={() => buy(template, hasAccess)}
              className="shrink-0 max-md:w-fit"
            />
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
