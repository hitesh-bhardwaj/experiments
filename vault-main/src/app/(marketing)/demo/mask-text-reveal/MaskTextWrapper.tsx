import Image from "next/image";
import MaskTextReveal from "@/components/mask-text-reveal";


const MaskTextWrapper = ({ effectProps = {} }: { effectProps?: Record<string, any> }) => {
  const replayKey = JSON.stringify(effectProps);
  const replayProps = {
    ...effectProps,
    animateOnScroll: false,
    scrub: false,
  };

  return (

      <main className="overflow-hidden bg-[#f8f2df] text-[#111111]">

        <section className="relative h-screen bg-[#111111] pt-20  px-8 text-white max-sm:px-4 max-sm:py-16">
          <div className="mx-auto grid min-h-[calc(100vh-12rem)] max-w-7xl items-center gap-10 grid-cols-[1fr_0.85fr] max-md:grid-cols-1 max-md:gap-2 max-sm:gap-10 max-sm:min-h-auto">
            <div>
              <div className="mb-8 mt-4 flex flex-wrap gap-3">
                {["poster copy", "hero headlines", "launch pages", "story sections"].map((item) => (
                  <span
                    key={item}
                    className="border border-white/25 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-white/80 max-sm:text-[0.62rem]"
                  >
                    {item}
                  </span>
                ))}
              </div>

              <MaskTextReveal key={replayKey} {...replayProps}>
                <p className="text-[clamp(3rem,7vw,8rem)] max-md:text-[8vw] font-black uppercase leading-[0.86] text-white max-sm:text-[3.35rem]">
                  Hide the sentence until the screen asks for it.
                </p>
              </MaskTextReveal>
            </div>

            <div className="relative overflow-hidden border-2 border-white/80 bg-[#f8f2df] p-4 text-[#111111] shadow-[14px_14px_0_#d7ff48] max-sm:p-3">
              <Image
                src="https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/h-10.jpg"
                alt="asset-image"
                width={3840}
                height={2160}
                sizes="(max-width: 640px) 100vw, 42vw"
                className="h-130 w-full object-cover saturate-150 max-sm:h-72"
              />
              <div className="absolute left-7 top-7 max-w-64 bg-[#f8f2df] p-4 text-sm font-black uppercase leading-tight shadow-[6px_6px_0_#111111] max-sm:left-5 max-sm:top-5 max-sm:max-w-48 max-sm:text-[0.72rem]">
                A reveal animation for headlines that need drama without losing readability.
              </div>
            </div>
          </div>
        </section>
      </main>

  );
};

export default MaskTextWrapper;
