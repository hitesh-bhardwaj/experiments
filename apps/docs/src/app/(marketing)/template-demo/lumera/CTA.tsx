// Built using Hyperiux Vault: https://vault.hyperiux.com

"use client";

import Image from "next/image";

import BlackButton from "./BlackButton";
import PrimaryButton from "./PrimaryButton";
import cta1 from "./assets/cta-1.webp";
import cta2 from "./assets/cta-2.webp";
import cta3 from "./assets/cta-3.webp";
import cta4 from "./assets/cta-4.webp";
import MaskTextReveal from "./effects/mask-text-reveal";
import { useEnquiryModal } from "./EnquiryModal";
import { FadeUp } from "./gsapAnimations";

const ctaImages = [
  { src: cta1, alt: "Lumera Heights living room interior" },
  { src: cta2, alt: "Lumera Heights kitchen interior" },
  { src: cta3, alt: "Lumera Heights bedroom interior" },
  { src: cta4, alt: "Lumera Heights building exterior" },
];

const CTA = () => {
  const { openEnquiryModal } = useEnquiryModal();

  const handleOpenEnquiry = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    openEnquiryModal();
  };

  return (
    <section className="relative z-10 bg-white px-[5%] py-[6%] max-md:px-[6%] max-md:py-[14%] max-[1025px]:py-[8%]" id="cta">
      <FadeUp className="w-full overflow-hidden rounded-[2.5vw] border border-black max-md:rounded-[6vw] max-[1025px]:rounded-[4vw]">
        <div className="flex flex-col items-center gap-[1.8vw] px-[6vw] pt-[5vw] text-center max-md:gap-[6vw] max-md:px-[6vw] max-md:pt-[14vw] max-[1025px]:gap-[3vw] max-[1025px]:px-[8vw] max-[1025px]:pt-[8vw]">
          <MaskTextReveal className="max-w-[60%] max-[1025px]:max-w-[90%]">

          <h2
            data-para-anim
            className=" font-medium! font-neue-montreal text-[#1C1B1A] text-[3.8vw] leading-[1.15] max-[1025px]:text-[5vw] max-md:text-[6.8vw] "
            >
            Some Properties Need to be Experienced in Person
          </h2>
            </MaskTextReveal>

            <MaskTextReveal className="w-[55%] max-[1025px]:w-[90%]">

          <p
            data-para-anim
            className=" text-[1.2vw] leading-[1.6] text-[#1C1B1A] max-md:text-[4.2vw]  max-[1025px]:text-[2.4vw]"
            >
            Tell us what you are looking for and our team will introduce you to residences that fit your lifestyle, priorities and ambitions in Dubai.
          </p>
            </MaskTextReveal>

            <FadeUp>

          <div className="mt-[1vw] flex items-center gap-[1.2vw] fadeup max-md:mt-[4vw] max-md:w-full max-[1025px]:flex-col max-md:gap-[4vw] max-[1025px]:gap-[2.5vw]">
            <BlackButton
              btnText="Arrange Private Consultation"
              link="#"
              onClick={handleOpenEnquiry}
              className="bg-[#1c1b1a] font-normal!"
              borderColor="#1c1b1a"
              />
            <PrimaryButton
              btnText="Contact Our Team"
              link="#"
              onClick={handleOpenEnquiry}
              className="border border-[#1c1b1a] max-[1025px]:w-full"
              />
          </div>
              </FadeUp>
        </div>

        <FadeUp>

       

        <div className="mt-[3.5vw] max-[1025px]:pb-[5vw] max-[1025px]:grid-cols-2 max-[1025px]:px-[6vw] grid grid-cols-4 gap-[1.5vw] px-[3vw] pb-[3vw] max-md:mt-[8vw] max-md:grid-cols-2 max-md:gap-[2.5vw] max-md:px-[5vw] max-md:pb-[5vw] max-[1025px]:gap-[1.5vw] ">
          {ctaImages.map(({ src, alt }, index) => (
            <div
              key={index}
              className="group relative aspect-4/3 overflow-hidden rounded-[1.2vw] max-md:rounded-[3vw] max-[1025px]:rounded-[2vw]"
            >
              <Image
                src={src}
                alt={alt}
                fill
                sizes="(max-width: 768px) 50vw, 25vw"
                className="object-cover transition-transform duration-500 ease-in-out group-hover:scale-110"
              />
            </div>
          ))}
        </div>
         </FadeUp>
      </FadeUp>
    </section>
  );
};

export default CTA;
