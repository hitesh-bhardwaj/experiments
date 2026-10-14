"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import LineReveal from "@/components/Animations/LineReveal";
import { useFadeUp } from "@/components/Animations/gsapAnimations";
import { useInteraction } from "@/homepage/components/InteractionProvider";
import { prefersReducedMotion } from "@/lib/motion";
import RollNumber from "./RollNumber";
import RollText from "./RollText";
import { useCurrencyState } from "@/lib/useCurrency";
import { Skeleton } from "@/components/ui/Skeleton";
import { CURRENCY_SYMBOLS, PLANS, getCreditsPerYear, getMonthlyEquivalent } from "@/lib/plans";

// Pro vs Pro+, line by line. Prices, credits and install limits come from
// lib/plans.js, like the plan cards above.
const PERIODS = [
  { id: "q", label: "Quarterly", billed: "Billed quarterly" },
  { id: "y", label: "Yearly", billed: "Billed yearly" },
];

function pricesFor(currency) {
  const month = (tier) => ({
    q: getMonthlyEquivalent(tier, "quarterly", currency),
    y: getMonthlyEquivalent(tier, "yearly", currency),
  });
  return { pro: month("pro"), plus: month("pro_plus") };
}

const credits = (tier, interval) => {
  const n = getCreditsPerYear(tier, interval);
  return n ? `${n} per year` : "Yearly billing only";
};

// A string is shown as text, true / false as a tick / dash, and { q, y } follows the billing period
const ROWS = [
  { feature: "Components", pro: "All", plus: "All" },
  { feature: "Templates", pro: "Selected catalogue, via credits", plus: "Full catalogue, via credits" },
  { feature: "Template credits", pro: { q: credits("pro", "quarterly"), y: credits("pro", "yearly") }, plus: { q: "1 every quarter", y: credits("pro_plus", "yearly") } },
  { feature: "Installs a day (copies, CLI & MCP)", pro: `${PLANS.pro.installsPerDay} a day`, plus: `${PLANS.pro_plus.installsPerDay} a day` },
  { feature: "Occasional freebies", pro: false, plus: true },
  { feature: "Priority access to new drops", pro: false, plus: true },
  { feature: "Hyperiux CLI install + auth", pro: true, plus: true },
  { feature: "Source code you own", pro: true, plus: true },
  { feature: "Commercial use", pro: true, plus: true },
  { feature: "Team & agency seats", pro: "Agency licensing", plus: "Agency licensing" },
];

const LABEL = "type-label";
const CELL = "flex w-[30%] items-center justify-center text-center px-[calc(var(--cvw)*1.6)] max-md:w-[40vw] max-md:px-[3vw]";
// Pro+ is a solid dark column; its row lines are drawn on the cells so they stay dark too
const PLUS = "bg-ink text-foreground border-foreground/10";
const TEXT = "type-body h-[1.7em]";

// Same tick as the Pricing Plans cards (orange square, white check); a muted dash when not included
function Mark({ on }) {
  return on ? (
    <i className="flex size-5 shrink-0 items-center justify-center bg-primary not-italic text-foreground" aria-label="Included">
      <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M5 12.5l4.2 4L19 7" />
      </svg>
    </i>
  ) : (
    <i className="flex size-5 shrink-0 items-center justify-center bg-black/10 not-italic text-black/20" aria-label="Not included">
      <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true">
        <path d="M6 12h12" />
      </svg>
    </i>
  );
}

function Cell({ value, period, dir, plus }) {
  const v = value !== null && typeof value === "object" ? value[period] : value;
  // Long text wraps to two lines on mobile, so its box is two lines tall
  const long = typeof v === "string" && v.length > 22;
  return typeof v === "boolean" ? <Mark on={v} /> : <RollText fixed text={v} dir={dir} className={`w-full text-center ${plus ? "text-foreground" : "text-black/60"} ${TEXT} ${long ? "max-lg:h-[3.3em]" : ""}`} />;
}

