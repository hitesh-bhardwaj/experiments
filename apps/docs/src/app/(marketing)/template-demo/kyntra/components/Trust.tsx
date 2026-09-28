// Built using Hyperiux Vault: https://vault.hyperiux.com
import Image from "next/image";
import NumberCounterThree from "./effects/number-counter/NumberCounterThree";
import ParallaxImageAnimation from "./effects/parallax-image-animation";

import trust from "../assets/trust.webp"

import { FadeUp, ParaAnim } from "./Animations/gsapAnim";
const STATS = [
  { value: "4.9/5", label: "Average Rating" },
  { value: "25K+", label: "Services Completed" },
  { value: "2K+", label: "Verified Professionals" },
  { value: "50+", label: "Service Categories" },
];

const Trust = () => {
  return (
    <section className="relative h-screen w-full overflow-hidden bg-black text-white max-[1025px]:h-fit  ">
  
      <Image
        src={trust}
        alt=""
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full scale-110 object-cover "
      />
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-black/55" />

      {/* Inset glass card */}
      <div className="relative z-10 flex h-full w-full pb-2 items-center justify-center px-[10vw] max-[1025px]:px-[3vw] max-[1025px]:py-[10vw] max-md:p-[7vw] max-md:py-[15vw]">
        <div className="relative h-[75vh] w-full max-w-360 overflow-hidden rounded-[1.6vw] max-[1025px]:h-full max-[1025px]:rounded-[4vw]  max-md:rounded-[4vw]">
          {/* Background image, parallax on scrub */}
          <ParallaxImageAnimation
            src={trust.src}
            alt="Kyntra verified professionals"
            start="top bottom"
            width={1440}
            height={736}
            quality={100}
            sizes="(max-width: 768px) 88vw, 80vw"
            wrapperClassName="pointer-events-none absolute inset-0"
            translateY="10%"
            scrub
          />

          <div aria-hidden className="pointer-events-none absolute inset-0 bg-black/25" />

          <div className="relative max-[1025px]:mt-[5vh] flex h-full flex-col justify-between p-[3.5vw] max-[1025px]:h-auto max-[1025px]:min-h-[100vw] max-[1025px]:gap-[10vw] max-[1025px]:p-[6vw] max-md:min-h-[175vw] max-md:gap-[12vw] max-md:p-[7vw]">
            <ParaAnim
              as="h2"
              className="font-helvetica-neue w-[50%] max-[1025px]:w-[90%] leading-[1.05] font-normal tracking-[-0.02em] max-[1025px]:text-[5vw] max-md:text-[10vw]"
            >
              Trusted by Homeowners
            </ParaAnim>

            <div className="grid grid-cols-4 gap-[3vw] max-[1025px]:grid-cols-1 max-[1025px]:gap-y-[7vw] max-md:gap-y-[9vw]">
              {STATS.map((stat, index) => (
                <div key={stat.label} className="flex flex-col">
                  <div className="flex h-[3.2vw] items-end leading-none **:leading-none max-[1025px]:h-[7vw] max-md:h-[11vw]">
                    <NumberCounterThree
                      value={stat.value}
                      fontWeight={500}
                      textColor="#ffffff"
                      textSize="font-medium text-[3.5vw] max-[1025px]:text-[6.5vw] max-md:text-[10vw]"
                    />
                  </div>
                  <div className="mt-[1.2vw] h-px w-full bg-white/50 max-[1025px]:mt-[2vw] max-[1025px]:w-[55%] max-md:mt-[3vw] max-md:w-[62%]" />
                  <FadeUp
                    as="span"
                    delay={index * 0.1}
                    className="mt-[0.9vw] text-22 tracking-wide text-white/85 max-[1025px]:mt-[2vw] max-[1025px]:text-[2.8vw] max-md:mt-[2.5vw] max-md:text-[4vw]"
                  >
                    {stat.label}
                  </FadeUp>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Trust;
