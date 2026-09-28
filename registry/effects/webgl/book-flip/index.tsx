// Built using Hyperiux Vault: https://vault.hyperiux.com

"use client";

import { useEffect, useState } from "react";
import { BookFlipp } from "./BookFlip";

function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setPrefersReducedMotion(mediaQuery.matches);
    update();
    mediaQuery.addEventListener("change", update);
    return () => mediaQuery.removeEventListener("change", update);
  }, []);

  return prefersReducedMotion;
}

export default function BookFlip({
  pageSpeed = 0.8,
  bookScale = 1,
}) {
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <>
    <BookFlipp
      images={BOOK_IMAGES}
      pathPattern=""
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
    <div className="w-fit absolute text-white bottom-8 left-1/2 -translate-x-1/2 text-center">
    Click on the navigation buttons or the pages itself to flip pages of the book

    </div>

    {prefersReducedMotion && (
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-4 right-4 z-40 w-fit max-w-65 rounded-md border border-white/15 bg-white/5 p-3 text-center backdrop-blur-sm max-md:hidden"
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
  "https://picsum.photos/seed/book1/800/600",
  "https://picsum.photos/seed/book2/800/600",
  "https://picsum.photos/seed/book3/800/600",
  "https://picsum.photos/seed/book4/800/600",
  "https://picsum.photos/seed/book5/800/600",
  "https://picsum.photos/seed/book6/800/600",
  "https://picsum.photos/seed/book7/800/600",
  "https://picsum.photos/seed/book8/800/600",
  "https://picsum.photos/seed/book9/800/600",
  "https://picsum.photos/seed/book10/800/600",
  "https://picsum.photos/seed/book11/800/600",
  "https://picsum.photos/seed/book12/800/600",
  "https://picsum.photos/seed/book13/800/600",
  "https://picsum.photos/seed/book14/800/600",
];
