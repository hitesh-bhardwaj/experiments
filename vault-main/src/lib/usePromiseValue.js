"use client";

import { useEffect, useState } from "react";

/**
 * Reads a promise handed down from a server component without suspending:
 * returns `pending` until it settles, then its value (or `fallback` if it
 * rejected). Lets the page render and work straight away while a slow value
 * (Supabase counts, the user's plan) streams in behind a skeleton.
 * A plain (non-promise) value is returned as is.
 */
export function usePromiseValue(promise, { pending, fallback } = {}) {
  const isPromise = typeof promise?.then === "function";
  const [state, setState] = useState(() => ({ promise, status: isPromise ? "pending" : "done", value: promise }));

  // A new promise (e.g. a fresh server render) starts over as pending.
  if (state.promise !== promise) {
    setState({ promise, status: isPromise ? "pending" : "done", value: promise });
  }

  useEffect(() => {
    if (!isPromise) return undefined;
    let active = true;
    promise.then(
      (value) => active && setState({ promise, status: "done", value }),
      () => active && setState({ promise, status: "failed", value: undefined }),
    );
    return () => {
      active = false;
    };
  }, [promise, isPromise]);

  if (state.status === "pending") return pending;
  if (state.status === "failed") return fallback;
  return state.value;
}
