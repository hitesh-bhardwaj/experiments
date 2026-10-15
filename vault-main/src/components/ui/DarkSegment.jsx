"use client";

import { T14 } from "@/app/(app)/(workspace)/templates/tokens";
import { BUTTON_TEXT } from "@/homepage/components/Button";

// Overall height = the padding below plus the 3px (p-0.75) the track adds on each side
const COMPACT = `py-[calc(0.375rem-3px)] ${T14} max-md:py-[calc(0.75rem-3px)]`;
// The standard button size (Button, BUTTON_SIZE), to sit in a row of buttons
const BUTTON = `py-[calc(0.5rem-3px)] ${BUTTON_TEXT} max-md:py-[calc(0.75rem-3px)]`;

/**
 * Segmented control for dark surfaces: an orange block slides to the chosen option.
 * Used by the templates hero (Corridor / Grid) and the dashboard's View as User / Admin.
 * `itemClassName` must give every option the same width: the block slides by whole widths.
 * `buttonSize` makes it as tall as, and the same text as, the standard Button.
 */
export function DarkSegment({ label, items, value, onChange, itemClassName, buttonSize = false }) {
  const index = Math.max(0, items.findIndex((item) => item.id === value));
  return (
    <div role="radiogroup" aria-label={label} className="relative flex gap-0.5 bg-foreground/6 p-0.75 ring-1 ring-inset ring-foreground/8 backdrop-blur-lg">
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute top-0.75 bottom-0.75 left-0.75 bg-primary transition-transform duration-700 ease-[cubic-bezier(.16,1,.3,1)] ${itemClassName}`}
        style={{ transform: `translateX(calc(${index} * (100% + 2px)))` }}
      />
      {items.map((item) => {
        const active = item.id === value;
        return (
          <button
            key={item.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(item.id)}
            className={`relative z-1 flex cursor-pointer items-center justify-center ${buttonSize ? BUTTON : COMPACT} transition-colors duration-500 ${itemClassName} ${
              active ? "text-background" : "text-foreground/60 hover:text-foreground"
            }`}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
