"use client";
import React, { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/dist/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { prefersReducedMotion } from "@/lib/motion";
import LinkButton from "@/components/WebsiteComps/LinkButton";
import MaskTextReveal from "@/components/mask-text-reveal";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, useGSAP);
}

const USE_CASES_X_PERCENT = [110, 70, 70, 70, 70];

const mark =
  "pointer-events-none absolute size-[0.3vw] border-primary max-lg:size-1.5 max-md:size-2 max-sm:size-1";

function UseCaseBox({ item }) {
  return (
    <article className="use-case-box relative w-full -mt-px border border-grey bg-background/40">
      {/* TITLE */}
      <div className="relative border-b border-grey px-[2vw] py-[2.5vw] max-lg:px-[3vw] max-lg:py-[3.5vw] max-md:px-[4vw] max-md:py-[5vw] max-sm:px-[6vw] max-sm:py-[7vw]">
        <span className={`${mark} -top-px -left-px border-t border-l`} />
        <span className={`${mark} -top-px -right-px border-t border-r`} />
        <span className={`${mark} -bottom-px -left-px border-b border-l`} />
        <span className={`${mark} -bottom-px -right-px border-b border-r`} />

        <h3 className="text32 font-avenir max-md:text-[4.4vw] max-sm:text-[6.5vw]">
          {item.title}
        </h3>
      </div>

      {/* BODY */}
      <div className="flex flex-col justify-between gap-[4vw] px-[2vw] py-[2.5vw] max-lg:gap-[5vw] max-lg:px-[3vw] max-lg:py-[3.5vw] max-md:gap-[7vw] max-md:px-[4vw] max-md:py-[5vw] max-sm:gap-[10vw] max-sm:px-[6vw] max-sm:py-[7vw]">
        <p className="text22 font-avenir w-[80%] max-lg:w-full max-md:w-full leading-[1.35] max-md:text-[2.2vw] max-sm:text-[4vw]">
          {item.text}
        </p>

        <LinkButton
          href={item.link}
          text={item.cta}
          prefetch={false}
          tilted={false}
        />
      </div>
    </article>
  );
}

export default function UseCases({ useCases }) {
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
          { xPercent: USE_CASES_X_PERCENT[i] },
          {
            xPercent: 0,
            ease: "power1.out",
            scrollTrigger: {
              trigger: box,
              start: "top 115%",
              end: "top 35%",
              scrub: true,
              markers: false,
            },
          },
        );
      });
    },
    { scope: container },
  );

  return (
    <div
      ref={container}
      className="h-fit w-full mt-[8vw] max-lg:mt-[10vw] max-lg:flex-col max-lg:gap-[6vw] max-lg:pb-[0vw]! max-md:mt-[16vw] max-md:pb-[30vw]! flex justify-between self-padd items-start overflow-x-clip text-white max-md:flex-col max-md:gap-[8vw]"
    >
      <MaskTextReveal stagger={0.08} scrub={false} duration={2} className="w-[40vw] sticky top-[20vh] max-lg:static max-lg:w-full max-lg:mb-[6vw]! max-md:static max-md:w-full max-md:mb-[10vw]!">
        <h2 className="text64 font-avenir">
          Built for teams where frontend is part of the brand & your interface needs to feel as premium as the product.
        </h2>
      </MaskTextReveal>

      <div className="h-full w-[43vw] flex flex-col max-lg:w-full max-lg:gap-[6vw] max-md:w-full max-md:gap-[8vw] max-sm:gap-[10vw]">
        {/* BOXES */}
        {useCases.map((item) => (
          <UseCaseBox key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}
