// Built using Hyperiux Vault: https://vault.hyperiux.com

import React, { type ComponentProps } from "react";

import SquareTranslateComp from "./SquareTranslateComp";

const items = [
    "Websites, web apps, landing pages",
    "Animation and interaction design",
    "Figma to production code",
    "Core Web Vitals and load time optimization",
    "Webflow development",
    "React / Next.js / Vue / Nuxt development",
    "GSAP / Framer Motion animation",
    "Unlimited revisions",
    "Direct Slack communication",
    "Senior developers on every project",
];

export default function SquareTranslate(props: ComponentProps<typeof SquareTranslateComp>) {
    return (
        <>
      <div className="w-full bg-white h-[300vh] pt-[100vh] px-[20vw]">

            <SquareTranslateComp
                items={items}
                textClassName="text-[1.1vw] max-[1025px]:text-xl"
                textColor="text-black"
                squareClassName="w-[.6vw] h-[.6vw] max-[1025px]:w-3 max-[1025px]:h-3"
                containerClassName="w-[50vw]  max-[1025px]:w-full"
                borderColor="border-black/10"
                {...props}
            />
      </div>


        </>
    );
}
