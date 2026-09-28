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
        <h1 className="text-[7vw] max-md:text-[9vw]">Hyperiux Vault</h1>

        <p className="mt-8 text-[1.4vw] max-[1025px]:text-[3vw] max-md:text-[4.5vw]">
          You&apos;ve just seen the Pixel Random Transition, now if you want to see
          it again click on the &quot;Click here&quot; button.
        </p>

        <div className="mt-12 flex justify-center gap-4 max-[1025px]:items-center  max-md:flex-col">
          <ArrowFillButton
            className="cursor-pointer border max-md:w-58 border-[#ff5f00] text-[#ffffff]"
            btnText={"Click here"}
            href={"/demo/pixel-random"}
          />
          <ArrowFillButton
            className="cursor-pointer border max-md:w-58 border-[#ff5f00] text-[#ff5f00]"
            btnText={"Browse effects"}
            hoverFillTextColor={"#ffffff"}
            arrowColor={"#ffffff"}
            hoverArrowColor={"#ffffff"}
            fillBgColor={"#ff5f00"}
            hoverFillBgColor={"#ff5f00"}
            textColor={"#ff5f00"}
            bgColor={"bg-white "}
            href={"/effects"}
          />
        </div>
      </div>
    </section>
  );
}
