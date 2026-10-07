"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/dist/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { prefersReducedMotion } from "@/lib/motion";
import LinkButton from "@/components/WebsiteComps/LinkButton";
import MaskTextReveal from "@/components/mask-text-reveal";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, useGSAP);
}

// How far each box starts to the right before sliding in as you scroll
const SLIDE_X_PERCENT = [110, 70, 70, 70, 70];

function UseCaseBox({ item }) {
  return (
    <article className="use-case-box relative -mt-px w-full border border-background/15">
      <div className="border-b border-background/15 px-[2vw] py-[2.5vw] max-md:px-[4vw] max-md:py-[5vw] max-sm:px-[6vw] max-sm:py-[7vw]">
        <h3 className={`text32 font-avenir text-[2.6vw]! max-md:text-[4vw]! max-sm:text-[6.6vw]! font-avenir`}>{item.title}</h3>
      </div>

      <div className="flex flex-col justify-between gap-[4vw] px-[2vw] py-[2.5vw] max-md:gap-[7vw] max-md:px-[4vw] max-md:py-[5vw] max-sm:gap-[10vw] max-sm:px-[6vw] max-sm:py-[7vw]">
        <p className={`text22 font-avenir text-[1.1vw]! leading-[1.6]! max-md:text-[2.2vw]! max-sm:text-[4.1vw]! w-[80%] max-md:w-full`}>{item.text}</p>
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
    <div
      ref={container}
      className="mx-auto flex h-fit w-full max-w-[1536px] items-start justify-between overflow-x-clip px-[4.5vw] py-[7%] text-background max-md:flex-col max-md:gap-[8vw] max-md:px-[5vw] max-md:pb-[30vw]! max-sm:px-[7vw]"
    >
      <MaskTextReveal stagger={0.08} scrub={false} duration={2} className="sticky top-[20vh] w-[40vw] max-md:static max-md:mb-[10vw]! max-md:w-full">
        <h2 className={`text64 text-[4.6vw]! max-md:text-[6vw]! max-sm:text-[9vw]! font-avenir`}>
          Built for teams where frontend is part of the brand & your interface needs to feel as premium as the product.
        </h2>
      </MaskTextReveal>

      <div className="flex h-full w-[43vw] flex-col max-md:w-full max-md:gap-[8vw] max-sm:gap-[10vw]">
        {useCases.map((item) => (
          <UseCaseBox key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}
