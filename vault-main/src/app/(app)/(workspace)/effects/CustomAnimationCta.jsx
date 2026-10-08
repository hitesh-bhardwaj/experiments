"use client";

import ButtonV3 from "@/homepage-v3/components/ButtonV3";
import { CustomAnimationFormTrigger } from "@/components/WebsiteComps/modals/CustomAnimationFormModal";


/**
 * "Request a custom animation" block - one component for the effects listing and the
 * effect detail page, so both render exactly the same thing. `cta` is the page content's
 * { heading, description, buttonText, buttonLink }; the button opens the custom
 * animation form. `sectionRef` lets the detail page's TOC stop above it.
 */
export function CustomAnimationCta({ cta, sectionRef, className = "" }) {
  if (!cta || !(cta.heading || cta.buttonText)) return null;

  return (
    <section
      ref={sectionRef}
      className={`mx-auto flex w-full items-start justify-between gap-[2vw] bg-ink px-[2.8vw] py-[3.3vw] text-light max-[1025px]:px-[3vw] max-md:flex-col max-md:gap-[6vw] max-md:px-[7vw] max-md:py-[10vw] ${className}`}
    >
      <div className="flex w-[60%] flex-col gap-4 max-md:w-full">
        {cta.heading && <h2 className="text64 font-aeonik font-medium">{cta.heading}</h2>}
        {cta.description && <p className="text24 max-w-3xl text-light/80">{cta.description}</p>}
      </div>
      {cta.buttonText && (
        <CustomAnimationFormTrigger>
          <ButtonV3 preventDefault={false} text={cta.buttonText} href={cta.buttonLink || "#"} className="w-fit" />
        </CustomAnimationFormTrigger>
      )}
    </section>
  );
}
