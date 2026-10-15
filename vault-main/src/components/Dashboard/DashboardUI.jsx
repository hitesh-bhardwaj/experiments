"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, LoaderCircle } from "lucide-react";
import { BUTTON_SIZE, ButtonChrome, buttonClassName } from "@/homepage/components/Button";
import LinkButton from "@/components/WebsiteComps/LinkButton";
import { DateRangeCalendarPicker } from "@/components/admin/DateRangeCalendarPicker";
import { FilterMenu } from "@/app/(app)/(workspace)/effects/FilterMenu";

// Building blocks shared by the dashboard tabs on the light sheet.

// The white card, and its padding
export const CARD = "flex flex-col bg-foreground text-ink ring-1 ring-inset ring-black/10";
export const CARD_PAD = "p-[calc(var(--cvw)*1.6)] max-lg:p-6 max-md:p-5";

// Where an effect was delivered: web dark, CLI orange, MCP outlined
const SOURCES = {
  web: ["Web", "bg-ink text-foreground"],
  cli: ["CLI", "bg-primary text-background"],
  mcp: ["MCP", "text-ink ring-1 ring-inset ring-black/20"],
};

export function SourceChip({ source }) {
  const [label, tone] = SOURCES[source] || SOURCES.web;
  return <span className={`type-small inline-flex w-12 shrink-0 justify-center py-0.5 ${tone}`}>{label}</span>;
}

// The FAQ's "View More" link (underline, rolling label) with a sideways arrow, no shimmer:
// "All usage", "Your templates". `tone`: "light" (dark text on the white cards), "dark"
// (white text on the dark plan card) or "accent" (orange, inline in a sentence - no
// arrow there).
const LINK_TONES = { light: "text-ink", dark: "text-foreground", accent: "text-primary" };

export function CardLink({ href, children, tone = "light", onClick, className = "" }) {
  const inline = tone === "accent";
  return (
    <LinkButton
      href={href}
      text={children}
      onClick={onClick}
      tilted={false}
      showArrow={!inline}
      arrowRight
      underlineClassName="mt-0.5"
      colorClassName={LINK_TONES[tone]}
      className={[inline ? "" : "type-label", className].filter(Boolean).join(" ")}
    />
  );
}

// The width of the dashboard's dropdown filters (trigger and panel alike)
export const FILTER_WIDTH = "w-[calc(var(--cvw)*13)] max-lg:w-48";

// "14 of 14 saved": the shown count big and dark, the rest quiet - as the effects listing's count
export function FilteredCount({ shown, total, noun }) {
  return (
    <p aria-live="polite" className="flex items-baseline gap-2">
      <span className="type-h3 text-ink">{shown}</span>
      <span className="type-label text-black/60">
        of {total} {noun}
      </span>
    </p>
  );
}

// The date filter's choices - the admin Activity page's ranges
export const DATE_PRESETS = { all: "All time", today: "Today", "7d": "Last 7 days", "30d": "Last 30 days", "90d": "Last 90 days", custom: "Custom range" };
const PRESET_DAYS = { today: 1, "7d": 7, "30d": 30, "90d": 90 };
export const ALL_DATES = { preset: "all", from: "", to: "" };

const dayString = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

// The YYYY-MM-DD days a date filter covers: { from, to }, from "" for all time
export function resolveDateRange({ preset, from, to }) {
  if (preset === "custom") return { from, to };
  const days = PRESET_DAYS[preset];
  if (!days) return { from: "", to: "" };
  const start = new Date();
  start.setDate(start.getDate() - (days - 1));
  return { from: dayString(start), to: dayString(new Date()) };
}

/**
 * A date filter for the light sheet: a dropdown of ranges (last 7 / 30 / 90 days...), as
 * on the admin Activity page, with a calendar beside it for "Custom range". `label`
 * names the date ("Saved", "Bought or saved"); `value` is { preset, from, to }.
 */
export function DateRangeFilter({ label, value, onChange }) {
  // The trigger and its panel share one width
  return (
    <div className="flex flex-wrap items-center gap-[calc(var(--cvw)*0.7)] max-md:gap-[2.5vw]">
      <FilterMenu
        tone="light"
        variant="label"
        alignRight
        widthClassName={FILTER_WIDTH}
        panelClassName="left-auto! right-0"
        options={Object.keys(DATE_PRESETS)}
        categoryFilter={value.preset}
        activeFilter={value.preset === "all" ? null : value.preset}
        getLabel={(id) => (id === "all" ? `${label}: ${DATE_PRESETS.all}` : DATE_PRESETS[id])}
        onSelect={(preset) => onChange({ preset, from: preset === "custom" ? value.from : "", to: preset === "custom" ? value.to : "" })}
      />
      {value.preset === "custom" && (
        <DateRangeCalendarPicker
          tone="light"
          from={value.from}
          to={value.to}
          onFromChange={(from) => onChange({ ...value, from })}
          onToChange={(to) => onChange({ ...value, to })}
          onClear={() => onChange(ALL_DATES)}
        />
      )}
    </div>
  );
}

