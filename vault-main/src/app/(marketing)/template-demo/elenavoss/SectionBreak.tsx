"use client";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/dist/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import Image from "next/image";
import { useRef } from "react";
import Client1 from "./assets/clients-1.webp";
import Client2 from "./assets/clients-2.webp";
import Client3 from "./assets/clients-3.webp";
import Client4 from "./assets/clients-4.webp";
import Client5 from "./assets/clients-5.webp";
import Client6 from "./assets/clients-6.webp";
import OverflowTextReveal from "./effects/overflow-text-reveal";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

export default function SectionBreak() {
  const container = useRef<HTMLElement | null>(null);
  const gridRef = useRef<HTMLDivElement | null>(null);

  useGSAP(
    () => {
      const grid = gridRef.current;
      if (!grid) return;
      const gridItems = Array.from(grid.querySelectorAll<HTMLElement>(".grid__item"));
      const total = gridItems.length;
      if (total === 0) return;

      const timeline = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: container.current,
          start: "top 20%",
          end: "bottom center",
          scrub: true,
          // markers:true,
        },
      });

      const isDesktop = globalThis.innerWidth > 1024;
      const enterDuration = isDesktop ? 1.5 : 4;
      const exitDuration = isDesktop ? 1.5 : 3.5;
      // Gap (in timeline seconds) between one cluster's start and the next -
      // kept close to enterDuration so a new wave doesn't start arriving
      // until the current one has essentially finished appearing. Waves
      // read as distinct "two-three, two-three" beats instead of several
      // clusters' entrances piling on top of each other.
      const groupStep = enterDuration + 0.4;
      // Short, deliberate stagger between one item's start and the next
      // item's start within the same cluster - small enough that the 2-3
      // items still read as one wave "arriving together", but with a
      // visible beat between each rather than popping in simultaneously.
      const withinGroupStagger = isDesktop ? 0.4 : 0.5;

      // Split items into small clusters of 2-3, applied uniformly all the
      // way through (including whatever's left in the last cluster) so the
      // rhythm stays consistent start to finish - no special-cased finale
      // that dumps every remaining logo in at once.
      const groups: number[][] = [];
      for (let i = 0; i < total; ) {
        const remaining = total - i;
        const size = Math.min(remaining, gsap.utils.random(2, 3, 1));
        groups.push(Array.from({ length: size }, (_, k) => i + k));
        i += size;
      }

      groups.forEach((group, groupIndex) => {
        const groupStart = groupIndex * groupStep;

        group.forEach((itemIndex, indexInGroup) => {
          const item = gridItems[itemIndex];
          const startTime = groupStart + indexInGroup * withinGroupStagger;

          gsap.set(item, {
            transformOrigin: "0% 0%",
            opacity: 0,
            x: isDesktop ? gsap.utils.random(-180, 180) : 0,
            y: isDesktop ? gsap.utils.random(-180, 180) : gsap.utils.random(-180, 180),
            filter: "blur(10px)",
            z: isDesktop ? gsap.utils.random(-2200, -1600) : gsap.utils.random(-550, -400),
          });

          timeline
            .to(
              item,
              {
                z: 0,
                opacity: 1,
                filter: "blur(0px)",
                duration: enterDuration,
              },
              startTime,
            )
            .to(
              item,
              {
                filter: "blur(10px)",
                opacity: 0,
                z: isDesktop ? gsap.utils.random(1400, 1800) : gsap.utils.random(500, 700),
                duration: exitDuration,
              },
              startTime + enterDuration,
            );
        });
      });
    },
    { scope: container },
  );

  return (
    <section
      ref={container}
      id="clientblur"
      className="relative w-screen h-[240vh] text-center z-2  bg-[#070707]"
    >
      <div className="sticky w-full top-0 h-screen flex items-center justify-center">
        <div className="w-3/5 max-lg:w-4/5">
          <OverflowTextReveal stagger={0.015}>
            <h3 className="text-[5.5vw]  text-white leading-[1.2] max-lg:text-[7vw] max-md:text-[8vw]">
              Trusted by Founders and Creatives, Built for Ambitious Brands.
            </h3>
          </OverflowTextReveal>
        </div>
      </div>
      <div className="left-0 sticky mt-[-100vh] top-0 z-20 h-screen w-screen overflow-hidden flex items-center justify-center">
        <div
          ref={gridRef}
          className="grid grid-cols-5 gap-[3vw] perspective-[350vw] max-md:grid-cols-3 max-md:gap-[6vw]"
        >
          {logos.map((item, index) => (
            <div key={index} className="grid__item flex h-[8vw] w-[14vw] items-center justify-center max-md:h-[22vw] max-md:w-[26vw]">
              {/* The logos are wildly different natural aspect ratios (a
                  wide wordmark vs. a near-square mark) - object-contain
                  against the full grid cell lets the squarer ones (Adobe,
                  IBM) balloon out to the cell's full height while the wider
                  ones stay small. Giving the image its own smaller, common
                  height (half the cell's) instead of the cell's full height
                  makes every logo render at that same height UNLESS it's
                  wide enough to hit the cell's width limit first - the one
                  genuinely-wide logo among these six ends up a bit shorter
                  than the rest, but nothing overflows and nothing looks
                  randomly oversized. */}
              <Image
                className="h-[4vw] w-full object-contain max-md:h-[11vw]"
                src={item.src}
                alt={item.alt}
                sizes="(max-width: 48rem) 26vw, 14vw"
                quality={100}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const clients = [
  { src: Client1, alt: "Google logo" },
  { src: Client2, alt: "Adobe logo" },
  { src: Client3, alt: "JP logo" },
  { src: Client4, alt: "Pinterest logo" },
  { src: Client5, alt: "IBM logo" },
  { src: Client6, alt: "Intel logo" },
];
const logos = [...clients, ...clients];
