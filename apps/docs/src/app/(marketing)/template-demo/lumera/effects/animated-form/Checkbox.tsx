
// Built using Hyperiux Vault: https://vault.hyperiux.com

import { forwardRef, type ComponentPropsWithoutRef, type ReactNode } from "react";

export type CheckboxProps = {
  id?: string;
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  label?: ReactNode;
  error?: string;
  accentColor?: string;
} & Omit<ComponentPropsWithoutRef<'button'>, 'id' | 'onChange'>;

const Checkbox = forwardRef<HTMLButtonElement, CheckboxProps>(
 function Checkbox(
 { id, checked, onChange, label, error, accentColor ="bg-orange-500", ...rest },
 ref
) {
 return (
 <div className="w-full">
 <div className="flex items-center gap-3">
 <button
 ref={ref}
 type="button"
 id={id}
 role="checkbox"
 aria-checked={checked}
 onClick={() => onChange && onChange(!checked)}
 className={`
 shrink-0 w-5 h-5 rounded border-2 transition-all duration-200
 flex items-center justify-center cursor-pointer
 ${checked
 ? `${accentColor} border-transparent`
 :"bg-white border-gray-400 hover:border-gray-600"
 }
 `}
 aria-invalid={error ? true : undefined}
 aria-describedby={error ? `${id}-error` : undefined}
 {...rest}
 >
 {checked && (
 <svg
 xmlns="http://www.w3.org/2000/svg"
 viewBox="0 0 12 12"
 fill="none"
 className="w-3 h-3"
 >
 <path
 d="M2 6l3 3 5-5"
 stroke="white"
 strokeWidth="1.8"
 strokeLinecap="round"
 strokeLinejoin="round"
 />
 </svg>
 )}
 </button>

 {label && (
 <div className="text-sm text-gray-600 font-light leading-snug select-none">
 {label}
 </div>
 )}
 </div>
 {error && (
 <p id={`${id}-error`} className="mt-1 ml-8 text-xs text-red-500">{error}</p>
 )}
 </div>
 );
})
;

export default Checkbox;
