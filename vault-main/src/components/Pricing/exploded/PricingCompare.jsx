"use client";

import { useRef } from "react";
import LineReveal from "@/components/Animations/LineReveal";
import { useFadeUp } from "@/components/Animations/gsapAnimations";
import { useBilling } from "./billing";
import { COMPARE_ROWS, INDIA_TAX_NOTE, formatMoney, pricingFor } from "./plans";
import { BillingToggle, Dash, Tick } from "./shared";

function Cell({ value }) {
  if (value === true) return <Tick />;
  if (!value) return <Dash />;
  return value;
}

export default function PricingCompare({ isIndia = false }) {
  const rootRef = useRef(null);
  const yearly = useBilling();
  const pricing = pricingFor(isIndia);
  const proPrice = yearly
    ? `${pricing.symbol}${formatMoney(pricing.yearly, pricing)}/year`
    : `${pricing.symbol}${formatMoney(pricing.monthly, pricing)}/mo`;

  useFadeUp(rootRef);

  return (
    <section ref={rootRef} className="compare" id="compare">
      <div className="cmp-head">
        <LineReveal as="h2" className="display d2">
          Free vs Pro, <span className="gradient-text-animate">line by line.</span>
        </LineReveal>
        <BillingToggle small label="Billing period for comparison" />
      </div>
      {/* Scrolls sideways on narrow screens instead of widening the page */}
      <div className="ct-scroll fadeup">
        <div className="ct" role="table" aria-label="Plan comparison">
          <div className="ct-row ct-hd" role="row">
            <span className="ct-f" role="columnheader">Feature</span>
            <span className="ct-c" role="columnheader"><b>Free</b><span className="label">{pricing.symbol}0 forever</span></span>
            <span className="ct-c ct-plus" role="columnheader">
              <b>Pro</b>
              <span className="label">{proPrice}{isIndia && ` · ${INDIA_TAX_NOTE}`}</span>
            </span>
          </div>
          {COMPARE_ROWS.map((row) => (
            <div key={row.feature} className="ct-row" role="row">
              <span className="ct-f" role="rowheader">{row.feature}</span>
              <span className="ct-c" role="cell"><Cell value={row.free} /></span>
              <span className="ct-c ct-plus" role="cell"><Cell value={row.pro} /></span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
