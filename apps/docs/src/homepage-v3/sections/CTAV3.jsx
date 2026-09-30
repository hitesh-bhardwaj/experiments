"use client";
import React, { Suspense } from "react";
import ButtonV3 from "../components/ButtonV3";
// import Piano from "../components/Piano";
import SplitLine from "@/components/WebsiteComps/SplitLine";
import { useWorkWithHyperiuxModal } from "@/components/WebsiteComps/modals/WorkWithHyperiuxModal";
import LineReveal from "@/components/Animations/LineReveal";

function CTAButtonV3s() {
  const { open } = useWorkWithHyperiuxModal();
  return (
    <div className="w-fit flex max-[1025px]:gap-[3vw] max-md:gap-[2vw] max-sm:gap-[5vw] items-center max-sm:flex-col max-md:items-start max-md:mx-auto max-md:w-full max-sm:w-full gap-[1.5vw]">
      <ButtonV3
        variant="outline"
        className="max-md:w-full"
        text="See Our Work"
        href="https://www.hyperiux.com/hyperiux-creds-2026.pdf"
        target_blank
      />
      <ButtonV3
        variant="orange"
        className="max-md:w-full"
        text="Work with Hyperiux"
        href="#"
        preventDefault
        onClick={open}
      />
    </div>
  );
}

export default function CTAV3() {
  return (
    <section
      id="CTA"
      className="h-fit gap-[3vw] max-[1025px]:gap-[6vw] max-md:h-fit max-md:mt-[-60vw]! mt-[-35vw] max-[1025px]:mt-[-65vw] max-md:py-[10vw] max-sm:py-[15vw]! max-md:mb-[10vw] overflow-x-hidden flex items-start justify-between max-sm:gap-[10vw] max-md:gap-[8vw] flex-col text-foreground self-padd relative z-500 w-full py-[7vw]!"
    >
      <LineReveal as="h2" className="t96 font-neue-haas max-[1025px]:w-full max-md:w-full relative z-2 w-[85%]">
        Need More Than a Component? We Build the Whole Interaction.
      </LineReveal>
      <div className="space-y-[3vw] max-[1025px]:space-y-[5vw] max-md:space-y-[10vw] relative z-2">
        <SplitLine as="p" delay={.25} className="text24 max-[1025px]:w-[75%] max-md:w-full w-[40vw]">
          Vault is a public slice of how Hyperiux approaches interaction design.
          Need something custom? We&apos;ll design and build it from scratch.
        </SplitLine>

        <Suspense
          fallback={
            <div className="w-fit flex max-[1025px]:gap-[3vw] max-md:gap-[2vw] max-sm:gap-[5vw] items-center max-sm:flex-col max-md:items-start max-md:mx-auto max-md:w-full max-sm:w-full gap-[1.5vw]">
              <ButtonV3
                variant="outline"
                className="max-md:w-full"
                text="See Our Work"
                href="https://www.hyperiux.com/hyperiux-creds-2026.pdf"
                target_blank
              />
              <ButtonV3
                variant="orange"
                className="max-md:w-full"
                text="Work with Hyperiux"
                href="#"
              />
            </div>
          }
        >
          <CTAButtonV3s />
        </Suspense>
      </div>

      {/* <Piano
        count={75}
        song="here-for-you"
        className="h-[18vw] max-[1025px]:hidden max-md:hidden z-0 w-[50vw] absolute bottom-0 right-0 pointer-events-none flex justify-between items-end"
      /> */}
    </section>
  );
}
