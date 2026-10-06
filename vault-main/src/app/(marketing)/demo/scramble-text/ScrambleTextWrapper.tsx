import React from "react";
import LenisSmoothScroll from "@/components/SmoothScroll/LenisScroll";
import Image from "next/image";
import ScrambleText from "@/components/scramble-text";
import SplitLine from "@/components/WebsiteComps/SplitLine";

const notes = [
  "Characters resolve from noise",
  "Runs once on scroll enter",
  "Useful for sharp editorial moments",
];

const ScrambleTextWrapper = ({ effectProps = {} }) => {
  return (
    <>
      <LenisSmoothScroll />
      <main className="overflow-hidden min-h-screen bg-[#f6f2ea] text-[#121212]">
        <section className=" px-8 py-8 pt-22 max-[1025px]:pt-25 max-md:pt-20 max-md:px-4 max-md:py-4">
          <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-7xl items-center gap-10 max-[1025px]:gap-6 border border-black/10 bg-[#fbf8f1] p-8 lg:grid-cols-[1.05fr_0.95fr] max-[1025px]:min-h-fit max-md:p-4">
            <div>
              <h1 className="mb-6 text-xs font-bold uppercase tracking-[0.24em] text-black/45 max-md:tracking-[0.16em]">
                Scramble Text
              </h1>
              <ScrambleText
                text="Signal appears when the noise decides to leave."
                textColor="#121212"
                align="left"
                {...effectProps}
                className="mb-8 text-[6vw] font-black leading-[0.88] uppercase max-[1025px]:text-[5vw] max-[1025px]:leading-[1.2] max-md:text-[12vw] max-md:leading-[0.92]"
              />
              <SplitLine>

              <p className="max-w-xl text-lg leading-[1.2] text-black/60 max-md:text-base max-md:leading-[1.4] max-[1025px]:leading-[1.2]">
                A minimal scroll reveal for headlines that should feel like they are decoding themselves in real time.
              </p>
              </SplitLine>
            </div>

            <div className="relative">
              <div className="h-155 w-full bg-black max-md:h-90">

             
              <Image
                src="https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/v-04.jpg"
                alt="Abstract distortion texture"
                width={800}
                height={800}
               
                className="h-full w-full object-cover"
              />
              <div className="absolute bottom-5 left-5 right-5 bg-[#fbf8f1] px-5 py-4 text-sm font-bold uppercase tracking-[0.18em] text-black max-md:text-[0.68rem] max-md:tracking-[0.12em]">
                Decode / Resolve / Reveal
              </div>
               </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
};

export default ScrambleTextWrapper;
