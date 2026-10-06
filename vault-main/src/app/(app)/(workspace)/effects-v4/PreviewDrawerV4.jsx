"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import Link from "next/link";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { useLenis } from "lenis/react";
import { Heart, Lock, X } from "lucide-react";
import ButtonV3 from "@/homepage-v3/components/ButtonV3";
import { getEffectHref, getEffectPreviewHref, getEffectCategory, resolveEffectCategoryId } from "@/lib/categories";
import { resolveEffectVideoUrl } from "@/lib/media";
import {
  DISPLAY,
  EffectCardV4,
  LABEL,
  MONO,
  NewBadge,
  TierBadge,
  installCommand,
  isNewEffect,
  resolveCover,
} from "./EffectCardV4";

gsap.registerPlugin(useGSAP);

const GHOST =
  "inline-flex h-11 cursor-pointer items-center justify-center gap-2.5 px-5 text-[#F4F4F4] bg-[rgba(244,244,244,.05)] shadow-[inset_0_0_0_1px_rgba(244,244,244,.14)] transition-[background-color,box-shadow] duration-500 hover:bg-[rgba(244,244,244,.1)] hover:shadow-[inset_0_0_0_1px_#ff5f00]";

/**
 * Quick-look panel for one effect: live preview, install command (or the Pro
 * lock), links out to the effect page and live demo, and more from the same
 * category. Portalled to <body> so no transformed ancestor can trap it.
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
  const closeRef = useRef(null);
  const lenis = useLenis();
  const open = !!effect;
  // The cover shows until the video actually plays (a loading video paints black).
  const [playingVideo, setPlayingVideo] = useState(null);

  const categoryId = effect ? resolveEffectCategoryId(effect) : null;
  const categoryName = getEffectCategory(categoryId)?.name || categoryId;
  const videoUrl = useMemo(() => (effect ? resolveEffectVideoUrl(effect) : null), [effect]);
  const cover = useMemo(() => (effect ? resolveCover(effect) : null), [effect]);
  const related = useMemo(
    () =>
      effect
        ? effects.filter((item) => item.name !== effect.name && resolveEffectCategoryId(item) === categoryId).slice(0, 3)
        : [],
    [effect, effects, categoryId],
  );

  // Lock the page behind the drawer and close on Escape.
  useEffect(() => {
    if (!open) return undefined;
    lenis?.stop();
    document.documentElement.style.overflow = "hidden";
    const onKey = (event) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const focus = setTimeout(() => closeRef.current?.focus(), 60);
    return () => {
      lenis?.start();
      document.documentElement.style.overflow = "";
      document.removeEventListener("keydown", onKey);
      clearTimeout(focus);
    };
  }, [open, lenis, onClose]);

  // Slide in on open and whenever another effect is opened from "related".
  useGSAP(
    () => {
      if (!open) return;
      gsap.fromTo(overlayRef.current, { backgroundColor: "rgba(8,8,8,0)" }, { backgroundColor: "rgba(8,8,8,.55)", duration: 0.6 });
      gsap.fromTo(panelRef.current, { xPercent: 12, autoAlpha: 0 }, { xPercent: 0, autoAlpha: 1, duration: 0.9, ease: "expo.out" });
      panelRef.current.scrollTop = 0;
    },
    { dependencies: [effect?.name] },
  );

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="v4-drawer-title"
      onClick={(event) => event.target === event.currentTarget && onClose()}
      className="fixed inset-0 z-990 grid grid-cols-[1fr_minmax(0,760px)] backdrop-blur-sm max-[1025px]:grid-cols-[minmax(0,1fr)]"
    >
      <div
        ref={panelRef}
        data-lenis-prevent
        className="col-start-2 flex h-full flex-col gap-5.5 overflow-y-auto overscroll-contain bg-[#121212] px-10 pt-7 pb-10 text-[#F4F4F4] shadow-[-30px_0_80px_-20px_#000] max-[1025px]:col-start-1 max-[1025px]:px-8 max-md:px-5 *:shrink-0"
      >
        <div className="flex items-center justify-between">
          <span className={`${LABEL} text-[#8a8a8a]`}>{categoryName}</span>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className={`${LABEL} inline-flex h-9 cursor-pointer items-center gap-2 px-3 text-[#bdbdbd] shadow-[inset_0_0_0_1px_rgba(244,244,244,.14)] transition-colors duration-500 hover:bg-[rgba(244,244,244,.08)] hover:text-white`}
          >
            <X className="size-3.5" aria-hidden="true" />
            Close · Esc
          </button>
        </div>

        <div className="relative aspect-16/10 overflow-hidden bg-[#0d0d0d] shadow-[inset_0_0_0_1px_rgba(244,244,244,.08)]">
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

        <div className="flex flex-wrap gap-1.5">
          <TierBadge tier={effect.tier} />
          {isNewEffect(effect) && <NewBadge />}
        </div>

        <h2 id="v4-drawer-title" className={`${DISPLAY} text-[3vw] leading-none tracking-[-.04em] max-[1025px]:text-[6vw] max-md:text-[9vw]`}>
          {effect.title}
        </h2>
        {effect.description && <p className="max-w-[56ch] text-[#b5b5b5]">{effect.description}</p>}

        {effect.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {effect.tags.map((tag) => (
              <span key={tag} className={`${MONO} inline-flex h-5.5 items-center px-1.75 text-[11px] text-[#bdbdbd] shadow-[inset_0_0_0_1px_rgba(244,244,244,.14)]`}>
                {tag}
              </span>
            ))}
          </div>
        )}

        {canInstall ? (
          <div className={`${MONO} flex items-center gap-2.5 bg-[#0b0b0b] py-2 pr-2 pl-4 text-sm text-[#d8d8d8] shadow-[inset_0_0_0_1px_rgba(244,244,244,.1)]`}>
            <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap">
              <span className="text-[#ff5f00]">$</span> {installCommand(effect)}
            </code>
            <button
              type="button"
              onClick={() => onCopyInstall(effect)}
              className={`${LABEL} h-9 shrink-0 cursor-pointer bg-[#ff5f00] px-4 text-[#141414] transition-colors duration-300 hover:bg-[#ff7a26]`}
            >
              Copy
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-4 bg-[rgba(255,95,0,.08)] px-4.5 py-4 shadow-[inset_0_0_0_1px_rgba(255,95,0,.35)]">
            <p className="flex items-center gap-2 text-sm text-[#e0c2ab]">
              <Lock className="size-3.75 text-[#ff5f00]" aria-hidden="true" />
              This is a Pro effect. Pro unlocks it with the rest of the library.
            </p>
            <ButtonV3 text="Unlock with Pro" href="/pricing" className="text-sm!" />
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <ButtonV3 text="Open effect page" href={getEffectHref(effect)} className="text-sm!" />
          <Link href={getEffectPreviewHref(effect)} target="_blank" rel="noopener noreferrer" className={`${GHOST} ${LABEL}`}>
            Live demo
          </Link>
          <button type="button" aria-pressed={isWishlisted} onClick={() => onToggleWishlist(effect)} className={`${GHOST} ${LABEL}`}>
            <Heart className={`size-3.5 ${isWishlisted ? "fill-[#ff5f00] text-[#ff5f00]" : ""}`} aria-hidden="true" />
            {isWishlisted ? "Saved" : "Save to favourites"}
          </button>
        </div>

        {related.length > 0 && (
          <div className="pt-4">
            <h4 className={`${LABEL} mb-3 text-[#8a8a8a]`}>More in this category</h4>
            <div className="grid grid-cols-3 gap-3.5 max-md:grid-cols-1">
              {related.map((item) => (
                <EffectCardV4 key={item.name} effect={item} small dark compact sizes="240px" onOpen={onOpen} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
