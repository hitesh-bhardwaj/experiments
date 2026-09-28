import HeadAnim from "@/components/Animations/HeadAnim";
import ArrowFillButton from "@/components/arrow-fill-button";
import SplitLine from "@/components/WebsiteComps/SplitLine";
import { getDemoPageMetadata } from "@/lib/demo-metadata";
import React from "react";

export default function page() {
  return (
    <section className="flex h-screen items-center justify-center bg-white px-6 text-center max-md:px-[7vw]">
      <div className="mx-auto max-w-5xl text-black">
        <HeadAnim>

        <h1 className="text-[7vw] max-md:text-[9vw]">Hyperiux Vault</h1>
        </HeadAnim>

      <SplitLine>
        <p className="text-[1.4vw] max-[1025px]:text-[3vw] max-md:text-[4.5vw]">
          You&apos;ve just seen the Svg Brush Transition, now if you want to
          see it again click on the &quot;Click here&quot; button.
        </p>
      </SplitLine>

        <div className="mt-12 flex justify-center gap-4 max-[1025px]:items-center max-md:flex-col">
          <ArrowFillButton
            className="cursor-pointer border border-[#ff5f00] text-[#ffffff]"
            btnText={"Click here"}
            href={"/demo/svg-brush-transition"}
          />

        </div>
      </div>
    </section>
  );
}
export async function generateMetadata() {
  return getDemoPageMetadata("svg-brush-transition");
}
