"use client";

import { useEffect, useRef, useState } from "react";
import { useVaultLayout } from "@/components/layout/VaultLayout";
import { MEDIA } from "@/lib/breakpoints";

/**
 * A card grid's 2 / 3 columns, kept in step with the workspace sidebar (the effects
 * listing, the dashboard's saved effects): 3 per row only fits with the sidebar closed,
 * so picking 3 closes it, and opening the sidebar drops the grid back to 2. The choice
 * is remembered in localStorage under `storageKey`.
 *
 * Returns `cols` (what the grid uses), `shownCols` (what the switch shows - the choice
 * straight away, even while the grid waits for the sidebar) and `chooseCols`.
 */
export function useGridColumns(storageKey) {
  const { isSidebarOpen, toggleSidebar } = useVaultLayout();
  const [cols, setCols] = useState(3);

  // Going to 3 with the sidebar open: close the sidebar first and switch the grid once
  // it has finished (its width transition is 300ms). Doing both at once had the cards'
  // layout animation aim at slots the widening container then moved - a visible jump.
  const [pendingCols, setPendingCols] = useState(null);
  const timerRef = useRef(0);
  useEffect(() => () => clearTimeout(timerRef.current), []);

  const chooseCols = (n) => {
    clearTimeout(timerRef.current);
    if (n === 3 && isSidebarOpen && !window.matchMedia(MEDIA.tablet).matches) {
      setPendingCols(3);
      toggleSidebar(false);
      timerRef.current = setTimeout(() => {
        setCols(3);
        setPendingCols(null);
      }, 340);
    } else {
      setPendingCols(null);
      setCols(n);
      if (n === 3) toggleSidebar(false);
    }
    try {
      window.localStorage.setItem(storageKey, String(n));
    } catch {
      /* storage unavailable */
    }
  };

  // Restore the choice after hydration (localStorage isn't on the server).
  useEffect(() => {
    let stored = 3;
    try {
      stored = Number(window.localStorage.getItem(storageKey)) === 2 ? 2 : 3;
    } catch {
      /* storage unavailable */
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCols(stored);
  }, [storageKey]);

  // Opening the sidebar from anywhere drops 3 per row to 2. Only reacts to the sidebar
  // itself, so it never fights the switch above.
  useEffect(() => {
    if (!isSidebarOpen) return;
    // ...including a switch to 3 that was still waiting for the sidebar to close.
    clearTimeout(timerRef.current);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPendingCols(null);
    setCols((c) => (c === 3 ? 2 : c));
  }, [isSidebarOpen]);

  return { cols, shownCols: pendingCols ?? cols, chooseCols };
}
