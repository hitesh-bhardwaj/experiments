"use client";

import { useMemo, useRef, useState, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { motion } from "motion/react";
import HeadAnim from "@/components/Animations/HeadAnim";
import Copy from "@/components/Animations/Copy";
import { useFadeUp } from "@/components/Animations/gsapAnimations";
import { useToastQueue, ToastViewport } from "@/components/ui/Toast";
import FAQV3 from "@/homepage-v3/sections/FAQV3";
import ButtonV3 from "@/homepage-v3/components/ButtonV3";
import { useTemplateWishlist } from "../templates/useTemplateWishlist";
import { useTemplateAccess } from "../templates/useTemplateAccess";
import { TemplateCardV4 } from "./TemplateCardV4";
import { DISPLAY, GUTTER, LABEL, T13, T14, T16, T18, T20, T40, catalogueOf, priceOf } from "./tokens";

// three.js only loads when the corridor is shown.
const TemplateCorridor = dynamic(() => import("./TemplateCorridor"), {
  ssr: false,
  loading: () => <div className="h-svh" />,
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

const CHIP = `inline-flex h-8.5 shrink-0 cursor-pointer items-center px-3.5 ${T13} transition-[background-color,color,box-shadow] duration-500`;
const CHIP_OFF = "text-[#cfcfcf] shadow-[inset_0_0_0_1px_rgba(244,244,244,.14)] hover:shadow-[inset_0_0_0_1px_rgba(255,95,0,.6)]";
const CHIP_ON = "bg-[#F4F4F4] text-[#141414]";

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

const formatPrices = (prices) => {
  const list = prices.map((p) => `$${p}`);
  return list.length > 1 ? `${list.slice(0, -1).join(", ")} or ${list.at(-1)}` : list[0] || "";
};

/**
 * Sample Templates listing: the v4 design (public/v4/Templates — Hyperiux
 * Vault (1).html, sidebar left out) merged with the live /templates page.
 *
 * From v4: the split hero with stats, the Corridor / Grid view switch, the 3D
 * corridor, catalogue filters, browser-frame cards and the template credits
 * section. From /templates: the real catalogue, approved description and FAQ,
 * view counts, Save (wishlist), and the Buy / Download flow with its paywall.
 */
export function TemplatesListingV4({ templates = [], description = "", faqItems = [] }) {
  const rootRef = useRef(null);
  const [category, setCategory] = useState("All");
  const [catalogue, setCatalogue] = useState("all");
  const [chosenView, setChosenView] = useState(null);
  const [glFailed, setGlFailed] = useState(false);

  const corridorOk = useSyncExternalStore(subscribeCorridor, canShowCorridor, () => true) && !glFailed;
  const view = corridorOk ? chosenView || "corr" : "grid";

  const { toast, showToast, dismissToast } = useToastQueue();
  const { wishlist, toggleWishlist } = useTemplateWishlist({
    onSaved: (t) => showToast({ title: `${t.title} saved`, description: "You'll find it in your dashboard's My Templates." }),
    onRemoved: (t) => showToast({ title: `${t.title} removed`, description: "No longer in your saved templates." }),
  });
  const accessSlugs = useTemplateAccess();

  useFadeUp(rootRef);

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
    [prices.length ? `$${prices[0]}` : "-", "From, or 1 credit"],
    [categories.length - 1, "Industries"],
  ];

  const clearFilters = () => {
    setCategory("All");
    setCatalogue("all");
  };

  return (
    <div ref={rootRef} className="relative text-[#F4F4F4]">
      {/* ---------- hero ---------- */}
      <section className={`${GUTTER} pt-36 pb-12 max-[1025px]:pt-32 max-md:pt-28`}>
        <nav aria-label="Breadcrumb" className={`fadeup ${LABEL} flex gap-2.5 text-[#7d7d7d]`}>
          <Link href="/" className="transition-colors duration-500 hover:text-white">
            Vault
          </Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page" className="text-[#ff5f00]">
            Templates
          </span>
        </nav>

        <div className="mt-7 grid grid-cols-[minmax(0,1.2fr)_minmax(0,.8fr)] items-end gap-12 max-[1025px]:grid-cols-1 max-[1025px]:gap-10">
          <HeadAnim rotate={0} animateOnScroll={false}>
            <h1 className={`${DISPLAY} max-w-[45vw] text-[6vw] leading-[0.95]! max-[1025px]:max-w-none max-[1025px]:text-[9vw] max-md:text-[13vw]`}>
              Whole sites. <span className="gradient-text-animate">Ready to ship.</span>
            </h1>
          </HeadAnim>

          <div className="grid gap-6">
            <Copy animateOnScroll={false} delay={0.3}>
              <p className={`max-w-[34vw] ${T16} text-[#bdbdbd] max-[1025px]:max-w-[70vw] max-md:max-w-none`}>
                {description} Buy one outright, or redeem a template credit from your plan.
              </p>
            </Copy>
            <div className={`fadeup ${LABEL} flex flex-wrap gap-x-7.5 gap-y-2.5`}>
              {stats.map(([value, label]) => (
                <p key={label}>
                  <b className={`${DISPLAY} block text-[2.4vw] leading-none text-[#F4F4F4] tabular-nums max-[1025px]:text-[4.5vw] max-md:text-[8vw]`}>
                    {value}
                  </b>
                  <span className="text-[1vw] text-white/60 max-[1025px]:text-[1.8vw] max-md:text-[3.6vw]">{label}</span>
                </p>
              ))}
            </div>
          </div>
        </div>

        {/* view · category · catalogue */}
        <div className="fadeup mt-14 flex flex-wrap items-center gap-3.5 max-md:mt-10">
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
          <div role="group" aria-label="Catalogue" className="ml-auto flex flex-wrap gap-1.5 max-[1025px]:ml-0">
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
        </div>
      </section>

      {/* ---------- corridor ---------- */}
      {view === "corr" && filtered.length > 0 && <TemplateCorridor templates={filtered} onUnsupported={() => setGlFailed(true)} />}

      {/* ---------- grid + credits sheet ---------- */}
      <div data-sound-hover="off" data-sound-flow="off" className="relative bg-[#F4F4F4] text-[#1D1D1D]">
        <section id="templates-grid" className={`${GUTTER} pt-24 max-md:pt-14`}>
          <div className="fadeup mb-8 flex items-end justify-between gap-4">
            <h2 className={`${DISPLAY} ${T40} leading-[1.02]`}>
              All <span className="gradient-text-animate">templates.</span>
            </h2>
            <p aria-live="polite" className={`${LABEL} text-[#6B6B6B]`}>
              {filtered.length} of {templates.length} templates
            </p>
          </div>

          {filtered.length === 0 ? (
            <div className="grid justify-items-center gap-3.5 px-4 py-20 text-center">
              <b className={`${DISPLAY} ${T20}`}>No templates match that filter yet.</b>
              <p className={`${T16} text-[#6B6B6B]`}>New templates land in the vault regularly.</p>
              <button
                type="button"
                onClick={clearFilters}
                className={`${LABEL} h-11 cursor-pointer px-5 shadow-[inset_0_0_0_1px_rgba(29,29,29,.1)] transition-shadow duration-500 hover:shadow-[inset_0_0_0_1px_#ff5f00]`}
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-x-5 gap-y-14 max-md:grid-cols-1 max-md:gap-y-12">
              {filtered.map((template, index) => (
                <motion.div key={template.slug} layout transition={CARD_LAYOUT_TRANSITION}>
                  <TemplateCardV4
                    template={template}
                    priority={index < 2}
                    isWishlisted={wishlist.includes(template.slug)}
                    onToggleWishlist={toggleWishlist}
                    hasAccess={accessSlugs.includes(template.slug)}
                  />
                </motion.div>
              ))}
            </div>
          )}
        </section>

        {/* template credits */}
        <section className={`${GUTTER} grid gap-7 pt-32 pb-28 max-md:pt-20 max-md:pb-20`}>
          <div className="fadeup grid gap-3">
            <p className={`${LABEL} flex items-center gap-2.5 text-[#6B6B6B]`}>
              <span aria-hidden="true" className="size-1.25 rounded-full bg-[#ff5f00]" />
              Template credits
            </p>
            <h2 className={`${DISPLAY} ${T40} leading-[1.02]`}>
              One credit. <span className="gradient-text-animate">One whole site.</span>
            </h2>
          </div>
          <div className="fadeup grid grid-cols-4 gap-3.5 max-[1025px]:grid-cols-2 max-md:grid-cols-1">
            <CreditCard title="No plan needed" className="bg-[#fff4ea] shadow-[inset_0_0_0_1px_rgba(255,95,0,.35)]">
              Buy any template outright{prices.length ? ` for ${formatPrices(prices)}` : ""}. One payment, and the source is yours.
            </CreditCard>
            <CreditCard title="1 credit = 1 template">Every page, section and interaction, as source code you own.</CreditCard>
            <CreditCard title="Pro">
              1 credit a year on quarterly billing, 3 a year on yearly. Redeem across the selected catalogue <span className="text-[#B84A00]">✦</span>.
            </CreditCard>
            <CreditCard title="Pro+" dark>
              1 credit every quarter, or 5 a year on yearly (worth ~$200). Redeem across the full catalogue.
            </CreditCard>
          </div>
          <div className="fadeup flex">
            <ButtonV3 className="tracking-normal!" text="Compare plans" href="/pricing" />
          </div>
        </section>
      </div>

      {/* ---------- FAQ (from /templates) ---------- */}
      {faqItems.length > 0 && (
        <div className="w-full bg-white pb-[5vw]">
          <FAQV3 faqItems={faqItems} translateTop={false} />
        </div>
      )}

      <ToastViewport toast={toast} onDismiss={dismissToast} />
    </div>
  );
}

function CreditCard({ title, dark = false, className = "", children }) {
  return (
    <div className={`p-6 ${dark ? "bg-[#1D1D1D] text-[#F4F4F4]" : `bg-white shadow-[inset_0_0_0_1px_rgba(29,29,29,.1)] ${className}`}`}>
      <b className={`${DISPLAY} ${T18} font-medium`}>{title}</b>
      <p className={`mt-2 ${T14} ${dark ? "text-[#bdbdbd]" : "text-[#6B6B6B]"}`}>{children}</p>
    </div>
  );
}

/** Segmented control for the dark hero: an orange block slides to the chosen option. */
function DarkSegment({ label, items, value, onChange, itemClassName }) {
  const index = Math.max(0, items.findIndex((item) => item.id === value));
  return (
    <div role="radiogroup" aria-label={label} className="relative flex gap-0.5 bg-white/6 p-0.75 shadow-[inset_0_0_0_1px_rgba(244,244,244,.08)]">
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute top-0.75 bottom-0.75 left-0.75 bg-[#ff5f00] transition-transform duration-700 ease-[cubic-bezier(.16,1,.3,1)] ${itemClassName}`}
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
            className={`relative z-1 grid h-8.5 cursor-pointer place-items-center ${T14} transition-colors duration-500 ${itemClassName} ${
              active ? "text-[#141414]" : "text-[#a9a9a9] hover:text-white"
            }`}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
