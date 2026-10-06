import ArrowFillButton from "@/components/arrow-fill-button";
import { getDemoPageMetadata } from "@/lib/demo-metadata";
import React from "react";

export default function page() {
  return (
    <section className="flex h-screen items-center justify-center bg-white max-md:px-[7vw] text-center">
      <div className="mx-auto max-w-5xl text-center text-black">
        <h1 className="text-[7vw] max-md:text-[9vw]">Hyperiux Vault</h1>

        <p className="mt-8 text-[1.4vw] max-[1025px]:text-[3vw] max-md:text-[4.5vw]">
          You&apos;ve just seen the block transition, now if you want to see
          again click on the &quot;click here&quot; button.
        </p>

        <div className="mt-12 flex justify-center gap-4 max-[1025px]:items-center max-md:flex-col">
          <ArrowFillButton
            className="border border-[#ff5f00] text-[#ffffff] cursor-pointer"
            btnText={"Click here"}
            href={"/demo/block-transition"}
          />

        </div>
      </div>
    </section>
  );
}
export async function generateMetadata() {
  return getDemoPageMetadata("block-transition");
}
