"use client";

import { useEffect, useState } from "react";
import { useVaultLayout } from "@/components/layout/VaultLayout";
import { MEDIA } from "@/lib/breakpoints";

/**
 * A card grid's 2 / 3 columns, kept in step with the workspace sidebar (the effects
 * listing, the dashboard's saved effects): 3 per row only fits with the sidebar closed,
 * so picking 3 closes it, and opening the sidebar drops the grid back to 2. The choice
 * is remembered in localStorage under `storageKey`.
 *
 * Returns `cols` (what the grid uses), `shownCols` (what the switch shows - the same) and
 * `chooseCols`.
 */
export function useGridColumns(storageKey) {
  const { isSidebarOpen, toggleSidebar } = useVaultLayout();
  const [cols, setCols] = useState(3);

  // Going to 3 closes the sidebar in the same moment, so the cards glide to their new
  // slots while the sidebar slides away - one motion, no wait for the sidebar first.
  const chooseCols = (n) => {
    setCols(n);
    if (n === 3 && isSidebarOpen && !window.matchMedia(MEDIA.tablet).matches) toggleSidebar(false);
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCols((c) => (c === 3 ? 2 : c));
  }, [isSidebarOpen]);

  return { cols, shownCols: cols, chooseCols };
}
