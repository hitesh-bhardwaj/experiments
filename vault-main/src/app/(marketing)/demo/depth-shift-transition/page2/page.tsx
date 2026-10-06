import CharStaggerPrimaryButton from "@/components/char-stagger-primary-button";
import FadeUp from "@/components/WebsiteComps/FadeUp";

import SplitLine from "@/components/WebsiteComps/SplitLine";
import { getDemoPageMetadata } from "@/lib/demo-metadata";
import Image from "next/image";

export default function page() {
  return (
    <section className="relative flex h-screen items-center justify-center max-md:px-[7vw] text-center">
      <Image
        src="https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/h-18.jpg"
        alt="Abstract background"
        fill
        priority
        className="object-cover brightness-75"
      />

      <div className="relative z-10 space-y-8   mx-auto text-center text-white">
        {/* Heading */}
        <SplitLine>
          <h1 className="text-[7vw] max-md:text-[9vw]">Hyperiux Vault</h1>
        </SplitLine>

        <SplitLine>
          <p className="text-balance text-[1.4vw] w-[80%]  mx-auto leading-[1.3] max-[1025px]:w-full max-[1025px]:mx-auto max-md:text-[4.5vw] max-[1025px]:text-[3vw]">
            You&apos;ve just seen Depth Shift Transition, now if you want to see it again click on the &quot;click&nbsp;here&quot; button.
          </p>
        </SplitLine>

        <FadeUp className="mt-12" delay={1}>
          <div className="mt-12 flex gap-4 max-md:flex-col max-[1025px]:items-center justify-center">
            <CharStaggerPrimaryButton
              bgClassName="bg-[#111111] rounded-md block"
              textClassName="font-medium text-[1.3vw] max-[1025px]:text-[2.5vw] max-sm:text-[4vw]"
              btnClassName="h-[3.5vw]"
              text={"Click here"}
              href={"/demo/depth-shift-transition"}
            />
          </div>
        </FadeUp>
      </div>
    </section>
  );
}
export async function generateMetadata() {
  return getDemoPageMetadata("depth-shift-transition", { title: "Depth Shift Transition" });
}
