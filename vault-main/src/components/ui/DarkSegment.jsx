"use client";

import { T14 } from "@/app/(app)/(workspace)/templates/tokens";
import { BUTTON_TEXT } from "@/homepage/components/Button";
import { motion, useReducedMotion } from "motion/react";

// Overall height = the padding below plus the 3px (p-0.75) the track adds on each side
const COMPACT = `py-[calc(0.375rem-3px)] ${T14} max-md:py-[calc(0.75rem-3px)]`;
// The standard button size (Button, BUTTON_SIZE), to sit in a row of buttons
const BUTTON = `py-[calc(0.5rem-3px)] ${BUTTON_TEXT} max-md:py-[calc(0.75rem-3px)]`;

/**
 * Segmented control for dark surfaces: an orange block slides to the chosen option.
 * Used by the templates hero (Corridor / Grid) and the dashboard's View as User / Admin.
 * `itemClassName` must give every option the same width: the block slides by whole widths.
 * `buttonSize` makes it as tall as, and the same text as, the standard Button.
 * `item.hidden` fades and collapses an option together, disabling it immediately.
 */
export function DarkSegment({ label, items, value, onChange, itemClassName, buttonSize = false }) {
  const index = Math.max(0, items.findIndex((item) => item.id === value));
  const visibleIndex = items.slice(0, index).filter((item) => !item.hidden).length;
  const reducedMotion = useReducedMotion();
  return (
    <div role="radiogroup" aria-label={label} className="relative flex bg-foreground/6 p-0.75 ring-1 ring-inset ring-foreground/8 backdrop-blur-lg">
      <motion.span
        aria-hidden="true"
        initial={false}
        animate={{ x: `calc(${visibleIndex} * (100% + 2px))` }}
        transition={{ duration: reducedMotion ? 0 : 0.5, ease: "easeInOut" }}
        className={`pointer-events-none absolute top-0.75 bottom-0.75 left-0.75 bg-primary ${itemClassName}`}
      />
      {items.map((item, itemIndex) => {
        const active = item.id === value;
        return (
          <motion.div
            key={item.id}
            initial={false}
            animate={{ width: item.hidden ? 0 : "auto", marginRight: !item.hidden && itemIndex < items.length - 1 ? 2 : 0 }}
            transition={{ duration: reducedMotion ? 0 : 0.5, ease: "easeInOut" }}
            className="relative shrink-0 overflow-hidden"
          >
          <button
            type="button"
            role="radio"
            aria-checked={active}
            aria-hidden={item.hidden || undefined}
            disabled={item.hidden}
            tabIndex={item.hidden ? -1 : undefined}
            onClick={() => onChange(item.id)}
            className={`relative z-1 flex cursor-pointer items-center justify-center ${buttonSize ? BUTTON : COMPACT} transition-[color,opacity,visibility] duration-500 motion-reduce:duration-0 ${itemClassName} ${item.hidden ? "invisible pointer-events-none opacity-0" : "visible opacity-100"} ${
              active ? "text-background" : "text-foreground/60 hover:text-foreground"
            }`}
          >
            {item.label}
          </button>
          </motion.div>
        );
      })}
    </div>
  );
}
