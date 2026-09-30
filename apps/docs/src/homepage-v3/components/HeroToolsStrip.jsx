"use client";

import { useRef } from "react";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/dist/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { MotionMark, NextMark, ReactMark, ThreeMark, WebGLMark } from "@/utils/Icons";
import { prefersReducedMotion } from "@/lib/motion";

if (typeof window !== "undefined") {
    gsap.registerPlugin(ScrollTrigger);
}

const DRIFT_PX_PER_FRAME = 0.35; // the Theremin marquee's constant drift

const MARK = "h-[1.7vw] w-auto max-[1025px]:h-[3.4vw] max-md:h-6";
const SYMBOL = "h-[1.9vw] w-auto max-[1025px]:h-[3.8vw] max-md:h-7";

// Wordmarks (Next.js, WebGL) carry their own name; symbols get it beside them.
// No Lenis logo exists in the repo, so it is a name only rather than an invented mark.
const TOOLS = [
    { name: "React", icon: <ReactMark className={SYMBOL} /> },
    { name: "Next.js", icon: <NextMark className={MARK} />, wordmark: true },
    { name: "GSAP", icon: <Image src="/icons/gsap-icon.svg" alt="" width={104} height={104} className={SYMBOL} /> },
    { name: "Three.js", icon: <ThreeMark className={SYMBOL} /> },
    { name: "WebGL", icon: <WebGLMark className={MARK} />, wordmark: true },
    { name: "Lenis" },
    { name: "Motion", icon: <MotionMark className={MARK} /> },
];

function ToolRow({ hidden = false }) {
    return (
        <div className="flex shrink-0 items-center gap-[7vw] pr-[7vw] max-md:gap-12 max-md:pr-12" aria-hidden={hidden || undefined}>
            {TOOLS.map((tool) => (
                <span key={tool.name} className="flex items-center gap-[0.8vw] whitespace-nowrap text-white opacity-55 max-[1025px]:gap-[1.6vw] max-md:gap-3">
                    {tool.icon}
                    {!tool.wordmark && <span className="text-[1.8vw] font-avenir font-normal tracking-[-0.02em] max-md:text-[5.5vw]">{tool.name}</span>}
                </span>
            ))}
        </div>
    );
}

// "Built on the tools your team already trusts": the Theremin hero's stack
// strip, a slow marquee at one constant speed. Two identical rows sit side
// by side, so wrapping by one row's width is seamless.
export default function HeroToolsStrip() {
    const rootRef = useRef(null);
    const trackRef = useRef(null);

    useGSAP(
        () => {
            if (prefersReducedMotion()) return undefined;
            const track = trackRef.current;
            const rowWidth = () => track.firstElementChild.offsetWidth;
            let x = 0;
            let visible = false;

            const onTick = () => {
                if (!visible) return;
                x -= DRIFT_PX_PER_FRAME;
                const width = rowWidth();
                if (width && x <= -width) x += width;
                gsap.set(track, { x });
            };
            gsap.ticker.add(onTick);

            // Only drift while on screen
            const trigger = ScrollTrigger.create({
                trigger: rootRef.current,
                start: "top bottom",
                end: "bottom top",
                onToggle: (self) => { visible = self.isActive; },
            });
            visible = trigger.isActive;

            return () => {
                gsap.ticker.remove(onTick);
                trigger.kill();
            };
        },
        { scope: rootRef }
    );

    return (
        <section ref={rootRef} aria-label="Built on" className="relative z-10 px-[3vw] max-[1025px]:px-[6vw] max-md:px-6 max-sm:px-5 mt-[20vh]">
            <div className="fadeup border-t border-white/10 pt-[4vw] pb-[12vw] max-[1025px]:pt-[8vw] max-[1025px]:pb-[18vw] max-md:pt-12 max-md:pb-28">
                <p className="mb-[2.4vw] text-center text-[0.7vw] max-[1025px]:text-[1.6vw] max-md:text-[11px] font-semibold uppercase tracking-[0.14em] text-white/40 max-[1025px]:mb-[5vw] max-md:mb-8">
                    Built on the tools your team already trusts
                </p>
                <div className="overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_12%,#000_88%,transparent)]" aria-hidden="true">
                    <div ref={trackRef} className="flex w-max will-change-transform">
                        <ToolRow />
                        <ToolRow hidden />
                    </div>
                </div>
                <p className="sr-only">React, Next.js, GSAP, Three.js, WebGL, Lenis and Motion.</p>
            </div>
            {/* Theremin's breathing room under the hero: the ribbons carry on
                through it before the next section arrives */}
            <div className="grid h-[38vh] place-items-end justify-center pb-[12vh]" aria-hidden="true">
                <p className="text-[0.75vw] font-medium uppercase tracking-[0.14em] text-white/35 max-[1025px]:text-[1.6vw] max-md:text-[11px]">
                    Move through the field
                </p>
            </div>
        </section>
    );
}
