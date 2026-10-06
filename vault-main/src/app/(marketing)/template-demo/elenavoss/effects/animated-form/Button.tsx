// Built using Hyperiux Vault: https://vault.hyperiux.com

import React, { forwardRef, type ComponentPropsWithoutRef, type ReactNode } from "react";

/**
 * Button
 * Props:
 * - children: React.ReactNode
 * - type:"button" |"submit" |"reset" (default"button")
 * - isLoading: boolean
 * - loadingText: string (default"Sending...")
 * - className: string
 * - All standard <button> props
 */
export type ButtonProps = {
  children?: ReactNode;
  type?: 'button' | 'submit' | 'reset';
  isLoading?: boolean;
  loadingText?: string;
  className?: string;
} & Omit<ComponentPropsWithoutRef<'button'>, 'type'>;

const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
 {
 children,
 type ="button",
 isLoading = false,
 loadingText ="Sending...",
 className ="",
 disabled,
 id,
 ...rest
 },
 ref
) {
 const autoId = !id && typeof children === "string"
   ? children.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")
   : undefined;

 return (
 <button
 ref={ref}
 id={id ?? autoId}
 type={type}
 disabled={isLoading || disabled}
 className={`
 relative inline-flex items-center justify-center
 rounded-full cursor-pointer
 bg-black text-white text-sm font-medium
 px-8 py-4 min-w-45
 transition-all duration-300
 hover:scale-[0.97] active:scale-95
 disabled:opacity-70 disabled:cursor-not-allowed
 ${className}
 `}
 {...rest}
 >
 {isLoading ? (
 <span className="flex items-center gap-2">
 <svg
 className="animate-spin w-4 h-4"
 xmlns="http://www.w3.org/2000/svg"
 fill="none"
 viewBox="0 0 24 24"
 >
 <circle
 className="opacity-25"
 cx="12"
 cy="12"
 r="10"
 stroke="currentColor"
 strokeWidth="4"
 />
 <path
 className="opacity-75"
 fill="currentColor"
 d="M4 12a8 8 0 018-8v8H4z"
 />
 </svg>
 {loadingText}
 </span>
 ) : (
 children
 )}
 </button>
 );
});

export default Button;
