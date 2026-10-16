"use client";

import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { Bar, SkeletonCard } from "./DashboardSkeletons";

// A stat's change against the previous period, and its line - the admin Activity cards.
// Growth is green, decline red, no change grey; the line takes the same colour.

const TONES = { up: "text-success-strong", down: "text-danger-strong", flat: "text-black/40" };

/** "up" | "down" | "flat", and the change as a whole percentage (null when there was nothing before) */
export function trendOf(current = 0, previous = 0) {
  if (current === previous) return { direction: "flat", percent: 0 };
  if (!previous) return { direction: "up", percent: null };
  const percent = Math.round(((current - previous) / previous) * 100);
  return { direction: percent > 0 ? "up" : percent < 0 ? "down" : "flat", percent };
}

/** "↑ 47% vs prev. 30d" in green, "↓ 12% …" in red, "No change …" in grey */
export function TrendDelta({ current, previous, label }) {
  const { direction, percent } = trendOf(current, previous);
  const Icon = direction === "up" ? ArrowUpRight : direction === "down" ? ArrowDownRight : Minus;
  const change = direction === "flat" ? "No change" : percent === null ? "Up from 0" : `${Math.abs(percent)}%`;
  return (
    <p className={`type-small flex items-center gap-1 ${TONES[direction]}`} title={`${current} now, ${previous} before`}>
      <Icon className="size-3.5 shrink-0" aria-hidden="true" />
      <span>
        {change} <span className="text-black/60">{label}</span>
      </span>
    </p>
  );
}

/** The stat over the window as a soft area line, coloured by its trend */
export function TrendLine({ series = [], current, previous, className = "" }) {
  const { direction } = trendOf(current, previous);
  const values = series.map((point) => point.value);
  const max = Math.max(...values, 0);
  const count = Math.max(values.length - 1, 1);
  // 0-100 across, 2-30 down (a little room so the stroke isn't clipped)
  const points = values.map((value, i) => [(i / count) * 100, max ? 30 - (value / max) * 28 : 30]);
  const line = points.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(2)},${y.toFixed(2)}`).join(" ");
  return (
    <svg viewBox="0 0 100 32" preserveAspectRatio="none" aria-hidden="true" className={`block w-full ${TONES[direction]} ${className}`}>
      {points.length > 1 && (
        <>
          <path d={`${line} L100,32 L0,32 Z`} fill="currentColor" fillOpacity="0.08" />
          <path d={line} fill="none" stroke="currentColor" strokeWidth="1.5" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}

// In a row of three stat cards, the width of two (two cards plus the gap between them),
// so a wide card in the next row lines up with the row above
export const TWO_OF_THREE = "w-[calc((100%-var(--cvw)*1.6)*2/3+var(--cvw)*0.8)] max-lg:w-full";

/**
 * A stat card: what it is, the total for the window (and a note under it), its change
 * against the previous period, and its line over the window. `stat` is
 * { current, previous, series }; `children` sit beside the total (a breakdown).
 */
export function StatCard({ label, value, note, stat, comparison, className = "", children }) {
  return (
    <section aria-label={label} className={`flex min-w-0 flex-col gap-(--cvw) bg-foreground p-[calc(var(--cvw)*1.6)] text-ink ring-1 ring-inset ring-black/10 max-lg:gap-3 max-lg:p-6 max-md:p-5 ${className}`}>
      <p className="type-label text-black/60">{label}</p>
      <div className="flex flex-wrap items-end justify-between gap-x-[calc(var(--cvw)*2)] gap-y-3">
        <div className="flex flex-col gap-1">
          <p className="type-h2">{value}</p>
          {note && <p className="type-small text-black/60">{note}</p>}
        </div>
        {children}
      </div>
      <TrendDelta current={stat.current} previous={stat.previous} label={comparison} />
      <TrendLine series={stat.series} current={stat.current} previous={stat.previous} className="mt-auto h-[calc(var(--cvw)*3.6)] max-lg:h-14" />
    </section>
  );
}

/** A stat card while it loads, in the same shape */
export function StatCardSkeleton({ className = "flex-1" }) {
  return (
    <SkeletonCard className={`min-w-0 gap-(--cvw) max-lg:gap-3 ${className}`}>
      <Bar type="type-label" className="w-[35%]" />
      <Bar type="type-h2" className="w-[30%]" />
      <Bar type="type-small" className="w-[50%]" />
      <Bar className="h-[calc(var(--cvw)*3.6)] w-full max-lg:h-14" />
    </SkeletonCard>
  );
}
