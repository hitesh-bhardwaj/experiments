import React from "react";
import Image from "next/image";
import { getDemoPageMetadata } from "@/lib/demo-metadata";
import ArrowFillButton from "@/components/arrow-fill-button";
import SplitLine from "@/components/WebsiteComps/SplitLine";
import FadeUp from "@/components/WebsiteComps/FadeUp";
import CharStaggerPrimaryButton from "@/components/char-stagger-primary-button";

export default function page() {
  return (
    <>
    <section className="relative flex h-screen items-center justify-center max-md:px-[7vw] text-center">
      <Image
        src="https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/h-23.jpg"
        alt="Abstract background"
        fill
        priority
        className="object-cover brightness-75"
        />

      <div className="relative z-10 max-w-5xl mx-auto text-center text-white">
        {/* Heading */}
        <SplitLine>
          <h1 className="text-[7vw] max-md:text-[9vw]">Sweep Lift Transition</h1>
        </SplitLine>

        {/* Subtext */}
        <SplitLine>
          <p className="mt-2 text-[1.4vw] max-md:text-[4.5vw] max-[1025px]:text-[3vw]">
            Click on the button to see the transition
          </p>
        </SplitLine>

        <FadeUp className="mt-12 flex gap-4 max-sm:flex-col max-md:items-center justify-center" delay={1}>
                 
                 <CharStaggerPrimaryButton
                              bgClassName="bg-[#111111] rounded-md block"
                     textClassName="font-medium text-[1.3vw] max-[1025px]:text-[2.5vw] max-sm:text-[4vw]"
                     btnClassName="h-[3.5vw]"
                     text={"Click here"}
                               href={"/demo/sweep-lift-transition/page2"}
                             />
               </FadeUp>
      </div>
    </section>

    
   
            </>
  );
}

export async function generateMetadata() {
  return getDemoPageMetadata("sweep-lift-transition", { title: "Sweep Lift Transition" });
}
