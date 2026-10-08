"use client";

import { useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import LineReveal from "@/components/Animations/LineReveal";
import { useFadeUp } from "@/components/Animations/gsapAnimations";
import Button from "@/homepage/components/Button";
import { useInteraction } from "@/homepage/components/InteractionProvider";
import { prefersReducedMotion } from "@/lib/motion";
import CreditTiles from "./CreditTiles";
import ReasonList from "./ReasonList";
import RollNumber from "./RollNumber";
import RollText from "./RollText";

const HEADER_OFFSET = 96;

// Same plans and prices as PricingPlansHome (display only: Pro+, quarterly
// billing and template credits aren't in checkout yet).
const PLANS = {
  pro: {
    name: "Pro",
    y: { month: 7.42, billed: "$89 billed yearly", copies: 5, credits: 3, catalogue: "selected catalogue" },
    q: { month: 9, billed: "$27 billed every 3 months", copies: 3, credits: 1, catalogue: "selected catalogue" },
    yearlySaving: 19,
  },
  plus: {
    name: "Pro+",
    y: { month: 14.92, billed: "$179 billed yearly", copies: Infinity, credits: 5, catalogue: "full catalogue" },
    q: { month: 19, billed: "$57 billed every 3 months", copies: Infinity, credits: 4, catalogue: "full catalogue" },
    yearlySaving: 49,
  },
};

// Plan + billing for the answers, with the reasons shown to the visitor
function recommend({ templates, copies, sections }) {
  const needsPlus = sections || copies > PLANS.pro.y.copies || templates > PLANS.pro.y.credits;
  const key = needsPlus ? "plus" : "pro";
  // Light use can start quarterly; everything else is cheaper yearly
  const period = !needsPlus && templates === 0 && copies <= PLANS.pro.q.copies ? "q" : "y";
  const plan = PLANS[key], tier = plan[period];
  const label = `${plan.name} ${period === "y" ? "yearly" : "quarterly"}`;

  const why = [];
  const num = (n, values) => ({ n, values });
  if (sections) why.push({ id: "sections", parts: ["Full page sections come with Pro+."] });
  if (tier.copies === Infinity) {
    // One wording for every count, so the row doesn't reword while the sliders glide past Pro's limit
    why.push({ id: "copies", parts: [num(copies, [1, 10]), ` copies a day, unlimited on Pro+ (Pro stops at ${PLANS.pro.y.copies}).`] });
  } else {
    why.push({ id: "copies", parts: [num(copies, [1, 10]), ` copies a day fits inside ${label}'s `, num(tier.copies, [3, 5]), "-a-day limit."] });
  }
  if (templates > 0) {
    why.push({
      id: "templates",
      parts:
        templates <= tier.credits
          ? ["Your ", num(templates, [1, 6]), templates > 1 ? " templates" : " template", ` fit inside ${label}'s `, num(tier.credits, [1, 5]), tier.credits > 1 ? " credits" : " credit", ` (${tier.catalogue}).`]
          : ["Your ", num(templates, [1, 6]), ` templates are more than ${label}'s `, num(tier.credits, [1, 5]), " credits, so extra ones are on you."],
    });
  }
  why.push({
    id: "saving",
    parts:
      period === "y"
        ? [`Yearly saves $`, num(plan.yearlySaving, [19, 49]), " against quarterly and adds those ", num(tier.credits, [1, 5]), " template credits."]
        : ["Quarterly keeps it light. Go yearly any time for more credits and copies."],
  });

  return { key, period, plan, tier, label, why };
}

const LABEL = "text-[0.7vw] uppercase tracking-[0.1em] max-md:text-[2.8vw]";
// The homepage's tune slider: a thin track that fills with the brand colour up to the thumb
const RANGE =
  "h-[1.4vw] w-full cursor-pointer appearance-none bg-transparent max-md:h-[6vw] " +
  "[&::-webkit-slider-runnable-track]:h-[0.2vw] [&::-webkit-slider-runnable-track]:bg-[linear-gradient(90deg,var(--primary)_var(--fill),color-mix(in_srgb,var(--foreground)_20%,transparent)_var(--fill))] max-md:[&::-webkit-slider-runnable-track]:h-[0.5vw] " +
  "[&::-webkit-slider-thumb]:-mt-[0.5vw] [&::-webkit-slider-thumb]:h-[1.2vw] [&::-webkit-slider-thumb]:w-[0.5vw] [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-none [&::-webkit-slider-thumb]:border-0 [&::-webkit-slider-thumb]:bg-primary max-md:[&::-webkit-slider-thumb]:-mt-[2.3vw] max-md:[&::-webkit-slider-thumb]:h-[5vw] max-md:[&::-webkit-slider-thumb]:w-[2vw] " +
  "[&::-moz-range-track]:h-[0.2vw] [&::-moz-range-track]:bg-foreground/20 max-md:[&::-moz-range-track]:h-[0.5vw] " +
  "[&::-moz-range-progress]:h-[0.2vw] [&::-moz-range-progress]:bg-primary max-md:[&::-moz-range-progress]:h-[0.5vw] " +
  "[&::-moz-range-thumb]:h-[1.2vw] [&::-moz-range-thumb]:w-[0.5vw] [&::-moz-range-thumb]:rounded-none [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-primary max-md:[&::-moz-range-thumb]:h-[5vw] max-md:[&::-moz-range-thumb]:w-[2vw]";
const fill = (v, min, max) => ({ "--fill": `${((v - min) / (max - min)) * 100}%` });

export default function PricingFinder() {
  const rootRef = useRef(null);
  const outRef = useRef(null);
  const { sound } = useInteraction() ?? {};
  // The thumbs sit at a continuous position (so they can glide); the answers are the whole step nearest to it
  const [pos, setPos] = useState({ templates: 2, copies: 4 });
  const templates = Math.round(pos.templates);
  const copies = Math.round(pos.copies);
  const [sections, setSections] = useState(false);
  // Turning full page sections on moves the sliders to a Pro+ sized setup; turning it off restores them
  const beforeSections = useRef(null);
  const posRef = useRef(pos);
  posRef.current = pos;
  const tweens = useRef({});
  const glideTo = (name, to, duration = 0.9) => {
    tweens.current[name]?.kill();
    if (prefersReducedMotion()) { setPos((p) => ({ ...p, [name]: to })); setTarget(null); return; }
    const proxy = { v: posRef.current[name] };
    tweens.current[name] = gsap.to(proxy, {
      v: to,
      duration,
      ease: "power3.inOut",
      onUpdate: () => setPos((p) => ({ ...p, [name]: proxy.v })),
      onComplete: () => setTarget(null),
    });
  };
  // Dragging follows the pointer freely, then settles on the nearest step on release
  const dragProps = (name) => ({
    onChange: (e) => {
      // Moving a slider by hand means the answers are no longer "I need full page sections"
      setSections(false);
      beforeSections.current = null;
      setTarget(null);
      tweens.current[name]?.kill(); setPos((p) => ({ ...p, [name]: +e.target.value }));
    },
    onPointerUp: () => glideTo(name, Math.round(posRef.current[name]), 0.3),
    onKeyUp: () => glideTo(name, Math.round(posRef.current[name]), 0.3),
  });
  // While the toggle glides the sliders, the recommendation reads the answers they are heading to,
  // so the plan and its reasons change once instead of at every step the thumbs pass
  const [target, setTarget] = useState(null);
  const toggleSections = () => {
    let to = null;
    if (!sections) {
      beforeSections.current = { templates, copies };
      to = { templates: 5, copies: 8 };
    } else if (beforeSections.current) {
      to = beforeSections.current;
      beforeSections.current = null;
    }
    if (to) {
      setTarget(to);
      glideTo("templates", to.templates);
      glideTo("copies", to.copies);
    }
    setSections(!sections);
  };
  const rec = recommend({ ...(target ?? { templates, copies }), sections });
  const key = rec.key + rec.period;

  useFadeUp(rootRef);

  // The plan name changes width (Pro / Pro+), so the tag beside it slides to its
  // new spot instead of jumping: watch the name resize, tween the difference.
  const tagRef = useRef(null);
  useLayoutEffect(() => {
    const tag = tagRef.current;
    const name = tag?.previousElementSibling;
    if (!tag || !name || typeof ResizeObserver === "undefined") return undefined;
    // Tween by how much the name itself grew or shrank. The observer also fires once on
    // observe and when fonts finish loading, which must not slide the tag in from afar.
    let width = name.offsetWidth;
    let started = false;
    const ro = new ResizeObserver(() => {
      const next = name.offsetWidth;
      const delta = next - width;
      width = next;
      if (!started) { started = true; return; }
      if (delta && !prefersReducedMotion()) {
        const from = (gsap.getProperty(tag, "x") || 0) - delta;
        gsap.fromTo(tag, { x: from }, { x: 0, duration: 0.9, ease: "expo.out", overwrite: "auto" });
      }
    });
    ro.observe(name);
    return () => ro.disconnect();
  }, []);

  // Only a changed recommendation animates, not every slider tick
  useGSAP(() => {
    if (prefersReducedMotion()) return;
    gsap.fromTo(outRef.current.querySelectorAll("[data-pick]"), { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.9, ease: "expo.out" });
  }, { dependencies: [key], scope: outRef, revertOnUpdate: true });

  return (
    <section ref={rootRef} id="finder" className="relative px-[4.5vw] py-[7%] max-md:py-[15%] text-foreground max-md:px-[6vw]">
      <div className="mx-auto flex w-full max-w-[1536px] items-center justify-between gap-[3vw] max-md:flex-col max-md:items-stretch max-md:gap-[10vw]">
      <div className="flex w-[40%] flex-col gap-[1.8vw] max-md:w-full max-md:gap-[5vw]">
        <LineReveal as="h2" className={`type-h1 text-foreground w-[80%] max-md:w-[80%]`}>
          Not Sure? <span className="gradient-text-animate">Let’s Size it.</span>
        </LineReveal>
        <p className={`fadeup text22 font-avenir leading-[1.6] w-[80%] text-foreground/60 max-md:w-full`}>
          Tell us how you build. We’ll point you to the plan that fits, and show you exactly why.
        </p>
      </div>

      <div className="fadeup flex w-[55%] items-stretch border border-foreground/10 bg-dark-card/60 max-md:w-full max-md:flex-col">
        <div className="flex w-[50%] flex-col justify-between gap-[2.4vw] p-[2.4vw] max-md:w-full max-md:gap-[8vw] max-md:p-[6vw]">
          <div className="flex flex-col gap-[2.4vw] max-md:gap-[8vw]">
          <div className="flex flex-col gap-[0.6vw] max-md:gap-[2vw]">
            <label htmlFor="fd-templates" className={`flex items-center justify-between gap-[1vw] text-foreground/60 ${LABEL}`}>
              <span>Templates you’ll launch this year</span>
              <output htmlFor="fd-templates" className="flex shrink-0 justify-end text-foreground"><RollNumber value={templates} values={[0, 6]} /></output>
            </label>
            <input id="fd-templates" type="range" min="0" max="6" step="any" value={pos.templates} {...dragProps("templates")} style={fill(pos.templates, 0, 6)} className={RANGE} />
          </div>
          <div className="flex flex-col gap-[0.6vw] max-md:gap-[2vw]">
            <label htmlFor="fd-copies" className={`flex items-center justify-between gap-[1vw] text-foreground/60 ${LABEL}`}>
              <span>Components you copy on a busy day</span>
              <output htmlFor="fd-copies" className="flex shrink-0 justify-end text-foreground"><RollNumber value={copies} values={[1, 10]} /></output>
            </label>
            <input id="fd-copies" type="range" min="1" max="10" step="any" value={pos.copies} {...dragProps("copies")} style={fill(pos.copies, 1, 10)} className={RANGE} />
          </div>
          </div>
          <Button
            text="I need full page sections"
            variant={sections ? "orange" : "outline"}
            preventDefault
            ariaLabel={`I need full page sections, ${sections ? "on" : "off"}`}
            onClick={() => { toggleSections(); sound?.note?.(sections ? 1 : 3); }}
            className={`w-fit max-md:w-full max-md:justify-center ${sections ? "border border-transparent" : ""}`}
          />
        </div>

        <div ref={outRef} aria-live="polite" className="flex w-[50%] flex-col gap-[1.2vw] border-l border-foreground/10 p-[2.4vw] max-md:w-full max-md:gap-[4vw] max-md:border-t max-md:border-l-0 max-md:p-[6vw]">
          <p data-pick className={`text-foreground/50 ${LABEL}`}>We’d pick</p>
          <div className={`text80 flex items-center gap-[1vw] text-foreground max-md:gap-[3vw]`}>
            <RollText text={rec.plan.name} dir={rec.key === "plus" ? 1 : -1} className="pb-[0.1em]" />
            <span ref={tagRef} className={`bg-primary/20 px-[0.7vw] py-[0.4vw] text-primary-hover max-md:px-[2vw] max-md:py-[1vw] ${LABEL}`}>
              {rec.period === "y" ? "Yearly" : "Quarterly"}
            </span>
          </div>
          <p className={`text22 font-avenir leading-[1.6] flex items-baseline text-foreground`}>
            <span className="flex items-baseline">$<span className="relative top-[0.1em]"><RollNumber value={rec.tier.month} values={[7.42, 9, 14.92, 19]} /></span></span>
            <span data-pick className="text-foreground/50">/mo · {rec.tier.billed}</span>
          </p>
          <CreditTiles count={rec.tier.credits} used={templates} />
          <ReasonList items={rec.why} />
          <div>
            <Button
              variant="orange"
              href="#plans"
              scrollOffset={HEADER_OFFSET}
              ariaLabel={`Start ${rec.label}`}
              className="max-md:w-full max-md:justify-center"
            >
              <RollText text={`Start ${rec.label}`} dir={rec.key === "plus" ? 1 : -1} />
            </Button>
          </div>
        </div>
      </div>
      </div>
    </section>
  );
}
