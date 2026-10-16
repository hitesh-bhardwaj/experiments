"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { subscribeCopyUsage } from "@/lib/copyUsageEvents";

// Each tab's last data, kept across client navigations (until a full reload): coming back to
// a tab shows it straight away - no skeleton - and refreshes it quietly behind.
const cache = new Map();

// Ask every dashboard tab on screen to refetch (after a change made elsewhere on the page)
export const DASHBOARD_REFRESH_EVENT = "vault:dashboard-refresh";
export function refreshDashboard() {
  window.dispatchEvent(new Event(DASHBOARD_REFRESH_EVENT));
}

/**
 * A dashboard tab's data: `load()` resolves it (a fetch, or the dev preview's sample). The
 * skeleton is for the very first load only (`data` null); after that the tab keeps showing
 * what it has while it refetches:
 * - when it mounts again (back on the tab),
 * - when the window regains focus or the browser tab becomes visible (an install from the
 *   terminal, a copy in another tab),
 * - after a copy or install anywhere on the page (copy-usage events), and after a save or
 *   unsave once the server has it (refreshDashboard()),
 * - every `pollMs` while visible, when set.
 *
 * `key` names the data (include the username); `mutate(fn)` changes it locally at once
 * (an unsaved card leaving the grid) and the refetch confirms it.
 */
export function useDashboardData(key, load, { pollMs = 0 } = {}) {
  const [entry, setEntry] = useState(() => ({ key, data: cache.get(key) ?? null }));
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  // The latest loader, without restarting the effect when the caller re-creates it
  const loadRef = useRef(load);
  useLayoutEffect(() => {
    loadRef.current = load;
  });

  useEffect(() => {
    if (!key) return undefined;
    let active = true;
    let timer = 0;
    const run = async () => {
      try {
        const data = await loadRef.current();
        if (!active) return;
        cache.set(key, data);
        setEntry({ key, data });
        setFailed(false);
      } catch (error) {
        console.error(error);
        // A failed refresh keeps what's on screen; only a first load shows the error
        if (active && !cache.has(key)) setFailed(true);
      }
    };
    // Several triggers at once (a copy fires an event and focus) make one request
    const soon = () => {
      clearTimeout(timer);
      timer = setTimeout(run, 200);
    };
    const onVisible = () => document.visibilityState === "visible" && soon();

    run();
    window.addEventListener("focus", soon);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener(DASHBOARD_REFRESH_EVENT, soon);
    const unsubscribeCopies = subscribeCopyUsage(soon);
    const poll = pollMs ? setInterval(() => document.visibilityState === "visible" && run(), pollMs) : 0;
    return () => {
      active = false;
      clearTimeout(timer);
      clearInterval(poll);
      window.removeEventListener("focus", soon);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener(DASHBOARD_REFRESH_EVENT, soon);
      unsubscribeCopies();
    };
  }, [key, attempt, pollMs]);

  const mutate = useCallback(
    (update) => {
      setEntry((current) => {
        const data = update(current.data);
        cache.set(key, data);
        return { key, data };
      });
    },
    [key],
  );
  const retry = useCallback(() => {
    setFailed(false);
    setAttempt((n) => n + 1);
  }, []);

  // A new key (another account) never shows the previous key's data
  const data = entry.key === key ? entry.data : (cache.get(key) ?? null);
  return { data, failed, retry, mutate };
}
