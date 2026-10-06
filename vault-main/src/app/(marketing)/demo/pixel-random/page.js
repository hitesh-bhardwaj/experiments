import ArrowFillButton from "@/components/arrow-fill-button";
import React from "react";

export const metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default function page() {
  return (
    <section className="flex h-screen items-center justify-center bg-white px-6 text-center max-md:px-[7vw]">
      <div className="mx-auto max-w-5xl text-black">
        <h1 className="text-[7vw] max-md:text-[9vw]">Pixel Random Transition</h1>

        <p className="mt-8 text-[1.4vw] max-[1025px]:text-[3vw] max-md:text-[4.5vw]">
          Click on the button to see the transition
        </p>

        <div className="mt-12">
          <ArrowFillButton
            className="cursor-pointer border border-[#ff5f00] text-[#ffffff]"
            btnText={"Click here"}
            href={"/demo/pixel-random/page2"}
          />
        </div>
      </div>
    </section>
  );
}
