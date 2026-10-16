"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { Skeleton } from "@/components/ui/Skeleton";
import { BUTTON_SIZE } from "@/homepage/components/Button";
import { getDashboardPreview } from "@/lib/dev/dashboardPreview";
import { useDashboard } from "./DashboardContext";
import { CARD, CARD_PAD } from "./DashboardUI";

// Loading states for the dashboard tabs, built from the real cards' frames: the same card
// (white, or dark for the plan and today cards), the same padding, and bars sized in the
// type class of the text they stand in for, so nothing jumps when the data arrives.

const DarkContext = createContext(false);

/** A card while it loads: the real card's surface and padding, bars inside. */
export function SkeletonCard({ dark = false, className = "", children }) {
  return (
    <DarkContext.Provider value={dark}>
      <div aria-hidden="true" className={`${dark ? `flex flex-col bg-ink text-foreground ${CARD_PAD}` : `${CARD} ${CARD_PAD}`} ${className}`}>
        {children}
      </div>
    </DarkContext.Provider>
  );
}

/**
 * One bar. `type` is the type class of the text it replaces (its height is that text's
 * line); otherwise size it with `className`.
 */
export function Bar({ type, className = "", ...props }) {
  const dark = useContext(DarkContext);
  const line = type ? `${type} h-[1lh]` : "";
  return <Skeleton light={!dark} className={[line, className].filter(Boolean).join(" ")} {...props} />;
}

/** A bar as tall as the site's Button (its padding around one line of its text). */
export function ButtonBar({ className = "w-40" }) {
  return <Bar className={`${BUTTON_SIZE} box-content h-[1lh] ${className}`} />;
}

/**
 * What the account is, before its data arrives - for skeletons in the right layout (Pro's
 * period bar, Pro+'s credits, no plan card for admins). From the session (Clerk's plan,
 * tier and role) or the development preview; `isAdmin` also comes from the dashboard.
 */
export function useAccountHint() {
  const { user } = useUser();
  const { isAdmin } = useDashboard();
  const [preview, setPreview] = useState(null);
  useEffect(() => {
    // The preview cookie is read after mount (it isn't there on the server)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPreview(getDashboardPreview());
  }, []);
  const meta = user?.publicMetadata || {};
  if (preview) return { isAdmin: preview === "admin", plan: preview === "free" ? "free" : "pro", tier: preview === "free" ? null : "pro", billingInterval: preview === "free" ? null : "yearly" };
  return {
    isAdmin: isAdmin || meta.role === "admin" || meta.role === "super_admin",
    plan: meta.plan === "pro" ? "pro" : "free",
    tier: meta.tier || null,
    billingInterval: meta.billingInterval || null,
  };
}
