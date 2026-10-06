// Built using Hyperiux Vault: https://vault.hyperiux.com

import { FooterParallax } from "./ParallaxFooter";

import { ArrowRight } from "lucide-react";

const ParallaxFooter = ({
 containerBgColor = "#ff6b00",
 footerBgColor = "#1a1a1a",
}) => {
 return (
 <>


 <div
 className="relative z-2 flex h-screen w-screen items-center justify-center"
 style={{ backgroundColor: containerBgColor }}
 >
 <h1 className="text-[4vw] font-medium max-md:text-[8.5vw] w-[70%] text-center">
 Scroll To See Parallax Effect
 </h1>
 </div>
 <FooterParallax
 footerClassName="text-white px-10 py-20"
 footerStyle={{ backgroundColor: footerBgColor }}
 >
 <div className="max-w-7xl mx-auto flex justify-between max-md:flex-col max-md:justify-start max-md:gap-[12vw]">
 <div className="w-[40%] max-[1025px]:w-[70%] max-md:w-[80%]">
 <h2 className="text-5xl font-semibold max-md:text-[7.5vw]">
 Let’s build something worth remembering.
 </h2>
 <p className="mt-4 text-sm max-[1025px]:text-xl">
 Fully dynamic height. Add anything here - it just works.
 </p>
 </div>

 <div className="flex items-center justify-end w-fit">
<a
  className="inline-flex items-center gap-1 rounded-full bg-white px-6 py-3 text-[#1a1a1a] transition-transform hover:scale-105"
>
  Browse effects
  <ArrowRight className="h-4 w-4" />
</a>
 </div>
 </div>
 </FooterParallax>

 </>
 );
};

export default ParallaxFooter;
