"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import gsap from "gsap";
import { prefersReducedMotion } from "@/lib/motion";
import { useLenis } from "lenis/react";
import { usePathname } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Heart, Lock } from "lucide-react";
import { CopyButtonContent } from "@/components/ui/CodeBlock";
import { SignInRequiredModal } from "@/components/ui/SignInRequiredModal";
import Button from "@/homepage/components/Button";
import { getEffectHref, getEffectPreviewHref, getEffectCategory, resolveEffectCategoryId } from "@/lib/categories";
import { resolveEffectVideoUrl } from "@/lib/media";
import {
  EffectCard,
  MONO,
  TierBadge,
  installCommand,
  resolveCover,
} from "./EffectCard";
import { T11, T14, T16, T18 } from "../templates/tokens";

// Off-screen panel: slid out to the right, or (reduced motion) faded out in place.
const panelHidden = () => (prefersReducedMotion() ? { xPercent: 0, opacity: 0 } : { xPercent: 100, opacity: 1 });

// Phones: a Button that shares the drawer's action row - grows to fill it, text from the
// left, no arrow (it would crowd the label at that width).
const MOBILE_ROW_BTN = "max-md:w-auto! max-md:flex-1 max-md:justify-start! max-md:px-3! max-md:[--btn-arrow:0px]!";
// Phones: a Button sized to its label (Demo), so the longer View button gets the rest of
// the row instead of an equal, too-narrow share.
const MOBILE_FIT_BTN = "max-md:w-fit! max-md:shrink-0 max-md:justify-start! max-md:px-3! max-md:[--btn-arrow:0px]!";
// Phones: the orange View button turns outline (like Demo) - orange is kept for the
// pinned bar's action (copy / Buy).
const MOBILE_OUTLINE = "max-md:border-foreground/20! max-md:bg-transparent! max-md:text-foreground!";

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
export function PreviewDrawer({
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
  const pathname = usePathname();
  // The install command is for signed-in visitors; Sign In opens the sign-in modal over the drawer.
  const { isSignedIn } = useUser();
  const [signInOpen, setSignInOpen] = useState(false);
  const signInOpenRef = useRef(false);
  useEffect(() => {
    signInOpenRef.current = signInOpen;
  });

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
        .to(panelRef.current, { xPercent: 0, opacity: 1, duration: PANEL_DURATION, ease: EASE })
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
        .to(panelRef.current, { ...panelHidden(), duration: PANEL_DURATION, ease: EASE })
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
      gsap.set(panelRef.current, panelHidden());
      gsap.set(overlayRef.current, { opacity: 0 });
      gsap.set(contentRef.current, { opacity: 0 });
      tlRef.current = gsap
        .timeline()
        .to(panelRef.current, { xPercent: 0, opacity: 1, duration: PANEL_DURATION, ease: EASE })
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
      // The sign-in modal on top owns the keyboard (Escape closes it, Space types in it)
      if (signInOpenRef.current) return;
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
    <div role="dialog" aria-modal="true" aria-labelledby="v4-drawer-title" data-sound-flow="off" className="fixed inset-0 z-990 [--scrollbar-thumb:initial]">
      <div ref={overlayRef} aria-hidden="true" onClick={onClose} className="absolute inset-0 bg-black/30 backdrop-blur-lg" />
      {/* data-lenis-prevent: the drawer is a modal, so the wheel stays inside it */}
      <div
        ref={panelRef}
        data-lenis-prevent
        className="absolute inset-y-0 right-0 w-[calc(var(--cvw)*53)] overflow-y-auto overscroll-contain border-l border-foreground/10 bg-background font-avenir text-foreground shadow-float max-lg:w-full max-lg:border-l-0"
      >
      <div ref={contentRef} className="flex flex-col gap-10 px-10 pt-7 pb-16 max-lg:px-8 max-lg:gap-8 max-md:px-[6vw] max-md:pb-0 *:shrink-0">
        <div className="flex items-center justify-between">
          <span className={`${T16} text-foreground/80`}>{categoryName}</span>
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

        <div className="relative aspect-[16/8.6] overflow-hidden border border-foreground/10 bg-background">
          {cover && <Image src={cover} alt="cover image" fill sizes="(max-width: 1025px) 100vw, 53vw" className="object-cover" />}
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

        {/* Tags sit right under the preview, above the name. */}
        {shown.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {shown.tags.map((tag) => (
              <span key={tag} className={`${MONO} inline-flex h-6 items-center border border-foreground/15 px-2 ${T11} text-foreground/70`}>
                {tag}
              </span>
            ))}
          </div>
        )}
        <div className="flex flex-col gap-6">
          {/* Tier sits beside the name at its usual small size. */}
          <div className="flex flex-wrap items-center gap-3">
            <h2 id="v4-drawer-title" className="type-h2">
              {shown.title}
            </h2>
            <TierBadge tier={shown.tier} />
          </div>

          {shown.description && (
            <p className={`w-[80%] ${T16} leading-relaxed text-foreground/80 max-lg:w-full`}>{shown.description}</p>
          )}
          <div className="flex w-full flex-wrap gap-4">
            {/* items-stretch: the heart takes the buttons' height. Phones: View Article, Demo,
                then a square heart, filling the row (MOBILE_ROW_BTN). */}
            <div className="flex flex-wrap items-stretch gap-2 max-md:w-full max-md:flex-nowrap">
              <button
                type="button"
                aria-pressed={saved}
                onClick={() => onToggleWishlist(shown)}
                aria-label={saved ? `Remove ${shown.title} from saved` : `Save ${shown.title}`}
                className={`flex items-center justify-center gap-2 border border-foreground/20 px-3 ${T16} max-md:order-3 max-md:w-12 max-md:shrink-0 max-md:px-0 ${saved ? "text-primary! [&_svg]:fill-primary [&_svg]:stroke-primary" : ""}`}
              >
                <div className="size-4.5">
                  <Heart className="size-full" />
                </div>
              </button>
              <Button text="Demo" href={getEffectPreviewHref(shown)} variant="outline" target_blank className={`bg-transparent! border-foreground/20 max-md:order-2 ${MOBILE_FIT_BTN}`} />
              <Button text="View Article" href={getEffectHref(shown)} className={`border border-primary max-md:order-1 ${MOBILE_ROW_BTN} ${MOBILE_OUTLINE}`} />
            </div>
          </div>
        </div>

        {/* Install command or lock. Phones: pinned to the bottom of the drawer (moved to
            the end, sticky), with a label when the command is available. */}
        <div className="flex flex-col gap-2.5 max-md:sticky max-md:bottom-0 max-md:z-2 max-md:order-last max-md:-mx-[6vw] max-md:border-t max-md:border-foreground/10 max-md:bg-background max-md:px-[6vw] max-md:pt-4 max-md:pb-[calc(1.75rem+env(safe-area-inset-bottom))]">
        {isSignedIn && installable && <p className={`hidden ${T14} text-foreground/50 max-md:block`}>Install with the Hyperiux CLI</p>}
        {!isSignedIn ? (
          <LockRow
            text="Sign in to see the install command."
            action={<Button text="Sign In" preventDefault onClick={() => setSignInOpen(true)} className="shrink-0" />}
          />
        ) : installable ? (
          <div className="flex items-center gap-3 border border-foreground/10 bg-foreground/3 py-3 pr-2 pl-4 max-md:items-stretch max-md:gap-2 max-md:border-0 max-md:bg-transparent max-md:p-0">
            {/* Phones: its own bordered box beside an orange square copy button. */}
            {/* select-none: copying goes through Copy, which counts the install */}
            <code className={`${MONO} min-w-0 flex-1 select-none overflow-x-auto whitespace-nowrap ${T14} text-foreground/80 max-md:flex max-md:items-center max-md:border max-md:border-foreground/10 max-md:bg-foreground/3 max-md:px-3 max-md:py-3`}>
              <span className="text-primary">$</span> {installCommand(shown)}
            </code>
            <button
              type="button"
              onClick={async () => {
                // Counts as an install (daily limit); "Copied" only once it went through
                if (!(await onCopyInstall(shown))) return;
                setCopied(true);
                clearTimeout(copiedTimerRef.current);
                copiedTimerRef.current = setTimeout(() => setCopied(false), 1600);
              }}
              aria-label={copied ? "Install Command Copied" : "Copy Install Command"}
              className={`inline-flex shrink-0 cursor-pointer items-center gap-1.5 px-2 ${T14} transition-colors duration-300 max-md:w-12 max-md:justify-center max-md:bg-primary max-md:px-0 max-md:text-background! ${copied ? "text-primary" : "text-foreground/70 hover:text-primary"}`}
            >
              {/* Tablet / phones: icon only (it flips to a tick once copied). */}
              <CopyButtonContent copied={copied} labelClassName="max-lg:hidden" />
            </button>
          </div>
        ) : (
          <LockRow
            text="This is a Pro effect. Pro unlocks it with the rest of the library."
            action={<Button text="Unlock with Pro" href="/pricing#plans" className="shrink-0" />}
          />
        )}
        </div>

        {related.length > 0 && (
          <div className="flex flex-col gap-8 border-t border-foreground/10 pt-10 ">
            <p className={`${T18} text-foreground`}>More in this category</p>
            {/* Two per row: the card widths are net of the same gap at each size (tablet: 2vw) */}
            <div className="flex flex-wrap gap-[calc(var(--cvw)*0.9)] max-lg:gap-x-[2vw] max-lg:gap-y-8">
              {related.map((item) => (
                <EffectCard key={item.name} effect={item} small dark sizes="240px" onOpen={onOpen} className="w-[calc((100%-var(--cvw)*0.9)/2)] max-lg:w-[calc((100%-2vw)/2)] max-md:w-full" tagClassName="border-foreground/20" />
              ))}
            </div>
          </div>
        )}
      </div>
      </div>
      <SignInRequiredModal open={signInOpen} onClose={() => setSignInOpen(false)} redirect={pathname} action="install effects with the CLI" />
    </div>,
    document.body,
  );
}

/**
 * A locked install command (signed out, or a Pro effect without Pro): the message in a
 * see-through blurred box with the action Button beside it. The Button is the standard
 * size and the box stretches to exactly its height; on phones the Button drops below.
 */
function LockRow({ text, action }) {
  return (
    <div className="flex w-full items-stretch gap-2 max-md:flex-col">
      <p className={`flex min-w-0 flex-1 items-center gap-2 border border-white/20 px-4.5 ${T14} text-foreground/70 backdrop-blur-lg max-md:py-3`}>
        <Lock className="size-3.75 shrink-0 text-primary" aria-hidden="true" />
        {text}
      </p>
      {action}
    </div>
  );
}
