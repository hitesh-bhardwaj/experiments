// The orange corner brackets of the homepage's framed blocks (the Preview
// rows' design language): four small L-marks sitting on a 1px grey border.
// The parent needs `position: relative` and that border; `className` styles
// every mark (e.g. a class to animate them).
const MARK = "pointer-events-none absolute size-[calc(var(--cvw)*0.5)] border-primary max-[1025px]:size-2 max-sm:size-1.5";
const CORNERS = [
    "-top-px -left-px border-t border-l",
    "-top-px -right-px border-t border-r",
    "-bottom-px -left-px border-b border-l",
    "-bottom-px -right-px border-b border-r",
];

export default function CornerMarks({ className = "" }) {
    return CORNERS.map((corner) => <span key={corner} aria-hidden="true" className={`${MARK} ${corner} ${className}`} />);
}
