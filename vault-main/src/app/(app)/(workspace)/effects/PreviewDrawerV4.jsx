"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import gsap from "gsap";
import { useLenis } from "lenis/react";
import { Check, Copy, Heart, Lock } from "lucide-react";
import ButtonV3 from "@/homepage-v3/components/ButtonV3";
import { getEffectHref, getEffectPreviewHref, getEffectCategory, resolveEffectCategoryId } from "@/lib/categories";
import { resolveEffectVideoUrl } from "@/lib/media";
import {
  DISPLAY,
  EffectCardV4,
  MONO,
  TierBadge,
  installCommand,
  resolveCover,
} from "./EffectCardV4";

// Text sizes in vw: desktop · tablet (max-[1025px]) · mobile (max-md).
const T11 = "text-[0.76vw] max-[1025px]:text-[1.4vw] max-md:text-[2.8vw]";
const T14 = "text-[0.97vw] max-[1025px]:text-[1.7vw] max-md:text-[3.6vw]";
const T16 = "text-[1.1vw] max-[1025px]:text-[1.95vw] max-md:text-[4.1vw]";

// Open/close choreography borrowed from the information-drawer effect: the panel
// slides in from the right (power2.inOut) while the backdrop fades, and only then
// does the content fade in. Closing runs it backwards - content fades out, then the
// panel slides off to the right - before anything unmounts.
const EASE = "power2.inOut";
const PANEL_DURATION = 0.65;
const CONTENT_DURATION = 0.25;

/**
 * Quick-look panel for one effect: live preview, install command (or the Pro
 * lock), links out to the effect page and live demo, and more from the same
 * category. Portalled to <body> so no transformed ancestor can trap it.
 *
 * `effect` drives it: set it to open (or swap to another effect), clear it to
 * close. The panel keeps showing the last effect while it animates out, so
 * `canInstall` / `isWishlisted` are functions of the effect being shown.
 */
