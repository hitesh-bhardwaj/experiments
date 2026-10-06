// Built using Hyperiux Vault: https://vault.hyperiux.com

"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import service01 from "./assets/service01.webp";
import service02 from "./assets/service02.webp";
import service03 from "./assets/service03.webp";
import service04 from "./assets/service04.webp";
import service05 from "./assets/service05.webp";
import DraggableMarquee from "./effects/draggable-marquee";
import { FadeUp } from "./gsapAnimations";

const services = [
  {
    title: "RELAXATION LOUNGE",
    img: service01,
  },
  {
    title: "65 Foot Lap Pool",
    img: service02,
  },
  {
    title: "Spa and Wellness",
    img: service03,
  },
  {
    title: "Fire Place",
    img: service04,
  },
  {
    title: "Wine Cellar",
    img: service05,
  },
];

export default function Service() {
  const servicesScrollRef = useRef<HTMLDivElement>(null);
  const [servicesThumb, setServicesThumb] = useState({ widthPct: 100, leftPct: 0 });

  const updateServicesThumb = () => {
    const el = servicesScrollRef.current;
    if (!el) return;
    const widthPct = Math.min(100, (el.clientWidth / el.scrollWidth) * 100);
    const maxScroll = el.scrollWidth - el.clientWidth;
    const scrollRatio = maxScroll > 0 ? el.scrollLeft / maxScroll : 0;
    setServicesThumb({ widthPct, leftPct: scrollRatio * (100 - widthPct) });
  };

  useEffect(() => {
    updateServicesThumb();
    window.addEventListener("resize", updateServicesThumb);
    return () => window.removeEventListener("resize", updateServicesThumb);
  }, []);

  return (
    <>
      <section className="w-screen max-md:py-[20%] max-[1025px]:py-[10%] max-[1025px]:overflow-hidden max-md:overflow-hidden" id="services">
        <div className={` flex flex-col py-[10%] gap-[7vw] max-[1025px]:py-0 max-md:gap-[1vw]`}>
          <FadeUp>

          <div className="w-full">
            <DraggableMarquee speed={1} />
          </div>
          </FadeUp>

          <div>
            <FadeUp>

           
            <div
              ref={servicesScrollRef}
              onScroll={updateServicesThumb}
              className={`w-full h-full px-[5%] no-scrollbar max-[1025px]:overflow-x-auto overflow-hidden max-md:pr-0 max-md:mt-[10%] max-[1025px]:w-screen max-[1025px]:ml-0 max-md:ml-0 max-md:px-[5vw]`}
            >
              <div className="flex relative gap-[1.5%] aspect-[2.5] fadeup max-[1025px]:flex max-[1025px]:w-[400vw] max-[1025px]:ml-[5%] max-[1025px]:aspect-auto max-[1025px]:overflow-visible max-[1025px]:mb-[5vw] max-[1025px]:gap-[3vw] max-md:gap-[1.5%]">
                {services.map((service, index) => (
                  <div
                    key={index}
                    className="group w-[20%] flex rounded-[24px] h-[65vh] overflow-hidden items-start [clip-path:polygon(0_0,100%_0,100%_100%,0%_100%)] p-[1vw] no-underline transition-all duration-350 ease-in-out relative hover:w-[50%] focus:w-[50%] max-[1025px]:w-full max-[1025px]:hover:w-full max-[1025px]:focus:w-full max-md:w-full max-md:hover:w-full max-md:focus:w-full max-[1025px]:h-[50vh] max-[1025px]:p-[4vw]"
                  >
                    <Image
                      fill
                      alt={service.title}
                      src={service.img}
                      loading="lazy"
                      quality={90}
                      className="object-cover object-center h-full w-full transition-all duration-350 ease-in-out scale-110 group-hover:scale-100 group-focus:scale-100"
                    />
                    <div className="stripe-label max-w-[15vw] backdrop-blur-xl px-[2vw] py-[1vw] bg-white/10 rounded-lg overflow-hidden w-fit duration-500 ease-in-out transition-all group-hover:max-w-[42vw] group-focus:max-w-[42vw] max-[1025px]:max-w-[90%] max-[1025px]:py-[2vw] max-[1025px]:px-[3vw]">
                      <p className="truncate text-[1.15vw] font-medium! font-head text-white uppercase whitespace-nowrap max-md:text-[4vw] max-[1025px]:text-[3vw]" title={service.title}>
                        {service.title}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
             </FadeUp>

            <div className="relative mt-[3vw] mx-[5%] hidden h-[0.4vw] overflow-hidden rounded-full bg-[#e5e5e5] max-[1025px]:block max-[1025px]:h-[0.8vw] max-md:mx-[5vw] max-md:mt-[6vw]">
              <div
                className="absolute inset-y-0 rounded-l-full bg-black"
                style={{ width: `${servicesThumb.widthPct}%`, left: `${servicesThumb.leftPct}%` }}
              />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
