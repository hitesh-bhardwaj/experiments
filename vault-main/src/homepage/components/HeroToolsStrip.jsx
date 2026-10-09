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

const MARK = "h-[calc(var(--cvw)*1.7)] w-auto max-md:h-6";
const SYMBOL = "h-[calc(var(--cvw)*1.9)] w-auto max-md:h-7";

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
        <div className="flex shrink-0 items-center gap-[calc(var(--cvw)*7)] pr-[calc(var(--cvw)*7)] max-md:gap-12 max-md:pr-12" aria-hidden={hidden || undefined}>
            {TOOLS.map((tool) => (
                <span key={tool.name} className="flex items-center gap-[calc(var(--cvw)*0.8)] whitespace-nowrap text-white opacity-55 max-md:gap-3">
                    {tool.icon}
                    {!tool.wordmark && <span className="text-[calc(var(--cvw)*1.8)] font-avenir font-normal tracking-[-0.02em] max-md:text-[calc(var(--cvw)*5.5)]">{tool.name}</span>}
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
        <section ref={rootRef} aria-label="Built on" className="relative z-10 px-[calc(var(--cvw)*3)] max-md:px-6 max-sm:px-0 mt-[20vh]">
            <div className="fadeup border-t border-white/10 max-md:px-0! pt-[calc(var(--cvw)*4)] pb-[calc(var(--cvw)*12)] max-md:pt-12 max-md:pb-28">
                <p className="mb-[calc(var(--cvw)*2.4)] text-center type-label text-white/40 max-md:mb-8">
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
            <div className="grid h-[38vh] max-md:h-[10vh] place-items-end justify-center pb-[12vh]" aria-hidden="true">
               
            </div>
        </section>
    );
}
