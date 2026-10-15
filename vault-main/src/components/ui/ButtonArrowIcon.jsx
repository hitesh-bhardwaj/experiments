// Right-pointing arrow (same path as public/icons/arrow-icon-final.svg), drawn
// inline in currentColor so it follows the surrounding text colour and hover.
export default function ButtonArrowIcon({ className = "" }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 14 14" fill="currentColor" className={className}>
      <path d="M0 6.125H10.6488L5.7575 1.23375L7 0L14 7L7 14L5.76625 12.7663L10.6488 7.875H0V6.125Z" />
    </svg>
  );
}
