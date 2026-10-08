"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
// FAQ registers its reveal with the dist build, a separate ScrollTrigger copy with its own trigger list.
import { ScrollTrigger as ScrollTriggerDist } from "gsap/dist/ScrollTrigger";
import dynamic from "next/dynamic";
import { motion } from "motion/react";
import HeadAnim from "@/components/Animations/HeadAnim";
import Copy from "@/components/Animations/Copy";
import { useFadeUp } from "@/components/Animations/gsapAnimations";
import { useToastQueue, ToastViewport } from "@/components/ui/Toast";
import FAQ from "@/homepage/sections/FAQ";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import Button from "@/homepage/components/Button";
import { useTemplateWishlist } from "./useTemplateWishlist";
import { useTemplateAccess } from "./useTemplateAccess";
import { TemplateCard } from "./TemplateCard";
import { TemplatePreviewDrawer } from "./TemplatePreviewDrawer";
import { useTemplatePurchase } from "./useTemplatePurchase";
import { DISPLAY, GUTTER, LABEL, PRICE, T16, cardReveal, catalogueOf, priceOf } from "./tokens";

// three.js only loads when the corridor is shown.
const TemplateCorridor = dynamic(() => import("./TemplateCorridor"), {
  ssr: false,
  loading: () => <div className="h-svh" />,
});

// Hero: the heading and description animate in first; the breadcrumb, stats and
// filter bar then fade up after them, one after another.
const heroFadeUp = (delay) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.9, ease: [0.16, 1, 0.3, 1] },
});

const VIEWS = [
  { id: "corr", label: "Corridor" },
  { id: "grid", label: "Grid" },
];
const CATALOGUES = [
  { id: "all", label: "All" },
  { id: "selected", label: "✦ Selected" },
  { id: "full", label: "Pro+ only" },
];
const CARD_LAYOUT_TRANSITION = { layout: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } };

const CHIP = `inline-flex py-3 shrink-0 cursor-pointer items-center px-3.5 ${T16} backdrop-blur-lg transition-[background-color,color,box-shadow] duration-500`;
const CHIP_OFF = "text-foreground/80 bg-foreground/5 ring-1 ring-inset ring-foreground/15 hover:ring-primary/60";
const CHIP_ON = "bg-primary text-background";

