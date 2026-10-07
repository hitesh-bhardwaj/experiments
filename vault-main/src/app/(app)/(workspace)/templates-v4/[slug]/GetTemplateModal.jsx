"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import Link from "next/link";
import gsap from "gsap";
import { useLenis } from "lenis/react";
import { motion } from "motion/react";
import { DISPLAY, LABEL, PRICE, T13, T14, T16, T40, catalogueOf, priceOf } from "../tokens";

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
      className="fixed inset-0 z-[310] grid place-items-center bg-black/20 p-4 backdrop-blur-md backdrop-brightness-50"
    >
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="relative grid w-[60vw] grid-cols-[minmax(0,.9fr)_minmax(0,1.1fr)] gap-6.5 bg-[#141414] p-6.5 text-[#F4F4F4] shadow-[inset_0_0_0_1px_rgba(244,244,244,.1),0_50px_100px_-30px_#000] max-[1025px]:w-[88vw] max-md:max-h-[90svh] max-md:w-full max-md:grid-cols-1 max-md:overflow-y-auto"
      >
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          className={`absolute top-4 right-4 cursor-pointer ${LABEL} text-[#8a8a8a] transition-colors duration-500 hover:text-white`}
        >
          Close · Esc
        </button>

        <div ref={thumbRef} className="relative aspect-[3/4] overflow-hidden bg-[#222] max-md:aspect-video">
          {shot && <Image src={shot} alt={`${template.title} homepage`} fill sizes="(max-width: 767px) 90vw, 26vw" quality={75} className="object-cover object-top" />}
          <span
            className={`absolute bottom-3 left-3 bg-[#ff5f00] px-2.5 py-1.5 ${LABEL} text-[#141414] transition-[opacity,transform] duration-700 ${redeemed ? "translate-y-0 opacity-100" : "translate-y-2.5 opacity-0"}`}
          >
            Redeemed (demo)
          </span>
        </div>

        <div className="grid content-center gap-4">
          <p className={`${LABEL} text-[#8a8a8a]`}>Get this template</p>
          <h3 id="get-template-title" className={`${DISPLAY} ${T40} leading-none`}>
            {template.title}
          </h3>

          <div role="tablist" className="relative flex w-fit gap-0.5 bg-white/6 p-0.75">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => onTab(t.id)}
                className={`h-8.5 w-30 cursor-pointer ${T14} transition-colors duration-500 ${tab === t.id ? "bg-[#ff5f00] text-[#141414]" : "text-[#a9a9a9] hover:text-white"}`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === "buy" ? (
            <div className="grid gap-3.5">
              {price != null && (
                <p className="flex items-baseline gap-2.5">
                  <b className={`${DISPLAY} ${PRICE} text-[3vw] leading-none max-[1025px]:text-[6vw] max-md:text-[11vw]`}>${price}</b>
                  <span className={`${LABEL} text-[#8a8a8a]`}>one-time payment</span>
                </p>
              )}
              <ul className={`grid gap-1.5 ${T14} text-[#cfcfcf]`}>
                {["Every page, section and interaction, as source you own", "The Figma file for the whole site", "Licensed under MPL-2.0"].map((item) => (
                  <li key={item} className="relative pl-4.5 before:absolute before:top-[.6em] before:left-0.5 before:size-1.5 before:rounded-full before:bg-[#ff5f00]">
                    {item}
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={onBuy}
                className={`inline-flex h-12 w-fit cursor-pointer items-center bg-[#ff5f00] px-5 ${T16} text-[#141414] transition-colors duration-500 hover:bg-[#ff7300]`}
              >
                Continue to payment
              </button>
              <p className={`${T13} bg-[#ff5f00]/8 px-3.5 py-3 text-[#9c9c9c] shadow-[inset_0_0_0_1px_rgba(255,95,0,.25)]`}>
                Planning more than one? Pro+ yearly comes with 5 template credits a year, plus every component and section.{" "}
                <Link href="/pricing" className="text-[#FFB27A] underline underline-offset-3">
                  Compare plans
                </Link>
              </p>
            </div>
          ) : (
            <div className="grid gap-3.5">
              <div role="radiogroup" aria-label="Your plan (demo)" className="flex w-fit gap-0.5 bg-white/8 p-0.75">
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
                    className={`h-7.5 cursor-pointer px-3 ${T13} transition-colors duration-500 ${plan === id ? "bg-[#F4F4F4] text-[#1D1D1D]" : "text-[#bdbdbd] hover:text-white"}`}
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
                    className={`grid size-10 place-items-center rounded-full font-mono not-italic ${T13} ${
                      i < remaining
                        ? "bg-[radial-gradient(circle_at_35%_30%,#FFD2B0,#ff5f00_55%,#B84300)] text-[#141414] shadow-[0_0_16px_rgba(255,95,0,.45),inset_0_-2px_4px_rgba(0,0,0,.25)]"
                        : "bg-white/8 text-[#6d6d6d] shadow-[inset_0_0_0_1px_rgba(244,244,244,.16)]"
                    }`}
                  >
                    {i + 1}
                  </i>
                ))}
              </div>
              <p aria-live="polite" className={`min-h-[3em] ${T14} text-[#bdbdbd]`}>
                {message}
              </p>
              <div className="flex flex-wrap gap-2">
                {!redeemed && !locked && remaining > 0 && (
                  <button
                    type="button"
                    onClick={redeem}
                    disabled={flying}
                    className={`inline-flex h-11 cursor-pointer items-center bg-[#ff5f00] px-5 ${T16} text-[#141414] transition-colors duration-500 hover:bg-[#ff7300] disabled:opacity-60`}
                  >
                    Redeem 1 credit
                  </button>
                )}
                {(redeemed || locked || remaining < 1) && (
                  <Link
                    href="/pricing"
                    className={`inline-flex h-11 items-center px-5 ${T16} text-[#F4F4F4] shadow-[inset_0_0_0_1px_rgba(244,244,244,.14)] transition-shadow duration-500 hover:shadow-[inset_0_0_0_1px_rgba(255,95,0,.7)]`}
                  >
                    {locked ? "See Pro+" : "Compare plans"}
                  </Link>
                )}
              </div>
              <p className={`${LABEL} text-[#6d6d6d]`}>Demo: template credits aren’t live yet. This wallet isn’t linked to your account.</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>,
    document.body,
  );
}
