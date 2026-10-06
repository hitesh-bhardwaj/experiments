"use client";

import SlideTextReveal from "@/components/slide-text-reveal";

const SlideTextWrapper = ({ effectProps = {} }: { effectProps?: Record<string, any> }) => {
  const replayKey = JSON.stringify(effectProps);
  const replayProps = {
    ...effectProps,
    animateOnScroll: false,
  };

  return (
    <div className="overflow-x-hidden bg-[#f7f1e3]">
      <section
        style={{ backgroundColor: "#f7f1e3", color: "#111827" }}
        className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-16 sm:px-8 lg:px-12"
      >
        <div className="relative mx-auto w-full">
          <div className="relative pt-5">
            <div className="max-w-4xl">
              <SlideTextReveal
                key={replayKey}
                {...replayProps}
                className="block"
              >
                <h1 className="text-6xl font-black uppercase leading-none tracking-tight sm:text-7xl lg:text-8xl">
                  Slide text should feel like a clean entrance, not a spectacle.
                </h1>
              </SlideTextReveal>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default SlideTextWrapper;
