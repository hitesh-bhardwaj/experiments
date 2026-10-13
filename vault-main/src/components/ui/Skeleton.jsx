/**
 * Placeholder for a value that is still being fetched (counts, plan, stats).
 * Inherits the surrounding text colour, so it works on light and dark surfaces;
 * size it with `className` (it defaults to a short, text-height bar).
 */
export function Skeleton({ className = "h-[1em] w-8", ...props }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block animate-pulse bg-current align-middle opacity-15 motion-reduce:animate-none ${className}`}
      {...props}
    />
  );
}
