import React from "react";
import { getDemoPageMetadata } from "@/lib/demo-metadata";
import ArrowFillButton from "@/components/arrow-fill-button";


export default function page() {
  return (
    <section className="flex h-screen items-center justify-center bg-white max-md:px-[7vw] text-center">
      <div className="mx-auto max-w-5xl text-center text-black">
        <h1 className="text-[7vw] max-md:text-[9vw]">Block Transition</h1>

        <p className="mt-8 text-[1.4vw] max-[1025px]:text-[3vw] max-md:text-[4.5vw]">
          Click on the button to see the transition
        </p>

        <div className="mt-12">
          <ArrowFillButton
            className="border border-[#ff5f00] text-[#ffffff] cursor-pointer"
            btnText={"Click here"}
            href={"/demo/block-transition/page2"}
          />
        </div>
      </div>
    </section>
  );
}

export async function generateMetadata() {
  return getDemoPageMetadata("block-transition");
}
