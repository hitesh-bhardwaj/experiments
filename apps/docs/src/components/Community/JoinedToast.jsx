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
      className="fixed bottom-[calc(72px+env(safe-area-inset-bottom,0px))] left-1/2 z-80 grid w-[min(440px,calc(100vw-2rem))] -translate-x-1/2 gap-2.5 bg-[rgba(22,22,22,.78)] px-6 py-[22px] text-left shadow-[inset_0_1px_0_rgba(255,255,255,.12),inset_0_0_0_1px_rgba(99,214,154,.35),0_30px_80px_-20px_rgba(255,107,0,.45)] backdrop-blur-[22px] backdrop-saturate-[160%]"
    >
      <span className={`font-avenir text-[11px] font-medium tracking-[.14em] uppercase inline-flex items-center gap-2.5 text-[#9C9C9C] before:size-[5px] before:rounded-full before:bg-primary before:content-[''] text-[#FFB27A]!`}>You’re on the list</span>
      <strong className="font-aeonik text-[26px] font-medium tracking-[-.03em]">Welcome to the crowd.</strong>
      <p className="text-sm text-[#b8b8b8]">That bright dot joining the swarm? That’s you.{matched} We’ll email you when your invite is ready.</p>
      <div className="mt-1.5 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={share}
          className={`font-avenir text-[11px] font-medium tracking-[.14em] uppercase h-10 bg-[rgba(244,244,244,.05)] px-4 shadow-[inset_0_0_0_1px_rgba(244,244,244,.14)] transition-shadow duration-600 ease-[cubic-bezier(.16,1,.3,1)] hover:shadow-[inset_0_0_0_1px_rgba(255,107,0,.6)]`}
        >
          {copied ? "Invite copied ✓" : "Invite a friend"}
        </button>
        <button type="button" className={`group relative inline-flex h-11 items-center opacity-85 transition-opacity duration-600 ease-[cubic-bezier(.16,1,.3,1)] hover:opacity-100 font-avenir text-[11px] font-medium tracking-[.14em] uppercase`} onClick={dismissCelebration}><span className="pb-[3px] bg-[linear-gradient(var(--primary),var(--primary)),linear-gradient(rgba(244,244,244,.25),rgba(244,244,244,.25))] bg-no-repeat bg-[position:0_100%,0_100%] bg-[size:0%_1px,100%_1px] transition-[background-size] duration-800 ease-[cubic-bezier(.16,1,.3,1)] group-hover:bg-[size:100%_1px,100%_1px]">Close</span></button>
      </div>
    </div>
  );
}
