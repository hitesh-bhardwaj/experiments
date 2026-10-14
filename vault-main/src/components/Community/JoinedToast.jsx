"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { prefersReducedMotion } from "@/lib/motion";
import { dismissCelebration, useCommunity } from "./community-store";

const SHOW_DELAY = 0.5;
const AUTO_HIDE_MS = 11000;
const COPIED_MS = 2600;

// "Welcome to the crowd" card, shown after a fresh sign-up
export default function JoinedToast() {
  const ref = useRef(null);
  const { celebrateAt, stack } = useCommunity();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!celebrateAt || !el) return undefined;
    const tween = prefersReducedMotion()
      ? null
      : gsap.fromTo(el, { opacity: 0, y: 30, filter: "blur(8px)" }, { opacity: 1, y: 0, filter: "blur(0px)", duration: 1.6, delay: SHOW_DELAY, ease: "expo.out" });
    const timer = setTimeout(dismissCelebration, AUTO_HIDE_MS);
    const onKey = (e) => { if (e.key === "Escape") dismissCelebration(); };
    document.addEventListener("keydown", onKey);
    return () => {
      tween?.kill();
      clearTimeout(timer);
      document.removeEventListener("keydown", onKey);
    };
  }, [celebrateAt]);

  useEffect(() => {
    if (!copied) return undefined;
    const timer = setTimeout(() => setCopied(false), COPIED_MS);
    return () => clearTimeout(timer);
  }, [copied]);

  if (!celebrateAt) return null;

  const matched = stack.length ? ` We’ll match you with the ${stack.slice(0, 3).join(", ")} crowd.` : "";

  const share = async () => {
    const text = `I just joined the Vault Community waitlist: a home for devs who obsess over motion. Come with? ${location.origin}/community`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch { /* clipboard blocked: nothing to confirm */ }
  };

  return (
    <div
      ref={ref}
      role="status"
      aria-live="polite"
      className="fixed bottom-[calc(var(--cvw)*5+env(safe-area-inset-bottom,0px))] left-1/2 z-80 flex w-[calc(var(--cvw)*30)] max-lg:w-[50vw] -translate-x-1/2 flex-col gap-[calc(var(--cvw)*0.7)] bg-background/80 px-[calc(var(--cvw)*1.7)] py-[calc(var(--cvw)*1.5)] text-left ring-1 ring-inset ring-success/30 shadow-2xl backdrop-blur-lg backdrop-saturate-150 max-md:bottom-[calc(18vw+env(safe-area-inset-bottom,0px))] max-md:w-[88vw] max-md:gap-[2.5vw] max-md:px-[6vw] max-md:py-[5.6vw]"
    >
      <span className="type-label inline-flex items-center gap-[calc(var(--cvw)*0.7)] text-primary-hover before:size-[calc(var(--cvw)*0.35)] before:bg-primary before:content-[''] max-md:gap-[2.5vw] max-md:before:size-[1.3vw]">You’re on the list</span>
      <strong className="type-h2 font-medium!">Welcome to the crowd.</strong>
      <p className="type-small text-foreground/80">That bright dot joining the swarm? That’s you.{matched} We’ll email you when your invite is ready.</p>
      <div className="flex items-center justify-between gap-[calc(var(--cvw)*0.8)] max-md:gap-[3vw]">
        <button
          type="button"
          onClick={share}
          className="type-label h-10 bg-foreground/5 px-4 ring-1 ring-inset ring-foreground/15 transition-shadow duration-600 ease-[cubic-bezier(.16,1,.3,1)] hover:ring-primary/60"
        >
          {copied ? "Invite copied ✓" : "Invite a friend"}
        </button>
        <button
          type="button"
          onClick={dismissCelebration}
          className="type-label group relative inline-flex h-11 items-center opacity-80 transition-opacity duration-600 ease-[cubic-bezier(.16,1,.3,1)] hover:opacity-100"
        >
          {/* Hairline that fills with the brand colour on hover */}
          <span className="relative pb-[calc(var(--cvw)*0.2)] max-md:pb-[0.8vw]">
            Close
            <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-px bg-foreground/20" />
            <span aria-hidden="true" className="absolute bottom-0 left-0 h-px w-0 bg-primary transition-[width] duration-800 ease-[cubic-bezier(.16,1,.3,1)] group-hover:w-full" />
          </span>
        </button>
      </div>
    </div>
  );
}
