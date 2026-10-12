"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import gsap from "gsap";
import { useLenis } from "lenis/react";
import { AnimatePresence, motion } from "motion/react";
import { LABEL, T13, T14, T16, catalogueOf, priceOf } from "../tokens";
import { PLANS, canRedeemCatalogue } from "@/lib/plans";

// Most credit coins drawn at once; a bigger balance shows as a number too
const MAX_COINS = 10;
const TABS = [
  { id: "buy", label: "Buy" },
  { id: "credit", label: "Use a credit" },
];
// The pricing page's plan comparison (components/Pricing/exploded/PricingProCompare.jsx).
const COMPARE_HREF = "/pricing#compare";
const EASE = [0.16, 1, 0.3, 1];

// Tab panels: the old one slides out and fades first, then the new one slides in from the side
// of the chosen tab (and the hidden one stays out of the tab order).
const PANEL_ON = { opacity: 1, x: 0, visibility: "visible", transition: { duration: 0.5, delay: 0.2, ease: EASE } };
const PANEL_OFF = (id) => ({ opacity: 0, x: id === "credit" ? SLIDE : -SLIDE, transition: { duration: 0.25, ease: EASE }, transitionEnd: { visibility: "hidden" } });

// How far a tab panel slides as it swaps
const SLIDE = 18;

const subscribeNoop = () => () => {};

/**
 * "Get this template" popup from the v4 design. The Buy tab hands off to the
 * real purchase (onBuy: sign in, then the paywall). The credit tab shows the
 * visitor's real template credits (/api/templates/credits) and spends one on
 * this template (/api/templates/[slug]/redeem), which then downloads.
 *
 * `open` shows it; `tab` ("buy" | "credit") picks the tab and is kept while it
 * animates out, so the content doesn't change mid-close.
 */
