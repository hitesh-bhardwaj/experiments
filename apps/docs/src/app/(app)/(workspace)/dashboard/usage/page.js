"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { EffectCard } from "@/components/ui/EffectCardNew";
import {
  effectCategories,
  getQuickCategoryLabel,
  resolveEffectCategoryId,
} from "@/lib/categories";
import { getFeaturedEffects } from "@/lib/featured-effects";
import { emitWishlistChanged } from "@/lib/wishlistEvents";
import { FilterMenu, FILTER_OPTIONS } from "@/app/(app)/(workspace)/effects/FilterMenu";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { DateRangeCalendarPicker } from "@/components/admin/DateRangeCalendarPicker";

// Same options/dropdown as the admin User Management and Activity pages'
// date-range control (CustomSelect + DateRangeCalendarPicker for "Custom
// range"), swapped in for the old Today/Yesterday/Last Week/Last Month
// button row.
const DATE_RANGE_OPTIONS = [
  { value: "today", label: "Today" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "all", label: "All time" },
  { value: "custom", label: "Custom range" },
];

const SOURCE_FILTER_OPTIONS = ["all", "web", "cli", "mcp"];
const SOURCE_LABELS = { all: "All Sources", web: "Web", cli: "CLI", mcp: "MCP" };

function getSourceLabel(id) {
  return SOURCE_LABELS[id] || id;
}

// copy_usage_effects.usage_date is written as a UTC YYYY-MM-DD string (see
// todayUTC() in the API route) - matching that format here keeps the filter
// in step with the daily-limit reset instead of drifting on the viewer's
// local timezone.
function utcDateString(daysAgo = 0) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - daysAgo);
  return date.toISOString().slice(0, 10);
}

function matchesDateFilter(lastCopiedAt, filterId, customFrom, customTo) {
  if (filterId === "all") return true;
  if (!lastCopiedAt) return false;

  if (filterId === "today") return lastCopiedAt === utcDateString(0);
  // Rolling windows, inclusive of today.
  if (filterId === "7d") return lastCopiedAt >= utcDateString(6);
  if (filterId === "30d") return lastCopiedAt >= utcDateString(29);
  if (filterId === "90d") return lastCopiedAt >= utcDateString(89);
  if (filterId === "custom") {
    if (customFrom && lastCopiedAt < customFrom) return false;
    if (customTo && lastCopiedAt > customTo) return false;
    return true;
  }

  return true;
}

function StatCard({ label, value, detail }) {
  return (
    <div className="flex h-full flex-col justify-between  p-6 bg-[#272727]">
      <p className="text-white mb-3">{label}</p>

      <p className="text-2xl font-medium font-laygrotesk leading-none">{value}</p>

      {detail && <div className="text-[#838383] mt-4">{detail}</div>}
    </div>
  );
}

