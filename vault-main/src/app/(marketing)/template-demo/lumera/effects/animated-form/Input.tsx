// Built using Hyperiux Vault: https://vault.hyperiux.com

import { forwardRef, useId, type ComponentPropsWithoutRef, type ReactNode } from "react";

/**
 * Floating-label Input
 * Props:
 * - id: string (required, links label to input)
 * - label: string
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
  labelBg?: string;
} & Omit<ComponentPropsWithoutRef<'input'>, 'id' | 'type'>;

const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    id,
    label,
    placeholder,
    type = "text",
    error,
    labelBg = "",
    className = "",
    ...rest
  },
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
 origin-start text-gray-400
 group-focus-within:text-gray-700
 has-[+input:not(:placeholder-shown)]:text-gray-700
 absolute top-1/2 block -translate-y-1/2 cursor-text px-2 text-sm
 transition-all duration-200 ease-out z-10
 group-focus-within:pointer-events-none
 group-focus-within:top-0
 group-focus-within:-translate-y-1/2
 group-focus-within:cursor-default
 group-focus-within:text-xs
 group-focus-within:font-medium
 has-[+input:not(:placeholder-shown)]:pointer-events-none
 has-[+input:not(:placeholder-shown)]:top-0
 has-[+input:not(:placeholder-shown)]:-translate-y-1/2
 has-[+input:not(:placeholder-shown)]:cursor-default
 has-[+input:not(:placeholder-shown)]:text-xs
 has-[+input:not(:placeholder-shown)]:font-medium
 ml-4
"
          >
            <span
              className={`bg-white text-gray-700 inline-flex px-1 text-sm ${labelBg ? labelBg : "bg-white"}`}
            >
              {label}
            </span>
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          type={type}
          placeholder={placeholder ?? " "}
          className={`
 w-full border rounded-full bg-white
 h-14 pl-5 pr-4 text-sm text-gray-800
 outline-none transition-all
 border-gray-200
 focus:border-gray-400
 ${error ? "border-red-400 focus:border-red-400" : ""}
 ${className}
 `}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${inputId}-error` : undefined}
          {...rest}
        />
      </div>
      {error && <p id={`${inputId}-error`} className="mt-1 ml-4 text-xs text-red-500">{error}</p>}
    </div>
  );
});

export default Input;
