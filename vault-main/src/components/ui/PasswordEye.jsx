import { Eye, EyeOff } from "lucide-react";

const OUT = "transition-[rotate,scale,opacity] duration-250 ease-[cubic-bezier(.55,0,1,.45)]";
const IN = "transition-[rotate,scale,opacity] delay-150 duration-450 ease-[cubic-bezier(.34,1.56,.64,1)]";

/**
 * The show / hide password icon (sign-in page, dashboard settings): open eye = password
 * shown, struck eye = hidden. The outgoing icon turns and scales away fast, then the
 * incoming one turns and scales in with a small overshoot (the site's Copy -> Copied
 * timing). Size it with `className`.
 */
export function PasswordEye({ revealed, className = "size-4" }) {
  return (
    <span aria-hidden="true" className={`relative block ${className}`}>
      <EyeOff strokeWidth={1.7} className={`absolute inset-0 size-full motion-reduce:transition-none ${revealed ? `rotate-90 scale-0 opacity-0 ${OUT}` : `rotate-0 scale-100 opacity-100 ${IN}`}`} />
      <Eye strokeWidth={1.7} className={`absolute inset-0 size-full motion-reduce:transition-none ${revealed ? `rotate-0 scale-100 opacity-100 ${IN}` : `-rotate-90 scale-0 opacity-0 ${OUT}`}`} />
    </span>
  );
}
