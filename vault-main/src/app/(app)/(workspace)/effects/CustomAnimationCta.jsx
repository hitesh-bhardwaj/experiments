"use client";

import ButtonV3 from "@/homepage-v3/components/ButtonV3";
import { CustomAnimationFormTrigger } from "@/components/WebsiteComps/modals/CustomAnimationFormModal";

const T18 = "text-[1.25vw] max-[1025px]:text-[2.2vw] max-md:text-[4.4vw]";

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
      className={`mx-auto flex w-full justify-between bg-[#1D1D1D] px-10 py-12 text-[#F4F4F4] max-[1025px]:px-6 max-md:my-[15vw] max-md:px-[7vw] ${className}`}
    >
      <div className="flex w-[60%] flex-col">
        {cta.heading && <h2 className="text-[3vw] font-medium max-md:text-[7vw]">{cta.heading}</h2>}
        {cta.description && <p className={`mt-4 max-w-3xl ${T18} text-white/80`}>{cta.description}</p>}
      </div>
      <div className="mt-2">
        {cta.buttonText && (
          <CustomAnimationFormTrigger>
            <ButtonV3 preventDefault={false} text={cta.buttonText} href={cta.buttonLink || "#"} className="mx-auto w-fit" />
          </CustomAnimationFormTrigger>
        )}
      </div>
    </section>
  );
}
