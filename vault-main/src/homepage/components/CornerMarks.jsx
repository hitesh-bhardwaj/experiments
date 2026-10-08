
const MARK = "pointer-events-none absolute size-[calc(var(--cvw)*0.5)] border-primary max-lg:size-2 max-sm:size-1.5";
const CORNERS = [
    "-top-px -left-px border-t border-l",
    "-top-px -right-px border-t border-r",
    "-bottom-px -left-px border-b border-l",
    "-bottom-px -right-px border-b border-r",
];

export default function CornerMarks({ className = "" }) {
    return CORNERS.map((corner) => <span key={corner} aria-hidden="true" className={`${MARK} ${corner} ${className}`} />);
}
