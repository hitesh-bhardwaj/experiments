// Built using Hyperiux Vault: https://vault.hyperiux.com

import React, {
  forwardRef,
  useId,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from "react";

/**
 * Placeholder-label Input
 * Props:
 * - id: string (required, links label to input)
 * - label: string - shown as the input's placeholder; disappears as soon
 *   as the user types (kept as a visually-hidden <label> for a11y)
 * - type: string (default"text")
 * - error: string | undefined
 * - className: string (extra classes on <input>)
 * - All standard <input> props (name, value, onChange, onBlur, autoComplete, …)
 */
export type InputProps = {
  id?: string;
  label?: ReactNode;
  type?: string;
  error?: string;
  className?: string;
} & Omit<ComponentPropsWithoutRef<"input">, "id" | "type">;

const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { id, label, placeholder, type = "text", error, className = "", ...rest },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const labelText = typeof label === "string" ? label : undefined;

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="sr-only">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        type={type}
        placeholder={placeholder ?? labelText}
        className={`
 w-full border rounded-full bg-white
 h-14 pl-5 pr-4 text-sm text-gray-800
 outline-none transition-all
 border-gray-200
 focus-within:border-[#ff5f00]
 ${error ? "border-red-400 focus:border-red-400" : ""}
 ${className}
 `}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${inputId}-error` : undefined}
        {...rest}
      />
      {error && (
        <p id={`${inputId}-error`} className="mt-1 ml-4 text-xs text-red-500">
          {error}
        </p>
      )}
    </div>
  );
});

export default Input;
