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

            <SquareTranslateComp
                items={items}
                textClassName="text-[1.1vw] max-[1025px]:text-lg"
                textColor="text-black"
                squareClassName="w-[.6vw] h-[.6vw] max-md:w-3 max-md:h-3"
                containerClassName="w-[50vw]  max-md:w-full"
                borderColor="border-black/10"
                {...props}
            />

        </>
    );
}
