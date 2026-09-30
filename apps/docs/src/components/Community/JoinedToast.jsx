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
    <div ref={ref} className="joined" role="status" aria-live="polite">
      <span className="label eyebrow joined-k">You’re on the list</span>
      <strong>Welcome to the crowd.</strong>
      <p>That bright dot joining the swarm? That’s you.{matched} We’ll email you when your invite is ready.</p>
      <div className="row">
        <button type="button" className="joined-share label" onClick={share}>{copied ? "Invite copied ✓" : "Invite a friend"}</button>
        <button type="button" className="cta3 label" onClick={dismissCelebration}><span className="t3">Close</span></button>
      </div>
    </div>
  );
}
