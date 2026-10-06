"use client";

import { useEffect, useState } from "react";
import { StatCard } from "@/components/admin/StatCard";
import { LineTrendChart } from "@/components/admin/charts/LineTrendChart";
import { DonutChart } from "@/components/admin/charts/DonutChart";
import { EffectRankSlider } from "@/components/admin/EffectRankSlider";
import { TemplateRankSlider } from "@/components/admin/TemplateRankSlider";
import { TemplatePurchasesPanel } from "@/components/admin/TemplatePurchasesPanel";
import { DateRangeCalendarPicker } from "@/components/admin/DateRangeCalendarPicker";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { useAdminRole } from "@/lib/useAdminRole";
import { InstallActivitySection } from "./InstallActivityTab";

// Overview and Installs & Copies used to be two tabs reading two different
// slices of the same underlying activity data - now one continuous page,
// "Activity" itself, sharing a single date-range control instead of each
// half quietly defaulting to its own fixed "last 30 days" window.

const DATE_RANGE_OPTIONS = [
  { value: "today", label: "Today" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "all", label: "All time" },
  { value: "custom", label: "Custom range" },
];

function formatCurrency(amount, currency = "INR") {
  try {
    return new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount || 0);
  } catch {
    return `${(amount || 0).toFixed(0)} ${currency}`;
  }
}

// invoices mixes INR and USD (see the overview route's own comment) - a
// single blended "Revenue" tile would silently add unlike units, so this
// looks up each currency's own total from stats.revenueByCurrency instead
// of summing the array. Currencies with zero real revenue still render a
// ₹0/$0 tile rather than disappearing, since "no USD revenue yet" is
// itself useful information, not noise to hide.
function revenueFor(overview, currency) {
  return overview.stats.revenueByCurrency?.find((row) => row.currency === currency)?.amount || 0;
}

function ChartPanel({ title, children }) {
  return (
    <div className=" bg-[#272727] p-6">
      {title && <p className="mb-4 text-white">{title}</p>}
      {children}
    </div>
  );
}

function StatCardSkeleton() {
  return (
    <div className="flex h-full flex-col justify-between  p-6 bg-[#272727]">
      <div className="mb-3 h-4 w-20 animate-pulse  bg-white/10" />
      <div className="h-7 w-16 animate-pulse  bg-white/15" />
    </div>
  );
}

function ChartPanelSkeleton({ height = 260 }) {
  return (
    <div className=" bg-[#272727] p-6">
      <div className="mb-4 h-4 w-32 animate-pulse  bg-white/10" />
      <div className="animate-pulse  bg-white/5" style={{ height }} />
    </div>
  );
}

function DateRangePicker({ range, onRangeChange, customFrom, customTo, onCustomFromChange, onCustomToChange }) {
  const isCustom = range === "custom";

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {isCustom && (
        <DateRangeCalendarPicker
          from={customFrom}
          to={customTo}
          onFromChange={onCustomFromChange}
          onToChange={onCustomToChange}
        />
      )}
      <CustomSelect size="compact" align="right" value={range} onChange={onRangeChange} options={DATE_RANGE_OPTIONS} />
    </div>
  );
}

