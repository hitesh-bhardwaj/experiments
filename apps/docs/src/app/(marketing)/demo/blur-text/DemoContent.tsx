"use client";

import React, { useEffect, useRef } from "react";
import BlurText from "@/components/blur-text";
import { ReactLenis } from "lenis/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import DemoHeader from "@/components/preview-chrome/DemoHeader";
import RegistryRemixerDemo from "@/components/remixer-panel/RegistryRemixerDemo";
gsap.registerPlugin(ScrollTrigger);


const Page = ({ registry }: any) => {
   const containerRef = useRef<HTMLDivElement | null>(null);

   useEffect(() => {
      const container = containerRef.current;
      if (!container) return;

      const ctx = gsap.context(() => {
         const sectionEls = container.querySelectorAll("section");

         [sectionEls[1], sectionEls[2], sectionEls[3]].forEach((el) => {
            if (!el) return;

            gsap.to(el, {
               backgroundColor: "#000000",
               color: "#ffffff",
               scrollTrigger: {
                  trigger: sectionEls[2],
                  start: "top 80%",
                  end: "top 20%",
                  scrub: true,
               },
            });

            el.querySelectorAll("[data-subtext]").forEach((sub: Element) => {
               gsap.to(sub, {
                  color: "#a3a3a3",
                  scrollTrigger: {
                     trigger: sectionEls[2],
                     start: "top 80%",
                     end: "top 20%",
                     scrub: true,
                  },
               });
            });
         });
      });

      return () => ctx.revert();
   }, []);

   return (
      <RegistryRemixerDemo
         registry={registry}
         copyCodeOptions={{ propsVariableName: "blurTextProps" }}
      >
         {({ values }: { values: any }) => (
      <ReactLenis root>
         <DemoHeader />
         <div ref={containerRef} className="overflow-x-hidden bg-[#f7f1e3]">
            <section
               style={{ backgroundColor: "#f7f1e3", color: "#111827" }}
               className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-16 sm:px-8 lg:px-12"
            >
              

               <div className="relative mx-auto w-full">
                  <div className="relative pt-5">
                     <div className="max-w-4xl">
                        <h1>

                           <BlurText
                              once={false}
                              variant="fade"
                              {...values}
                              className="block text-6xl font-black uppercase leading-none tracking-tight sm:text-7xl lg:text-8xl"
                           >
                              Blur should feel like a stage entrance, not a loading state.
                           </BlurText>
                        </h1>
                     </div>
                  </div>
               </div>
            </section>
         </div>
      </ReactLenis>
         )}
      </RegistryRemixerDemo>
   );
};

export default Page;
