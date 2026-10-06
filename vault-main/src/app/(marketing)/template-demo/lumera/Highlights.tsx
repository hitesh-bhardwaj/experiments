// Built using Hyperiux Vault: https://vault.hyperiux.com

"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";

import SmoothInfiniteCarousel, {
  type KeyboardSlider,
} from "./smooth-carousel/SmoothInfiniteCarousel";
import highlight1 from "./assets/highlight-1.webp";
import highlight2 from "./assets/highlight-2.webp";
import highlight3 from "./assets/highlight-3.webp";
import highlight4 from "./assets/highlight-4.webp";
import MaskTextReveal from "./effects/mask-text-reveal";
import { FadeUp } from "./gsapAnimations";

const highlightImages = [highlight1,highlight2,highlight3,highlight4];

const highlightPlaces = [
  { distance: "5km", location: "Palm Jumeirah" },
  { distance: "10km", location: "Dubai Marina" },
  { distance: "2km", location: "Business Bay" },
  { distance: "1.5km", location: "Burj Khalifa" },
].map((place, index) => ({
  ...place,
  img: highlightImages[index % highlightImages.length],
}));

const Highlights = () => {
  const sliderRef = useRef<KeyboardSlider | null>(null);
  const rafRef = useRef<number | null>(null);
  const [thumb, setThumb] = useState({ width: 100, left: 0 });

  const carouselConfig = useMemo(
    () => ({
      infinite: false,
      snap: false,
      setOffset: ({ wrapperWidth }: { wrapperWidth: number }) => {
        const wrapperEl = sliderRef.current?.wrapper;
        if (!wrapperEl) return wrapperWidth;

        const cs = getComputedStyle(wrapperEl);
        const paddingLeft = parseFloat(cs.paddingLeft || "0");
        const paddingRight = parseFloat(cs.paddingRight || "0");
        const gap = parseFloat(cs.columnGap || "0");
        const itemCount = wrapperEl.children.length;

        // Desired: last item's right edge lands at (wrapperWidth - paddingRight).
        // Core's totalWidth/offset math ignores flex `gap`, so we fold paddingLeft
        // and the accumulated gaps into the offset to compensate.
        return (
          wrapperWidth -
          paddingRight -
          paddingLeft -
          Math.max(0, itemCount - 1) * gap
        );
      },
    }),
    []
  );

  const handleReady = (slider: KeyboardSlider) => {
    sliderRef.current = slider;
  };

  useEffect(() => {
    const tick = () => {
      const slider = sliderRef.current;
      if (slider) {
        const width = Math.min(
          100,
          (slider.viewport.wrapperWidth / slider.viewport.totalWidth) * 100
        );
        const left = slider.progress * (100 - width);
        setThumb({ width, left });
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <>
      <section className="pb-[7%] pt-[5%] space-y-[6vw]! max-[1025px]:space-y-[12vw]! overflow-hidden max-md:py-[15%]" id="highlights">
        <div className={`px-[5%] max-md:px-[6%] flex flex-col gap-[1.5vw]`}>
          <MaskTextReveal>

          <h2
            data-para-anim
            className="font-neue-montreal font-medium! text-[#1C1B1A] text-[3.8vw] leading-[1.2] max-[1025px]:text-[6.8vw] max-md:text-[8.8vw]"
            >
            Nearby Highlights
          </h2>
            </MaskTextReveal>
        </div>

        <FadeUp>

      

        <div className="">
          <SmoothInfiniteCarousel
            config={carouselConfig}
            wrapperClassName="fadeup pl-[5%] pr-[5%] pb-[1vw] gap-[1.2vw] max-[1025px]:gap-[8vw]"
            itemClassName="cursor-grab active:cursor-grabbing"
            onReady={handleReady}
          >
            {highlightPlaces.map((place, index) => (
              <div
                key={index}
                className="relative h-[27vw] w-[40vw] shrink-0 overflow-hidden rounded-lg max-[1025px]:h-[50vw] max-[1025px]:w-[78vw] max-md:h-[62vw] max-md:w-[84vw]"
              >
                <Image
                  src={place.img}
                  alt={place.location}
                  fill
                  draggable={false}
                  sizes="(max-width: 768px) 84vw, (max-width: 1024px) 72vw, 40vw"
                  className="object-cover transition-transform duration-500 ease-in-out hover:scale-110"
                />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-linear-to-t from-black/70 via-black/15 to-transparent" />
                <div className="absolute bottom-4 left-0 p-[2vw] max-md:p-[5vw]">
                  <p className="text-[1.3vw] text-white/80 max-md:text-[3.2vw]">
                    <span className="font-medium text-white">{place.distance}</span> away from
                  </p>
                  <p className=" mt-1.5 uppercase text-white text-[2vw] leading-[1.1] max-md:text-[6vw]">
                    {place.location}
                  </p>
                </div>
              </div>
            ))}
          </SmoothInfiniteCarousel>
          <div
            className="relative overflow-hidden rounded-full bg-[#e5e5e5] mt-[3.6vw] mx-[5%] h-[0.4vw] w-[90%] max-[1025px]:h-[1.5vw] max-md:mt-[7vw] max-md:w-[90vw]"
            aria-hidden="true"
          >
            <div
              className="absolute inset-y-0 rounded-full bg-black"
              style={{ width: `${thumb.width}%`, left: `${thumb.left}%` }}
            />
          </div>
        </div>
          </FadeUp>
      </section>
    </>
  );
};

export default Highlights;
