"use client";

import { useEffect, useState } from "react";
import Button from "@/homepage/components/Button";
import { dashboardPath } from "@/components/Dashboard/dashboardRoutes";
import { getDashboardPreview, sampleDashboard } from "@/lib/dev/dashboardPreview";
import { markScrollToPricingCards } from "@/lib/pricingScrollIntent";

const DAY_MS = 24 * 60 * 60 * 1000;
const PERIOD_MONTHS = { monthly: 1, quarterly: 3, yearly: 12 };
const INTERVALS = { monthly: "Monthly", quarterly: "Quarterly", yearly: "Yearly" };

/**
 * The account's plan, pinned to the foot of the sidebar on dashboard pages (the sidebar
 * hides it while collapsed): the plan and billing cycle, days left with a bar for how far
 * through the period it is, and the next step - Pro+ for Pro, Pro for free accounts,
 * billing for Pro+. Nothing for admins, whose access isn't a plan.
 */
export function SidebarPlanCard({ username }) {
  const [info, setInfo] = useState(null);
  const [now, setNow] = useState(null);

  useEffect(() => {
    let active = true;
    // Read after mount: the clock differs between server and browser
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(Date.now());
    const preview = getDashboardPreview();
    if (preview) {
      const sample = sampleDashboard(preview);
      setInfo({ ...sample, isAdmin: preview === "admin" });
      return () => {
        active = false;
      };
    }
    fetch("/api/user/plan?detail=1")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => active && data && setInfo(data))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  if (!info || info.isAdmin || !now) return null;

  const isPro = info.plan === "pro";
  const name = !isPro ? "Free plan" : info.tier === "pro_plus" ? "Pro+" : "Pro";
  const interval = INTERVALS[info.billingInterval];
  const end = info.planValidUntil ? new Date(info.planValidUntil) : null;
  const start = end && PERIOD_MONTHS[info.billingInterval] ? new Date(end) : null;
  if (start) start.setMonth(start.getMonth() - PERIOD_MONTHS[info.billingInterval]);
  const daysLeft = end ? Math.max(0, Math.ceil((end - now) / DAY_MS)) : null;
  const elapsed = start && end ? Math.min(1, Math.max(0, (now - start) / (end - start))) : null;

  const next = !isPro
    ? { text: "Upgrade to Pro", href: "/pricing#plans", onClick: markScrollToPricingCards }
    : info.tier === "pro_plus"
      ? { text: "Manage billing", href: dashboardPath(username, "invoicing"), outline: true }
      : { text: "Upgrade to Pro+", href: "/pricing#plans", onClick: markScrollToPricingCards };

  return (
    <div className="flex w-full flex-col gap-[calc(var(--cvw)*1)] bg-dark-card p-[calc(var(--cvw)*1.2)] ring-1 ring-inset ring-foreground/10">
      <p className="type-label text-foreground/80">
        {name}
        {isPro && interval && <span className="text-primary"> · {interval}</span>}
      </p>
      {isPro && daysLeft !== null ? (
        <p className="flex items-baseline gap-2">
          <span className="type-h3 text-foreground">{daysLeft}</span>
          <span className="type-small text-foreground/80">days left</span>
        </p>
      ) : (
        <p className="type-small text-foreground/80">{isPro ? "Active, no end date" : "Free effects, 3 a day"}</p>
      )}
      {elapsed !== null && (
        <span aria-hidden="true" className="h-1 w-full bg-foreground/10">
          <span className="block h-full bg-primary" style={{ width: `${(elapsed * 100).toFixed(1)}%` }} />
        </span>
      )}
      <Button text={next.text} href={next.href} onClick={next.onClick} variant={next.outline ? "outline" : undefined} className="w-full" />
    </div>
  );
}
