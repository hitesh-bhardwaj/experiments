"use client";

import Image from "next/image";
import DemoHeader from "@/components/preview-chrome/DemoHeader";
import LenisSmoothScroll from "@/components/SmoothScroll/LenisScroll";
import ScrollBottom from "@/components/WebsiteComps/ScrollBottom";
import RegistryRemixerDemo from "@/components/remixer-panel/RegistryRemixerDemo";
import SquareTranslate from "@/components/square-translate";

export default function DemoContent({ registry }: { registry: any }) {
  return (
    <RegistryRemixerDemo
      registry={registry}
      render={(values: any) => <SquareTranslate {...values} />}
      copyCodeOptions={{ propsVariableName: "squareTranslateProps" }}
    >
      {({ effect }) => (
        <>
          <DemoHeader />
          <LenisSmoothScroll />
          <div className="h-fit w-screen bg-[#eeeeee] px-[4vw] text-black max-md:px-8 max-sm:px-6 py-[10vw] max-md:pt-[20vw] max-md:pb-[40vh]">
            <div className="h-fit py-[2vw]  max-md:py-6 w-[80%] max-md:w-full mx-auto mb-[5vw] max-md:mb-8 flex flex-col items-center justify-center text-center text-[1.5vw] max-md:text-base px-[4vw] max-md:px-4 gap-[1vw]">
              <h1 className="text-[5vw]  font-medium max-md:text-[7vw] max-sm:text-[9vw]">
                Square Translate
              </h1>
              <p>
                A scroll-driven list with a rotating square indicator that follows
                your scroll position.
              </p>
            </div>
            <h2 className="mb-[2vw] max-md:mb-4">
              <span className="text-[3.5vw] max-md:text-2xl font-medium text-black">
                What&apos;s included
              </span>
            </h2>
            <div className="h-fit w-full py-[10vh] max-md:py-6 flex max-md:flex-col items-center gap-[6vw] max-md:gap-8">
              <div className="h-[35vw] w-[40vw] max-md:w-full max-md:h-[40vw] max-sm:h-[70vw] rounded-lg overflow-hidden">
                <Image
                  alt="Square Translate"
                  src="https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/h-03.jpg"
                  width={1000}
                  height={1000}
                  className="w-full h-full object-cover"
                  priority
                />
              </div>
              <div className="max-md:w-full max-md:px-4">{effect}</div>
            </div>
            <div className="h-[20vh] max-md:h-24 bg-[#eeeeee] text-white mb-[5vw] max-md:mb-8 relative flex items-center justify-center w-full">
              <div className="h-[10vw] max-md:h-20 w-[80%] max-md:w-full flex items-center justify-center text-center font-mono text-[1.5vw] max-md:text-base px-[4vw] max-md:px-4  rounded-xl bg-black translate-y-[10vw] max-md:translate-y-8">
                <p>Hope you like it!</p>
              </div>
            </div>
          </div>
          <ScrollBottom textColor="text-[#000000]" className="bottom-[2%] left-[95%] max-sm:left-[90%]" />
        </>
      )}
    </RegistryRemixerDemo>
  );
}
