// A ring filled to `value` of `max` (a full orange ring when there's no limit).
export function RingMeter({ value = 0, max = null, className = "" }) {
  const share = max ? Math.min(1, value / max) : 1;
  const r = 15.9;
  const length = 2 * Math.PI * r;

  return (
    <svg viewBox="0 0 36 36" aria-hidden="true" className={`-rotate-90 ${className}`}>
      <circle cx="18" cy="18" r={r} fill="none" strokeWidth="2.5" className="stroke-foreground/10" />
      <circle
        cx="18"
        cy="18"
        r={r}
        fill="none"
        strokeWidth="2.5"
        strokeDasharray={`${(share * length).toFixed(2)} ${length.toFixed(2)}`}
        className="stroke-primary transition-[stroke-dasharray] duration-700"
      />
    </svg>
  );
}