// Whether a timestamp falls inside a picked range of YYYY-MM-DD days (local, both ends
// included). No range picked: everything passes; a range picked: undated items don't.
export function inDateRange(value, from, to) {
  if (!from) return true;
  if (!value) return false;
  const time = new Date(value).getTime();
  const start = new Date(`${from}T00:00:00`).getTime();
  const end = new Date(`${to || from}T23:59:59.999`).getTime();
  return time >= start && time <= end;
}

// A native <button> (form submit) in the site Button's look: orange, or "outline"
export function SubmitButton({ label, busy = false, disabled = false, variant = "orange", type = "submit", onClick, className = "" }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || busy}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={buttonClassName({ variant, disabled: disabled || busy, className: `w-fit ${className}` })}
    >
      <ButtonChrome label={busy ? <LoaderCircle className="size-4 animate-spin" aria-label="Working" /> : label} hovered={hovered} />
    </button>
  );
}

// A text field on a white card: label above, light well
export const FIELD = "type-body w-full bg-light px-4 py-3 text-ink ring-1 ring-inset ring-black/10 outline-none transition-shadow duration-300 placeholder:text-black/40 focus:ring-primary";
export const FIELD_LABEL = "type-label flex flex-col gap-2 text-black/60";

// Rows of term / value pairs inside a card
export function DetailRows({ rows, tone = "light" }) {
  const line = tone === "dark" ? "border-foreground/10" : "border-black/10";
  const term = tone === "dark" ? "text-foreground/80" : "text-black/60";
  return (
    <dl className="flex flex-col">
      {rows.map(([label, value]) => (
        <div key={label} className={`flex items-baseline justify-between gap-4 border-t py-[calc(var(--cvw)*0.9)] first:border-t-0 max-lg:py-3 ${line}`}>
          <dt className={`type-small ${term}`}>{label}</dt>
          <dd className="type-body text-right">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

// Previous / next for a paged table, with "Page 1 of 5 · 40 events"
export function Pager({ page, pages, total, noun, onPage }) {
  const btn = "grid size-9.5 cursor-pointer place-items-center text-ink ring-1 ring-inset ring-black/10 transition-shadow duration-300 hover:ring-primary disabled:cursor-default disabled:text-black/20 disabled:hover:ring-black/10";
  return (
    <div className="flex items-center justify-between gap-4">
      <p className="type-small text-black/60">
        Page {page + 1} of {pages} · {total} {noun}
      </p>
      <div className="flex gap-1.5">
        <button type="button" aria-label="Previous page" disabled={page === 0} onClick={() => onPage(page - 1)} className={btn}>
          <ArrowLeft className="size-4" aria-hidden="true" />
        </button>
        <button type="button" aria-label="Next page" disabled={page >= pages - 1} onClick={() => onPage(page + 1)} className={btn}>
          <ArrowRight className="size-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

// Plain action buttons at the standard button size, icon + label: orange, or outlined
const ACTION = `inline-flex w-fit shrink-0 cursor-pointer items-center gap-2 px-4 ${BUTTON_SIZE} transition-[background-color,color,box-shadow] duration-300 disabled:cursor-default disabled:opacity-60 [&_svg]:size-4`;
export const ACTION_PRIMARY = `${ACTION} bg-primary text-background hover:bg-primary-hover`;
export const ACTION_LINE = `${ACTION} text-ink ring-1 ring-inset ring-black/10 hover:text-primary hover:ring-primary`;

// An on / off switch (square track, round knob); `disabled` for one that's always on
export function Toggle({ checked, onChange, label, disabled = false }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange?.(!checked)}
      className={`relative h-6 w-11 shrink-0 cursor-pointer transition-colors duration-300 disabled:cursor-default ${checked ? "bg-primary" : "bg-black/20"} ${disabled ? "opacity-60" : ""}`}
    >
      <span aria-hidden="true" className={`absolute top-1 left-1 size-4  bg-foreground transition-transform duration-300 ${checked ? "translate-x-5" : ""}`} />
    </button>
  );
}