export default function PricingProCompare({ currency: initialCurrency }) {
  const { currency, ready: currencyReady } = useCurrencyState(initialCurrency);
  const prices = useMemo(() => pricesFor(currency), [currency]);
  const rootRef = useRef(null);
  const toggleRef = useRef(null);
  const clipRef = useRef(null);
  const placed = useRef(false);
  const { sound } = useInteraction() ?? {};
  const [period, setPeriod] = useState("q");
  // Going to yearly rolls the values up, back to quarterly rolls them down
  const dir = period === "y" ? 1 : -1;
  const periodInfo = PERIODS.find((p) => p.id === period);

  useFadeUp(rootRef);

  // The dark pill glides under the chosen period. It is a light copy of the
  // labels clipped to the chosen option, so the fill and the text move as one.
  useLayoutEffect(() => {
    const root = toggleRef.current;
    const place = (animate) => {
      const on = root.querySelector('[aria-checked="true"]');
      if (!on || !clipRef.current) return;
      const { offsetLeft: l, offsetTop: t, offsetWidth: w, offsetHeight: h } = on;
      const clipPath = `inset(${t}px ${root.clientWidth - l - w}px ${root.clientHeight - t - h}px ${l}px)`;
      if (animate && placed.current && !prefersReducedMotion()) gsap.to(clipRef.current, { clipPath, duration: 0.8, ease: "expo.out", overwrite: true });
      else gsap.set(clipRef.current, { clipPath });
      placed.current = true;
    };
    place(true);
    // Only real resizes re-place it: the observer's first callback would snap an animation to its end
    let ready = false;
    const ro = new ResizeObserver(() => { if (ready) place(false); ready = true; });
    ro.observe(root);
    return () => ro.disconnect();
  }, [period]);

  const choose = (id) => {
    if (id === period) return;
    setPeriod(id);
    sound?.note?.(id === "y" ? 3 : 1);
  };

  return (
    <section ref={rootRef} id="compare" data-sound-flow="off" className="section-x relative bg-light py-[7%] font-avenir text-ink">
      <div className="site-container flex flex-col gap-[calc(var(--cvw)*3)] max-md:gap-[10vw]">
        <div className="flex items-end justify-between gap-[calc(var(--cvw)*2)] max-md:flex-col max-md:items-start max-md:gap-[10vw]">
          <LineReveal as="h2" className="type-h1">
            Pro vs Pro+,<br />
            <span className="gradient-text-animate">Line by Line.</span>
          </LineReveal>

          <div ref={toggleRef} role="radiogroup" aria-label="Billing period" data-sound-hover="off" className="fadeup relative isolate flex w-fit bg-ink p-[calc(var(--cvw)*0.3)] max-lg:p-[0.6vw] max-md:p-[1vw]">
            {PERIODS.map((p) => (
              <button
                key={p.id}
                type="button"
                role="radio"
                aria-checked={p.id === period}
                onClick={() => choose(p.id)}
                className={`cursor-pointer rounded-none px-[calc(var(--cvw)*1.2)] py-[calc(var(--cvw)*0.7)] text-foreground max-lg:px-[2.4vw] max-lg:py-[1.4vw] max-md:px-[4vw] max-md:py-[2.4vw] ${LABEL}`}
              >
                {p.label}
              </button>
            ))}
            <div ref={clipRef} aria-hidden="true" className="pointer-events-none absolute inset-0 flex bg-foreground p-[calc(var(--cvw)*0.3)] max-lg:p-[0.6vw] max-md:p-[1vw]">
              {PERIODS.map((p) => (
                <span key={p.id} className={`px-[calc(var(--cvw)*1.2)] py-[calc(var(--cvw)*0.7)] text-ink max-lg:px-[2.4vw] max-lg:py-[1.4vw] max-md:px-[4vw] max-md:py-[2.4vw] ${LABEL}`}>{p.label}</span>
              ))}
            </div>
          </div>
        </div>

        <div className="fadeup overflow-x-auto">
          <div role="table" aria-label="Pro and Pro+ compared" className="flex min-w-full flex-col max-md:min-w-[116vw]">
            <div role="row" className="flex">
              <div role="columnheader" className="flex w-[40%] max-md:w-[36vw] items-start border-b border-black/10 py-[calc(var(--cvw)*2.2)] type-body max-md:px-[4vw] max-md:py-[6vw]">Feature</div>
              {[["pro", "Pro"], ["plus", "Pro+"]].map(([id, name]) => (
                <div key={id} role="columnheader" className={`${CELL} flex-col justify-start gap-[calc(var(--cvw)*0.6)] border-b py-[calc(var(--cvw)*2.2)] max-md:gap-[2vw] max-md:py-[6vw] ${id === "plus" ? PLUS : "border-black/10"}`}>
                  <p className="type-h3">{id === "plus" ? <>Pro<span className="text-primary">+</span></> : name}</p>
                  <div className={`flex items-center justify-center max-lg:flex-wrap ${id === "plus" ? "text-foreground" : "text-black/60"} ${LABEL}`}>
                    <span className="flex h-[calc(var(--cvw)*1.2)] items-center leading-none max-lg:h-[2.4vw] max-md:h-[4vw]">
                      {currencyReady ? <>{CURRENCY_SYMBOLS[currency]}<RollNumber value={prices[id][period]} values={[prices[id].q, prices[id].y]} /></> : <Skeleton className="h-[1em] w-10" />}
                    </span>
                    <span>/mo</span>
                    <span className="max-lg:hidden">&nbsp;·&nbsp;</span>
                    {currencyReady ? <RollText fixed text={periodInfo.billed} dir={dir} className="h-[calc(var(--cvw)*1.2)] w-[calc(var(--cvw)*10)] leading-[calc(var(--cvw)*1.2)] max-lg:h-[2.4vw] max-lg:w-full max-lg:leading-[2.4vw] max-md:h-[4vw] max-md:w-full max-md:leading-[4vw]" /> : <Skeleton className="h-[1em] w-[calc(var(--cvw)*8)] max-lg:w-24" />}
                  </div>
                </div>
              ))}
            </div>

            <div>
              {ROWS.map((row) => (
                <div key={row.feature} role="row" className="flex">
                  <div role="rowheader" className="flex w-[40%] max-md:w-[36vw] items-center border-b border-black/10 py-[calc(var(--cvw)*1.4)] type-body max-md:px-[4vw] max-md:py-[4.6vw]">{row.feature}</div>
                  <div role="cell" className={`${CELL} border-b border-black/10 py-[calc(var(--cvw)*1.4)] max-md:py-[4.6vw]`}>
                    <Cell value={row.pro} period={period} dir={dir} />
                  </div>
                  <div role="cell" className={`${CELL} ${PLUS} border-b py-[calc(var(--cvw)*1.4)] max-md:py-[4.6vw]`}>
                    <Cell value={row.plus} period={period} dir={dir} plus />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
