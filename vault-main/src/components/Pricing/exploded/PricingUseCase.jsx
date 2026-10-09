"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/dist/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { prefersReducedMotion } from "@/lib/motion";
import LinkButton from "@/components/WebsiteComps/LinkButton";
import LineWipe from "@/components/Animations/LineWipe";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, useGSAP);
}

// How far each box starts to the right before sliding in as you scroll
const SLIDE_X_PERCENT = [110, 70, 70, 70, 70];

function UseCaseBox({ item }) {
  return (
    <article className="use-case-box relative w-full border border-t-0 border-background/15 first:border-t max-md:border-t">
      <div className="border-b border-background/15 px-[2vw] py-[2.5vw] max-md:px-[6vw] max-md:py-[7vw]">
        <h3 className="type-h3">{item.title}</h3>
      </div>

      <div className="flex flex-col justify-between gap-[4vw] px-[2vw] py-[2.5vw] max-md:gap-[10vw] max-md:px-[6vw] max-md:py-[7vw]">
        <p className="type-body w-[80%] max-md:w-full">{item.text}</p>
        <LinkButton href={item.link} text={item.cta} prefetch={false} tilted={false} className="text-background!" />
      </div>
    </article>
  );
}

// Pricing page use cases, for the white sheet: dark text, thin dark borders,
// the page's side gutter, and plain boxes with no corner marks.
export default function PricingUseCase({ useCases }) {
  const container = useRef(null);

  useGSAP(
    () => {
      const boxes = gsap.utils.toArray(".use-case-box");
      if (prefersReducedMotion()) {
        gsap.set(boxes, { xPercent: 0 });
        return;
      }
      boxes.forEach((box, i) => {
        gsap.fromTo(
          box,
          { xPercent: SLIDE_X_PERCENT[i] },
          {
            xPercent: 0,
            ease: "power1.out",
            scrollTrigger: { trigger: box, start: "top 115%", end: "top 35%", scrub: true },
          },
        );
      });
    },
    { scope: container },
  );

  return (
    <section ref={container} id="use-cases" data-sound-flow="off" className="overflow-x-clip bg-foreground px-[4.5vw] py-[7%] text-background max-md:px-[6vw] max-md:py-[15%]">
      <div className="mx-auto flex h-fit w-full max-w-[1536px] items-start justify-between max-md:flex-col max-md:gap-[10vw]">
        <div className="sticky top-[20vh] w-[45%] max-md:static max-md:w-full">
          {/* The blog card's line wipe, scrubbed with the scroll like the cards beside it */}
          <LineWipe scrub start="top 95%" end="top top" lit="var(--background)">
            <h2 className="font-aeonik text-[calc(var(--cvw)*3.6)] leading-[1.1] max-lg:text-[5vw] max-md:text-[8vw]">
              Built for teams where frontend is part of the brand & your interface needs to feel as premium as the product.
            </h2>
          </LineWipe>
        </div>

        <div className="flex h-full w-[48%] flex-col max-md:w-full max-md:gap-[10vw]">
          {useCases.map((item) => (
            <UseCaseBox key={item.id} item={item} />
          ))}
        </div>
      </div>
    </section>
  );
}
