"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/dist/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { prefersReducedMotion } from "@/lib/motion";

if (typeof window !== "undefined") {
    gsap.registerPlugin(ScrollTrigger, useGSAP);
}

// A section that comes in like an overlay: it starts scaled down and a little low, scales up
// to full size as it scrolls into view, then scales back down and drifts up as it leaves.
// Both are scrubbed to the scroll.
export function useSectionOverlay(ref, { scale = 0.88, shift = "12vh" } = {}) {
    useGSAP(() => {
        const root = ref.current;
        if (!root || prefersReducedMotion()) return;
        gsap.fromTo(
            root,
            { scale, y: shift, transformOrigin: "50% 0%" },
            {
                scale: 1,
                y: "0vh",
                ease: "power3.out",
                clearProps: "transform",
                scrollTrigger: { trigger: root, start: "top 100%", end: "top 15%", scrub: 0.8 },
            },
        );
        gsap.fromTo(
            root,
            { scale: 1, y: "0vh", transformOrigin: "50% 100%" },
            {
                scale,
                y: `-${shift}`,
                ease: "power3.in",
                immediateRender: false,
                scrollTrigger: { trigger: root, start: "bottom 100%", end: "bottom 0%", scrub: 0.8 },
            },
        );
    }, { scope: ref });
}