function OverviewSection({ range, customFrom, customTo }) {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const isCustom = range === "custom";

  useEffect(() => {
    if (isCustom && !customFrom && !customTo) return;

    let active = true;
    // Resets loading/error immediately on a range switch instead of
    // flashing stale data while the new fetch is in flight - a real
    // external-system sync, not derivable during render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    if (isCustom) {
      if (customFrom) params.set("from", customFrom);
      if (customTo) params.set("to", customTo);
    } else {
      params.set("range", range);
    }

    fetch(`/api/admin/activity/overview?${params.toString()}`)
      .then((res) => res.json().then((json) => ({ ok: res.ok, json })))
      .then(({ ok, json }) => {
        if (!ok) throw new Error(json.error || "Failed to load activity overview");
        if (active) setOverview(json);
      })
      .catch((err) => {
        if (active) setError(err.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [range, isCustom, customFrom, customTo]);

  if (error) {
    return (
      <div className=" border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
        {error}
      </div>
    );
  }

  if (loading || !overview) {
    return (
      <>
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <ChartPanelSkeleton key={i} />
          ))}
        </div>
      </>
    );
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          label={range === "today" ? "Copies Today" : "Total Copies"}
          value={overview.stats.totalCopies}
        />
        <StatCard label="Saved Effects" value={overview.stats.totalSaved} />
        <StatCard label="Saved Templates" value={overview.stats.totalSavedTemplates} />
        <StatCard label="Total Template Views" value={overview.stats.totalViews} />
        <StatCard label="Revenue (INR)" value={formatCurrency(revenueFor(overview, "INR"), "INR")} />
        <StatCard label="Revenue (USD)" value={formatCurrency(revenueFor(overview, "USD"), "USD")} />
      </div>
      <div className="flex flex-col gap-4">
        <ChartPanel>
          <EffectRankSlider title="Top saved effects" effects={overview.topSavedEffects} valueLabel="saves" />
        </ChartPanel>

        <ChartPanel>
          <EffectRankSlider title="Top copied effects" effects={overview.topCopiedEffects} valueLabel="copies" />
        </ChartPanel>

        <ChartPanel>
          <EffectRankSlider
            title="Top installed effects"
            effects={overview.topInstalledEffects}
            valueLabel="installs"
          />
        </ChartPanel>

        <ChartPanel>
          <TemplateRankSlider title="Top viewed templates" templates={overview.topViewedTemplates} />
        </ChartPanel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartPanel title="Signups">
          <LineTrendChart data={overview.signupTrend} xKey="label" color="#60a5fa" valueLabel="signups" />
        </ChartPanel>

        <ChartPanel title="Copy activity">
          <LineTrendChart data={overview.copyTrend} xKey="label" color="#ff5f00" valueLabel="copies" />
        </ChartPanel>

        <ChartPanel title="Revenue (INR)">
          <LineTrendChart data={overview.revenueTrendINR} xKey="label" color="#4ade80" valueLabel="revenue (₹)" />
        </ChartPanel>

        <ChartPanel title="Revenue (USD)">
          <LineTrendChart data={overview.revenueTrendUSD} xKey="label" color="#38bdf8" valueLabel="revenue ($)" />
        </ChartPanel>

            <ChartPanel title="Template purchases - last 30 days">
              <LineTrendChart
                data={overview.templatePurchaseTrend}
                xKey="label"
                color="#facc15"
                valueLabel="purchases"
              />
            </ChartPanel>

        <ChartPanel title="Plan distribution">
          <DonutChart data={overview.planDistribution} />
        </ChartPanel>
      </div>

      
    </>
  );
}

export default function AdminActivityPage() {
  const [range, setRange] = useState("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const { isSuperAdmin } = useAdminRole();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Activity</h1>
          <p className="mt-1 text-sm text-white/50">
            Site-wide usage trends, install/copy delivery, and per-user drill-down.
          </p>
        </div>
        <DateRangePicker
          range={range}
          onRangeChange={setRange}
          customFrom={customFrom}
          customTo={customTo}
          onCustomFromChange={setCustomFrom}
          onCustomToChange={setCustomTo}
        />
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-medium text-white">Overview</h2>
        <OverviewSection range={range} customFrom={customFrom} customTo={customTo} />
      </div>

      <div className="space-y-4 border-t border-white/10 pt-10">
        <h2 className="text-lg font-medium text-white">Installs &amp; Copies</h2>
        <InstallActivitySection range={range} customFrom={customFrom} customTo={customTo} />
      </div>

      {isSuperAdmin && (
        <div className="space-y-4 border-t border-white/10 pt-10">
          <div>
            <h2 className="text-lg font-medium text-white">Template Purchases</h2>
            <p className="mt-1 text-sm text-white/50">
              Every one-time template sale in the selected window. Super-admin only, same
              gate as Invoicing.
            </p>
          </div>
          <TemplatePurchasesPanel range={range} customFrom={customFrom} customTo={customTo} />
        </div>
      )}
    </div>
  );
}
