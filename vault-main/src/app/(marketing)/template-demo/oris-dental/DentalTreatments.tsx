"use client";

import React, { useEffect, useId, useRef } from "react";
import gsap from "gsap";
import ScrollTrigger from "gsap/dist/ScrollTrigger";
import SplitTextLines from "./effects/split-text-lines/SplitTextLines";

import Image, { StaticImageData } from "next/image";
import treatment1 from "./assets/treatment1.webp";
import treatment2 from "./assets/treatment2.webp";
import treatment3 from "./assets/treatment3.webp";

gsap.registerPlugin(ScrollTrigger);

export interface TreatmentCard {
  id: number;
  title: string;
  tags: string[];
  description: string;
  bgColor: string;
  image: StaticImageData | string;
}

const TREATMENTS_DATA: TreatmentCard[] = [
  {
    id: 1,
    title: "Teeth Whitening",
    tags: ["Advanced brightening", "Stain removal", "Instant results"],
    description:
      "Professional teeth whitening treatments utilize safe, high-grade bleaching agents activated by specialized light technology to lift years of deep stains, restoring brilliant natural radiance in a single comfortable visit.",
    bgColor: "#13314a",
    image: treatment1,
  },
  {
    id: 2,
    title: "Dental Implants",
    tags: ["Permanent solution", "Natural appearance", "Long-term care"],
    description:
      "Dental implants are titanium posts surgically placed into the jawbone to serve as artificial tooth roots. Once healed, they support custom crowns that look, feel, and function like natural teeth, restoring your ability to eat, speak, and smile with full confidence.",
    bgColor: "#3365e2",
    image: treatment2,
  },
  {
    id: 3,
    title: "Orthodontics & Aligners",
    tags: ["Custom fit", "Discreet alignment", "Gentle movement"],
    description:
      "Clear aligners and modern orthodontic options gently guide teeth into optimal alignment over time. Designed for discreet comfort and easy maintenance throughout your daily routine.",
    bgColor: "#13314a",
    image: treatment3,
  },
];

