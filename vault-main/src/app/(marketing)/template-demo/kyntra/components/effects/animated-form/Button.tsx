// Built using Hyperiux Vault: https://vault.hyperiux.com
import React, { forwardRef, type ComponentPropsWithoutRef, type ReactNode } from "react";

/** White pill with trailing arrow */
export type ButtonProps = {
  children?: ReactNode;
  type?: 'button' | 'submit' | 'reset';
  isLoading?: boolean;
  loadingText?: string;
  showArrow?: boolean;
  className?: string;
} & Omit<ComponentPropsWithoutRef<'button'>, 'type'>;

const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    children,
    type = "button",
    isLoading = false,
    loadingText = "Sending...",
    showArrow = true,
    className = "",
    disabled,
    id,
    ...rest
  },
  ref,
) {
  const autoId =
    !id && typeof children === "string"
      ? children.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")
      : undefined;

  return (
    <button
      ref={ref}
      id={id ?? autoId}
      type={type}
      disabled={isLoading || disabled}
      className={`
        group relative inline-flex cursor-pointer items-center justify-center
        gap-[0.8vw] rounded-full bg-white px-[2.2vw] py-[1vw]
        font-aeonik-pro text-[1.05vw] tracking-tight text-black
        transition-all duration-300 hover:scale-[0.97] active:scale-95
        disabled:cursor-not-allowed disabled:opacity-70
        max-[1025px]:gap-[3vw] max-[1025px]:px-[8vw] max-[1025px]:py-[3.6vw] max-[1025px]:text-[3.2vw]
        max-md:w-full max-md:text-[4vw]
        ${className}
      `}
      {...rest}
    >
      {isLoading ? (
        <span className="flex items-center gap-[0.6vw] max-[1025px]:gap-[2vw]">
          <svg
            className="h-[1vw] w-[1vw] animate-spin max-[1025px]:h-[3.4vw] max-[1025px]:w-[3.4vw]"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="3"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 0 1 8-8v3a5 5 0 0 0-5 5H4z"
            />
          </svg>
          {loadingText}
        </span>
      ) : (
        <>
          {children}
          {showArrow && (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-[1.1vw] w-[1.1vw] transition-transform duration-300 group-hover:translate-x-[0.25vw] max-[1025px]:h-[3.6vw] max-[1025px]:w-[3.6vw]"
            >
              <path d="M5 12h14" />
              <path d="m12 5 7 7-7 7" />
            </svg>
          )}
        </>
      )}
    </button>
  );
});

export default Button;
