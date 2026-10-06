// Built using Hyperiux Vault: https://vault.hyperiux.com
import React, { forwardRef, useState, useRef, useEffect } from "react";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps {
  id?: string;
  label?: string;
  options?: SelectOption[];
  error?: string;
  className?: string;
  value?: string;
  onChange?: (event: { target: { value: string; id?: string } }) => void;
}

const Select = forwardRef<HTMLButtonElement, SelectProps>(function Select(
  { id, label, options = [], error, className = "", ...rest },
  ref,
) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const selectedOption = options.find((opt) => opt.value === rest.value);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node | null)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (value: string) => {
    rest.onChange?.({ target: { value, id } });
    setOpen(false);
  };

  return (
    <div className="w-full" ref={containerRef}>
      <div className="relative w-full">
        <button
          type="button"
          id={id}
          ref={ref}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-describedby={error ? `${id}-error` : undefined}
          onClick={() => setOpen((prev) => !prev)}
          className={`
            flex h-[3.6vw] w-full cursor-pointer items-center rounded-[0.8vw] max-[1025px]:rounded-[2.5vw]
            border border-white/25 bg-white/5 pl-[1.6vw] pr-[3.2vw] text-left
            font-aeonik-pro text-[1.05vw] outline-none
            text-white transition-colors duration-300 hover:border-white/40
            max-[1025px]:h-[12vw] max-[1025px]:pl-[5vw] max-[1025px]:pr-[10vw] max-[1025px]:text-[3.2vw]
            max-md:h-[14vw] max-md:text-[4vw]
            ${error ? "border-red-400/70" : ""}
            ${className}
          `}
        >
          {selectedOption ? selectedOption.label : label}
        </button>

        <span
          className={`pointer-events-none absolute right-[1.4vw] top-[1.8vw] -translate-y-1/2 text-white transition-transform duration-300 max-[1025px]:right-[5vw] max-[1025px]:top-[6vw] max-md:top-[7vw] ${
            open ? "rotate-180" : ""
          }`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-[1.1vw] w-[1.1vw] max-[1025px]:h-[4vw] max-[1025px]:w-[4vw]"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </span>

        {/* Radio panel floats over fields */}
        <div
          ref={panelRef}
          role="listbox"
          className={`absolute left-0 right-0 top-full z-50 mt-[0.8vw] origin-top rounded-[0.9vw] bg-white px-[1.8vw] py-[1.6vw] shadow-2xl transition-all duration-300 ease-out max-[1025px]:mt-[3vw] max-[1025px]:rounded-[3vw] max-[1025px]:px-[5vw] max-[1025px]:py-[4vw] ${
            open
              ? "pointer-events-auto translate-y-0 scale-100 opacity-100"
              : "pointer-events-none -translate-y-[0.6vw] scale-[0.98] opacity-0"
          }`}
        >
          <div className="grid grid-cols-2 gap-x-[1.5vw] gap-y-[1.1vw] max-[1025px]:gap-x-[4vw] max-[1025px]:gap-y-[3.5vw]">
            {options.map((opt) => {
              const isSelected = rest.value === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  tabIndex={open ? 0 : -1}
                  onClick={() => handleSelect(opt.value)}
                  className="group flex cursor-pointer items-center gap-[0.8vw] text-left max-[1025px]:gap-[3vw]"
                >
                  <span
                    className={`flex h-[1.3vw] w-[1.3vw] shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-300 max-[1025px]:h-[4.5vw] max-[1025px]:w-[4.5vw] ${
                      isSelected
                        ? "border-[#1a56ff]"
                        : "border-[#1a56ff]/70 group-hover:border-[#1a56ff]"
                    }`}
                  >
                    <span
                      className={`block h-[0.62vw] w-[0.62vw] rounded-full bg-[#1a56ff] transition-transform duration-300 max-[1025px]:h-[2.2vw] max-[1025px]:w-[2.2vw] ${
                        isSelected ? "scale-100" : "scale-0"
                      }`}
                    />
                  </span>
                  <span className="font-aeonik-pro text-[1.05vw] text-black max-[1025px]:text-[3.2vw] max-md:text-[4vw]">
                    {opt.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {error && (
        <p
          id={`${id}-error`}
          className="ml-[1.4vw] mt-[0.4vw] font-aeonik-pro text-[0.8vw] text-red-400 max-[1025px]:ml-[5vw] max-[1025px]:mt-[1.5vw] max-[1025px]:text-[2.6vw] max-md:text-[3.2vw]"
        >
          {error}
        </p>
      )}
    </div>
  );
});

export default Select;
