"use client";

import { useEffect, useRef, useState } from "react";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from "lucide-react";
import { T14 } from "@/app/(app)/(workspace)/templates/tokens";

// Same shadcn "range date picker" pattern (trigger button showing the
// formatted range -> popover with a month grid, click a start day then an
// end day) reskinned to this admin dashboard's own dark/square/orange-accent
// look instead of pulling in shadcn's actual stack
// (react-day-picker + date-fns + Radix Popover, none of which this codebase
// uses anywhere else - every other dropdown/panel here, e.g. CustomSelect,
// is hand-rolled the same way this is).
//
// `from`/`to` are YYYY-MM-DD strings; every pick reports both at once through
// `onChange({ from, to })`. (Two separate from / to callbacks lost the first
// change when the parent built both from the same old value - picks did nothing.)

const WEEKDAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

// The admin pages' dark look, and a light one for the dashboard's light sheet (the
// trigger matches the effects listing's filter buttons there)
const TONES = {
  dark: {
    trigger: "border border-white/10 bg-white/5 px-3 py-3.5 text-sm text-white hover:border-white/25 focus:border-white/25",
    clear: "border border-white/10 bg-white/5 text-white/50 hover:text-white",
    icon: "text-white/50",
    value: "text-white",
    placeholder: "text-white/40",
    panel: "border border-white/10 bg-[#1a1a1a]",
    nav: "text-white/50 hover:bg-white/10 hover:text-white",
    month: "text-white",
    weekday: "text-white/40",
    edge: "bg-[#ff5f00] text-black font-medium",
    between: "bg-white/10 text-white",
    day: "text-white/70 hover:bg-white/10",
  },
  light: {
    trigger: `h-9.5 bg-foreground px-4 ${T14} text-black/60 ring-1 ring-inset ring-black/10 hover:text-ink hover:ring-primary`,
    clear: "h-9.5 bg-foreground text-black/60 ring-1 ring-inset ring-black/10 hover:text-ink hover:ring-primary",
    icon: "text-black/40",
    value: "text-ink",
    placeholder: "",
    panel: "bg-foreground text-ink ring-1 ring-inset ring-black/10",
    nav: "text-black/60 hover:bg-black/5 hover:text-ink",
    month: "text-ink",
    weekday: "text-black/40",
    edge: "bg-primary text-background",
    between: "bg-primary/10 text-ink",
    day: "text-black/60 hover:bg-black/5 hover:text-ink",
  },
};

function toDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateString(value) {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function formatDisplayDate(date) {
  return date.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
}

function isSameDay(a, b) {
  return !!a && !!b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function isBetween(date, start, end) {
  return date.getTime() > start.getTime() && date.getTime() < end.getTime();
}

// One month's grid of cells: leading/trailing nulls pad the first/last week
// so every row stays a full 7 columns without the days themselves shifting.
function buildMonthGrid(monthDate) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const startWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < startWeekday; i += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) cells.push(new Date(year, month, day));
  while (cells.length % 7 !== 0) cells.push(null);

  return cells;
}

function MonthGrid({ monthDate, from, to, hoverDate, onSelectDay, onHoverDay, tone }) {
  const cells = buildMonthGrid(monthDate);

  return (
    <div className="w-64 shrink-0">
      <p className={`mb-3 text-center text-sm font-medium ${tone.month}`}>
        {monthDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
      </p>

      <div className="grid grid-cols-7 gap-y-1">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className={`flex h-8 items-center justify-center text-[11px] font-medium ${tone.weekday}`}>
            {label}
          </div>
        ))}

        {cells.map((date, index) => {
          if (!date) return <div key={index} />;

          const isStart = isSameDay(date, from);
          const isEnd = isSameDay(date, to);
          const rangeEnd = to || (hoverDate && from && hoverDate.getTime() > from.getTime() ? hoverDate : null);
          const inRange = from && rangeEnd && isBetween(date, from, rangeEnd);

          return (
            <button
              key={index}
              type="button"
              onClick={() => onSelectDay(date)}
              onMouseEnter={() => onHoverDay(date)}
              className={`flex h-8 w-8 items-center justify-center justify-self-center text-xs transition-colors ${
                isStart || isEnd ? tone.edge : inRange ? tone.between : tone.day
              }`}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * `tone`: "dark" (admin pages) or "light". `placeholder` labels the trigger before a
 * range is picked; with `onClear`, a picked range gets an × that clears it.
 */
export function DateRangeCalendarPicker({ from, to, onChange, tone: toneName = "dark", placeholder = "Pick a date range", onClear }) {
  const tone = TONES[toneName];
  const [open, setOpen] = useState(false);
  const [hoverDate, setHoverDate] = useState(null);
  const rootRef = useRef(null);

  const fromDate = parseDateString(from);
  const toDate = parseDateString(to);

  const [viewMonth, setViewMonth] = useState(() => {
    const anchor = fromDate || toDate || new Date();
    return new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  });

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  function shiftMonth(delta) {
    setViewMonth((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1));
  }

  function handleSelectDay(date) {
    // No range yet, or a complete range already picked - start fresh.
    if (!fromDate || (fromDate && toDate)) {
      onChange({ from: toDateString(date), to: "" });
      return;
    }

    // Picking a day before the current start just moves the start instead
    // of producing an inverted range.
    if (date.getTime() < fromDate.getTime()) {
      onChange({ from: toDateString(date), to: "" });
      return;
    }

    onChange({ from, to: toDateString(date) });
    setHoverDate(null);
    setOpen(false);
  }

  const label = fromDate ? (toDate ? `${formatDisplayDate(fromDate)} - ${formatDisplayDate(toDate)}` : formatDisplayDate(fromDate)) : placeholder;

  return (
    <div ref={rootRef} className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((isOpen) => !isOpen)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={`flex cursor-pointer items-center gap-2 outline-none transition ${tone.trigger}`}
      >
        <CalendarIcon className={`h-3.5 w-3.5 ${tone.icon}`} />
        <span className={fromDate ? tone.value : tone.placeholder}>{label}</span>
      </button>
      {onClear && fromDate && (
        <button type="button" onClick={onClear} aria-label="Clear the date range" className={`grid w-9.5 cursor-pointer place-items-center transition ${tone.clear}`}>
          <X className="size-3.5" aria-hidden="true" />
        </button>
      )}

      {open && (
        <div
          role="dialog"
          onMouseLeave={() => setHoverDate(null)}
          // Fades and scales in
          className={`absolute top-full right-0 z-30 mt-2 origin-top-right animate-[hx-scale-in_0.49s_cubic-bezier(0.33,1,0.68,1)] p-4 motion-reduce:animate-none ${tone.panel}`}
        >
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            aria-label="Previous month"
            className={`absolute left-4 top-4 flex h-6 w-6 items-center justify-center transition ${tone.nav}`}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            aria-label="Next month"
            className={`absolute right-4 top-4 flex h-6 w-6 items-center justify-center transition ${tone.nav}`}
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          <MonthGrid
            monthDate={viewMonth}
            from={fromDate}
            to={toDate}
            hoverDate={hoverDate}
            onSelectDay={handleSelectDay}
            onHoverDay={setHoverDate}
            tone={tone}
          />
        </div>
      )}
    </div>
  );
}
