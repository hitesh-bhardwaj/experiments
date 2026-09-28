// Built using Hyperiux Vault: https://vault.hyperiux.com

"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useLenis } from "lenis/react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { X } from "lucide-react";
import dynamic from "next/dynamic";

// The provider wraps the whole page, so the form would otherwise sit in the
// critical bundle. The body only renders once the modal has been opened.
const AnimatedForm = dynamic(() => import("./effects/animated-form"));
import { prefersReducedMotion } from "./reducedMotion";

gsap.registerPlugin(useGSAP);

const OPEN_DURATION = 0.7;
const CLOSE_DURATION = 0.5;
const OPEN_EASE = "power3.out";
const CLOSE_EASE = "power2.in";
// Reduced motion still shows the change, just as a short fade
const REDUCED_MOTION_FADE = 0.2;

const OVERLAY_OPACITY = 0.7;
const PANEL_CLOSED_SCALE = 0.8;

// The enquiry modal is opened from several places that aren't in the same
// subtree (Header's "Enquire Now", Hero's "Speak With an Advisor" and
// "Explore Our Collection"), so the open/close state lives in a provider
// wrapped around the page instead of inside any one section.
type EnquiryContextValue = {
  openEnquiryModal: () => void;
  closeEnquiryModal: () => void;
};

const EnquiryContext = createContext<EnquiryContextValue | null>(null);

export function useEnquiryModal(): EnquiryContextValue {
  const context = useContext(EnquiryContext);
  if (!context) {
    throw new Error("useEnquiryModal must be used within <EnquiryModalProvider>");
  }
  return context;
}

export const EnquiryModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const lenis = useLenis();

  const overlayRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const tweenRef = useRef<gsap.core.Timeline | null>(null);

  const [enquiryOpen, setEnquiryOpen] = useState(false);
  // The node has to stay mounted for the whole close tween, so `exiting` is
  // tracked separately; reopening mid-close cancels the exit.
  const [exiting, setExiting] = useState(false);
  const [lastOpen, setLastOpen] = useState(enquiryOpen);
  if (enquiryOpen !== lastOpen) {
    setLastOpen(enquiryOpen);
    setExiting(!enquiryOpen && lastOpen);
  }
  const enquiryMounted = enquiryOpen || exiting;

  const openEnquiryModal = useCallback(() => setEnquiryOpen(true), []);
  const closeEnquiryModal = useCallback(() => setEnquiryOpen(false), []);

  useGSAP(
    () => {
      const overlay = overlayRef.current;
      const panel = panelRef.current;
      if (!overlay || !panel) return;

      // A new tween always replaces the one in flight
      tweenRef.current?.kill();

      const reduced = prefersReducedMotion();
      const duration = reduced
        ? REDUCED_MOTION_FADE
        : enquiryOpen
          ? OPEN_DURATION
          : CLOSE_DURATION;
      const ease = reduced ? "none" : enquiryOpen ? OPEN_EASE : CLOSE_EASE;

      if (enquiryOpen) {
        const timeline = gsap.timeline();
        tweenRef.current = timeline;

        timeline
          .fromTo(
            overlay,
            { opacity: 0 },
            { opacity: OVERLAY_OPACITY, duration, ease },
          )
          .fromTo(
            panel,
            { opacity: 0, scale: reduced ? 1 : PANEL_CLOSED_SCALE },
            { opacity: 1, scale: 1, duration, ease },
            0,
          );

        return;
      }

      const timeline = gsap.timeline({ onComplete: () => setExiting(false) });
      tweenRef.current = timeline;

      timeline
        .to(overlay, { opacity: 0, duration, ease })
        .to(
          panel,
          { opacity: 0, scale: reduced ? 1 : PANEL_CLOSED_SCALE, duration, ease },
          0,
        );
    },
    { dependencies: [enquiryOpen], revertOnUpdate: false },
  );

  useEffect(() => () => void tweenRef.current?.kill(), []);

  useEffect(() => {
    if (!enquiryMounted) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeEnquiryModal();
      }
    };

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    lenis?.stop?.();
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
      lenis?.start?.();
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [enquiryMounted, lenis, closeEnquiryModal]);

  const value = useMemo(
    () => ({ openEnquiryModal, closeEnquiryModal }),
    [openEnquiryModal, closeEnquiryModal]
  );

  return (
    <EnquiryContext.Provider value={value}>
      {children}
      {enquiryMounted && (
        <div
          className="fixed inset-0 z-100 flex items-center justify-center px-[5%] py-[5vw] max-[1025px]:items-start max-[1025px]:overflow-y-auto max-[1025px]:py-[10vw]"
          role="dialog"
          aria-modal="true"
          aria-label="Lumera enquiry form"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeEnquiryModal();
            }
          }}
        >
          <div
            ref={overlayRef}
            aria-hidden
            style={{ opacity: 0 }}
            className="pointer-events-none absolute inset-0 bg-black backdrop-blur-sm will-change-[opacity]"
          />

          <div
            ref={panelRef}
            style={{ opacity: 0, transform: `scale(${PANEL_CLOSED_SCALE})` }}
            className="relative h-[85vh] max-md:h-[80vh] w-full max-w-[42vw] overflow-y-auto rounded-[1.4vw] bg-[white] p-[2vw] shadow-2xl will-change-[transform,opacity] max-[1025px]:max-w-[86vw] max-[1025px]:rounded-[4vw] max-[1025px]:p-[5vw] max-md:max-w-[92vw] max-md:p-[6vw]"
          >
            <button
              type="button"
              aria-label="Close enquiry form"
              onClick={closeEnquiryModal}
              className="sticky left-full top-0 z-10 flex h-[2.8vw] w-[2.8vw] items-center justify-center rounded-full bg-[#1c1b1a] text-white transition-transform duration-300 hover:rotate-180 max-[1025px]:h-[9vw] max-[1025px]:w-[9vw]"
            >
              <X className="h-[1.2vw] w-[1.2vw] max-[1025px]:h-[4vw] max-[1025px]:w-[4vw]" strokeWidth={1.8} />
            </button>
            <AnimatedForm />
          </div>
        </div>
      )}
    </EnquiryContext.Provider>
  );
};

export default EnquiryModalProvider;
