// Built using Hyperiux Vault: https://vault.hyperiux.com
"use client";

import Image from "next/image";

import exp01 from "./assets/exp01.webp";
import exp02 from "./assets/exp02.jpg";
import exp03 from "./assets/exp03.jpg";
import { FadeUp, lineDraw } from "./gsapAnimations";

const ProjectHover = () => {
  lineDraw();

  return (
    <>
      <section className="py-[10%] bg-[#161616] max-md:py-[20%] max-[1025px]:py-[10%]">
        <div className={`px-[5%] max-md:px-[6%] flex items-center justify-center`}>
        

        
          <div className="w-[90%] flex flex-col font-medium">
           

           <FadeUp>

          
            {/* First Project */}
            <div className="text-center group" id="p1">
              <div className="flex w-fit mx-auto items-center justify-center mb-[2.8vw] relative gap-[1.5vw]">
                <p className={`uppercase font-neue-montreal text-white group-hover:translate-x-[-4.5vw] rtl:group-hover:translate-x-[4.5vw] duration-300 text-[4vw] leading-none  ease-out max-[1025px]:text-[5vw] max-[1025px]:group-hover:translate-x-0 rtl:max-[1025px]:group-hover:translate-x-0`}>
                  <span className="max-[1025px]:text-[7vw]">25+</span>{" "}Years Of Experience
                </p>
                <div className="w-[6vw] absolute right-[-9%] h-[6vw] rtl:right-auto rtl:left-[-20%] top-[-25%] rounded-full overflow-hidden ml-[1.5vw] scale-0 duration-300 ease-out group-hover:scale-100 max-[1025px]:group-hover:scale-0">
                  <Image src={exp01} alt="Lumera Heights architectural detail" width={200} height={200} className="object-cover h-full w-full" />
                </div>
              </div>
              <span data-line-draw className="w-full block h-px bg-white max-md:my-[7vw] max-[1025px]:my-[4vw]"></span>
            </div>
             </FadeUp>

      <FadeUp>

      
            {/* Second Project */}
            <div className="text-center group" id="p2">
              <div className="flex items-center justify-center mt-[3.5vw] mb-[2.8vw] relative gap-[1.5vw]">
                <p className={`uppercase font-neue-montreal text-white group-hover:translate-x-[-4.8vw] rtl:group-hover:translate-x-[5.5vw] duration-300 text-[4vw] leading-none  ease-out max-[1025px]:text-[5vw] max-[1025px]:group-hover:translate-x-0 rtl:max-[1025px]:group-hover:translate-x-0`}>
                  <span className="max-[1025px]:text-[7vw]">50K+</span>{" "}Home
                </p>{" "}
                <div className={`w-[6vw] absolute right-[47%] h-[6vw] top-[-10%] rtl:right-auto rtl:left-[35%] overflow-hidden ml-[1.5vw] scale-0 duration-300 ease-out group-hover:scale-100 [clip-path:circle(100%_at_0_100%)] max-[1025px]:hidden`}>
                  <Image src={exp02} alt="Lumera Heights completed home interior" width={250} height={250} className="object-cover h-full w-full" />
                </div>
                <p className={`uppercase font-neue-montreal text-white group-hover:translate-x-[2.4vw] rtl:group-hover:translate-x-[-4vw] duration-300 text-[4vw] leading-none ease-out max-[1025px]:text-[5vw] max-[1025px]:group-hover:translate-x-0 rtl:max-[1025px]:group-hover:translate-x-0 max-[1025px]:pt-[1vw]`}>
                  Delivered
                </p>
              </div>
              <span data-line-draw className="w-full block h-px bg-white max-md:my-[7vw] max-[1025px]:my-[4vw]"></span>
            </div>
            </FadeUp>

            <FadeUp>

           

            {/* Third Project */}
            <div className="text-center group" id="p3">
              <div className="flex items-center justify-center mt-[3.5vw] mb-[2.8vw] relative gap-[1.5vw]">
                <p className={`uppercase font-neue-montreal text-white group-hover:translate-x-[-7.2vw] rtl:group-hover:translate-x-[7.5vw] duration-300 text-[4vw] leading-none  ease-out max-[1025px]:text-[7vw] max-[1025px]:group-hover:translate-x-0 rtl:max-[1025px]:group-hover:translate-x-0`}>
                  20+
                </p>{" "}
                <div className="w-[12vw] absolute right-[62%] h-[6vw] top-[-15%] rtl:right-auto rtl:left-[48%] overflow-hidden ml-[1.5vw] scale-0 duration-300 ease-out group-hover:scale-100 rounded-xl max-[1025px]:hidden">
                  <Image src={exp03} alt="Lumera Heights luxury project exterior" width={250} height={250} className="object-cover h-full w-full" />
                </div>
                <p className={`uppercase font-neue-montreal text-white group-hover:translate-x-[5.2vw] rtl:group-hover:translate-x-[-7.5vw] duration-300 text-[4vw] leading-px ease-out max-[1025px]:text-[5vw] max-[1025px]:group-hover:translate-x-0 rtl:max-[1025px]:group-hover:translate-x-0`}>
                  Luxury Projects
                </p>
              </div>
              <span data-line-draw className="w-full block h-px  bg-white max-md:my-[7vw] max-[1025px]:my-[4vw]"></span>
            </div>
             </FadeUp>
          </div>

        </div>
      </section>
    </>
  );
};

export default ProjectHover;
