"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/dist/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { prefersReducedMotion } from "@/lib/motion";

if (typeof window !== "undefined") {
    gsap.registerPlugin(ScrollTrigger, useGSAP);
}

// A section that comes in like an overlay: it starts scaled down and scales up to
// full size as its top scrolls into view, smoothed behind the scroll.
//
// The scale is driven by hand from a ScrollTrigger with no animation attached, not by
// a scrubbed tween. Every ScrollTrigger inside the overlay measures its start/end with
// getBoundingClientRect, which includes this scale, and during a refresh ScrollTrigger
// resets a scrubbed tween to its start (scaled down) - so everything deep in the overlay
// was measured hundreds of px too early, on load and again on any later refresh. Here
// the overlay is put back to full size for every refresh and re-scaled after it.
export function useSectionOverlay(ref, { scale = 0.88 } = {}) {
    useGSAP(() => {
        const root = ref.current;
        if (!root || prefersReducedMotion()) return undefined;

        const ease = gsap.parseEase("power3.out");
        const scaleAt = (progress) => scale + (1 - scale) * ease(progress);

        // Full size leaves no transform at all, so fixed/sticky children behave normally
        const apply = (progress, instant = false) => {
            const target = scaleAt(progress);
            const done = () => target === 1 && gsap.set(root, { clearProps: "transform" });
            if (instant) {
                gsap.killTweensOf(root);
                gsap.set(root, { scale: target, transformOrigin: "50% 0%" });
                done();
            } else {
                gsap.to(root, { scale: target, transformOrigin: "50% 0%", duration: 0.8, ease: "power3.out", overwrite: true, onComplete: done });
            }
        };

        const trigger = ScrollTrigger.create({
            trigger: root,
            start: "top 100%",
            end: "top 15%",
            onUpdate: (self) => apply(self.progress),
        });

        let measuredCount = 0;
        const atFullSize = () => {
            gsap.killTweensOf(root);
            gsap.set(root, { clearProps: "transform" });
        };
        const afterRefresh = () => {
            measuredCount = ScrollTrigger.getAll().length;
            apply(trigger.progress, true);
        };
        ScrollTrigger.addEventListener("refreshInit", atFullSize);
        ScrollTrigger.addEventListener("refresh", afterRefresh);

        // Sections inside are often lazy (next/dynamic): their ScrollTriggers are created
        // after the first refresh and only measure themselves, against the scaled overlay.
        // Re-measure everything once scrolling stops if triggers were added since the last
        // refresh, or whenever the overlay's size changes as those sections mount
        // (transforms don't count, so the scale itself never re-triggers this).
        const onScrollEnd = () => {
            if (ScrollTrigger.getAll().length !== measuredCount) ScrollTrigger.refresh();
        };
        ScrollTrigger.addEventListener("scrollEnd", onScrollEnd);

        let timer = null;
        const ro = new ResizeObserver(() => {
            clearTimeout(timer);
            timer = setTimeout(() => ScrollTrigger.refresh(), 150);
        });
        ro.observe(root);

        apply(trigger.progress, true);
        ScrollTrigger.refresh();

        return () => {
            ro.disconnect();
            clearTimeout(timer);
            ScrollTrigger.removeEventListener("refreshInit", atFullSize);
            ScrollTrigger.removeEventListener("refresh", afterRefresh);
            ScrollTrigger.removeEventListener("scrollEnd", onScrollEnd);
            trigger.kill();
            gsap.killTweensOf(root);
            gsap.set(root, { clearProps: "transform" });
        };
    }, { scope: ref });
}
