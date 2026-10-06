// Built using Hyperiux Vault: https://vault.hyperiux.com
import React, { forwardRef, useId, type ComponentPropsWithoutRef, type ReactNode } from "react";

/** Floating-label input */
export type InputProps = {
  id?: string;
  label?: ReactNode;
  type?: string;
  error?: string;
  className?: string;
  labelBg?: string;
} & Omit<ComponentPropsWithoutRef<'input'>, 'id' | 'type'>;

const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { id, label, placeholder, type = "text", error, labelBg = "", className = "", ...rest },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <div className="w-full">
      <div className="group relative w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="
              pointer-events-none absolute inset-y-0 left-[1.6vw] z-10 flex items-center
              font-aeonik-pro text-[1.05vw] text-white
              transition-opacity duration-300 ease-out
              group-focus-within:opacity-40
              has-[+input:not(:placeholder-shown)]:opacity-0
              group-focus-within:has-[+input:not(:placeholder-shown)]:opacity-0
              max-[1025px]:left-[5vw] max-[1025px]:text-[3.2vw]
              max-md:text-[4vw]
            "
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          type={type}
          placeholder={placeholder ?? " "}
          className={`
            h-[3.6vw] w-full rounded-[0.8vw] border border-white/25 bg-white/5 max-[1025px]:rounded-[2.5vw]
            pl-[1.6vw] pr-[1.6vw] font-aeonik-pro text-[1.05vw]
            text-white outline-none transition-colors duration-300
            hover:border-white/40 focus:border-white/60
            max-[1025px]:h-[12vw] max-[1025px]:pl-[5vw] max-[1025px]:pr-[5vw] max-[1025px]:text-[3.2vw]
            max-md:h-[14vw] max-md:text-[4vw]
            ${error ? "border-red-400/70 focus:border-red-400" : ""}
            ${className}
          `}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${inputId}-error` : undefined}
          {...rest}
        />
      </div>
      {error && (
        <p
          id={`${inputId}-error`}
          className="ml-[1.4vw] mt-[0.4vw] font-aeonik-pro text-[0.8vw] text-red-400 max-[1025px]:ml-[5vw] max-[1025px]:mt-[1.5vw] max-[1025px]:text-[2.6vw] max-md:text-[3.2vw]"
        >
          {error}
        </p>
      )}
    </div>
  );
});

export default Input;