export function PreviewDrawerV4({
  effect,
  effects,
  canInstall,
  isWishlisted,
  onClose,
  onOpen,
  onToggleWishlist,
  onCopyInstall,
}) {
  const overlayRef = useRef(null);
  const panelRef = useRef(null);
  const contentRef = useRef(null);
  const closeRef = useRef(null);
  const lenis = useLenis();
  const open = !!effect;

  // The effect on screen; it outlives `effect` until the close animation ends.
  const [shown, setShown] = useState(null);
  const shownRef = useRef(null);
  const wasOpenRef = useRef(false);
  const closingRef = useRef(false);
  const tlRef = useRef(null);

  // The cover shows until the video actually plays (a loading video paints black).
  const [playingVideo, setPlayingVideo] = useState(null);
  // "Copy" flips to "Copied" for a moment after copying the install command.
  const [copied, setCopied] = useState(false);
  const copiedTimerRef = useRef(0);
  useEffect(() => () => clearTimeout(copiedTimerRef.current), []);

  // Open, swap, or close in response to `effect`.
  useEffect(() => {
    const prev = shownRef.current;
    if (effect && !prev) {
      shownRef.current = effect;
      setShown(effect);
      return;
    }
    // Reopened while it was still closing: slide back in, then show this effect.
    if (effect && prev && closingRef.current) {
      closingRef.current = false;
      tlRef.current?.kill();
      tlRef.current = gsap
        .timeline()
        .to(panelRef.current, { xPercent: 0, duration: PANEL_DURATION, ease: EASE })
        .to(overlayRef.current, { opacity: 1, duration: PANEL_DURATION, ease: EASE }, "<")
        .add(() => {
          if (effect === prev) gsap.to(contentRef.current, { opacity: 1, duration: CONTENT_DURATION, ease: EASE });
          else {
            shownRef.current = effect;
            setShown(effect);
          }
        });
      return;
    }
    if (effect && prev && effect !== prev) {
      tlRef.current?.kill();
      tlRef.current = gsap.to(contentRef.current, {
        opacity: 0,
        duration: CONTENT_DURATION,
        ease: EASE,
        onComplete: () => {
          shownRef.current = effect;
          setShown(effect);
        },
      });
      return;
    }
    if (!effect && prev) {
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
  }, [effect]);

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

  const categoryId = shown ? resolveEffectCategoryId(shown) : null;
  const categoryName = getEffectCategory(categoryId)?.name || categoryId;
  const videoUrl = useMemo(() => (shown ? resolveEffectVideoUrl(shown) : null), [shown]);
  const cover = useMemo(() => (shown ? resolveCover(shown) : null), [shown]);
  const related = useMemo(
    () =>
      shown
        ? effects.filter((item) => item.name !== shown.name && resolveEffectCategoryId(item) === categoryId).slice(0, 2)
        : [],
    [shown, effects, categoryId],
  );

  // Lock the page behind the drawer and close on Escape (released as soon as it starts closing).
  // The page scrollbar is hidden separately (data-v4-drawer-open, below) for as long as
  // the drawer is on screen. Scroll input outside the panel
  // is cancelled, so the page can't move; the panel scrolls natively and
  // overscroll-behavior: contain stops it chaining at its ends. lenis.stop() covers
  // pages that run Lenis.
  useEffect(() => {
    if (!open) return undefined;
    // Flag the page before stopping Lenis: lenis-stopped alone means overflow: clip on
    // <html>, which drops the scrollbar for a frame or two (a sideways jump) until the
    // render that sets this attribute catches up. The effect below removes it.
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

  // The page scrollbar stays hidden for as long as the drawer is on screen - including
  // its close animation - so it only reappears once the panel has fully slid away.
  const onScreen = !!shown;
  useEffect(() => {
    if (!onScreen) return undefined;
    const root = document.documentElement;
    root.setAttribute("data-v4-drawer-open", "");
    return () => root.removeAttribute("data-v4-drawer-open");
  }, [onScreen]);

  if (!shown || typeof document === "undefined") return null;
  const installable = canInstall(shown);
  const saved = isWishlisted(shown);

  return createPortal(
    // [--scrollbar-thumb:initial] brings the panel's own scrollbar back: <html> hides the
    // page thumb through the same (inherited) variable while the drawer is open.
    <div role="dialog" aria-modal="true" aria-labelledby="v4-drawer-title" className="fixed inset-0 z-990 [--scrollbar-thumb:initial]">
      <div ref={overlayRef} aria-hidden="true" onClick={onClose} className="absolute inset-0 bg-[rgba(8,8,8,.35)] backdrop-blur-[2px]" />
      <div
        ref={panelRef}
        data-lenis-prevent
        className="absolute inset-y-0 right-0 w-[min(760px,100vw)] overflow-y-auto overscroll-contain border-l border-white/10 bg-[#0e0e0e] font-neue-haas text-white shadow-[-16px_0_40px_-24px_rgba(0,0,0,.6)] max-[1025px]:w-full max-[1025px]:border-l-0"
      >
      <div ref={contentRef} className="flex flex-col gap-10 px-10 pt-7 pb-16 max-[1025px]:px-8 max-md:px-5 *:shrink-0">
        <div className="flex items-center justify-between">
          <span className={`${T16} text-white/80`}>{categoryName}</span>
          {/* Same close control as the site's modals: the cross turns a quarter on hover. */}
          <button
            ref={closeRef}
            type="button"
            aria-label="Close preview (Esc)"
            onClick={onClose}
            className="group grid size-10 cursor-pointer place-items-center border border-white/20 bg-white/10 transition-colors duration-500 hover:border-[#ff5f00] hover:bg-[#ff5f00]"
          >
            <span className="relative grid size-4 place-items-center transition-transform duration-500 ease-in-out group-hover:rotate-90">
              <span className="h-px w-4 rotate-45 bg-white" />
              <span className="absolute h-px w-4 -rotate-45 bg-white" />
            </span>
          </button>
        </div>

        <div className="relative aspect-[16/8.6] overflow-hidden border border-white/10 bg-[#0d0d0d]">
          {cover && <Image src={cover} alt="" fill sizes="(max-width: 1025px) 100vw, 760px" className="object-cover" />}
          {videoUrl && (
            <video
              key={videoUrl}
              src={videoUrl}
              autoPlay
              muted
              loop
              playsInline
              onPlaying={() => setPlayingVideo(videoUrl)}
              className={`absolute inset-0 size-full object-cover transition-opacity duration-500 ${playingVideo === videoUrl ? "opacity-100" : "opacity-0"}`}
            />
          )}
        </div>

        {/* Actions sit right under the preview. */}
       
        <div className="grid gap-6">
         
          {/* Tier sits beside the name at its usual small size. */}
          <div className="flex flex-wrap items-center gap-3">
            <h2 id="v4-drawer-title" className={`${DISPLAY} text-[3vw] leading-[1]! tracking-[-.04em] max-[1025px]:text-[6vw] max-md:text-[9vw]`}>
              {shown.title}
            </h2>
            <div className="mt-1.5">
            <TierBadge tier={shown.tier} />
            </div>
          </div>
          {shown.description && (
            <p className={`max-w-[42vw] ${T16} leading-relaxed text-white/80 max-[1025px]:max-w-none`}>{shown.description}</p>
          )}
          <div className="flex w-full justify-between">
          {shown.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {shown.tags.map((tag) => (
                <span key={tag} className={`${MONO} inline-flex h-6 items-center border border-white/15 px-2 ${T11} text-white/70`}>
                  {tag}
                </span>
              ))}
            </div>
          )}
           <div className=" flex justify-end">
          <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            aria-pressed={saved}
            onClick={() => onToggleWishlist(shown)}
            className={` flex gap-2 border px-3 border-white/60 py-3 leading-[1.2] text-[1.1vw] self-center ${saved ? "text-[#ff5f00]! [&_svg]:fill-[#ff5f00] [&_svg]:stroke-[#ff5f00]" : ""}`}
          >
            <div className="size-4.5">
            <Heart className="size-full" />
            </div>
          </button>
          <ButtonV3 text="Demo" href={getEffectPreviewHref(shown)} variant="outline" target_blank className="bg-transparent!" />
          <ButtonV3 text="View Article" href={getEffectHref(shown)} className="border border-primary" />
          {/* Same dark action button as the card's Save. */}

          </div>
        </div>


          </div>
        </div>

        {installable ? (
          <div className="flex items-center gap-3 border border-white/10 bg-white/3 py-3 pr-2 pl-4">
            <code className={`${MONO} min-w-0 flex-1 overflow-x-auto whitespace-nowrap ${T14} text-white/85`}>
              <span className="text-[#ff5f00]">$</span> {installCommand(shown)}
            </code>
            <button
              type="button"
              onClick={() => {
                onCopyInstall(shown);
                setCopied(true);
                clearTimeout(copiedTimerRef.current);
                copiedTimerRef.current = setTimeout(() => setCopied(false), 1600);
              }}
              className={`inline-flex shrink-0 cursor-pointer items-center gap-1.5 px-2 ${T14} transition-colors duration-300 ${copied ? "text-[#ff5f00]" : "text-white/70 hover:text-[#ff5f00]"}`}
            >
              {copied ? <Check className="size-3.5" aria-hidden="true" /> : <Copy className="size-3.5" aria-hidden="true" />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-4 border border-[#ff5f00]/35 bg-[#ff5f00]/[.06] px-4.5 py-4">
            <p className={`flex items-center gap-2 ${T14} text-white/70`}>
              <Lock className="size-3.75 shrink-0 text-[#ff5f00]" aria-hidden="true" />
              This is a Pro effect. Pro unlocks it with the rest of the library.
            </p>
            <ButtonV3 text="Unlock with Pro" href="/pricing" />
          </div>
        )}

        {related.length > 0 && (
          <div className="border-t border-white/10 pt-6">
            <p className={`mb-4 ${T16} text-white`}>More in this category</p>
            <div className="grid grid-cols-2 gap-3.5 max-md:grid-cols-1">
              {related.map((item) => (
                <EffectCardV4 key={item.name} effect={item} small dark sizes="240px" onOpen={onOpen} tagClassName="border-white/20" />
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
