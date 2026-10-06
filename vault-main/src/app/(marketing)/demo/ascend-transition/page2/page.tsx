import ArrowFillButton from "@/components/arrow-fill-button";

import SplitLine from "@/components/WebsiteComps/SplitLine";
import FadeUp from "@/components/WebsiteComps/FadeUp";
import { getDemoPageMetadata } from "@/lib/demo-metadata";
import Image from "next/image";
import React from "react";
import CharStaggerPrimaryButton from "@/components/char-stagger-primary-button";

export default function page() {
  return (
    <section className="relative flex h-screen items-center justify-center max-sm:px-[7vw] text-center">
       <Image
              src="https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/h-19.jpg"
              alt="Abstract background"
              fill
              priority
              className="object-cover brightness-90"
            />


      <div className="relative z-10 space-y-8 max-w-5xl mx-auto text-center text-white">
        {/* Heading */}
        <SplitLine>
          <h1 className="text-[7vw] max-sm:text-[9vw]">Hyperiux Vault</h1>
        </SplitLine>



        <SplitLine>
          <p className=" text-balance text-[1.4vw] w-[80%]  mx-auto leading-[1.3] max-[1025px]:w-full max-[1025px]:mx-auto max-md:text-[4.5vw] max-[1025px]:text-[3vw]">
            You&apos;ve just seen the ascend transition, now if you want to see
            again click on the &quot;click&nbsp;here&quot; button.
          </p>
        </SplitLine>


        <FadeUp className="mt-12 flex gap-4 max-sm:flex-col max-md:items-center justify-center" delay={1}>
          
          <CharStaggerPrimaryButton
                       bgClassName="bg-[#111111] rounded-md block"
              textClassName="font-medium text-[1.3vw] max-[1025px]:text-[2.5vw] max-sm:text-[4vw]"
              btnClassName="h-[3.5vw]"
              text={"Click here"}
                        href={"/demo/ascend-transition"}
                      />
        </FadeUp>
      </div>
    </section>
  );
}
export async function generateMetadata() {
  return getDemoPageMetadata("ascend-transition", { title: "Ascend Transition" });
}
