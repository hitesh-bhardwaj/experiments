"use client";

import React, { useMemo } from "react";
import SplitLine from "../WebsiteComps/SplitLine";
import LineReveal from "../Animations/LineReveal";

// Same map/shape as PricingV3.jsx and Pricing.jsx - each pricing-displaying
// component keeps its own local copy rather than a shared constants module,
// matching this codebase's existing pattern (Pricing.jsx duplicates this
// exact map already).
const PRICING = {
  USD: { symbol: "$", monthly: 20, yearly: 179 },
  INR: { symbol: "₹", monthly: 999, yearly: 8999 },
};

const BASE_ROWS = [
  { feature: "Effects included", free: "50+ effects", pro: "Full library, all categories", proHighlight: true },
  { feature: "New effects", free: null, pro: "Added monthly", proHighlight: true },
  { feature: "Scroll & text effects", free: true, pro: true },
  { feature: "Cursor effects", free: false, pro: true },
  { feature: "WebGL scenes", free: false, pro: true },
  { feature: "Advanced page transitions", free: false, pro: true },
  { feature: "CLI install", free: true, pro: true },
  { feature: "Source code ownership", free: true, pro: true },
  { feature: "Commercial use", free: "Free core, where marked", pro: "Full commercial use", proHighlight: true },
  { feature: "Updates & fixes", free: "Community cadence", pro: "Priority", proHighlight: true },
  { feature: "Support", free: "GitHub / community", pro: "Email support", proHighlight: true },
  { feature: "Team / agency use", free: "Individual use", pro: "Per seat - agency licensing available", proHighlight: true },
];

function Tick() {
  return (
    <svg
      viewBox="0 0 18 18"
      fill="none"
      className="w-[1.1vw] h-[1.1vw] max-[1025px]:w-4 max-[1025px]:h-4 shrink-0"
      aria-hidden="true"
    >
      <path
        d="M3.5 9.4L7.2 13L14.8 4.8"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Dash() {
  return <span className="text-white/25 text-[1.1vw] max-[1025px]:text-base">-</span>;
}

function Cell({ value, isPro = false, highlight = false }) {
  if (value === true) {
    return (
      <span className={isPro ? "text-primary" : "text-white/50"}>
        <Tick />
      </span>
    );
  }
  if (!value) return <Dash />;
  return (
    <span className={`text24 max-[1025px]:text-[3.5vw] max-md:text-sm leading-snug ${highlight ? "text-primary font-medium" : "text-white/50"}`}>
      {value}
    </span>
  );
}

export default function PricingCompareTable({ isIndia = false }) {
  const currency = isIndia ? "INR" : "USD";
  const { symbol, monthly, yearly } = PRICING[currency];

  const rows = useMemo(
    () => [
      ...BASE_ROWS,
      {
        feature: "Price",
        free: `${symbol}0 forever`,
        pro: `${symbol}${monthly}/mo or ${symbol}${yearly}/yr`,
        proHighlight: true,
      },
    ],
    [symbol, monthly, yearly]
  );

  return (
    <section className="w-screen pb-[30vw] max-md:pb-[40vw]! overflow-hidden text-white px-[5vw] py-[8vw] max-[1025px]:px-0 max-[1025px]:pt-0 max-[1025px]:pb-[15vw] relative z-10">

      {/* Heading */}
      <LineReveal
        as="h2"
        className="text110 text-center mb-[6vw] max-md:mb-[12vw] w-[75vw] max-[1025px]:w-[80%] mx-auto"
      >
        <span className="gradient-text-animate">Free vs. Pro,</span> feature by feature.
      </LineReveal>

      {/* Table card */}
      <div className="w-full font-neue-haas! h-fit max-[1025px]:overflow-x-scroll max-[1025px]:pb-[7vw] max-[1025px]:px-[7vw] fadeup">
        <div className="mx-auto w-full max-w-[82vw] border border-white/8 overflow-hidden  max-md:max-w-[240vw] max-md:w-[240vw] max-[1025px]:max-w-[150vw] max-[1025px]:w-[150vw]">

          {/* Column headers */}
          <div className="grid grid-cols-[2.2fr_1fr_1fr] max-[1025px]:grid-cols-[25%_40%_35%] max-md:grid-cols-[25%_40%_35%] bg-white/4 px-[2.5vw] py-[1.3vw] max-[1025px]:px-6 max-[1025px]:py-4 border-b border-white/8">
            <span className=" text-[1.2vw] max-[1025px]:text-[3vw] max-md:text-[5vw] text-white/50 uppercase">
              Feature
            </span>
            <span className=" text-[1.2vw] max-[1025px]:text-[3vw] max-md:text-[5vw] text-white/50 uppercase text-center">
              Free
            </span>
            <span className=" text-[1.2vw] max-[1025px]:text-[3vw] max-md:text-[5vw] text-white/50 uppercase text-center">
              Pro
            </span>
          </div>

          {/* Rows */}
          {rows.map((row, i) => (
            <div
              key={row.feature}
              className={`grid grid-cols-[2.2fr_1fr_1fr] max-[1025px]:grid-cols-[25%_40%_35%] max-md:grid-cols-[25%_40%_35%] items-center px-[2.5vw] py-[1.4vw] max-[1025px]:px-6 max-[1025px]:py-4 border-t border-white/6 ${i % 2 !== 0 ? "bg-white/2" : ""
                }`}
            >
              <span className="text24 max-[1025px]:text-sm text-white/80 pr-[2vw]">
                {row.feature}
              </span>
              <span className="flex items-center justify-center">
                <Cell value={row.free} />
              </span>
              <span className="flex items-center justify-center text-center">
                <Cell value={row.pro} isPro highlight={row.proHighlight} />
              </span>
            </div>
          ))}
        </div>

      </div>

      {/* Footer note */}
      <SplitLine
        as="p"
        className="text24 max-[1025px]:text-sm text-center mt-[3vw] max-[1025px]:mt-[8vw] max-[1025px]:px-[10vw]"
      >
        All plans include source code you own. No black boxes.
      </SplitLine>
    </section>
  );
}
