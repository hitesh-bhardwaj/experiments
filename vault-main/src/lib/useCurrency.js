"use client";

import { useEffect, useState } from "react";

// The visitor's pricing currency ("USD" | "INR"). Server pages that already
// know it pass `initial`; anything else asks /api/pricing-region once per
// page load and shares the answer.
let resolved = null;
let pending = null;

function fetchCurrency() {
  if (!pending) {
    pending = fetch("/api/pricing-region")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        resolved = data?.currency === "INR" ? "INR" : "USD";
        return resolved;
      })
      .catch(() => "USD");
  }
  return pending;
}

// { currency, ready }: `ready` is false until the visitor's currency is known,
// so prices can show a skeleton instead of flashing USD before switching to INR.
export function useCurrencyState(initial) {
  const [state, setState] = useState(() => ({
    currency: initial || resolved || "USD",
    ready: Boolean(initial || resolved),
  }));

  useEffect(() => {
    if (initial) return undefined;
    let live = true;
    fetchCurrency().then((value) => {
      if (live) setState({ currency: value, ready: true });
    });
    return () => {
      live = false;
    };
  }, [initial]);

  return state;
}

export function useCurrency(initial) {
  return useCurrencyState(initial).currency;
}
