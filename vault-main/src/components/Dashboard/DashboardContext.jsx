"use client";

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { dashboardPath } from "./dashboardRoutes";

const DashboardContext = createContext({ username: "", catalog: [], isAdmin: false, isSuperAdmin: false });

/** The account in the URL, its admin role and the effects catalogue (Sanity), for every dashboard tab. */
export function DashboardProvider({ username, catalog, isAdmin, isSuperAdmin, children }) {
  const value = useMemo(() => {
    const bySlug = new Map(catalog.map((effect) => [effect.name, effect]));
    return { username, catalog, isAdmin, isSuperAdmin, effectBySlug: (slug) => bySlug.get(slug) || null };
  }, [username, catalog, isAdmin, isSuperAdmin]);
  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
}

export function useDashboard() {
  const context = useContext(DashboardContext);
  const path = useCallback((sub = "") => dashboardPath(context.username, sub), [context.username]);
  return { ...context, path };
}

export const HERO_ASIDE_ID = "dashboard-hero-aside";

const subscribeNever = () => () => {};

/** Content for the right side of the dashboard header (a meter, a count), set by the tab. */
export function DashboardHeroAside({ children }) {
  // The header's slot exists only in the browser; false on the server and during hydration.
  const mounted = useSyncExternalStore(subscribeNever, () => true, () => false);
  const slot = mounted ? document.getElementById(HERO_ASIDE_ID) : null;
  return slot ? createPortal(children, slot) : null;
}
