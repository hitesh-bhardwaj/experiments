"use client";

import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { prefersReducedMotion } from "@/lib/motion";
import { useInteraction } from "@/homepage/components/InteractionProvider";
import { setYearly, useBilling } from "./billing";

const ROLL_DURATION = 1.1;

export function Tick() {
  return (
    <i className="ok">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M5 12.5l4.2 4L19 7" />
      </svg>
    </i>
  );
}

export function Dash() {
  return (
    <i className="no">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M7 12h10" />
      </svg>
    </i>
  );
}

// Monthly/Yearly radio group with a pill that slides under the checked option
export function BillingToggle({ small = false, label = "Billing period", saving }) {
  const yearly = useBilling();
  const { sound } = useInteraction() ?? {};
  const rootRef = useRef(null);
  const pillRef = useRef(null);

  useLayoutEffect(() => {
    const root = rootRef.current;
    const placePill = () => {
      const on = root.querySelector('[aria-checked="true"]');
      if (!on) return;
      pillRef.current.style.width = `${on.offsetWidth}px`;
      pillRef.current.style.transform = `translateX(${on.offsetLeft - 4}px)`;
    };
    placePill();
    const ro = new ResizeObserver(placePill);
    ro.observe(root);
    return () => ro.disconnect();
  }, [yearly]);

  const choose = (value) => {
    if (value === yearly) return;
    setYearly(value);
    sound?.note?.(value ? 3 : 1);
  };

  return (
    <div ref={rootRef} className={`bill${small ? " bill--sm" : ""}`} role="radiogroup" aria-label={label}>
      <button type="button" role="radio" className="bill-o label" aria-checked={!yearly} onClick={() => choose(false)}>
        Monthly
      </button>
      <button type="button" role="radio" className="bill-o label" aria-checked={yearly} onClick={() => choose(true)}>
        Yearly {saving && <span className="bill-save">{saving}</span>}
      </button>
      <i ref={pillRef} className="bill-pill" aria-hidden="true" />
    </div>
  );
}

// A number that rolls to its new value (instantly under reduced motion)
export function RollingNumber({ value, format }) {
  const ref = useRef(null);
  const shownRef = useRef(value);

  useLayoutEffect(() => {
    const el = ref.current;
    const state = { v: shownRef.current };
    const write = () => { el.textContent = format(state.v); };
    if (prefersReducedMotion() || state.v === value) {
      state.v = value;
      shownRef.current = value;
      write();
      return undefined;
    }
    const tween = gsap.to(state, {
      v: value,
      duration: ROLL_DURATION,
      ease: "expo.out",
      onUpdate: () => { shownRef.current = state.v; write(); },
    });
    return () => tween.kill();
  }, [value, format]);

  return <span ref={ref}>{format(value)}</span>;
}
