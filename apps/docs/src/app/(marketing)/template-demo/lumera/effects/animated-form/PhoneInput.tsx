// Built using Hyperiux Vault: https://vault.hyperiux.com

"use client";

import { forwardRef, useEffect, useRef, useState, type ChangeEvent, type ComponentPropsWithoutRef } from "react";

export const COUNTRY_CODES = [
  { code: "IN", dial: "+91", flag: "🇮🇳", name: "India" },
  { code: "IE", dial: "+353", flag: "🇮🇪", name: "Ireland" },
  { code: "US", dial: "+1", flag: "🇺🇸", name: "United States" },
  { code: "GB", dial: "+44", flag: "🇬🇧", name: "United Kingdom" },
  { code: "AU", dial: "+61", flag: "🇦🇺", name: "Australia" },
  { code: "CA", dial: "+1", flag: "🇨🇦", name: "Canada" },
  { code: "DE", dial: "+49", flag: "🇩🇪", name: "Germany" },
  { code: "FR", dial: "+33", flag: "🇫🇷", name: "France" },
  { code: "AE", dial: "+971", flag: "🇦🇪", name: "United Arab Emirates" },
  { code: "SG", dial: "+65", flag: "🇸🇬", name: "Singapore" },
];

const joinClasses = (...classes: (string | boolean | undefined | null)[]): string => classes.filter(Boolean).join(" ");

export interface CountryCode {
  code: string;
  dial: string;
  flag: string;
  name: string;
}

export type PhoneInputProps = {
  id?: string;
  label?: string | false;
  value?: string;
  onChange?: (value: string) => void;
  defaultCountry?: string;
  countries?: CountryCode[];
  error?: string;
  className?: string;
  wrapperClassName?: string;
  countryButtonClassName?: string;
  flagClassName?: string;
  dialCodeClassName?: string;
  chevronClassName?: string;
  dropdownClassName?: string;
  optionClassName?: string;
  activeOptionClassName?: string;
  optionFlagClassName?: string;
  optionCodeClassName?: string;
  optionDialClassName?: string;
  dividerClassName?: string;
  inputClassName?: string;
  errorClassName?: string;
  placeholder?: string;
  showCountryName?: boolean;
} & Omit<ComponentPropsWithoutRef<'input'>, 'id' | 'value' | 'onChange' | 'placeholder'>;

const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(function PhoneInput(
  {
    id = "phone",
    label = "Phone Number*",
    value = "",
    onChange,
    defaultCountry = "IN",
    countries = COUNTRY_CODES,
    error,
    className = "",
    wrapperClassName = "",
    countryButtonClassName = "",
    flagClassName = "",
    dialCodeClassName = "",
    chevronClassName = "",
    dropdownClassName = "",
    optionClassName = "",
    activeOptionClassName = "",
    optionFlagClassName = "",
    optionCodeClassName = "",
    optionDialClassName = "",
    dividerClassName = "",
    inputClassName = "",
    errorClassName = "",
    placeholder,
    showCountryName = false,
    ...rest
  },
  ref
) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  const [selectedCountry, setSelectedCountry] = useState<CountryCode>(() => {
    return countries.find((country) => country.code === defaultCountry) || countries[0];
  });

  const [open, setOpen] = useState(false);

  const numberPart = value.startsWith(selectedCountry.dial)
    ? value.slice(selectedCountry.dial.length).trim()
    : value;

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current) return;

      if (!rootRef.current.contains(event.target as Node | null)) {
        setOpen(false);
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
    };
  }, []);

  const handleCountrySelect = (country: CountryCode) => {
    setSelectedCountry(country);
    setOpen(false);

    onChange?.(`${country.dial} ${numberPart}`.trim());
  };

  const handleNumberChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextNumber = event.target.value.replace(/[^\d\s\-()]/g, "");

    onChange?.(`${selectedCountry.dial} ${nextNumber}`.trim());
  };

  return (
    <div ref={rootRef} className={joinClasses("w-full", wrapperClassName)}>
      <div
        data-phone-field
        className={joinClasses(
          "flex h-14 items-center rounded-full border bg-white transition-all",
          "border-gray-200 focus-within:border-gray-400",
          error && "border-red-400 focus-within:border-red-400",
          className
        )}
      >
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setOpen((current) => !current)}
            className={joinClasses(
              "flex h-full cursor-pointer items-center gap-1 pl-4 pr-2 text-sm text-gray-700 transition-colors hover:text-gray-900",
              countryButtonClassName
            )}
            aria-expanded={open}
            aria-haspopup="listbox"
          >
            <span className={joinClasses("text-base", flagClassName)}>
              {selectedCountry.flag}
            </span>

            <span className={joinClasses("font-normal text-sm", dialCodeClassName)}>
              {selectedCountry.dial}
            </span>

            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={joinClasses(
                "transition-transform duration-200",
                open && "rotate-180",
                chevronClassName
              )}
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>

          {open && (
            <div
              role="listbox"
              className={joinClasses(
                "absolute left-0 top-full z-50 mt-2 max-h-52 min-w-48 rounded-md border border-gray-200 bg-white py-1 shadow-lg",
                dropdownClassName
              )}
            >
              <div className="overflow-y-auto max-h-48" onWheelCapture={(e) => e.stopPropagation()}>
              {countries.map((country) => {
                const isActive = selectedCountry.code === country.code;

                return (
                  <button
                    key={`${country.code}-${country.dial}`}
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    onClick={() => handleCountrySelect(country)}
                    className={joinClasses(
                      "flex w-full cursor-pointer items-center gap-2 px-4 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50",
                      optionClassName,
                      isActive && joinClasses("font-medium text-orange-500", activeOptionClassName)
                    )}
                  >
                    <span className={joinClasses("", optionFlagClassName)}>
                      {country.flag}
                    </span>

                    <span className={joinClasses("", optionCodeClassName)}>
                      {showCountryName ? country.name : country.code}
                    </span>

                    <span className={joinClasses("ml-auto text-gray-400", optionDialClassName)}>
                      {country.dial}
                    </span>
                  </button>
                );
              })}
              </div>
            </div>
          )}
        </div>

        <span
          className={joinClasses("h-6 w-px shrink-0 bg-gray-200", dividerClassName)}
        />

        <input
          ref={ref}
          id={id}
          type="tel"
          value={numberPart}
          onChange={handleNumberChange}
          placeholder={placeholder ?? (label === false ? "" : label)}
          autoComplete="tel"
          className={joinClasses(
            "h-full flex-1 rounded-r-full bg-transparent pl-4 pr-5 text-sm text-gray-800 outline-none placeholder:text-gray-700 placeholder:text-sm",
            inputClassName
          )}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          {...rest}
        />
      </div>

      {error && (
        <p id={`${id}-error`} className={joinClasses("ml-4 mt-1 text-xs text-red-500", errorClassName)}>
          {error}
        </p>
      )}
    </div>
  );
});

export default PhoneInput;