export function GetTemplateModal({ template, open, tab = "buy", onTab, onClose, onBuy }) {
  const mounted = useSyncExternalStore(subscribeNoop, () => true, () => false);
  const lenis = useLenis();
  const closeRef = useRef(null);
  const thumbRef = useRef(null);
  const coinRefs = useRef([]);
  const pathname = usePathname();
  // { signedIn, plan, tier, balance } once loaded
  const [wallet, setWallet] = useState(null);
  // null | "redeemed" | "already-owned" | "error"
  const [outcome, setOutcome] = useState(null);
  const [busy, setBusy] = useState(false);

  // Fresh balance each time the popup opens, or a different template is shown
  useEffect(() => {
    if (!open || !template) return undefined;
    let live = true;
    fetch("/api/templates/credits")
      .then((res) => (res.ok ? res.json() : null))
      .catch(() => null)
      .then((data) => {
        if (!live) return;
        setWallet(data);
        setOutcome(null);
      });
    return () => {
      live = false;
    };
  }, [open, template]);

  useEffect(() => {
    if (!open) return undefined;
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

  if (!mounted || !template) return null;

  const price = priceOf(template);
  const full = catalogueOf(template) === "full";
  const shot = template.screenshots?.[0];
  const subscribed = wallet?.plan === "pro";
  const remaining = wallet?.balance ?? 0;
  const locked = subscribed && !canRedeemCatalogue(wallet.tier, catalogueOf(template));
  const canRedeem = subscribed && !locked && remaining > 0 && !outcome;
  const coins = Math.min(remaining, MAX_COINS);
  const downloadHref = `/api/templates/${template.slug}/download`;

  // The coin flies into the thumbnail once the server has actually spent it
  const redeem = async () => {
    if (busy || !canRedeem) return;
    setBusy(true);
    let data = null;
    let ok = false;
    try {
      const res = await fetch(`/api/templates/${template.slug}/redeem`, { method: "POST" });
      data = await res.json().catch(() => null);
      ok = res.ok;
      if (!ok) {
        setOutcome(data?.reason === "already-owned" ? "already-owned" : "error");
        if (typeof data?.balance === "number") setWallet((w) => ({ ...w, balance: data.balance }));
        setBusy(false);
        return;
      }
    } catch {
      setOutcome("error");
      setBusy(false);
      return;
    }

    const coin = coinRefs.current[coins - 1];
    const thumb = thumbRef.current;
    const finish = () => {
      setWallet((w) => ({ ...w, balance: data.balance }));
      setOutcome("redeemed");
      setBusy(false);
      if (thumb) gsap.fromTo(thumb, { scale: 0.96 }, { scale: 1, duration: 1, ease: "elastic.out(1,.5)" });
    };
    if (!coin || !thumb || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return finish();
    const from = coin.getBoundingClientRect();
    const to = thumb.getBoundingClientRect();
    const token = coin.cloneNode(true);
    Object.assign(token.style, { position: "fixed", zIndex: 400, left: `${from.left}px`, top: `${from.top}px`, margin: 0, pointerEvents: "none" });
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
  if (!wallet) message = "Checking your credits…";
  else if (outcome === "redeemed") message = `${template.title} is yours to keep, even if you cancel.`;
  else if (outcome === "already-owned") message = `You already own ${template.title}.`;
  else if (outcome === "error") message = "Couldn't redeem the credit. Please try again.";
  else if (!wallet.signedIn) message = "Sign in to use a template credit from your plan.";
  else if (!subscribed) message = "Template credits come with Pro and Pro+: 3 or 5 a year on yearly billing.";
  else if (locked) message = "This template is in the full catalogue. Pro credits cover the selected catalogue; Pro+ credits unlock it.";
  else if (remaining < 1) message = "You have no template credits left. New ones arrive with your next billing period.";
  else message = `Spend 1 of your ${remaining} credit${remaining === 1 ? "" : "s"} on ${template.title}. You keep it forever, even if you cancel.`;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="get-template"
          role="dialog"
          aria-modal="true"
          aria-labelledby="get-template-title"
          data-lenis-prevent
          data-sound-flow="off"
          onClick={(e) => e.target === e.currentTarget && onClose()}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: EASE }}
          // z-[310]: just above VaultLayout's z-300 page layer (the tablet/mobile header, z-950, stays on top).
          // The page behind is blurred and dimmed rather than covered with a dark fill.
          className="fixed inset-0 z-[310] flex items-center justify-center bg-black/20 p-4 backdrop-blur-lg backdrop-brightness-50"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.5, ease: EASE }}
            className="relative flex w-[60vw] items-stretch gap-6.5 bg-background p-6.5 text-light ring-1 ring-inset ring-foreground/10 shadow-[0_3.5vw_7vw_-2vw_black] max-lg:w-[88vw] max-md:max-h-[90svh] max-md:w-full max-md:flex-col max-md:overflow-y-auto max-md:pt-16"
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

            <div ref={thumbRef} className="relative h-[28vw] w-[45%] shrink-0 overflow-hidden bg-grey max-md:aspect-video max-md:w-full">
              {shot && <Image src={shot} alt={`${template.title} homepage`} fill sizes="(max-width: 767px) 90vw, 26vw" quality={75} className="object-cover object-top" />}
              
            </div>

            <div className="flex min-w-0 flex-1 flex-col justify-center gap-4">
              <p className={`${LABEL} text-foreground/50`}>Get this template</p>
              <h3 id="get-template-title" className="type-h1 leading-none">
                {template.title}
              </h3>

              <SlideToggle
                role="tablist"
                items={TABS}
                value={tab}
                onChange={onTab}
                activeClassName="bg-primary"
                itemClassName={`h-8.5 w-30 ${T14}`}
                activeTextClassName="text-background"
                inactiveTextClassName="text-foreground/60 hover:text-foreground"
                trackClassName="bg-foreground/6"
              />

              {/* Both panels share one grid cell, so the area is always as tall as the taller one */}
              <div className="grid">
                <motion.div
                  key="buy"
                  className="col-start-1 row-start-1"
                  aria-hidden={tab !== "buy"}
                  initial={false}
                  style={{ visibility: tab === "buy" ? "visible" : "hidden" }}
                  animate={tab === "buy" ? PANEL_ON : PANEL_OFF("buy")}
                >
                    <div className="flex flex-col gap-3.5">
                      {price != null && (
                        <p className="flex items-baseline gap-2.5">
                          <b className="type-h2 leading-none">${price}</b>
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
                     
                    </div>
                </motion.div>
                <motion.div
                  key="credit"
                  className="col-start-1 row-start-1"
                  aria-hidden={tab !== "credit"}
                  initial={false}
                  style={{ visibility: tab === "credit" ? "visible" : "hidden" }}
                  animate={tab === "credit" ? PANEL_ON : PANEL_OFF("credit")}
                >
                    <div className="flex flex-col gap-3.5">
                      {subscribed && (
                        <p className={`${LABEL} text-foreground/50`}>
                          Your plan: {PLANS[wallet.tier]?.name ?? "Pro"} · {remaining} credit{remaining === 1 ? "" : "s"}
                        </p>
                      )}
                      {coins > 0 && (
                        <div className="flex min-h-11 flex-wrap gap-2.5">
                          {Array.from({ length: coins }, (_, i) => (
                            <i
                              key={i}
                              ref={(el) => {
                                coinRefs.current[i] = el;
                              }}
                              className={`flex size-10 items-center justify-center bg-primary font-mono not-italic text-background ${T13}`}
                            >
                              {i + 1}
                            </i>
                          ))}
                        </div>
                      )}
                      <p aria-live="polite" className={`min-h-[3em] ${T14} text-foreground/70`}>
                        {message}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {canRedeem && (
                          <button
                            type="button"
                            onClick={redeem}
                            disabled={busy}
                            className={`inline-flex h-11 cursor-pointer items-center bg-primary px-5 ${T16} text-background transition-colors duration-500 hover:bg-primary-hover disabled:opacity-60`}
                          >
                            Redeem 1 credit
                          </button>
                        )}
                        {(outcome === "redeemed" || outcome === "already-owned") && (
                          <a
                            href={downloadHref}
                            className={`inline-flex h-11 items-center bg-primary px-5 ${T16} text-background transition-colors duration-500 hover:bg-primary-hover`}
                          >
                            Download source
                          </a>
                        )}
                        {wallet && !wallet.signedIn && (
                          <Link
                            href={`/sign-in?redirect_url=${encodeURIComponent(pathname)}`}
                            className={`inline-flex h-11 items-center bg-primary px-5 ${T16} text-background transition-colors duration-500 hover:bg-primary-hover`}
                          >
                            Sign in
                          </Link>
                        )}
                        {wallet && !outcome && (!subscribed || locked || remaining < 1) && (
                          <Link
                            href={COMPARE_HREF}
                            onClick={onClose}
                            className={`inline-flex h-11 items-center px-5 ${T16} text-light ring-1 ring-inset ring-foreground/14 transition-shadow duration-500 hover:ring-primary/70`}
                          >
                            {locked ? "See Pro+" : "Compare plans"}
                          </Link>
                        )}
                      </div>
                    </div>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

/** Equal-width options with one highlight block that slides to the chosen option. */
function SlideToggle({ role, ariaLabel, items, value, onChange, activeClassName, itemClassName, activeTextClassName, inactiveTextClassName, trackClassName }) {
  const index = Math.max(0, items.findIndex((item) => item.id === value));
  const isTabs = role === "tablist";
  return (
    <div role={role} aria-label={ariaLabel} className={`relative flex w-fit gap-0.5 p-0.75 ${trackClassName}`}>
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute top-0.75 bottom-0.75 left-0.75 transition-transform duration-500 ease-[cubic-bezier(.16,1,.3,1)] ${activeClassName} ${itemClassName}`}
        style={{ transform: `translateX(calc(${index} * (100% + 2px)))` }}
      />
      {items.map((item) => {
        const active = item.id === value;
        return (
          <button
            key={item.id}
            type="button"
            role={isTabs ? "tab" : "radio"}
            {...(isTabs ? { "aria-selected": active } : { "aria-checked": active })}
            onClick={() => onChange(item.id)}
            className={`relative z-1 cursor-pointer transition-colors duration-500 ${itemClassName} ${active ? activeTextClassName : inactiveTextClassName}`}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
