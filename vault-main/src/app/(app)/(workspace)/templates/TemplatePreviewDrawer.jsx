"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import gsap from "gsap";
import { useLenis } from "lenis/react";
import { Heart } from "lucide-react";
import ButtonV3 from "@/homepage-v3/components/ButtonV3";
import LinkButton from "@/components/WebsiteComps/LinkButton";
import { BADGE, DISPLAY, PRICE, T11, T14, T16, T18, catalogueLabel, catalogueOf, priceOf } from "./tokens";

// Same open/close choreography as the effects preview drawer (PreviewDrawerV4):
// the panel slides in from the right while the backdrop fades, then the content
// fades in; closing runs it backwards before anything unmounts.
const EASE = "power2.inOut";
const PANEL_DURATION = 0.65;
const CONTENT_DURATION = 0.25;

/**
 * Quick look at one template, opened from a template card: the whole desktop
 * design to scroll through, its details, Save / Demo / View template, the price
 * with Buy, and more templates to switch to.
 *
 * `template` drives it: set it to open (or swap), clear it to close. `onBuy`
 * gets the template; the listing closes the drawer and runs the purchase.
 */
export function TemplatePreviewDrawer({ template, templates = [], isWishlisted, hasAccess, onToggleWishlist, onClose, onOpen, onBuy }) {
  const overlayRef = useRef(null);
  const panelRef = useRef(null);
  const contentRef = useRef(null);
  const closeRef = useRef(null);
  const lenis = useLenis();
  const open = !!template;

  const [shown, setShown] = useState(null);
  const shownRef = useRef(null);
  const wasOpenRef = useRef(false);
  const closingRef = useRef(false);
  const tlRef = useRef(null);

  // Open, swap, or close in response to `template`.
  useEffect(() => {
    const prev = shownRef.current;
    if (template && !prev) {
      shownRef.current = template;
      setShown(template);
      return;
    }
    if (template && prev && closingRef.current) {
      closingRef.current = false;
      tlRef.current?.kill();
      tlRef.current = gsap
        .timeline()
        .to(panelRef.current, { xPercent: 0, duration: PANEL_DURATION, ease: EASE })
        .to(overlayRef.current, { opacity: 1, duration: PANEL_DURATION, ease: EASE }, "<")
        .add(() => {
          if (template === prev) gsap.to(contentRef.current, { opacity: 1, duration: CONTENT_DURATION, ease: EASE });
          else {
            shownRef.current = template;
            setShown(template);
          }
        });
      return;
    }
    if (template && prev && template !== prev) {
      tlRef.current?.kill();
      tlRef.current = gsap.to(contentRef.current, {
        opacity: 0,
        duration: CONTENT_DURATION,
        ease: EASE,
        onComplete: () => {
          shownRef.current = template;
          setShown(template);
        },
      });
      return;
    }
    if (!template && prev) {
      closingRef.current = true;
      tlRef.current?.kill();
      tlRef.current = gsap
        .timeline({
          onComplete: () => {
            closingRef.current = false;
            shownRef.current = null;
            wasOpenRef.current = false;
            setShown(null);
          },
        })
        .to(contentRef.current, { opacity: 0, duration: CONTENT_DURATION, ease: EASE })
        .to(panelRef.current, { xPercent: 100, duration: PANEL_DURATION, ease: EASE })
        .to(overlayRef.current, { opacity: 0, duration: PANEL_DURATION, ease: EASE }, "<");
    }
  }, [template]);

  // Slide in on first open; on a swap only the content fades back in.
  useLayoutEffect(() => {
    if (!shown) return;
    tlRef.current?.kill();
    panelRef.current.scrollTop = 0;
    if (!wasOpenRef.current) {
      wasOpenRef.current = true;
      gsap.set(panelRef.current, { xPercent: 100 });
      gsap.set(overlayRef.current, { opacity: 0 });
      gsap.set(contentRef.current, { opacity: 0 });
      tlRef.current = gsap
        .timeline()
        .to(panelRef.current, { xPercent: 0, duration: PANEL_DURATION, ease: EASE })
        .to(overlayRef.current, { opacity: 1, duration: PANEL_DURATION, ease: EASE }, "<")
        .to(contentRef.current, { opacity: 1, duration: CONTENT_DURATION, ease: EASE });
    } else {
      tlRef.current = gsap.fromTo(contentRef.current, { opacity: 0 }, { opacity: 1, duration: CONTENT_DURATION, ease: EASE });
    }
  }, [shown]);

  useEffect(() => () => tlRef.current?.kill(), []);

  // Lock the page behind the drawer and close on Escape (as PreviewDrawerV4).
  useEffect(() => {
    if (!open) return undefined;
    document.documentElement.setAttribute("data-v4-drawer-open", "");
    lenis?.stop();
    const insidePanel = (target) => target instanceof Node && panelRef.current?.contains(target);
    const blockScroll = (event) => {
      if (!insidePanel(event.target)) event.preventDefault();
    };
    const SCROLL_KEYS = new Set([" ", "PageUp", "PageDown", "Home", "End", "ArrowUp", "ArrowDown"]);
    const onKey = (event) => {
      if (event.key === "Escape") onClose();
      else if (SCROLL_KEYS.has(event.key) && !insidePanel(document.activeElement)) event.preventDefault();
    };
    document.addEventListener("wheel", blockScroll, { passive: false });
    document.addEventListener("touchmove", blockScroll, { passive: false });
    document.addEventListener("keydown", onKey);
    const focus = setTimeout(() => closeRef.current?.focus({ preventScroll: true }), PANEL_DURATION * 1000);
    return () => {
      lenis?.start();
      document.removeEventListener("wheel", blockScroll);
      document.removeEventListener("touchmove", blockScroll);
      document.removeEventListener("keydown", onKey);
      clearTimeout(focus);
    };
  }, [open, lenis, onClose]);

  // The page scrollbar stays hidden while the drawer is on screen, including its close animation.
  const onScreen = !!shown;
  useEffect(() => {
    if (!onScreen) return undefined;
    const root = document.documentElement;
    root.setAttribute("data-v4-drawer-open", "");
    return () => root.removeAttribute("data-v4-drawer-open");
  }, [onScreen]);

  const others = useMemo(() => (shown ? templates.filter((t) => t.slug !== shown.slug).slice(0, 2) : []), [shown, templates]);

  if (!shown || typeof document === "undefined") return null;
  const saved = isWishlisted(shown);
  const owned = hasAccess(shown);
  const price = priceOf(shown);
  const full = catalogueOf(shown) === "full";
  const page = shown.fullShot;
  const shot = page?.src || shown.screenshots?.[0];
  const panSeconds = page ? Math.min(16, Math.max(6, (page.height / page.width) * 1.6)) : 6;
  const href = shown.href || `/templates/${shown.slug}`;

  return createPortal(
    <div role="dialog" aria-modal="true" aria-labelledby="tpl-drawer-title" className="fixed inset-0 z-990 [--scrollbar-thumb:initial]">
      <div ref={overlayRef} aria-hidden="true" onClick={onClose} className="absolute inset-0 bg-black/30 backdrop-blur-lg" />
      <div
        ref={panelRef}
        data-lenis-prevent
        className="absolute inset-y-0 right-0 w-[53vw] overflow-y-auto overscroll-contain border-l border-foreground/10 bg-background font-avenir text-foreground shadow-[-1.1vw_0_2.8vw_-1.7vw_color-mix(in_srgb,black_60%,transparent)] max-lg:w-full max-lg:border-l-0"
      >
        <div ref={contentRef} className="flex flex-col gap-8 px-10 pt-7 pb-16 max-lg:px-8 max-md:px-5 *:shrink-0">
          <div className="flex items-center justify-between">
            <span className={`${T16} text-foreground/80`}>{shown.category}</span>
            {/* Same close control as the site's modals: the cross turns a quarter on hover. */}
            <button
              ref={closeRef}
              type="button"
              aria-label="Close preview (Esc)"
              onClick={onClose}
              className="group flex size-10 cursor-pointer items-center justify-center border border-foreground/20 bg-foreground/10 transition-colors duration-500 hover:border-primary hover:bg-primary"
            >
              <span className="relative flex size-4 items-center justify-center transition-transform duration-500 ease-in-out group-hover:rotate-90">
                <span className="h-px w-4 rotate-45 bg-foreground" />
                <span className="absolute h-px w-4 -rotate-45 bg-foreground" />
              </span>
            </button>
          </div>

          {/* Same frame as the effect drawer's preview; hovering pans down the whole page. */}
          <div className="group/shot relative aspect-[16/8.6] overflow-hidden border border-foreground/10 bg-background">
            {shot && (
              <Image
                src={shot}
                alt={`${shown.title} homepage`}
                fill
                sizes="(max-width: 1025px) 100vw, 53vw"
                quality={75}
                style={{ "--pan": `${panSeconds}s` }}
                className="object-cover object-top transition-[object-position] duration-[1.6s] ease-in-out group-hover/shot:object-bottom group-hover/shot:duration-(--pan)"
              />
            )}
          </div>

          {/* Same order as the effect drawer: tags, name, description, then the actions. */}
          {shown.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {shown.tags.map((tag) => (
                <span key={tag} className={`inline-flex h-6 items-center border border-foreground/15 px-2 font-mono ${T11} text-foreground/70`}>
                  {tag}
                </span>
              ))}
            </div>
          )}

          <div className="grid gap-6">
            {/* Catalogue sits beside the name at its usual small size. */}
            <div className="flex flex-wrap items-center gap-3">
              <h2 id="tpl-drawer-title" className={`${DISPLAY} text64 font-aeonik`}>
                {shown.title}
              </h2>
              <div className="mt-1.5">
                <span className={`${BADGE} ${full ? "bg-foreground text-background border-black/20 border" : "bg-primary text-background"}`}>{catalogueLabel(shown)}</span>
              </div>
            </div>

            {shown.tagline && <p className={`w-[80%] ${T16} leading-relaxed text-foreground/80 max-lg:w-full`}>{shown.tagline}</p>}

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                aria-pressed={saved}
                aria-label={saved ? `Remove ${shown.title} from saved` : `Save ${shown.title}`}
                onClick={() => onToggleWishlist(shown)}
                className={`flex cursor-pointer gap-2 self-center border border-foreground/20 px-3 py-3 leading-[1.2] ${saved ? "text-primary! [&_svg]:fill-primary [&_svg]:stroke-primary" : ""}`}
              >
                <span className="size-4.5">
                  <Heart className="size-full" aria-hidden="true" />
                </span>
              </button>
              <ButtonV3 text="Demo" href={shown.previewHref || href} variant="outline" target_blank className="tracking-normal! bg-transparent! border-foreground/20" />
              <ButtonV3 text="View template" href={href} className="tracking-normal! border border-primary" />
            </div>
          </div>

          {/* Where the effect drawer has its Pro box: the price, and Buy (Download when it's yours). */}
          <div className="flex flex-wrap items-center justify-between gap-4 border border-primary/35 bg-primary/6 px-4.5 py-4">
            <p className={`flex items-baseline gap-2 ${T14} text-foreground/70`}>
              {price != null && <b className={`${PRICE} ${T18} font-normal text-foreground`}>${price}</b>}
              {owned ? "This template is yours." : "one-time, or 1 template credit"}
            </p>
            <LinkButton
              href={owned ? `/api/templates/${shown.slug}/download` : "#"}
              text={owned ? "Download" : "Buy template"}
              underline
              tilted={false}
              underlineClassName="mt-0"
              onClick={(event) => {
                event.preventDefault();
                onBuy(shown);
              }}
              className="text18 text-foreground transition-colors duration-300 hover:text-primary"
            />
          </div>

          {others.length > 0 && (
            <div className="flex flex-col gap-4 border-t border-foreground/10 pt-6">
              <p className={`${T16} text-foreground`}>More templates</p>
              <div className="grid grid-cols-2 gap-[0.9vw] max-md:grid-cols-1 max-md:gap-[3.5vw]">
                {/* Same look as the effect drawer's small cards. */}
                {others.map((t) => (
                  <button key={t.slug} type="button" onClick={() => onOpen(t)} className="group grid cursor-pointer gap-3.5 text-left">
                    <span className="relative block aspect-[16/8.6] overflow-hidden bg-grey transition-shadow duration-700 group-hover:shadow-[0_14px_28px_-16px_rgba(0,0,0,.35)]">
                      {(t.screenshots?.[0] || t.fullShot?.src) && (
                        <Image
                          src={t.screenshots?.[0] || t.fullShot.src}
                          alt={t.title}
                          fill
                          sizes="240px"
                          quality={75}
                          className="object-cover object-top transition-[scale] duration-700 group-hover:scale-[1.03]"
                        />
                      )}
                      <span aria-hidden="true" className="pointer-events-none absolute inset-0 shadow-[inset_0_0_0_1px_rgba(244,244,244,.07)]" />
                    </span>
                    <span className="grid gap-1">
                      <span className={`${DISPLAY} truncate ${T18} leading-tight font-medium text-foreground`}>{t.title}</span>
                      <span className={`${T14} text-foreground/55`}>{t.category}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
