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

// How far each box starts to the right before sliding in as you scroll: the first from further out
const slideStart = (i) => (i === 0 ? 110 : 70);

function UseCaseBox({ item }) {
  return (
    <article className="use-case-box relative w-full border border-t-0 border-black/10 first:border-t max-md:border-t">
      <div className="border-b border-black/10 px-[calc(var(--cvw)*2)] py-[calc(var(--cvw)*2.5)] max-md:px-[6vw] max-md:py-[7vw]">
        <h3 className="type-h3">{item.title}</h3>
      </div>

      <div className="flex flex-col justify-between gap-[calc(var(--cvw)*4)] px-[calc(var(--cvw)*2)] py-[calc(var(--cvw)*2.5)] max-md:gap-[10vw] max-md:px-[6vw] max-md:py-[7vw]">
        <p className="type-body w-[80%] max-md:w-full">{item.text}</p>
        <div className="[&_a]:text-ink">
          <LinkButton href={item.link} text={item.cta} tilted={false} />
        </div>
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
          { xPercent: slideStart(i) },
          {
            xPercent: 0,
            ease: "power1.out",
            scrollTrigger: { trigger: box, start: "top 95%", end: "top 25%", scrub: true },
          },
        );
      });
    },
    { scope: container },
  );

  return (
    <section ref={container} id="use-cases" data-sound-flow="off" className="section-x overflow-x-clip bg-light py-[7%] text-ink">
      <div className="site-container flex h-fit items-start justify-between max-md:flex-col max-md:gap-[10vw]">
        <div className="sticky top-[20vh] w-[45%] max-md:static max-md:w-full">
          {/* The blog card's line wipe, scrubbed with the scroll like the cards beside it */}
          <LineWipe scrub start="top 95%" end="top top" lit="var(--ink)">
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
