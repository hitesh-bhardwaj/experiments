import Image from "next/image";
import SplitLine from "@/components/WebsiteComps/SplitLine";
import FadeUp from "@/components/WebsiteComps/FadeUp";
import CharStaggerPrimaryButton from "@/components/char-stagger-primary-button";

export default function PageContent() {
  return (
    <section className="relative flex h-screen items-center justify-center text-center max-md:px-[7vw]">
      <Image
        src="https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/h-17.jpg"
        alt="Abstract background"
        fill
        priority
        className="object-cover brightness-75"
      />

      <div className="relative z-10 mx-auto max-w-5xl text-center text-white">
        <SplitLine>
          <h1 className="text-[7vw] max-md:text-[9vw]">Depth Shift Transition</h1>
        </SplitLine>

        <SplitLine>
          <p className="mt-2 text-[1.4vw] max-[1025px]:text-[3vw] max-md:text-[4.5vw]">
            Click on the button to see the transition
          </p>
        </SplitLine>

        <FadeUp className="mt-12" delay={1}>
          <CharStaggerPrimaryButton
            bgClassName="bg-[#111111] rounded-md block"
            textClassName="font-medium text-[1.3vw] max-[1025px]:text-[2.5vw] max-sm:text-[4vw]"
            btnClassName="h-[3.5vw]"
            text={"Click here"}
            href="/demo/depth-shift-transition/page2"
          />
        </FadeUp>
      </div>
    </section>
  );
}
