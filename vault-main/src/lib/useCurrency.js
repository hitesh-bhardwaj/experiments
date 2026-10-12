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

export function useCurrency(initial) {
  const [currency, setCurrency] = useState(initial || resolved || "USD");

  useEffect(() => {
    if (initial) return undefined;
    let live = true;
    fetchCurrency().then((value) => {
      if (live) setCurrency(value);
    });
    return () => {
      live = false;
    };
  }, [initial]);

  return currency;
}
