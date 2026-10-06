"use client";

import { BookFlipp } from "./BookFlip";
import { usePrefersReducedMotion } from "@/lib/motion";


export default function BookFlip({
  pageSpeed = 0.8,
  bookScale = 1,
}) {
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <>
    <BookFlipp
      images={BOOK_IMAGES}
      pathPattern="https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/book-flip"
      bgColor="#000000"
      cameraDistance={{
        mobile: 9,
        desktop: 4,
      }}
      floatConfig={{
        rotation_x: -Math.PI / 4,
        floatIntensity: 1,
        speed: 2,
        rotationIntensity: 2,
      }}
      showUI={true}
      pageSpeed={pageSpeed}
      bookScale={bookScale}
    />
    <div className="w-fit absolute bottom-8 max-md:bottom-3 max-md:w-[80vw] max-md:leading-[1.2] left-1/2 -translate-x-1/2 text-center">
    Click on the navigation buttons or the pages itself to flip pages of the book

    </div>

    {prefersReducedMotion && (
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-4 right-4 z-40 w-fit max-w-65 rounded-md border border-white/15 bg-white/5 p-3 text-center backdrop-blur-sm max-[1025px]:hidden"
      >
        <h2 className="text-sm leading-none text-white">
          The pages keep turning.
        </h2>
        <p className="mt-2 text-xs leading-5 text-white/65">
          Book Flip animates each page turn as a continuous physical bend
          when you click or drag. Since that motion is the entire
          interaction, reduced motion can&apos;t be applied here.
        </p>
      </div>
    )}
    </>
  );
}

const BOOK_IMAGES = [
  "nature01",
  "nature02",
  "nature03",
  "nature04",
  "nature05",
  "nature06",
  "nature07",
  "nature08",
  "nature09",
  "nature10",
  "nature11",
  "nature12",
  "nature13",
  "nature14",
];
