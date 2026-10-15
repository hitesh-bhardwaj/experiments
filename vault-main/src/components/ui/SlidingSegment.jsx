"use client";

import { T14 } from "@/app/(app)/(workspace)/templates/tokens";

// Two- and three-pane window icons for the column switch.
const COLUMN_ICONS = {
  2: (
    <>
      <rect x="3.5" y="4.5" width="7.5" height="15" />
      <rect x="13" y="4.5" width="7.5" height="15" />
    </>
  ),
  3: (
    <>
      <rect x="2.5" y="4.5" width="5" height="15" />
      <rect x="9.5" y="4.5" width="5" height="15" />
      <rect x="16.5" y="4.5" width="5" height="15" />
    </>
  ),
};
export const COLUMN_ITEMS = [2, 3].map((n) => ({
  id: n,
  ariaLabel: `${n} cards per row`,
  label: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="size-4" aria-hidden="true">
      {COLUMN_ICONS[n]}
    </svg>
  ),
}));

/**
 * A segmented control whose dark active block slides to the chosen option.
 * Every option shares `itemClassName`'s width, so the block can travel by
 * whole steps of (its own width + the 2px gap). For light surfaces: the effects
 * listing (tier, columns) and the dashboard's filters.
 */
export function SlidingSegment({ label, items, value, onChange, itemClassName, className = "" }) {
  const index = Math.max(0, items.findIndex((item) => item.id === value));
  return (
    <div role="group" aria-label={label} className={`relative flex gap-0.5 bg-foreground p-0.75 ring-1 ring-inset ring-black/10 ${className}`}>
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute top-0.75 bottom-0.75 left-0.75 bg-ink transition-transform duration-500 ease-[cubic-bezier(.16,1,.3,1)] ${itemClassName}`}
        style={{ transform: `translateX(calc(${index} * (100% + 2px)))` }}
      />
      {items.map((item) => {
        const active = item.id === value;
        return (
          <button
            key={item.id}
            type="button"
            aria-pressed={active}
            aria-label={item.ariaLabel}
            onClick={() => onChange(item.id)}
            className={`relative z-1 flex h-8 cursor-pointer items-center justify-center ${T14} transition-colors duration-500 ${itemClassName} ${
              active ? "text-light" : "text-black/60 hover:text-ink"
            }`}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
