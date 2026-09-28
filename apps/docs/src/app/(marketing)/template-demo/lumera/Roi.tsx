// Built using Hyperiux Vault: https://vault.hyperiux.com
import MaskTextReveal from "./effects/mask-text-reveal";
import NumberCounter from "./effects/number-counter";
import { FadeUp } from "./gsapAnimations";

const roiStats = [
  { value: "1.85M", suffix: "/AED", label: "Starting Price" },
  { value: "60 / 40", label: "Payment Plan" },
  { value: "1-3 BHK", label: "Residences" },
  { value: "Q4 2028", label: "Expected Handover" },
];

const Roi = () => {
  return (
    <>
      <section className="py-[5%]  max-md:pb-[20%]" id="roi">
        <div className={`px-[5%] max-md:px-[6%] flex flex-col gap-[6vw] max-md:gap-[7vw]`}>
          <div className="flex justify-between max-[1025px]:flex-col max-md:gap-[7vw] max-[1025px]:gap-[5vw]">
            <MaskTextReveal className="w-[35%] max-[1025px]:w-full">

            <h2 data-para-anim className={`font-neue-montreal text-[#1C1B1A] font-medium! text-[3.8vw] leading-[1.2] max-[1025px]:text-[6.8vw] max-md:text-[8.8vw] `}>
              Invest in Dubai&apos;s Next Landmark
            </h2>
            </MaskTextReveal>

            <MaskTextReveal className="w-[40%] max-[1025px]:w-full">

            <p data-para-anim className=" max-[1025px]:text-[3vw] text-[#1C1B1A] max-md:w-full max-md:text-[4.2vw] text-[1.3vw]">
              Own a residence where architectural distinction, prime location, and elevated living come together. Lumera Heights offers a compelling opportunity for those seeking long-term value in the heart of Dubai.
            </p>
            </MaskTextReveal>
          </div>
          <FadeUp>

         
          <div className="flex flex-wrap gap-[3.5vw] fadeup max-md:gap-[5vw] max-[1025px]:gap-[2.5vw]">
            {roiStats.map((stat) => (
              <div
                key={stat.label}
                className="flex flex-col max-[1025px]:w-[45%] mx-auto items-center justify-center gap-[0.4vw] rounded-full max-[1025px]:rounded-lg max-[1025px]:px-2 border border-[#ca8216] px-[5vw] py-[2.2vw] text-center max-md:px-[7vw] max-md:py-[5vw] max-md:gap-[2vw]  max-[1025px]:py-[3vw]"
              >
                <p className="flex items-end justify-center gap-[0.15em] font-neue-montreal font-medium text-[2.5vw] leading-none text-black max-md:text-[5vw] max-[1025px]:text-[3.2vw]">
                  <NumberCounter value={stat.value} />
                  {stat.suffix && (
                    <span className="mb-[0.2vw] font-neue-montreal text-[0.9vw] leading-none text-[#1c1b1a] max-md:text-[3vw] max-[1025px]:text-[1.8vw]">
                      {stat.suffix}
                    </span>
                  )}
                </p>
                <p className="text-[1.1vw] text-[#1c1b1a] max-md:text-[3.2vw] max-[1025px]:text-[1.8vw]">{stat.label}</p>
              </div>
            ))}
          </div>
           </FadeUp>
        </div>
      </section>
    </>
  );
};

export default Roi;
