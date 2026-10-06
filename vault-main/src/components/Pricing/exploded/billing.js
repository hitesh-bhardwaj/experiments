"use client";

import { useSyncExternalStore } from "react";

// One Monthly/Yearly choice for the whole pricing page: Plans, Compare and
// the Finder read and write it here. The hero's WebGL stacks aren't React, so
// every change is also broadcast as `vault:billing` (PricingHero listens).

let yearly = true;
const listeners = new Set();

export function setYearly(value) {
  if (value === yearly) return;
  yearly = value;
  listeners.forEach((fn) => fn());
  window.dispatchEvent(new CustomEvent("vault:billing", { detail: { yearly } }));
}

const subscribe = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};
const getSnapshot = () => yearly;
const getServerSnapshot = () => true;

export function useBilling() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
