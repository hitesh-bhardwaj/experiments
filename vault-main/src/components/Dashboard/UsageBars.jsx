"use client";

import { useState } from "react";

// Where each delivery came from, as the bars and legend colour it (tip: on the dark tooltip)
export const SOURCE_BARS = [
  { key: "web", label: "Web", tone: "bg-ink", tip: "bg-foreground" },
  { key: "cli", label: "CLI", tone: "bg-primary", tip: "bg-primary" },
  { key: "mcp", label: "MCP", tone: "bg-black/20", tip: "bg-foreground/40" },
];

// "Oct 8" / "Wed, Oct 8" for a local YYYY-MM-DD day
const dayDate = (day) => new Date(`${day}T00:00:00`);
const shortDate = (day) => new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(dayDate(day));
const longDate = (day) => new Intl.DateTimeFormat("en", { weekday: "short", month: "short", day: "numeric" }).format(dayDate(day));

// A round top for the scale: 1-5, then 10, 20, 50, 100...
function niceMax(value) {
  if (value <= 5) return Math.max(1, Math.ceil(value));
  const step = 10 ** Math.floor(Math.log10(value));
  return [1, 2, 5, 10].map((m) => m * step).find((n) => n >= value);
}

const CHART_H = "h-[calc(var(--cvw)*11)] max-lg:h-44";

/**
 * One bar a day, oldest on the left: its web / CLI / MCP effects stacked. A scale on
 * the left with light gridlines, the date under every few bars (each centred on its
 * own bar), a dashed line at the daily limit, and the day's numbers in a tooltip on
 * hover or focus. `days`: [{ date: "YYYY-MM-DD" (local), web, cli, mcp }].
 */
export function UsageBars({ days, limit = null, todayKey = null }) {
  const [hovered, setHovered] = useState(null);
  const totals = days.map((d) => d.web + d.cli + d.mcp);
  const top = niceMax(Math.max(limit || 0, ...totals));
  const ticks = top > 1 ? [...new Set([top, Math.round(top / 2), 0])] : [1, 0];
  // A date under every `every`-th bar (at most ~7 of them), counted back from the last
  const every = Math.max(1, Math.ceil(days.length / 7));
  const labelled = (i) => (days.length - 1 - i) % every === 0;
  const tip = hovered === null ? null : days[hovered];

  return (
    <div className="flex gap-2">
      {/* the scale */}
      <div className={`type-small relative w-6 shrink-0 text-right text-black/40 ${CHART_H}`}>
        {ticks.map((tick) => (
          <span key={tick} className="absolute right-0 translate-y-1/2 leading-none" style={{ bottom: `${(tick / top) * 100}%` }}>
            {tick}
          </span>
        ))}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className={`relative ${CHART_H}`} onMouseLeave={() => setHovered(null)}>
          {/* gridlines, and the daily limit */}
          {ticks.map((tick) => (
            <span key={tick} aria-hidden="true" className="absolute inset-x-0 border-t border-black/5" style={{ bottom: `${(tick / top) * 100}%` }} />
          ))}
          {limit && (
            <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 z-1 border-t border-dashed border-primary/60" style={{ bottom: `${(limit / top) * 100}%` }}>
              <span className="type-small absolute right-0 bottom-1 bg-foreground/90 px-1 text-primary">Daily limit {limit}</span>
            </span>
          )}

          <div className="relative flex h-full items-end gap-0.75">
            {days.map((day, i) => (
              <button
                key={day.date}
                type="button"
                aria-label={`${longDate(day.date)}: ${totals[i]} effects (${day.web} web, ${day.cli} CLI, ${day.mcp} MCP)`}
                onMouseEnter={() => setHovered(i)}
                onFocus={() => setHovered(i)}
                onBlur={() => setHovered(null)}
                className={`flex h-full flex-1 cursor-default flex-col-reverse outline-none transition-opacity duration-200 ${hovered !== null && hovered !== i ? "opacity-40" : ""}`}
              >
                {SOURCE_BARS.map(({ key, tone }) =>
                  day[key] ? <span key={key} className={`block w-full ${tone}`} style={{ height: `${(day[key] / top) * 100}%` }} /> : null,
                )}
                {/* an empty day still marks its place */}
                {totals[i] === 0 && <span className="block h-px w-full bg-black/10" />}
              </button>
            ))}
          </div>

          {/* the hovered day's numbers, above its bar (kept inside the chart near the edges) */}
          {tip && (
            <div
              role="tooltip"
              className="pointer-events-none absolute top-0 z-10 flex min-w-36 flex-col gap-1.5 bg-ink px-3 py-2.5 text-foreground shadow-lg"
              style={{
                left: `${((hovered + 0.5) / days.length) * 100}%`,
                transform: `translateX(${hovered < days.length / 6 ? "-10%" : hovered > (days.length * 5) / 6 ? "-90%" : "-50%"})`,
              }}
            >
              <span className="type-small text-foreground/80">
                {longDate(tip.date)}
                {tip.date === todayKey ? " · Today" : ""}
              </span>
              <span className="type-body">
                {totals[hovered]} effect{totals[hovered] === 1 ? "" : "s"}
              </span>
              {SOURCE_BARS.map(({ key, label, tip: tone }) => (
                <span key={key} className="type-small flex items-center justify-between gap-4">
                  <span className="flex items-center gap-1.5">
                    <span aria-hidden="true" className={`size-2 ${tone}`} />
                    {label}
                  </span>
                  {tip[key]}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* dates, each centred under its own bar */}
        <div className="type-small flex gap-0.75 text-black/40">
          {days.map((day, i) => (
            <span key={day.date} className="flex min-w-0 flex-1 justify-center whitespace-nowrap">
              {/* phones keep every other date, so they don't run together */}
              {labelled(i) ? <span className={((days.length - 1 - i) / every) % 2 ? "max-md:invisible" : ""}>{shortDate(day.date)}</span> : "\u200b"}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