export default function UsagePage() {
  const { isLoaded } = useUser();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [wishlist, setWishlist] = useState([]);
  const [dateFilter, setDateFilter] = useState("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");

  async function loadUsage() {
    try {
      const res = await fetch("/api/dashboard/usage");

      if (!res.ok) {
        throw new Error("Failed to load usage");
      }

      const json = await res.json();

      setData(json);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  const toggleWishlist = async (effect) => {
    try {
      const res = await fetch("/api/wishlist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ effect }),
      });

      const result = await res.json();

      if (!res.ok) {
        console.error(result);
        return;
      }

      setWishlist((prev) =>
        result.saved
          ? prev.includes(effect.name)
            ? prev
            : [...prev, effect.name]
          : prev.filter((slug) => slug !== effect.name)
      );

      emitWishlistChanged(result.saved);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (!isLoaded) return;

    const frame = requestAnimationFrame(() => {
      loadUsage();
    });

    return () => cancelAnimationFrame(frame);
  }, [isLoaded]);

  useEffect(() => {
    if (!isLoaded) return;

    let active = true;

    fetch("/api/wishlist")
      .then((res) => res.json())
      .then((rows) => {
        if (active) {
          setWishlist((rows || []).map((item) => item.effect_slug || item.name));
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [isLoaded]);

  const copiedEffects = useMemo(() => data?.copiedEffects || [], [data]);

  const featuredEffects = useMemo(
    () => getFeaturedEffects(copiedEffects),
    [copiedEffects]
  );

  // Everything - featured/free/pro plus every category actually present -
  // collapsed into one dropdown, ordered to match the site's category
  // order first. Unlike the vault listing, there's no separate chips row.
  const categoryDropdownOptions = useMemo(() => {
    const presentCategories = new Set();

    copiedEffects.forEach((effect) => {
      const id = resolveEffectCategoryId(effect);
      if (id) presentCategories.add(id);
    });

    const knownCategories = effectCategories
      .filter(
        (category) =>
          category.id !== "featured" && presentCategories.has(category.id)
      )
      .map((category) => category.id);

    const extraCategories = [...presentCategories].filter(
      (id) => !knownCategories.includes(id)
    );

    return ["all", ...FILTER_OPTIONS, ...knownCategories, ...extraCategories];
  }, [copiedEffects]);

  const activeCategoryFilter = categoryFilter === "all" ? null : categoryFilter;

  const filteredEffects = useMemo(() => {
    return copiedEffects.filter((effect) => {
      if (!matchesDateFilter(effect.lastCopiedAt, dateFilter, customFrom, customTo)) return false;
      if (sourceFilter !== "all" && effect.source !== sourceFilter) return false;

      if (categoryFilter === "all") return true;

      if (categoryFilter === "featured") {
        return featuredEffects.some((featured) => featured.name === effect.name);
      }

      if (categoryFilter === "free") return effect.tier !== "pro";
      if (categoryFilter === "pro") return effect.tier === "pro";

      return resolveEffectCategoryId(effect) === categoryFilter;
    });
  }, [copiedEffects, dateFilter, customFrom, customTo, categoryFilter, sourceFilter, featuredEffects]);

  if (!isLoaded || loading || !data) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-zinc-400">Loading usage...</p>
      </div>
    );
  }

  const isUnlimited = data.isAdmin;
  const { limit, count, remaining, plan } = data;
  const usagePct =
    isUnlimited || !limit ? 0 : Math.min(100, Math.round((count / limit) * 100));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-4xl font-aeonik text-white">Usage</h1>

        <p className="text-white mt-2">
          Track your daily install/copy usage and revisit effects you&apos;ve
          installed or copied.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <StatCard
          label="Today's Usage"
          value={isUnlimited ? "Unlimited" : `${count} / ${limit}`}
          detail={
            isUnlimited ? null : (
              <div className="mt-1 h-2 w-full  bg-white/10 overflow-hidden">
                <div
                  className={`h-full  transition-all duration-500 ${
                    remaining === 0 ? "bg-[#ff5f00]" : "bg-white"
                  }`}
                  style={{ width: `${usagePct}%` }}
                />
              </div>
            )
          }
        />

        <StatCard
          label="Remaining Today"
          value={isUnlimited ? "Unlimited" : remaining}
          detail={
            isUnlimited
              ? ""
              : "Resets daily at midnight UTC."
          }
        />

        <StatCard
          label="Plan"
          value={<span className="capitalize">{plan}</span>}
          detail={
            !isUnlimited && plan !== "pro" ? (
              <Link href="/pricing" className="text-[#ff5f00] hover:text-[#ff7a29]">
                Upgrade for a higher limit
              </Link>
            ) : null
          }
        />
      </div>

      <div>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4 mt-10">
          <h2 className="text-2xl font-semibold text-white">
            Installed &amp; Copied Effects
          </h2>

          {copiedEffects.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              {dateFilter === "custom" && (
                <DateRangeCalendarPicker
                  from={customFrom}
                  to={customTo}
                  onFromChange={setCustomFrom}
                  onToChange={setCustomTo}
                />
              )}
              <CustomSelect
                size="compact"
                align="right"
                value={dateFilter}
                onChange={setDateFilter}
                options={DATE_RANGE_OPTIONS}
              />
            </div>
          )}
        </div>

        {copiedEffects.length > 0 && (
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <FilterMenu
              activeFilter={activeCategoryFilter}
              categoryFilter={categoryFilter}
              getLabel={getQuickCategoryLabel}
              onSelect={setCategoryFilter}
              options={categoryDropdownOptions}
              variant="label"
              panelClassName="max-h-[20vw] max-md:max-h-[50vh] overflow-y-auto"
            />

            <FilterMenu
              activeFilter={sourceFilter === "all" ? null : sourceFilter}
              categoryFilter={sourceFilter}
              getLabel={getSourceLabel}
              onSelect={setSourceFilter}
              options={SOURCE_FILTER_OPTIONS}
              variant="label"
            />
          </div>
        )}

        {copiedEffects.length === 0 ? (
          <div className=" p-12 bg-[#272727] text-center">
            <h3 className="text-2xl text-white mb-2">No installed or copied effects yet</h3>

            <p className="text-zinc-400">
              Effects you install or copy code from - on the website, via the CLI, or through
              MCP - will show up here.
            </p>
          </div>
        ) : filteredEffects.length === 0 ? (
          <div className=" p-12 text-center bg-[#272727] backdrop-blur-lg">
            <h3 className="text-xl text-white mb-2">
              No installed or copied effects match these filters
            </h3>

            <p className="text-zinc-400">
              Choose another range, category, or source to view your installed and copied
              effects.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4 max-[1025px]:grid-cols-2 max-md:grid-cols-1 max-md:gap-12">
            {filteredEffects.map((effect) => (
              <EffectCard
                key={effect.name}
                effect={effect}
                isWishlisted={wishlist.includes(effect.name)}
                toggleWishlist={toggleWishlist}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
