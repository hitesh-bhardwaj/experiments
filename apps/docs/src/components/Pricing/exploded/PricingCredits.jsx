"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import LineReveal from "@/components/Animations/LineReveal";
import { useFadeUp } from "@/components/Animations/gsapAnimations";
import { prefersReducedMotion } from "@/lib/motion";
import { useInteraction } from "@/homepage-v3/components/InteractionProvider";
import { useBilling } from "./billing";
import { CREDITS, DEMO_TEMPLATES } from "./plans";
import { BillingToggle } from "./shared";

const FLY_DURATION = 0.9;
const FLY_FADE_DELAY = 0.75;

// Demo wallet: spend template credits on example templates and watch each
// coin fly into the card it unlocks. The wallet size follows the page's
// Monthly/Yearly toggle, and changing it refills the wallet.
export default function PricingCredits() {
  const rootRef = useRef(null);
  const coinRefs = useRef([]);
  const artRefs = useRef([]);
  const fliesRef = useRef(new Set());
  const yearly = useBilling();
  const { sound } = useInteraction() ?? {};
  const total = yearly ? CREDITS.yearly : CREDITS.monthly;
  const [wallet, setWallet] = useState({ yearly, owned: [], pending: [] });
  const refill = () => setWallet({ yearly, owned: [], pending: [] });

  // Refill whenever the plan changes (adjusted during render, not in an effect)
  if (wallet.yearly !== yearly) refill();
  const { owned, pending } = wallet;

  useFadeUp(rootRef);

  // Kill any coin still in flight on unmount
  useEffect(() => {
    const flies = fliesRef.current;
    return () => {
      flies.forEach(({ el, tweens }) => { tweens.forEach((t) => t.kill()); el.remove(); });
      flies.clear();
    };
  }, []);

  const spent = owned.length + pending.length;
  const left = total - spent;

  // A coin that lands after a refill no longer counts: it left the old wallet
  const own = (i) =>
    setWallet((w) => (w.pending.includes(i)
      ? { ...w, pending: w.pending.filter((x) => x !== i), owned: [...w.owned, i] }
      : w));

  const redeem = (i) => {
    if (owned.includes(i) || pending.includes(i) || left <= 0) return;
    sound?.note?.(i);
    const coin = coinRefs.current[left - 1];
    const art = artRefs.current[i];
    setWallet((w) => ({ ...w, pending: [...w.pending, i] }));
    if (prefersReducedMotion() || !coin || !art) {
      own(i);
      return;
    }
    const from = coin.getBoundingClientRect();
    const to = art.getBoundingClientRect();
    const el = document.createElement("i");
    el.className = "pr-credit-fly";
    el.textContent = left;
    document.body.appendChild(el);
    const fly = { el, tweens: [] };
    fliesRef.current.add(fly);
    gsap.set(el, { left: from.left + from.width / 2, top: from.top + from.height / 2 });
    fly.tweens.push(
      gsap.to(el, {
        left: to.left + to.width / 2,
        top: to.top + to.height / 2,
        scale: 1.6,
        duration: FLY_DURATION,
        ease: "power3.inOut",
        onComplete: () => {
          el.remove();
          fliesRef.current.delete(fly);
          own(i);
          gsap.fromTo(art, { scale: 0.96 }, { scale: 1, duration: 0.9, ease: "elastic.out(1,.5)" });
        },
      }),
      gsap.to(el, { opacity: 0, duration: 0.3, delay: FLY_FADE_DELAY }),
    );
  };

  const note = left
    ? `${left} credit${left > 1 ? "s" : ""} left on Pro ${yearly ? "yearly" : "monthly"}`
    : `Wallet empty. That\u2019s ${yearly ? "a year" : "a month"} of templates, owned forever.`;

  return (
    <section ref={rootRef} className="credits" id="credits">
      <div className="cr-head">
        <p className="eyebrow label fadeup">Template credits</p>
        <LineReveal as="h2" className="display d2">
          One credit. <span className="gradient-text-animate">One whole site.</span>
        </LineReveal>
        <p className="body fadeup">
          A credit unlocks one complete template: every page, section and interaction, as source
          code you own. Try it: spend your credits below.
        </p>
      </div>
      <div className="cr-play fadeup">
        <div className="wallet">
          <div className="wallet-top">
            <span className="label">Your wallet</span>
            <BillingToggle small label="Plan for this demo" />
          </div>
          <div className="coins">
            {Array.from({ length: total }, (_, i) => (
              <i key={i} ref={(el) => { coinRefs.current[i] = el; }} className={`tok${i < left ? "" : " dim"}`}>
                {i + 1}
              </i>
            ))}
          </div>
          <p className="wallet-note" aria-live="polite">{note}</p>
          <button type="button" className="cta3 label wallet-reset" onClick={refill}>
            <span className="t3">Reset wallet</span>
          </button>
        </div>
        <ul className="shelf">
          {DEMO_TEMPLATES.map((name, i) => {
            const isOwned = owned.includes(i);
            return (
              <li key={name} className={`tp${isOwned ? " owned" : ""}`}>
                <div ref={(el) => { artRefs.current[i] = el; }} className="tp-art" aria-hidden="true"><i /><i /><i /></div>
                <div className="tp-meta"><b>{name}</b></div>
                <button type="button" className="tp-b label" disabled={isOwned || (!left && !pending.includes(i))} onClick={() => redeem(i)}>
                  {isOwned ? "Yours ✓" : "Redeem"}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
      <p className="cr-fine label">Template names are examples. This wallet is a demo and isn&rsquo;t linked to your account.</p>
    </section>
  );
}
