// Built using Hyperiux Vault: https://vault.hyperiux.com

import React, { forwardRef, type ComponentPropsWithoutRef, type ReactNode } from "react";

export type TextareaProps = {
  id?: string;
  label?: ReactNode;
  error?: string;
  rows?: number;
  className?: string;
} & Omit<ComponentPropsWithoutRef<'textarea'>, 'id' | 'rows'>;

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
 function Textarea(
 { id, label, error, rows = 5, className ="", ...rest },
 ref
) {
 const labelText = typeof label === "string" ? label : undefined;
 return (
 <div className="w-full">
 {label && (
 <label htmlFor={id} className="sr-only">
 {label}
 </label>
 )}
 <textarea
 ref={ref}
 id={id}
 rows={rows}
 placeholder={labelText ?? ""}
 className={`
 w-full border rounded-2xl bg-white
 pt-5 pb-4 pl-5 pr-4 text-sm text-gray-800
 outline-none transition-all resize-none
 border-gray-200
 focus:border-gray-400
 ${error ?"border-red-400 focus:border-red-400" :""}
 ${className}
 `}
 aria-invalid={error ? true : undefined}
 aria-describedby={error ? `${id}-error` : undefined}
 {...rest}
 />
 {error && (
 <p id={`${id}-error`} className="mt-1 ml-4 text-xs text-red-500">{error}</p>
 )}
 </div>
 );
})
;

export default Textarea;
