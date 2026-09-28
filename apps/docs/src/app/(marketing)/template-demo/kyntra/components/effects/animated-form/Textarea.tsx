// Built using Hyperiux Vault: https://vault.hyperiux.com
import React, { forwardRef, type ComponentPropsWithoutRef, type ReactNode } from "react";

export type TextareaProps = {
  id?: string;
  label?: ReactNode;
  error?: string;
  rows?: number;
  className?: string;
} & Omit<ComponentPropsWithoutRef<'textarea'>, 'id' | 'rows'>;

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { id, label, error, rows = 3, className = "", ...rest },
  ref,
) {
  return (
    <div className="w-full">
      <div className="group relative w-full">
        {label && (
          <label
            htmlFor={id}
            className="
              pointer-events-none absolute left-[1.6vw] top-[1.3vw] z-10 block
              font-aeonik-pro text-[1.05vw] text-white
              transition-all duration-300 ease-out
              group-focus-within:top-[0.7vw] group-focus-within:text-[0.75vw] group-focus-within:text-white
              has-[+textarea:not(:placeholder-shown)]:top-[0.7vw]
              has-[+textarea:not(:placeholder-shown)]:text-[0.75vw]
              has-[+textarea:not(:placeholder-shown)]:text-white
              max-[1025px]:left-[5vw] max-[1025px]:top-[4vw] max-[1025px]:text-[3.2vw]
              max-[1025px]:group-focus-within:top-[2.2vw] max-[1025px]:group-focus-within:text-[2.4vw]
              max-[1025px]:has-[+textarea:not(:placeholder-shown)]:top-[2.2vw]
              max-[1025px]:has-[+textarea:not(:placeholder-shown)]:text-[2.4vw]
              max-md:text-[4vw]
            "
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={id}
          rows={rows}
          placeholder=" "
          className={`
            w-full resize-none rounded-[0.8vw] border border-white/25 bg-white/5
            px-[1.6vw] pb-[1.2vw] pt-[2.4vw] font-aeonik-pro text-[1.05vw]
            text-white outline-none transition-colors duration-300
            hover:border-white/40 focus:border-white/60
            max-[1025px]:rounded-[2.5vw] max-[1025px]:px-[5vw] max-[1025px]:pb-[4vw] max-[1025px]:pt-[7vw] max-[1025px]:text-[3.2vw]
            max-md:text-[4vw]
            ${error ? "border-red-400/70 focus:border-red-400" : ""}
            ${className}
          `}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          {...rest}
        />
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

export default Textarea;
