"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import Link from "next/link";
import gsap from "gsap";
import { useLenis } from "lenis/react";
import { AnimatePresence, motion } from "motion/react";
import { LABEL, T13, T14, T16, catalogueOf, priceOf } from "../tokens";

// Demo wallet, same plans as the pricing page's credit demo.
const PLANS = [
  { id: "pro", label: "Pro · yearly", credits: 3 },
  { id: "plus", label: "Pro+ · yearly", credits: 5 },
];
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

// Content swaps (tab, plan): the old content slides out and fades, the new slides in from the
// side the chosen option lies on, the way the pricing toggles move their highlight.
const SLIDE = 18;
const swap = {
  enter: (dir) => ({ opacity: 0, x: dir * SLIDE }),
  center: { opacity: 1, x: 0, transition: { duration: 0.5, ease: EASE } },
  exit: (dir) => ({ opacity: 0, x: dir * -SLIDE, transition: { duration: 0.25, ease: EASE } }),
};

const subscribeNoop = () => () => {};

/**
 * "Get this template" popup from the v4 design. The Buy tab hands off to the
 * real purchase (onBuy: sign in, then the paywall). Credits aren't live yet,
 * so the credit tab is the v4 demo wallet: redeeming plays the animation and
 * says so, but unlocks nothing and isn't stored.
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
  const [plan, setPlan] = useState("plus");
  const [left, setLeft] = useState({ pro: 3, plus: 5 });
  const [redeemed, setRedeemed] = useState(false);
  const [flying, setFlying] = useState(false);

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
  const credits = PLANS.find((p) => p.id === plan).credits;
  const locked = plan === "pro" && full;
  const remaining = left[plan];
  const planDir = PLANS.findIndex((p) => p.id === plan) > 0 ? 1 : -1;

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
  if (redeemed) message = `Redeemed in this demo. When credits go live, ${template.title} would be yours to keep, even if you cancel. Nothing was charged and nothing was unlocked.`;
  else if (locked) message = "This template is in the full catalogue. Pro credits cover the selected catalogue; Pro+ credits unlock it.";
  else if (remaining < 1) message = "That’s your credits for the year. Pro+ quarterly adds one every quarter.";
  else message = `Spend 1 of your ${remaining} credits on ${template.title}. You keep it forever, even if you cancel.`;

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
            className="relative flex w-[60vw] items-stretch gap-6.5 bg-background p-6.5 text-light ring-1 ring-inset ring-foreground/10 shadow-[0_3.5vw_7vw_-2vw_black] max-lg:w-[88vw] max-md:max-h-[90svh] max-md:w-full max-md:flex-col max-md:overflow-y-auto"
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
                      <SlideToggle
                        role="radiogroup"
                        ariaLabel="Your plan (demo)"
                        items={PLANS}
                        value={plan}
                        onChange={(id) => {
                          setPlan(id);
                          setRedeemed(false);
                        }}
                        activeClassName="bg-light"
                        itemClassName={`h-7.5 w-28 ${T13}`}
                        activeTextClassName="text-ink"
                        inactiveTextClassName="text-foreground/70 hover:text-foreground"
                        trackClassName="bg-foreground/8"
                      />
                      <AnimatePresence mode="wait" initial={false} custom={planDir}>
                        <motion.div key={plan} custom={planDir} variants={swap} initial="enter" animate="center" exit="exit" className="flex flex-col gap-3.5">
                      <div className="flex min-h-11 flex-wrap gap-2.5">
                        {Array.from({ length: credits }, (_, i) => (
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
                            href={COMPARE_HREF}
                            onClick={onClose}
                            className={`inline-flex h-11 items-center px-5 ${T16} text-light ring-1 ring-inset ring-foreground/14 transition-shadow duration-500 hover:ring-primary/70`}
                          >
                            {locked ? "See Pro+" : "Compare plans"}
                          </Link>
                        )}
                      </div>
                        </motion.div>
                      </AnimatePresence>
                      
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
