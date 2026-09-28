/**
 * Menu icon drawn as a mask rather than an <img>: the source SVGs are stroked
 * in a fixed grey, and masking lets each row colour its own icon.
 *
 * @param {string} src - path to the SVG under /public.
 * @param {string} className - sizing and colour (the mask paints `bg-current`).
 */
export default function NavMenuIconV3({ src, className = "" }) {
  return (
    <span
      aria-hidden="true"
      className={`mask-center mask-contain mask-no-repeat block shrink-0 bg-current ${className}`}
      style={{ maskImage: `url(${src})`, WebkitMaskImage: `url(${src})` }}
    />
  );
}
