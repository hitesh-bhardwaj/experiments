"use client";

import { useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import LineReveal from "@/components/Animations/LineReveal";
import { useFadeUp } from "@/components/Animations/gsapAnimations";
import { useInteraction } from "@/homepage-v3/components/InteractionProvider";
import { prefersReducedMotion } from "@/lib/motion";
import RollNumber from "./RollNumber";
import RollText from "./RollText";

// Pro vs Pro+, line by line. Display only: Pro+, quarterly billing and
// template credits aren't in checkout yet. Prices match the plan cards above.
const PERIODS = [
  { id: "q", label: "Quarterly", billed: "Billed quarterly" },
  { id: "y", label: "Yearly", billed: "Billed yearly" },
];

const PRICES = {
  pro: { q: 9, y: 7.42 },
  plus: { q: 19, y: 14.92 },
};

// A string is shown as text, true / false as a tick / dash, and { q, y } follows the billing period
const ROWS = [
  { feature: "Components", pro: "All", plus: "All" },
  { feature: "Page sections", pro: false, plus: true },
  { feature: "Templates", pro: "Selected catalogue, via credits", plus: "Full catalogue, via credits" },
  { feature: "Template credits", pro: { q: "1 per year", y: "3 per year" }, plus: { q: "1 every quarter", y: "5 per year" } },
  { feature: "Component copies", pro: { q: "3 a day", y: "5 a day" }, plus: "Unlimited" },
  { feature: "Occasional freebies", pro: false, plus: true },
  { feature: "Priority access to new drops", pro: false, plus: true },
  { feature: "Hyperiux CLI install + auth", pro: true, plus: true },
  { feature: "Source code you own", pro: true, plus: true },
  { feature: "Commercial use", pro: true, plus: true },
  { feature: "Team & agency seats", pro: "Agency licensing", plus: "Agency licensing" },
];

const LABEL = "text-[0.7vw] uppercase tracking-[0.1em] max-md:text-[2.8vw]";
const CELL = "flex w-[30%] items-center px-[1.6vw] max-md:px-[4vw]";
const TEXT = "h-[1.7vw] text-[1.1vw] leading-[1.7vw] max-md:h-[6vw] max-md:text-[3.8vw] max-md:leading-[6vw]";

function Mark({ on }) {
  return (
    <i
      aria-label={on ? "Included" : "Not included"}
      className={`flex size-[1.8vw] items-center justify-center not-italic max-md:size-[6vw] ${on ? "bg-primary/15 text-primary" : "bg-background/5 text-background/30"}`}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="square" aria-hidden="true" className="size-[0.9vw] max-md:size-[3vw]">
        <path d={on ? "M5 12.5l4.2 4L19 7" : "M7 12h10"} />
      </svg>
    </i>
  );
}

function Cell({ value, period, dir }) {
  const v = value !== null && typeof value === "object" ? value[period] : value;
  return typeof v === "boolean" ? <Mark on={v} /> : <RollText fixed text={v} dir={dir} className={`w-full text-background/60 ${TEXT}`} />;
}

export default function PricingProCompare() {
  const rootRef = useRef(null);
  const toggleRef = useRef(null);
  const clipRef = useRef(null);
  const placed = useRef(false);
  const bodyRef = useRef(null);
  const hoverRef = useRef(null);
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

  // One highlight slides between the rows instead of each row lighting up on its own
  const hoverRow = (row) => {
    const bar = hoverRef.current;
    if (!bar) return;
    const vars = { y: row.offsetTop, height: row.offsetHeight };
    const hidden = Number(gsap.getProperty(bar, "opacity")) < 0.05;
    if (hidden || prefersReducedMotion()) gsap.set(bar, vars);
    else gsap.to(bar, { ...vars, duration: 0.6, ease: "expo.out", overwrite: "auto" });
    gsap.to(bar, { opacity: 1, duration: 0.4, ease: "power2.out", overwrite: "auto" });
  };
  const leaveRows = () => gsap.to(hoverRef.current, { opacity: 0, duration: 0.5, ease: "power2.out", overwrite: "auto" });

  const choose = (id) => {
    if (id === period) return;
    setPeriod(id);
    sound?.note?.(id === "y" ? 3 : 1);
  };

  return (
    <section ref={rootRef} id="compare" className="relative bg-foreground font-avenir text-background">
      <div className="flex flex-col gap-[3vw] px-[4.5vw] pt-[2vw] pb-[8vw] max-md:gap-[8vw] max-md:px-[5vw] max-md:pb-[16vw]">
        <div className="flex items-end justify-between gap-[2vw] max-md:flex-col max-md:items-start max-md:gap-[6vw]">
          <LineReveal as="h2" className="text64 leading-[1.2]!">
            Pro vs Pro+,<br />
            <span className="gradient-text-animate">line by line.</span>
          </LineReveal>

          <div ref={toggleRef} role="radiogroup" aria-label="Billing period" className="fadeup relative isolate flex w-fit border border-background/10 bg-background/10 p-[0.3vw] max-md:p-[1vw]">
            {PERIODS.map((p) => (
              <button
                key={p.id}
                type="button"
                role="radio"
                aria-checked={p.id === period}
                onClick={() => choose(p.id)}
                className={`cursor-pointer rounded-none px-[1.4vw] py-[0.8vw] text-background/60 max-md:px-[4.4vw] max-md:py-[2.8vw] ${LABEL}`}
              >
                {p.label}
              </button>
            ))}
            <div ref={clipRef} aria-hidden="true" className="pointer-events-none absolute inset-0 flex bg-background p-[0.3vw] max-md:p-[1vw]">
              {PERIODS.map((p) => (
                <span key={p.id} className={`px-[1.4vw] py-[0.8vw] text-foreground max-md:px-[4.4vw] max-md:py-[2.8vw] ${LABEL}`}>{p.label}</span>
              ))}
            </div>
          </div>
        </div>

        <div className="fadeup overflow-x-auto px-[3vw] max-md:px-0">
          <div role="table" aria-label="Pro and Pro+ compared" className="flex min-w-full flex-col border border-background/10 bg-foreground max-md:min-w-[170vw]">
            <div role="row" className="flex border-b border-background/10">
              <div role="columnheader" className="flex w-[40%] items-center px-[1.6vw] py-[2.2vw] text-[1.1vw] text-background/30 max-md:px-[4vw] max-md:py-[6vw] max-md:text-[3.8vw]">Feature</div>
              {[["pro", "Pro"], ["plus", "Pro+"]].map(([id, name]) => (
                <div key={id} role="columnheader" className={`${CELL} flex-col items-start justify-center gap-[0.6vw] py-[2.2vw] max-md:gap-[2vw] max-md:py-[6vw] ${id === "plus" ? "bg-primary/5" : ""}`}>
                  <p className="text-[1.6vw] max-md:text-[5.6vw]">{id === "plus" ? <>Pro<span className="text-primary">+</span></> : name}</p>
                  <p className={`flex items-center text-background/60 ${LABEL}`}>
                    <span className="flex h-[1.2vw] items-center leading-none max-md:h-[4vw]">$<RollNumber value={PRICES[id][period]} values={[PRICES[id].q, PRICES[id].y]} /></span>
                    <span>/mo ·&nbsp;</span>
                    <RollText fixed text={periodInfo.billed} dir={dir} className="h-[1.2vw] w-[10vw] leading-[1.2vw] max-md:h-[4vw] max-md:w-[34vw] max-md:leading-[4vw]" />
                  </p>
                </div>
              ))}
            </div>

            <div ref={bodyRef} className="relative" onPointerLeave={leaveRows}>
              <i ref={hoverRef} aria-hidden="true" className="pointer-events-none absolute top-0 left-0 z-10 h-0 w-full bg-background/5 opacity-0" />
              {ROWS.map((row) => (
                <div key={row.feature} role="row" className="flex border-b border-background/10 last:border-b-0" onPointerEnter={(e) => hoverRow(e.currentTarget)}>
                  <div role="rowheader" className="flex w-[40%] items-center px-[1.6vw] py-[1.4vw] text-[1.1vw] max-md:px-[4vw] max-md:py-[4.6vw] max-md:text-[3.8vw]">{row.feature}</div>
                  <div role="cell" className={`${CELL} py-[1.4vw] max-md:py-[4.6vw]`}>
                    <Cell value={row.pro} period={period} dir={dir} />
                  </div>
                  <div role="cell" className={`${CELL} bg-primary/5 py-[1.4vw] max-md:py-[4.6vw]`}>
                    <Cell value={row.plus} period={period} dir={dir} />
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
