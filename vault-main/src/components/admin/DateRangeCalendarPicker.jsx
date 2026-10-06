"use client";

import { useEffect, useRef, useState } from "react";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";

// Same shadcn "range date picker" pattern (trigger button showing the
// formatted range -> popover with a month grid, click a start day then an
// end day) reskinned to this admin dashboard's own dark/square/orange-accent
// look instead of pulling in shadcn's actual stack
// (react-day-picker + date-fns + Radix Popover, none of which this codebase
// uses anywhere else - every other dropdown/panel here, e.g. CustomSelect,
// is hand-rolled the same way this is).
//
// `from`/`to` are the same YYYY-MM-DD strings the <input type="date"> pair
// this replaces already produced - a drop-in swap, no parent/API changes.

const WEEKDAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

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

function MonthGrid({ monthDate, from, to, hoverDate, onSelectDay, onHoverDay }) {
  const cells = buildMonthGrid(monthDate);

  return (
    <div className="w-64 shrink-0">
      <p className="mb-3 text-center text-sm font-medium text-white">
        {monthDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
      </p>

      <div className="grid grid-cols-7 gap-y-1">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="flex h-8 items-center justify-center text-[11px] font-medium text-white/40">
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
                isStart || isEnd
                  ? "bg-[#ff5f00] text-black font-medium"
                  : inRange
                    ? "bg-white/10 text-white"
                    : "text-white/70 hover:bg-white/10"
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

export function DateRangeCalendarPicker({ from, to, onFromChange, onToChange }) {
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
      onFromChange(toDateString(date));
      onToChange("");
      return;
    }

    // Picking a day before the current start just moves the start instead
    // of producing an inverted range.
    if (date.getTime() < fromDate.getTime()) {
      onFromChange(toDateString(date));
      return;
    }

    onToChange(toDateString(date));
    setHoverDate(null);
    setOpen(false);
  }

  const label = fromDate ? (toDate ? `${formatDisplayDate(fromDate)} - ${formatDisplayDate(toDate)}` : formatDisplayDate(fromDate)) : "Pick a date range";

  return (
    <div ref={rootRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((isOpen) => !isOpen)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="flex items-center gap-2 border border-white/10 bg-white/5 px-3 py-3.5 text-sm text-white outline-none transition hover:border-white/25 focus:border-white/25"
      >
        <CalendarIcon className="h-3.5 w-3.5 text-white/50" />
        <span className={fromDate ? "text-white" : "text-white/40"}>{label}</span>
      </button>

      {open && (
        <div
          role="dialog"
          onMouseLeave={() => setHoverDate(null)}
          className="absolute right-0 z-30 mt-2 border border-white/10 bg-[#1a1a1a] p-4"
        >
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            aria-label="Previous month"
            className="absolute left-4 top-4 flex h-6 w-6 items-center justify-center text-white/50 transition hover:bg-white/10 hover:text-white"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            aria-label="Next month"
            className="absolute right-4 top-4 flex h-6 w-6 items-center justify-center text-white/50 transition hover:bg-white/10 hover:text-white"
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
          />
        </div>
      )}
    </div>
  );
}
