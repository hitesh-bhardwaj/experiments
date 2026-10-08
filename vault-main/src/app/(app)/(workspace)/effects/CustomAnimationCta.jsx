"use client";

import { motion } from "motion/react";
import Button from "@/homepage/components/Button";
import { CustomAnimationFormTrigger } from "@/components/WebsiteComps/modals/CustomAnimationFormModal";


/**
 * "Request a custom animation" block - one component for the effects listing and the
 * effect detail page, so both render exactly the same thing. `cta` is the page content's
 * { heading, description, buttonText, buttonLink }; the button opens the custom
 * animation form. `sectionRef` lets the detail page's TOC stop above it.
 *
 * It fades up as it scrolls into view, like the site's .fadeup (50px, 1.2s, power3.out,
 * at 90% of the viewport) - with motion, since the listing doesn't run useFadeUp and
 * swaps its content in place.
 */
export function CustomAnimationCta({ cta, sectionRef, className = "" }) {
  if (!cta || !(cta.heading || cta.buttonText)) return null;

  return (
    <motion.section
      ref={sectionRef}
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -10% 0px" }}
      transition={{ duration: 1.2, ease: [0.165, 0.84, 0.44, 1] }}
      className={`mx-auto flex w-full items-start justify-between gap-[2vw] bg-ink px-[2.8vw] py-[3.3vw] text-light max-lg:px-[3vw] max-md:flex-col max-md:gap-[6vw] max-md:px-[7vw] max-md:py-[10vw] ${className}`}
    >
      <div className="flex w-[60%] flex-col gap-4 max-md:w-full">
        {cta.heading && <h2 className="type-h1 font-medium!">{cta.heading}</h2>}
        {cta.description && <p className="type-body-lg max-w-3xl text-light/80">{cta.description}</p>}
      </div>
      {cta.buttonText && (
        <CustomAnimationFormTrigger>
          <Button preventDefault={false} text={cta.buttonText} href={cta.buttonLink || "#"} className="w-fit" />
        </CustomAnimationFormTrigger>
      )}
    </motion.section>
  );
}
