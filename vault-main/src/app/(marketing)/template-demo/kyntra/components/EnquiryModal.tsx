// Built using Hyperiux Vault: https://vault.hyperiux.com

"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { useLenis } from "lenis/react";
import { X } from "lucide-react";
import AnimatedForm from "./effects/animated-form";
import { prefersReducedMotion } from "./Animations/reducedMotion";

gsap.registerPlugin(useGSAP);

const OPEN_DURATION = 0.7;
const CLOSE_DURATION = 0.5;
const OPEN_EASE = "power3.out";
const CLOSE_EASE = "power2.in";
// Reduced motion still shows the change, just as a short fade
const REDUCED_MOTION_FADE = 0.2;

const OVERLAY_OPACITY = 0.7;
const PANEL_CLOSED_SCALE = 0.8;

export interface EnquiryModalProps {
  /** Stays mounted while animating out */
  open: boolean;
  onClose: () => void;
  ariaLabel?: string;
}

const EnquiryModal: React.FC<EnquiryModalProps> = ({
  open,
  onClose,
  ariaLabel = "Kyntra enquiry form",
}) => {
  const lenis = useLenis();

  const overlayRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const tweenRef = useRef<gsap.core.Timeline | null>(null);

  const [exiting, setExiting] = useState(false);
  // Derived during render: the node must stay mounted for the whole close
  // tween, and `open` flipping back on cancels a close already in flight.
  const [lastOpen, setLastOpen] = useState(open);
  if (open !== lastOpen) {
    setLastOpen(open);
    // Only a real open -> closed edge animates out
    setExiting(!open && lastOpen);
  }
  const mounted = open || exiting;

  useGSAP(
    () => {
      const overlay = overlayRef.current;
      const panel = panelRef.current;
      if (!overlay || !panel) return;

      // A new tween always replaces the one in flight
      tweenRef.current?.kill();

      const reduced = prefersReducedMotion();

      if (open) {
        const timeline = gsap.timeline();
        tweenRef.current = timeline;

        if (reduced) {
          gsap.set(panel, { scale: 1 });
          timeline
            .fromTo(
              overlay,
              { opacity: 0 },
              { opacity: OVERLAY_OPACITY, duration: REDUCED_MOTION_FADE, ease: "none" },
            )
            .fromTo(
              panel,
              { opacity: 0 },
              { opacity: 1, duration: REDUCED_MOTION_FADE, ease: "none" },
              0,
            );
          return;
        }

        timeline
          .fromTo(
            overlay,
            { opacity: 0 },
            { opacity: OVERLAY_OPACITY, duration: OPEN_DURATION, ease: OPEN_EASE },
          )
          .fromTo(
            panel,
            { opacity: 0, scale: PANEL_CLOSED_SCALE },
            { opacity: 1, scale: 1, duration: OPEN_DURATION, ease: OPEN_EASE },
            0,
          );

        return;
      }

      const duration = reduced ? REDUCED_MOTION_FADE : CLOSE_DURATION;
      const ease = reduced ? "none" : CLOSE_EASE;

      const timeline = gsap.timeline({ onComplete: () => setExiting(false) });
      tweenRef.current = timeline;

      timeline
        .to(overlay, { opacity: 0, duration, ease })
        .to(
          panel,
          {
            opacity: 0,
            scale: reduced ? 1 : PANEL_CLOSED_SCALE,
            duration,
            ease,
          },
          0,
        );
    },
    { dependencies: [open], revertOnUpdate: false },
  );

  // Lock scroll, listen for Escape
  useEffect(() => {
    if (!mounted) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    const previousBodyOverflow = document.body.style.overflow;

    lenis?.stop?.();
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      lenis?.start?.();
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [mounted, lenis, onClose]);

  useEffect(() => () => void tweenRef.current?.kill(), []);

  if (!mounted) return null;

  return createPortal(
    <div
      className="kyntra-page fixed inset-0 z-100 flex items-center justify-center max-[1025px]:py-[10vw]"
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={overlayRef}
        aria-hidden
        style={{ opacity: 0 }}
        className="pointer-events-none absolute inset-0 bg-black will-change-[opacity]"
      />

      <div
        ref={panelRef}
        style={{ opacity: 0, transform: `scale(${PANEL_CLOSED_SCALE})` }}
        className="relative mt-[5vw] pt-2 h-[75vh] w-[90vw] overflow-hidden rounded-[1.6vw] border border-[#88888880] px-[3vw] bg-[#0b1020]/10 backdrop-blur-2xl will-change-[transform,opacity] max-[1025px]:mt-[10vw] max-[1025px]:max-w-[90vw] max-[1025px]:rounded-[5vw] max-md:max-w-[92vw]"
      >
        <div
          data-lenis-prevent
          className="h-full w-full overflow-y-auto overflow-x-hidden p-[2vw] max-[1025px]:p-[7vw]"
        >
          <button
            type="button"
            aria-label="Close enquiry form"
            onClick={onClose}
            className="sticky left-full top-0 z-20 flex h-[3vw] w-[3vw] shrink-0 items-center justify-center rounded-full border border-white/30 bg-white/10 text-white backdrop-blur-md transition-all duration-300 hover:rotate-90  max-[1025px]:h-[10vw] max-[1025px]:w-[10vw]"
          >
            <X
              className="h-[1.3vw] w-[1.3vw] max-[1025px]:h-[4.5vw] max-[1025px]:w-[4.5vw]"
              strokeWidth={1.5}
            />
          </button>

          <div className="  max-[1025px]:mt-[-5vw]">
            <AnimatedForm />
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default EnquiryModal;
