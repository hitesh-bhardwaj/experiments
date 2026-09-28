import HeadAnim from "@/components/Animations/HeadAnim";
import SplitLine from "@/components/WebsiteComps/SplitLine";
import React from "react";
import { getDemoPageMetadata } from "@/lib/demo-metadata";
import ArrowFillButton from "@/components/arrow-fill-button";


export default function page() {
  return (
    <section className="flex h-screen items-center justify-center bg-white px-6 text-center max-md:px-[7vw]">
      <div className="mx-auto max-w-5xl text-black">
        <HeadAnim>
        <h1 className="text-[7vw] max-md:text-[9vw]">Page Flip Transition</h1>
        </HeadAnim>

        <SplitLine>

        <p className="mt-8 text-[1.4vw] max-[1025px]:text-[3vw] max-md:text-[4.5vw]">
          Click on the button to see the transition
        </p>
        </SplitLine>

        <div className="mt-12">
          <ArrowFillButton
            className="cursor-pointer border border-[#ff5f00] text-[#ffffff]"
            btnText={"Click here"}
            href={"/demo/page-flip-transition/page2"}
          />
        </div>
      </div>
    </section>
  );
}

export async function generateMetadata() {
  return getDemoPageMetadata("page-flip-transition");
}
