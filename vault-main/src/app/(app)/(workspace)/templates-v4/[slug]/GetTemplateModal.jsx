"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import Link from "next/link";
import gsap from "gsap";
import { useLenis } from "lenis/react";
import { motion } from "motion/react";
import { DISPLAY, LABEL, PRICE, T13, T14, T16, catalogueOf, priceOf } from "../tokens";

// Demo wallet, same plans as the pricing page's credit demo.
const PLANS = {
  pro: { label: "Pro · yearly", credits: 3 },
  plus: { label: "Pro+ · yearly", credits: 5 },
};
const TABS = [
  { id: "buy", label: "Buy" },
  { id: "credit", label: "Use a credit" },
];

/**
 * "Get this template" popup from the v4 design. The Buy tab hands off to the
 * real purchase (onBuy: sign in, then the paywall). Credits aren't live yet,
 * so the credit tab is the v4 demo wallet: redeeming plays the animation and
 * says so, but unlocks nothing and isn't stored.
 */
export function GetTemplateModal({ template, tab, onTab, onClose, onBuy }) {
  const open = tab != null;
  const lenis = useLenis();
  const closeRef = useRef(null);
  const thumbRef = useRef(null);
  const coinRefs = useRef([]);
  const [plan, setPlan] = useState("plus");
  const [left, setLeft] = useState({ pro: PLANS.pro.credits, plus: PLANS.plus.credits });
  const [redeemed, setRedeemed] = useState(false);
  const [flying, setFlying] = useState(false);

  const price = priceOf(template);
  const full = catalogueOf(template) === "full";
  const shot = template.screenshots?.[0];

  useEffect(() => {
    if (!open) return;
    lenis?.stop();
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const id = setTimeout(() => closeRef.current?.focus(), 50);
    return () => {
      lenis?.start();
      window.removeEventListener("keydown", onKey);
      clearTimeout(id);
    };
  }, [open, lenis, onClose]);

  if (!open || typeof document === "undefined") return null;

  const locked = plan === "pro" && full;
  const remaining = left[plan];

  const redeem = () => {
    if (flying || remaining < 1) return;
    const coin = coinRefs.current[remaining - 1];
    const thumb = thumbRef.current;
    const finish = () => {
      setLeft((l) => ({ ...l, [plan]: l[plan] - 1 }));
      setRedeemed(true);
      setFlying(false);
      if (thumb) gsap.fromTo(thumb, { scale: 0.96 }, { scale: 1, duration: 1, ease: "elastic.out(1,.5)" });
    };
    if (!coin || !thumb || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return finish();
    setFlying(true);
    const from = coin.getBoundingClientRect();
    const to = thumb.getBoundingClientRect();
    const token = coin.cloneNode(true);
    Object.assign(token.style, { position: "fixed", zIndex: 200, left: `${from.left}px`, top: `${from.top}px`, margin: 0, pointerEvents: "none" });
    document.body.appendChild(token);
    gsap.to(token, {
      x: to.left + to.width / 2 - from.left - from.width / 2,
      y: to.top + to.height / 2 - from.top - from.height / 2,
      scale: 2,
      duration: 0.9,
      ease: "power3.inOut",
      onComplete: () => {
        token.remove();
        finish();
      },
    });
    gsap.to(token, { opacity: 0, duration: 0.25, delay: 0.75 });
  };

  let message = "";
  if (redeemed) message = `Redeemed in this demo. When credits go live, ${template.title} would be yours to keep, even if you cancel. Nothing was charged and nothing was unlocked.`;
  else if (locked) message = "This template is in the full catalogue. Pro credits cover the selected catalogue (✦); Pro+ credits unlock it.";
  else if (remaining < 1) message = "That’s your credits for the year. Pro+ quarterly adds one every quarter.";
  else message = `Spend 1 of your ${remaining} credits on ${template.title}. You keep it forever, even if you cancel.`;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="get-template-title"
      data-lenis-prevent
      onClick={(e) => e.target === e.currentTarget && onClose()}
      // z-[310]: just above VaultLayout's z-300 page layer (the tablet/mobile header, z-950, stays on top).
      // The page behind is blurred and dimmed rather than covered with a dark fill.
      className="fixed inset-0 z-[310] flex items-center justify-center bg-black/20 p-4 backdrop-blur-lg backdrop-brightness-50"
    >
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="relative flex w-[60vw] items-stretch gap-6.5 bg-background p-6.5 text-light ring-1 ring-inset ring-foreground/10 shadow-[0_3.5vw_7vw_-2vw_black] max-[1025px]:w-[88vw] max-md:max-h-[90svh] max-md:w-full max-md:flex-col max-md:overflow-y-auto"
      >
        {/* Same close control as the effects preview drawer: the cross turns a quarter on hover. */}
        <button
          ref={closeRef}
          type="button"
          aria-label="Close (Esc)"
          onClick={onClose}
          className="group absolute top-4 right-4 z-1 flex size-10 cursor-pointer items-center justify-center border border-foreground/20 bg-foreground/10 transition-colors duration-500 hover:border-primary hover:bg-primary"
        >
          <span className="relative flex size-4 items-center justify-center transition-transform duration-500 ease-in-out group-hover:rotate-90">
            <span className="h-px w-4 rotate-45 bg-foreground" />
            <span className="absolute h-px w-4 -rotate-45 bg-foreground" />
          </span>
        </button>

        <div ref={thumbRef} className="relative aspect-[3/4] w-[45%] shrink-0 overflow-hidden bg-grey max-md:aspect-video max-md:w-full">
          {shot && <Image src={shot} alt={`${template.title} homepage`} fill sizes="(max-width: 767px) 90vw, 26vw" quality={75} className="object-cover object-top" />}
          <span
            className={`absolute bottom-3 left-3 bg-primary px-2.5 py-1.5 ${LABEL} text-background transition-[opacity,transform] duration-700 ${redeemed ? "translate-y-0 opacity-100" : "translate-y-2.5 opacity-0"}`}
          >
            Redeemed (demo)
          </span>
        </div>

        <div className="flex min-w-0 flex-1 flex-col justify-center gap-4">
          <p className={`${LABEL} text-foreground/50`}>Get this template</p>
          <h3 id="get-template-title" className={`${DISPLAY} text64 font-aeonik leading-none`}>
            {template.title}
          </h3>

          <div role="tablist" className="relative flex w-fit gap-0.5 bg-foreground/6 p-0.75">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => onTab(t.id)}
                className={`h-8.5 w-30 cursor-pointer ${T14} transition-colors duration-500 ${tab === t.id ? "bg-primary text-background" : "text-foreground/60 hover:text-foreground"}`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === "buy" ? (
            <div className="flex flex-col gap-3.5">
              {price != null && (
                <p className="flex items-baseline gap-2.5">
                  <b className={`${DISPLAY} ${PRICE} text-[3vw] leading-none max-[1025px]:text-[6vw] max-md:text-[11vw]`}>${price}</b>
                  <span className={`${LABEL} text-foreground/50`}>one-time payment</span>
                </p>
              )}
              <ul className={`flex flex-col gap-1.5 ${T14} text-foreground/80`}>
                {["Every page, section and interaction, as source you own", "The Figma file for the whole site", "Licensed under MPL-2.0"].map((item) => (
                  <li key={item} className="relative pl-4.5 before:absolute before:top-[.6em] before:left-0.5 before:size-1.5 before:bg-primary">
                    {item}
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={onBuy}
                className={`inline-flex h-12 w-fit cursor-pointer items-center bg-primary px-5 ${T16} text-background transition-colors duration-500 hover:bg-primary-hover`}
              >
                Continue to payment
              </button>
              <p className={`${T13} bg-primary/8 px-3.5 py-3 text-foreground/60 ring-1 ring-inset ring-primary/25`}>
                Planning more than one? Pro+ yearly comes with 5 template credits a year, plus every component and section.{" "}
                <Link href="/pricing" className="text-[#FFB27A] underline underline-offset-3">
                  Compare plans
                </Link>
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3.5">
              <div role="radiogroup" aria-label="Your plan (demo)" className="flex w-fit gap-0.5 bg-foreground/8 p-0.75">
                {Object.entries(PLANS).map(([id, p]) => (
                  <button
                    key={id}
                    type="button"
                    role="radio"
                    aria-checked={plan === id}
                    onClick={() => {
                      setPlan(id);
                      setRedeemed(false);
                    }}
                    className={`h-7.5 cursor-pointer px-3 ${T13} transition-colors duration-500 ${plan === id ? "bg-light text-ink" : "text-foreground/70 hover:text-foreground"}`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <div className="flex min-h-11 flex-wrap gap-2.5">
                {Array.from({ length: PLANS[plan].credits }, (_, i) => (
                  <i
                    key={`${plan}-${i}`}
                    ref={(el) => {
                      coinRefs.current[i] = el;
                    }}
                    className={`flex size-10 items-center justify-center font-mono not-italic ${T13} ${
                      i < remaining
                        ? "bg-[radial-gradient(circle_at_35%_30%,#FFD2B0,var(--primary)_55%,#B84300)] text-background shadow-[0_0_1.1vw_color-mix(in_srgb,var(--primary)_45%,transparent),inset_0_-0.1vw_0.3vw_color-mix(in_srgb,black_25%,transparent)]"
                        : "bg-foreground/8 text-foreground/40 ring-1 ring-inset ring-foreground/16"
                    }`}
                  >
                    {i + 1}
                  </i>
                ))}
              </div>
              <p aria-live="polite" className={`min-h-[3em] ${T14} text-foreground/70`}>
                {message}
              </p>
              <div className="flex flex-wrap gap-2">
                {!redeemed && !locked && remaining > 0 && (
                  <button
                    type="button"
                    onClick={redeem}
                    disabled={flying}
                    className={`inline-flex h-11 cursor-pointer items-center bg-primary px-5 ${T16} text-background transition-colors duration-500 hover:bg-primary-hover disabled:opacity-60`}
                  >
                    Redeem 1 credit
                  </button>
                )}
                {(redeemed || locked || remaining < 1) && (
                  <Link
                    href="/pricing"
                    className={`inline-flex h-11 items-center px-5 ${T16} text-light ring-1 ring-inset ring-foreground/14 transition-shadow duration-500 hover:ring-primary/70`}
                  >
                    {locked ? "See Pro+" : "Compare plans"}
                  </Link>
                )}
              </div>
              <p className={`${LABEL} text-foreground/40`}>Demo: template credits aren’t live yet. This wallet isn’t linked to your account.</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>,
    document.body,
  );
}