/* ---------- can this device show the corridor? (desktop, motion allowed, WebGL) ---------- */
const CORRIDOR_QUERY = "(min-width: 901px) and (prefers-reduced-motion: no-preference)";
let webgl;
const hasWebGL = () => {
  if (webgl === undefined) {
    try {
      webgl = !!document.createElement("canvas").getContext("webgl2");
    } catch {
      webgl = false;
    }
  }
  return webgl;
};
const subscribeCorridor = (onChange) => {
  const mq = window.matchMedia(CORRIDOR_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
};
const canShowCorridor = () => window.matchMedia(CORRIDOR_QUERY).matches && hasWebGL();

// "$39, $49 or $59", each price in Aeonik Pro.
const formatPrices = (prices) =>
  prices.map((p, i) => (
    <Fragment key={p}>
      {i > 0 && (i === prices.length - 1 ? " or " : ", ")}
      <span className={PRICE}>${p}</span>
    </Fragment>
  ));

/**
 * Sample Templates listing: the v4 design (public/v4/Templates — Hyperiux
 * Vault (1).html, sidebar left out) merged with the live /templates page.
 *
 * From v4: the split hero with stats, the Corridor / Grid view switch, the 3D
 * corridor, catalogue filters, browser-frame cards and the template credits
 * section. From /templates: the real catalogue, approved description and FAQ,
 * view counts, Save (wishlist), and the Buy / Download flow with its paywall.
 */
export function TemplatesListing({ templates = [], description = "", faqItems = [] }) {
  const rootRef = useRef(null);
  const [category, setCategory] = useState("All");
  const [catalogue, setCatalogue] = useState("all");
  const [chosenView, setChosenView] = useState(null);
  const [glFailed, setGlFailed] = useState(false);

  const corridorOk = useSyncExternalStore(subscribeCorridor, canShowCorridor, () => true) && !glFailed;
  const view = corridorOk ? chosenView || "corr" : "grid";

  const { toast, showToast, dismissToast } = useToastQueue();
  const { wishlist, toggleWishlist, signInModal } = useTemplateWishlist({
    onSaved: (t) => showToast({ title: `${t.title} saved`, description: "You'll find it in your dashboard's My Templates." }),
    onRemoved: (t) => showToast({ title: `${t.title} removed`, description: "No longer in your saved templates." }),
  });
  const accessSlugs = useTemplateAccess();

  // Preview drawer (opened from a card's shot) and the purchase it can start.
  const [drawerTemplate, setDrawerTemplate] = useState(null);
  const closeDrawer = useCallback(() => setDrawerTemplate(null), []);
  const { buy, modals: purchaseModals } = useTemplatePurchase();
  const buyFromDrawer = (template) => {
    setDrawerTemplate(null);
    // Let the drawer slide away before the "Get this template" popup opens.
    setTimeout(() => buy(template, accessSlugs.includes(template.slug)), 650);
  };

  useFadeUp(rootRef);

  // The corridor's height follows the filtered count (and it unmounts when nothing
  // matches, or for the grid view), so the page's height jumps on a filter change and
  // every ScrollTrigger below it (fade-ups, FAQ reveal...) keeps stale positions.
  // Re-measure them whenever the listing's height actually changes.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let height = root.offsetHeight;
    let timer;
    const observer = new ResizeObserver(() => {
      if (root.offsetHeight === height) return;
      height = root.offsetHeight;
      clearTimeout(timer);
      timer = setTimeout(() => {
        ScrollTrigger.refresh();
        if (ScrollTriggerDist !== ScrollTrigger) ScrollTriggerDist.refresh();
      }, 120);
    });
    observer.observe(root);
    return () => {
      observer.disconnect();
      clearTimeout(timer);
    };
  }, []);

  const categories = useMemo(() => ["All", ...new Set(templates.map((t) => t.category).filter(Boolean))], [templates]);
  const prices = useMemo(() => [...new Set(templates.map(priceOf).filter((p) => p != null))].sort((a, b) => a - b), [templates]);
  const filtered = useMemo(
    () =>
      templates.filter(
        (t) => (category === "All" || t.category === category) && (catalogue === "all" || catalogueOf(t) === catalogue),
      ),
    [templates, category, catalogue],
  );

  const stats = [
    [templates.length, "Templates"],
    [prices.length ? <span className={PRICE}>${prices[0]}</span> : "-", "or 1 credit"],
    [categories.length - 1, "Industries"],
  ];

  const clearFilters = () => {
    setCategory("All");
    setCatalogue("all");
  };

  return (
    <div ref={rootRef} className="relative text-light">
      {/* ---------- hero ---------- */}
      <section id="templates-hero" className={`${GUTTER} flex flex-col gap-7 pt-36 pb-12 max-lg:pt-32 max-md:pt-28`}>
        <motion.div {...heroFadeUp(1)}>
          <Breadcrumb />
        </motion.div>

        <div className="flex justify-between gap-12 max-lg:flex-col max-lg:items-stretch max-lg:gap-10">
          <HeadAnim rotate={0} animateOnScroll={false} delay={0.2}>
            <h1 className="type-display w-[35vw] max-lg:w-full -mt-3">
              Whole sites. <span className="gradient-text-animate">Ready to ship.</span>
            </h1>
          </HeadAnim>

          <div className="flex w-[38%] flex-col gap-6 max-lg:w-full">
            <Copy animateOnScroll={false} delay={0.5}>
              <p className="type-body-lg w-[90%] text-foreground/80 max-lg:w-[70%] max-md:w-full">
                {description} Buy one outright, or redeem a template credit from your plan.
              </p>
            </Copy>
            <motion.div {...heroFadeUp(1.1)} className={`${LABEL} flex flex-wrap gap-x-[2vw] gap-y-[0.7vw] max-md:gap-x-[7vw] max-md:gap-y-[2.5vw]`}>
              {stats.map(([value, label]) => (
                <p key={label}>
                  <b className={`${DISPLAY} block font-aeonik text-[2.4vw] leading-none text-light tabular-nums max-lg:text-[4.5vw] max-md:text-[8vw]`}>
                    {value}
                  </b>
                  <span className="text-[1vw] text-foreground/60 max-lg:text-[1.8vw] max-md:text-[3.6vw]">{label}</span>
                </p>
              ))}
            </motion.div>
          </div>
        </div>

        {/* view · category · catalogue */}
        <motion.div {...heroFadeUp(1.2)} className="flex flex-wrap items-center justify-between gap-3.5 pt-7 max-md:pt-3">
          <div className="flex flex-wrap items-center gap-3.5">
            {corridorOk && <DarkSegment label="View" items={VIEWS} value={view} onChange={setChosenView} itemClassName="w-24" />}
            <div role="group" aria-label="Category" className="flex flex-wrap gap-1.5">
              {categories.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-pressed={category === c}
                  onClick={() => setCategory(c)}
                  className={`${CHIP} ${category === c ? CHIP_ON : CHIP_OFF}`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
          <div role="group" aria-label="Catalogue" className="flex flex-wrap gap-1.5">
            {CATALOGUES.map((c) => (
              <button
                key={c.id}
                type="button"
                aria-pressed={catalogue === c.id}
                onClick={() => setCatalogue(c.id)}
                className={`${CHIP} ${catalogue === c.id ? CHIP_ON : CHIP_OFF}`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ---------- corridor ---------- */}
      {view === "corr" && filtered.length > 0 && <TemplateCorridor templates={filtered} onUnsupported={() => setGlFailed(true)} />}

      {/* ---------- grid + credits sheet ---------- */}
      <div data-sound-hover="off" data-sound-flow="off" className="relative flex flex-col gap-[8vw] bg-light py-[7%] text-ink max-md:gap-[15vw] max-md:py-[15%]">
        <section id="templates-grid" className={`${GUTTER} flex flex-col gap-12`}>
          <div className="flex items-end justify-between gap-4">
            <HeadAnim rotate={0} by="words">
              <h2 className="type-h1">
                All <span className="gradient-text-animate">templates.</span>
              </h2>
            </HeadAnim>
            <p aria-live="polite" className={`fadeup ${LABEL} text-black/60`}>
              {filtered.length} of {templates.length} templates
            </p>
          </div>

          {filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-3.5 px-4 py-20 text-center">
              <b className="type-h2">No templates match that filter yet.</b>
              <p className="type-body text-black/60">New templates land in the vault regularly.</p>
              <button
                type="button"
                onClick={clearFilters}
                className={`${LABEL} h-11 cursor-pointer px-5 ring-1 ring-inset ring-black/10 transition-shadow duration-500 hover:ring-primary`}
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-x-[1.4vw] gap-y-14 max-md:gap-y-12">
              {filtered.map((template, index) => (
                <motion.div key={template.slug} layout transition={CARD_LAYOUT_TRANSITION} className="w-[calc((100%-1.4vw)/2)] max-md:w-full">
                  <motion.div {...cardReveal(index)}>
                    <TemplateCard
                      template={template}
                      priority={index < 2}
                      isWishlisted={wishlist.includes(template.slug)}
                      onToggleWishlist={toggleWishlist}
                      onOpen={setDrawerTemplate}
                      hasAccess={accessSlugs.includes(template.slug)}
                    />
                  </motion.div>
                </motion.div>
              ))}
            </div>
          )}
        </section>

        {/* template credits */}
        <section id="template-credits" className={`${GUTTER} flex flex-col gap-12`}>
          <HeadAnim rotate={0} by="words">
            <h2 className={`${DISPLAY} type-h1 font-aeonik`}>
              One credit. <span className="gradient-text-animate">One whole site.</span>
            </h2>
          </HeadAnim>
          <div className="fadeup flex flex-wrap gap-[0.9vw] max-md:gap-[3.5vw]">
            <CreditCard title="No plan needed" className="bg-[#fff4ea]">
              Buy any template outright{prices.length > 0 && <> for {formatPrices(prices)}</>}. One payment, and the source is yours.
            </CreditCard>
            <CreditCard title="Pro">
              1 credit a year on quarterly billing, 3 a year on yearly. Redeem across the selected catalogue <span className="text-primary">✦</span>.
            </CreditCard>
            <CreditCard title="Pro+" dark>
              1 credit every quarter, or 5 a year on yearly (worth ~<span className={PRICE}>$200</span>). Redeem across the full catalogue.
            </CreditCard>
          </div>
          <div className="fadeup flex">
            <Button className="tracking-normal!" text="Compare plans" href="/pricing#compare" />
          </div>
        </section>
      </div>

      {/* ---------- FAQ (from /templates) ---------- */}
      {faqItems.length > 0 && (
        <div className="w-full bg-foreground pb-[5vw]">
          <FAQ faqItems={faqItems} translateTop={false} />
        </div>
      )}

      <TemplatePreviewDrawer
        template={drawerTemplate}
        templates={templates}
        isWishlisted={(t) => wishlist.includes(t.slug)}
        hasAccess={(t) => accessSlugs.includes(t.slug)}
        onToggleWishlist={toggleWishlist}
        onClose={closeDrawer}
        onOpen={setDrawerTemplate}
        onBuy={buyFromDrawer}
      />
      {purchaseModals}
      {signInModal}

      <ToastViewport toast={toast} onDismiss={dismissToast} />
    </div>
  );
}

function CreditCard({ title, dark = false, className = "", children }) {
  return (
    <div className={`flex w-[calc((100%-1.8vw)/3)] flex-col gap-2 p-6 max-lg:w-[calc((100%-0.9vw)/2)] max-md:w-full ${dark ? "bg-ink text-light" : `bg-foreground ring-1 ring-inset ring-black/10 ${className}`}`}>
      <b className="type-h3 font-medium!">{title}</b>
      <p className={`type-body ${dark ? "text-light/60" : "text-black/60"}`}>{children}</p>
    </div>
  );
}

/** Segmented control for the dark hero: an orange block slides to the chosen option. */
function DarkSegment({ label, items, value, onChange, itemClassName }) {
  const index = Math.max(0, items.findIndex((item) => item.id === value));
  return (
    <div role="radiogroup" aria-label={label} className="relative flex gap-0.5 bg-foreground/6 p-0.75 ring-1 ring-inset ring-foreground/8 backdrop-blur-lg">
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute top-0.75 bottom-0.75 left-0.75 bg-primary transition-transform duration-700 ease-[cubic-bezier(.16,1,.3,1)] ${itemClassName}`}
        style={{ transform: `translateX(calc(${index} * (100% + 2px)))` }}
      />
      {items.map((item) => {
        const active = item.id === value;
        return (
          <button
            key={item.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(item.id)}
            className={`relative z-1 flex cursor-pointer items-center justify-center py-2.5 ${T16} transition-colors duration-500 ${itemClassName} ${
              active ? "text-background" : "text-foreground/60 hover:text-foreground"
            }`}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
