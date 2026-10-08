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
      className="fixed bottom-[calc(5vw+env(safe-area-inset-bottom,0vw))] left-1/2 z-80 flex w-[30vw] -translate-x-1/2 flex-col gap-[0.7vw] bg-background/80 px-[1.7vw] py-[1.5vw] text-left ring-1 ring-inset ring-[rgba(99,214,154,.35)] shadow-[0_2vw_5.5vw_-1.4vw_color-mix(in_srgb,var(--primary)_45%,transparent)] backdrop-blur-lg backdrop-saturate-150 max-md:bottom-[calc(18vw+env(safe-area-inset-bottom,0vw))] max-md:w-[88vw] max-md:gap-[2.5vw] max-md:px-[6vw] max-md:py-[5.6vw]"
    >
      <span className="type-label inline-flex items-center gap-[0.7vw] text-[#FFB27A] before:size-[0.35vw] before:bg-primary before:content-[''] max-md:gap-[2.5vw] max-md:before:size-[1.3vw]">You’re on the list</span>
      <strong className="type-h2 font-medium!">Welcome to the crowd.</strong>
      <p className="type-small text-foreground/70">That bright dot joining the swarm? That’s you.{matched} We’ll email you when your invite is ready.</p>
      <div className="flex items-center justify-between gap-[0.8vw] max-md:gap-[3vw]">
        <button
          type="button"
          onClick={share}
          className="type-label h-10 bg-foreground/5 px-4 ring-1 ring-inset ring-foreground/15 transition-shadow duration-600 ease-[cubic-bezier(.16,1,.3,1)] hover:ring-primary/60"
        >
          {copied ? "Invite copied ✓" : "Invite a friend"}
        </button>
        <button type="button" className="type-label group relative inline-flex h-11 items-center opacity-80 transition-opacity duration-600 ease-[cubic-bezier(.16,1,.3,1)] hover:opacity-100" onClick={dismissCelebration}><span className="pb-[0.2vw] bg-[linear-gradient(var(--primary),var(--primary)),linear-gradient(color-mix(in_srgb,var(--foreground)_25%,transparent),color-mix(in_srgb,var(--foreground)_25%,transparent))] bg-no-repeat bg-[position:0_100%,0_100%] bg-[size:0%_1px,100%_1px] transition-[background-size] duration-800 ease-[cubic-bezier(.16,1,.3,1)] group-hover:bg-[size:100%_1px,100%_1px] max-md:pb-[0.8vw]">Close</span></button>
      </div>
    </div>
  );
}
