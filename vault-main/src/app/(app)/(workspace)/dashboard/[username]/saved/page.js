"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { useUser } from "@clerk/nextjs";
import { useDashboard } from "@/components/Dashboard/DashboardContext";
import { ALL_DATES, CARD, CARD_PAD, DateRangeFilter, FILTER_WIDTH, FilteredCount, inDateRange, resolveDateRange } from "@/components/Dashboard/DashboardUI";
import { COLUMN_ITEMS, SlidingSegment } from "@/components/ui/SlidingSegment";
import { Skeleton } from "@/components/ui/Skeleton";
import Button from "@/homepage/components/Button";
import { CARD_LAYOUT_TRANSITION, EffectCard } from "@/app/(app)/(workspace)/effects/EffectCard";
import { FilterMenu } from "@/app/(app)/(workspace)/effects/FilterMenu";
import { useEffectCardActions } from "@/app/(app)/(workspace)/effects/useEffectCardActions";
import { EFFECT_GRID, EFFECT_GRID_COLS } from "@/app/(app)/(workspace)/templates/tokens";
import { effectCategories, getEffectHref, getQuickCategoryLabel, resolveEffectCategoryId } from "@/lib/categories";
import { getDashboardPreview } from "@/lib/dev/dashboardPreview";
import { useGridColumns } from "@/hooks/useGridColumns";

const TIERS = [
  { id: "all", label: "All" },
  { id: "free", label: "Free" },
  { id: "pro", label: "Pro" },
];
// "recent" is the default order; the rest live in the filter menu, as on the effects listing
const SORTS = { recent: "Recently saved", oldest: "Oldest saved", az: "A to Z", za: "Z to A" };
const SORT_OPTIONS = ["oldest", "az", "za"];


const titleOf = (effect) => effect.title || effect.name;

export default function SavedEffectsPage() {
  const router = useRouter();
  const { user } = useUser();
  const { catalog, effectBySlug } = useDashboard();
  const { cardActions, overlays } = useEffectCardActions({ userPlan: user?.publicMetadata?.plan || "free" });

  // Saved rows, newest first: { name, created_at, ... }; null while loading
  const [rows, setRows] = useState(null);
  const [tier, setTier] = useState("all");
  const [category, setCategory] = useState(null);
  const [sort, setSort] = useState("recent");
  const [dates, setDates] = useState(ALL_DATES);
  // 2 / 3 per row, in step with the sidebar like /effects (picking 3 closes it)
  const { cols, shownCols, chooseCols } = useGridColumns("hyperiux-dashboard-saved-cols");

  useEffect(() => {
    let active = true;
    // Development preview: the first nine effects in the catalogue, a day apart
    if (getDashboardPreview()) {
      const sample = catalog.slice(0, 9).map((effect, i) => ({ name: effect.name, created_at: new Date(Date.now() - i * 86400000).toISOString() }));
      requestAnimationFrame(() => active && setRows(sample));
      return () => {
        active = false;
      };
    }
    fetch("/api/dashboard/saved")
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`saved ${res.status}`))))
      .then((data) => active && setRows(data.savedEffects || []))
      .catch((error) => {
        console.error(error);
        if (active) setRows([]);
      });
    return () => {
      active = false;
    };
  }, [catalog]);

  // Each saved row with the effect's full details from the catalogue (cover, tags, video)
  const saved = useMemo(() => (rows || []).map((row) => ({ ...row, ...(effectBySlug(row.name) || {}), savedAt: row.created_at })), [rows, effectBySlug]);

  // The category dropdown: every category among the saved effects, in the site's order
  const categoryChips = useMemo(() => {
    const counts = new Map();
    saved.forEach((effect) => {
      const id = resolveEffectCategoryId(effect);
      if (id) counts.set(id, (counts.get(id) || 0) + 1);
    });
    const ordered = effectCategories.map((c) => c.id).filter((id) => counts.has(id));
    return [...ordered, ...[...counts.keys()].filter((id) => !ordered.includes(id))].map((id) => ({ id, count: counts.get(id) }));
  }, [saved]);

  const shown = useMemo(() => {
    const { from, to } = resolveDateRange(dates);
    const list = saved.filter(
      (effect) =>
        (tier === "all" || (tier === "pro" ? effect.tier === "pro" : effect.tier !== "pro")) &&
        (!category || resolveEffectCategoryId(effect) === category) &&
        inDateRange(effect.savedAt, from, to),
    );
    if (sort === "oldest") return [...list].reverse();
    if (sort === "az") return [...list].sort((a, b) => titleOf(a).localeCompare(titleOf(b)));
    if (sort === "za") return [...list].sort((a, b) => titleOf(b).localeCompare(titleOf(a)));
    return list;
  }, [saved, tier, category, sort, dates]);

  return (
    <div className="flex flex-col gap-[calc(var(--cvw)*1.6)] max-lg:gap-6">
      {overlays}

      {rows === null ? (
        <div className={`flex flex-wrap ${EFFECT_GRID}`}>
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className={`aspect-[16/11] ${EFFECT_GRID_COLS[3]}`} />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className={`${CARD} ${CARD_PAD} items-start gap-4`}>
          <p className="type-h3">Nothing saved yet.</p>
          <p className="type-body text-black/60">Tap the heart on any effect to keep it here.</p>
          <Button href="/effects" text="Browse Effects" />
        </div>
      ) : (
        <>
          {/* tier, sort, saved date and columns - the effects listing's controls */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <FilteredCount shown={shown.length} total={rows.length} noun="saved" />
            <div className="flex flex-wrap items-center gap-[calc(var(--cvw)*0.7)] max-md:gap-[2.5vw]">
              <SlidingSegment label="Tier" items={TIERS} value={tier} onChange={setTier} itemClassName="w-14" />
              {categoryChips.length > 1 && (
                <FilterMenu
                  tone="light"
                  variant="label"
                  alignRight
                  widthClassName={FILTER_WIDTH}
                  panelClassName="left-auto! right-0 max-h-[20vw] max-md:max-h-[50vh] overflow-y-auto"
                  options={["all", ...categoryChips.map((c) => c.id)]}
                  categoryFilter={category || "all"}
                  activeFilter={category}
                  getLabel={(id) => (id === "all" ? "All Categories" : getQuickCategoryLabel(id))}
                  onSelect={(id) => setCategory(id === "all" ? null : id)}
                />
              )}
              <FilterMenu
                tone="light"
                alignRight
                panelClassName="left-auto! right-0"
                options={SORT_OPTIONS}
                activeFilter={sort === "recent" ? null : sort}
                getLabel={(id) => SORTS[id] || SORTS.recent}
                onSelect={setSort}
                onClear={() => setSort("recent")}
              />
              <DateRangeFilter label="Saved" value={dates} onChange={setDates} />
              <SlidingSegment label="Columns" items={COLUMN_ITEMS} value={shownCols} onChange={chooseCols} itemClassName="w-8.5" className="max-lg:hidden" />
            </div>
          </div>

          {shown.length === 0 ? (
            <p className="type-body text-black/60">No saved effects match these filters.</p>
          ) : (
            <div className={`flex flex-wrap ${EFFECT_GRID}`}>
              {/* the cards glide to their new slots on a column switch or filter, as on /effects */}
              {shown.map((effect) => (
                <motion.div key={effect.name} layout transition={CARD_LAYOUT_TRANSITION} className={EFFECT_GRID_COLS[cols]}>
                  <EffectCard effect={effect} {...cardActions(effect)} onOpen={(item) => router.push(getEffectHref(item))} />
                </motion.div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
