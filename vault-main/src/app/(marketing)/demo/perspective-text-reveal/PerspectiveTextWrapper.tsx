"use client";

import { useState } from "react";
import Image from "next/image";
import PerspectiveTextReveal from "@/components/perspective-text-reveal";
import { ReactLenis } from "lenis/react";
import SplitLine from "@/components/WebsiteComps/SplitLine";


const specs = [
  ["Start", "top 90%"],
  ["Motion", "rotateX"],
  ["Depth", "800px"],
  ["Stagger", "0.08s"],
];

const scenes = [
  {
    title: "A headline can feel like it has a camera angle.",
    copy: "The line starts above the frame, tilted back in space, then settles toward the reader with a clean perspective flip.",
  },
  {
    title: "Use it when the reveal should feel dimensional.",
    copy: "Launch pages, immersive stories, case studies, and hero transitions can all use this effect to create a stronger sense of arrival.",
  },
  {
    title: "Keep the layout calm so the rotation reads clearly.",
    copy: "Large line height, high contrast, and a little breathing room let the 3D motion become the star without making the page noisy.",
  },
];

const PerspectiveTextWrapper = ({ effectProps = {} }) => {
  const [replayKey, setReplayKey] = useState(0);

  return (
    <ReactLenis root key={replayKey}>
     
      <main className="overflow-hidden bg-[#07090d] text-white">
        <section className="relative min-h-screen   px-8 py-8 max-md:px-4 max-md:py-4">
          <div className="absolute inset-0">
            <Image
              src="https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/h-15.jpg"
              alt="asset-image"
              fill
              priority
              sizes="100vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(7,9,13,0.95),rgba(7,9,13,0.58),rgba(7,9,13,0.9))]" />
            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-[linear-gradient(0deg,#07090d,transparent)]" />
          </div>

          <div className="relative mx-auto grid min-h-[calc(100vh-4rem)] max-w-7xl grid-rows-[auto_1fr_auto] max-[1025px]:min-h-[80vh] max-md:min-h-[calc(100vh-2rem)]">
           

            <div className="grid items-center gap-10 py-18 grid-cols-[0.95fr_1.05fr] max-[1025px]:grid-cols-1 max-md:py-14">
              <div className="max-w-3xl">
                <button
                  type="button"
                  onClick={() => setReplayKey((value) => value + 1)}
                  className="mb-7 w-fit border border-white/20 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.22em] text-[#b9e6ff] backdrop-blur max-md:text-[2.6vw] max-md:tracking-[0.16em]"
                >
                  Replay animation
                </button>

                <PerspectiveTextReveal key={`hero-title-${replayKey}`} scrub={false} {...effectProps}>
                  <h1 className="text-[7vw] font-black uppercase leading-[0.84] text-white max-sm:text-[8vw] max-sm:leading-[0.88]">
                    Lines fall into depth.
                  </h1>
                </PerspectiveTextReveal>
              </div>

              <div className="relative min-h-130  max-[1025px]:min-h-150 max-md:min-h-110">
                <div className="absolute left-6 right-10 top-8 h-28 skew-y-[-5deg] border border-white/25 bg-white/10 backdrop-blur max-md:left-2 max-md:right-6 max-md:h-20" />
                <div className="absolute left-16 right-6 top-40 h-36 skew-y-[-5deg] border border-[#b9e6ff]/50 bg-[#b9e6ff]/20 backdrop-blur max-md:left-8 max-md:right-2 max-md:top-28 max-md:h-24" />
                <div className="absolute bottom-16 left-24 right-0 h-48 skew-y-[-5deg] overflow-hidden border border-white/35 bg-white/10 shadow-[0_30px_80px_rgba(0,0,0,0.45)] max-md:bottom-12 max-md:left-10 max-md:h-36">
                  <Image
                    src="https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/h-01.jpg"
                    alt="asset-image"
                    fill
                    sizes="(max-width: 640px) 86vw, 560px"
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-[#07090d]/25" />
                </div>
                <div className="absolute bottom-0 left-0 max-w-sm border-l border-[#b9e6ff] bg-[#07090d]/80 p-6 backdrop-blur max-sm:max-w-[78%] max-sm:p-4">
                <PerspectiveTextReveal key={`hero-copy-${replayKey}`} scrub={false} {...effectProps}>

                  <p className="text-lg font-semibold leading-8 text-white/76 max-md:text-sm max-md:leading-6">
                    Built for moments where typography should rotate into view like a scene finding its angle.
                  </p>
                </PerspectiveTextReveal>
                </div>
              </div>
            </div>

            <div className="grid border-y border-white/15 grid-cols-4 max-md:grid-cols-2">
              {specs.map(([label, value]) => (
                <div
                  key={label}
                  className="border-white/15 py-5 px-4 border-r last:border-r-0 max-md:border-r-0 max-md:border-t max-md:first:border-t-0"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/38 max-md:tracking-[0.16em]">
                    {label}
                  </p>
                  <PerspectiveTextReveal key={`${label}-${replayKey}`} scrub={false} {...effectProps}>

                    

                  <p className="mt-2 text-2xl font-black uppercase text-[#b9e6ff] max-md:text-xl">
                    {value}
                  </p>
                  </PerspectiveTextReveal>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </ReactLenis>
  );
};

export default PerspectiveTextWrapper;
