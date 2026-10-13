"use client";

import { useEffect, useState } from "react";

/**
 * The visitor's plan, fetched on the client for cached (ISR) pages that can't
 * read the session on the server. "free" until it loads, so the page works
 * straight away; `loading` lets callers show a skeleton meanwhile.
 */
export function useUserPlan() {
  const [state, setState] = useState({ plan: "free", loading: true });

  useEffect(() => {
    let active = true;
    fetch("/api/user/plan")
      .then((res) => (res.ok ? res.json() : { plan: "free" }))
      .catch(() => ({ plan: "free" }))
      .then((data) => active && setState({ plan: data?.plan || "free", loading: false }));
    return () => {
      active = false;
    };
  }, []);

  return state;
}
