import { PixelateSvgFilter } from "@/components/pixelated-image-effect";

// Static (non-interactive) dot-matrix panel for the sign-in split layout -
// reuses the same declarative SVG pixelation filter as the "Pixelated Image
// Effect" registry effect (registry/effects/cursor/pixelated-image-effect),
// but without that component's pointer-tracking, animation loop, or baked-in
// headline copy, none of which apply to a static background panel.
export default function AuthArtPanel({
  src,
  pixelSize = 10,
  className = "",
}) {
  const filterId = "auth-art-pixelate-filter";

  return (
    <div className={`relative h-full w-full overflow-hidden bg-black ${className}`.trim()}>
      <PixelateSvgFilter id={filterId} size={pixelSize} crossLayers />

      <div
        className="absolute inset-0"
        style={{ filter: `url(#${filterId})` }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="" className="h-full w-full object-cover" />
      </div>
    </div>
  );
}
