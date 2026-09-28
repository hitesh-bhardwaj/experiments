"use client";

import { useState, type ComponentProps } from "react";
import Image from "next/image";
import OverflowTextReveal from "@/components/overflow-text-reveal";
import { ReactLenis } from "lenis/react";
import DemoHeader from "@/components/WebsiteComps/DemoHeader";
import SplitLine from "@/components/WebsiteComps/SplitLine";


interface OverflowTextRevealWrapperProps {
  effectProps?: ComponentProps<typeof OverflowTextReveal>;
}

const OverflowTextRevealWrapper = ({ effectProps = {} }: OverflowTextRevealWrapperProps) => {
  const [replayKey, setReplayKey] = useState(0);
  const remixerKey = JSON.stringify(effectProps);
  const revealKey = `${replayKey}-${remixerKey}`;
  const replayProps = {
    ...effectProps,
    animateOnScroll: false,
    scrub: false,
  };

  return (
    <ReactLenis root key={revealKey}>
      <DemoHeader textColor="#ffffff" logoColor='#FFFFFF' />
      {/* SECTION 1 - direction: bottom (default) */}
      <section className="relative h-screen flex flex-col pt-[20vh] max-[1025px]:pt-[45vh] max-md:pt-[4vh] max-[1025px]:justify-center max-[1025px]:px-5 overflow-hidden bg-[#0a0a0a]">
        <Image
          src="https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/h-15.jpg"
          alt="Nature"
          fill
          className="object-cover opacity-60"
          priority
        />
        <div className="absolute inset-0 bg-linear-to-t from-[#0a0a0a] via-[#0a0a0a]/40 to-transparent" />

        <div className="relative z-10 px-2 space-y-5  max-w-6xl mx-auto w-full">
          <SplitLine>

          <button
            type="button"
            onClick={() => setReplayKey((k) => k + 1)}
            className=" w-fit border border-white/20 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-white/60 backdrop-blur"
          >
            Replay animation
          </button>
          </SplitLine>


        
          <OverflowTextReveal key={`heading-${revealKey}`} {...replayProps}>
            <h1 className="text-8xl font-black text-white leading-[0.9] tracking-tighter uppercase max-sm:text-5xl">
              Characters<br />Rise From<br />Below
            </h1>
          </OverflowTextReveal>
          <OverflowTextReveal key={`copy-${revealKey}`} {...replayProps} delay={(effectProps.delay ?? 0) + 0.1}>
            <p className="max-w-lg py-8 text-xl max-md:text-2xl leading-relaxed font-light text-white/50 max-sm:text-base">
              The default variant. Each character slides upward out of its clipping mask,
              rotating into place with a subtle tilt as you scroll.
            </p>
          </OverflowTextReveal>
        </div>
      </section>
    </ReactLenis>
  );
};

export default OverflowTextRevealWrapper;
