import CubeBackgroundAscii from "../../homepage-v3/components/CubeBackgroundAscii";

// Desktop keeps the original split: a fixed CubeBackgroundAscii canvas
// filling the viewport behind a w-1/2 form column on the right. Below 1025px
// the canvas is dropped entirely (a WebGL canvas fighting a full-width
// stacked form for space isn't worth it there) and the form just centers
// itself full-width with responsive padding.
export default function SplitAuthLayout({ children }) {
  return (
    <main className="flex min-h-screen w-full items-center justify-end text-white max-[1025px]:justify-center">
      <div className="h-screen w-full fixed inset-0 -translate-x-1/2 max-[1025px]:hidden">
        <CubeBackgroundAscii
          debug={false}
          src="/homepage-v3/pricing/new/1.mp4"
          config={{
            charSet: "hyperiux",
            charColumns: 196,
            charZoom: 1.56,
            charGap: 0.27,
            dither: 0.45,
            glyphGain: 1.25,
            videoScale: 0.77,
            videoOffsetX: 0.23,
            videoOffsetY: 0,
            levelsLow: 0.06,
            levelsHigh: 0.27,
            brightnessMap: 1.88,
            rampLow: 0,
            rampHigh: 0.44,
            invert: false,
          }}
        />
      </div>

      <div className="flex items-center justify-center px-36 py-20 w-1/2 max-[1025px]:w-full max-[1025px]:px-8 max-[1025px]:py-16 max-md:px-5 max-md:py-12">
        <div className="w-full max-w-136">{children}</div>
      </div>
    </main>
  );
}