export default function DentalTreatments({
  cards = TREATMENTS_DATA,
}: {
  cards?: TreatmentCard[];
}) {
  const uid = useId().replace(/:/g, "");
  const sectionId = `dental-treatments-${uid}`;
  const sectionRef = useRef<HTMLElement>(null);
  const runwayRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    cardRefs.current = cardRefs.current.slice(0, cards.length);

    const mm = gsap.matchMedia(sectionRef);

    // Reduced motion keeps the cards in normal document flow (see the CSS
    // below), so no timeline is built at all.
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const runway = runwayRef.current;
      const cardEls = cardRefs.current.filter(Boolean) as HTMLDivElement[];

      if (!runway || cardEls.length === 0) return;

      // The stage is stuck to the top of the viewport for exactly the
      // scroll span between these two points, so the timeline runs while
      // the cards are on screen.
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: runway,
          start: "20% 50%",
          end: "bottom bottom",
          scrub: true,
          markers: false,
          invalidateOnRefresh: true,
        },
      });

      // Only animate subsequent cards (index > 0) onto the stack
      cardEls.slice(1).forEach((card, i) => {
        // Incoming card rises up onto the stack
        tl.fromTo(
          card,
          {
            y: () => window.innerHeight * 1.1 - card.offsetTop,
          },
          { y: 0, ease: "none", duration: 1 },
          i,
        );

        // Previous cards in the stack scale down to create receding depth
        for (let prevIdx = 0; prevIdx <= i; prevIdx++) {
          const prevCard = cardEls[prevIdx];
          const targetScale = Math.max(0.85, 1 - (i + 1 - prevIdx) * 0.05);
          tl.to(
            prevCard,
            {
              scale: targetScale,
              transformOrigin: "center top",
              ease: "none",
              duration: 1,
            },
            i,
          );
        }
      });

      // Trailing beat so the finished stack holds before it scrolls away.
      tl.to({}, { duration: 0.5 });
    });

    return () => mm.revert();
  }, [cards]);

  return (
    <section
      id={sectionId}
      ref={sectionRef}
      className="w-full bg-white h-fit relative z-10 pt-[6vw] pb-[2vw] max-md:pb-0"
    >
      {/* Header Section */}
      <div className="oris-paddx mb-[7vw] max-[1025px]:mb-[10vw] max-md:mb-[12vw]">
        <SplitTextLines
          as="h2"
          className="text-[4.2vw] max-[1025px]:text-[6vw] max-md:text-[7.5vw]"
        >
          Dental Care Treatments
        </SplitTextLines>
        <SplitTextLines as="p" className="oris-text22 mt-[1.5vw]" delay={0.15}>
          Personalized care designed for every stage of dental health.
        </SplitTextLines>
      </div>

      {/* Scroll runway -> sticky stage -> absolutely stacked cards */}
      <div
        ref={runwayRef}
        style={{ height: `${cards.length * 50}svh` }}
        className="w-full motion-reduce:h-auto"
      >
        <div className="w-full oris-paddx sticky top-[5vw] max-[1025px]:top-0 h-screen max-[1025px]:h-[100svh] max-md:top-[13%] max-[1025px]:flex max-[1025px]:items-center max-md:items-start max-[1025px]:justify-center motion-reduce:static motion-reduce:h-auto">
          <div className="relative w-full h-full max-[1025px]:h-[74svh] max-md:h-[76svh] motion-reduce:h-auto">
            {cards.map((item, index) => (
              <div
                key={item.id}
                ref={(el) => {
                  cardRefs.current[index] = el;
                }}
                style={
                  index === 0
                    ? ({
                        zIndex: 1,
                        backgroundColor: item.bgColor,
                        top: 0,
                      } as React.CSSProperties)
                    : ({
                        zIndex: index + 1,
                        backgroundColor: item.bgColor,
                        top: `calc(${index * 6}vw)`,
                        "--top-tablet": `calc(${index * 16}px)`,
                        "--top-mobile": `calc(${index * 12}px)`,
                      } as React.CSSProperties)
                }
                className={`absolute inset-x-0 ${
                  index === 0
                    ? "top-0"
                    : "max-[1025px]:top-[var(--top-tablet)] max-md:top-[var(--top-mobile)] translate-y-[110vh]"
                } motion-reduce:static motion-reduce:translate-y-0 motion-reduce:mb-[25vw] h-[35vw] max-[1025px]:h-full rounded-[2.2vw] max-[1025px]:rounded-[24px] py-[1.4vw] pb-[2.8vw] px-[2.8vw] max-[1025px]:p-[4.5vw] max-md:p-[5vw] flex flex-row max-[1025px]:flex-col items-center max-[1025px]:items-start justify-between gap-[3vw] max-[1025px]:gap-[2.5vw] border border-white/10`}
              >
                {/* Left: Title, Tags & Description */}
                <div className="flex flex-col justify-between h-full flex-1 max-[1025px]:h-auto max-[1025px]:gap-[2.5vw]">
                  {/* Top: Title & Tags */}
                  <div>
                    <h3 className="text-white w-full text-[3.8vw] max-[1025px]:text-[5.5vw] max-md:text-[7vw] leading-[1.15]! whitespace-pre-line">
                      {item.title}
                    </h3>
                    <div className="flex flex-wrap items-center gap-[0.6vw] max-[1025px]:gap-[1.5vw] text-white oris-text22 mt-[1.2vw] max-[1025px]:mt-[2vw]">
                      {item.tags.map((tag, tagIdx) => (
                        <React.Fragment key={tagIdx}>
                          <span>{tag}</span>
                          {tagIdx < item.tags.length - 1 && (
                            <span className="w-[0.3vw] h-[0.3vw] max-[1025px]:w-[1vw] max-[1025px]:h-[1vw] rounded-full bg-white inline-block" />
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>

                  {/* Bottom: Description */}
                  <div>
                    <p className="text-white oris-text32 max-w-[55vw] pb-[3vw] max-[1025px]:pb-0 max-[1025px]:max-w-full">
                      {item.description}
                    </p>
                  </div>
                </div>

                {/* Right: Image Card */}
                {item.image && (
                  <div className="relative w-[24vw] h-[26vw] max-[1025px]:w-full max-[1025px]:h-[30svh] max-md:h-[30svh] rounded-[1.6vw] max-[1025px]:rounded-xl overflow-hidden shrink-0 shadow-lg">
                    <Image
                      src={item.image}
                      alt={item.title}
                      fill
                      sizes="(max-width: 1025px) 90vw, 25vw"
                      className="object-cover"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
