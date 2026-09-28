"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

// Matches the two select-trigger sizes already used across the admin pages:
// the filter-bar style (default) and the compact per-table-row style.
const SIZE_STYLES = {
  default: {
    trigger: "py-3.5 pl-4 pr-9 text-sm",
    chevron: "right-3 h-4 w-4",
    option: "px-4 py-2.5 text-sm",
  },
  compact: {
    trigger: "py-3.5 pl-3 pr-7 text-sm",
    chevron: "right-2 h-3.5 w-3.5",
    option: "px-3 py-2.5 text-sm",
  },
};

/**
 * Custom dropdown replacement for native <select> - a native select's option
 * list is rendered by the browser/OS, so there's no DOM to hang a hover-fill
 * animation off of. This reproduces the same trigger look as the native
 * selects it replaces, with a FilterMenu/Sidebar-style animated panel:
 * hovering an option fills it, and the selected option stays filled once the
 * pointer leaves the panel.
 */
export function CustomSelect({
  value,
  onChange,
  options,
  disabled = false,
  size = "default",
  align = "left",
  className = "",
  panelClassName = "",
}) {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(null);
  const rootRef = useRef(null);
  const styles = SIZE_STYLES[size] || SIZE_STYLES.default;

  // Clear the hovered option whenever the panel closes - derived purely
  // from `open`, which is already available during render.
  if (!open && hovered !== null) {
    setHovered(null);
  }

  useEffect(() => {
    if (!open) {
      return;
    }

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

  const selected = options.find((option) => option.value === value);

  return (
    <div ref={rootRef} className={`relative inline-block text-sm ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((isOpen) => !isOpen)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`block w-full border border-white/10 bg-white/5 text-left text-white outline-none transition focus:border-white/25 disabled:opacity-50 disabled:cursor-not-allowed ${styles.trigger}`}
      >
        <span className="truncate">{selected?.label ?? value}</span>
      </button>
      <ChevronDown
        aria-hidden="true"
        className={`pointer-events-none absolute top-1/2 -translate-y-1/2 text-white/40 transition-transform duration-200 ${
          open ? "rotate-180" : ""
        } ${styles.chevron}`}
      />

      {open && (
        <div
          role="listbox"
          onMouseLeave={() => setHovered(null)}
          className={`absolute z-30 mt-2 min-w-full space-y-1 border border-white/10 bg-[#1a1a1a] p-1.5 whitespace-nowrap ${
            align === "right" ? "right-0" : "left-0"
          } ${panelClassName}`}
        >
          {options.map((option) => {
            const isSelected = option.value === value;
            const highlighted = hovered ? hovered === option.value : isSelected;

            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                onMouseEnter={() => setHovered(option.value)}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={`group relative isolate flex w-full items-center cursor-pointer text-left ${styles.option}`}
              >
                <span
                  aria-hidden="true"
                  className={`absolute inset-0 z-0 origin-top bg-[#ff5f00] transition-transform duration-300 ease-out motion-reduce:transition-none ${
                    highlighted ? "scale-y-100" : "scale-y-0"
                  }`}
                />
                <span
                  className={`relative z-10 ${highlighted ? "text-[#111111]" : "text-white/80"}`}
                >
                  {option.label}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
