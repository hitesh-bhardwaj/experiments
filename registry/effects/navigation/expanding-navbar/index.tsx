// Built using Hyperiux Vault: https://vault.hyperiux.com

import { ExpandingNavbarDesktop } from "./ExpandingNavbarDesktop";
import { ExpandingNavbarMobile } from "./ExpandingNavbarMobile";
import { ArrowUpRight } from "lucide-react";

interface ExpandingNavbarProps {
    backgroundColor?: string;
    activeColor?: string;
    duration?: number;
    expandedWidth?: number;
}

const MENU_EASE = "cubic-bezier(0.625, 0.05, 0, 1)";

export default function ExpandingNavbar({
    backgroundColor = "#ffffff",
    activeColor = "#ff5f00",
    duration = 1,
    expandedWidth = 98,
}: ExpandingNavbarProps) {
    return (
        <div className="h-screen w-full relative overflow-hidden" style={{ backgroundColor }}>
            <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center text-[#111111]">
                <h1 className="max-[1025px]:text-[4vw] max-md:text-[5vw] text-[2.5vw] tracking-tight">
                    Watch items spring, orbit and snap into place
                    <br />
                    <span className="text-[1.5vw] max-[1025px]:text-[2.5vw] max-md:text-[3.5vw] opacity-70">
                        [Click the menu to reveal the motion]
                    </span>
                </h1>

                <div className="mt-6 flex items-center gap-3 max-md:flex-col">
                    <a
                        href="/effects"
                        className="w-fit mx-auto items-center flex gap-2 rounded-full text-white px-6 py-3 text-[1vw] max-[1025px]:text-[2vw] max-md:text-[3vw] font-medium hover:opacity-90 transition-opacity"
                        style={{ backgroundColor: activeColor }}
                    >
                        Explore all Effects
                        <ArrowUpRight className="size-4" />
                    </a>
                    <a
                        href="/effects/navigation/expanding-navbar"
                        className="w-fit mx-auto items-center flex gap-2 rounded-full text-white px-6 py-3 text-[1vw] max-[1025px]:text-[2vw] max-md:text-[3vw] font-medium hover:opacity-90 transition-opacity"
                        style={{ backgroundColor: activeColor }}
                    >
                        Read Article
                        <ArrowUpRight className="size-4" />
                    </a>
                </div>
            </div>

            <ExpandingNavbarDesktop activeColor={activeColor} duration={duration} ease={MENU_EASE} expandedWidth={expandedWidth} />
            <ExpandingNavbarMobile activeColor={activeColor} duration={duration} ease={MENU_EASE} />
        </div>
    );
}
