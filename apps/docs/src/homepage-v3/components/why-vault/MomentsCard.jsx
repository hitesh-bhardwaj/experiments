"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { isLighthouseOrHeadless, isSoftwareRenderer } from "@/lib/audit";
import CursorDemo from "./CursorDemo";
import ScrollDemo from "./ScrollDemo";
import TextDemo from "./TextDemo";

const TABS = [
    { id: "scroll", label: "Scroll", effect: "Grid Tunnel" },
    { id: "cursor", label: "Cursor", effect: "Butterfly Trail Cursor" },
    { id: "text", label: "Text", effect: "Rectangular Text Reveal" },
];
// Mount the demos well before the card arrives so they are already running when it does
const NEAR_VIEWPORT = "150% 0px";

function Demo({ tab }) {
    if (tab === "cursor") return <CursorDemo />;
    if (tab === "scroll") return <ScrollDemo />;
    return <TextDemo />;
}

// 01 "150+ components": live Vault effects behind Cursor · Text · Scroll tabs
export default function MomentsCard({ onTab }) {
    const cardRef = useRef(null);
    const tabsRef = useRef(null);
    const pillRef = useRef(null);
    const [tab, setTab] = useState("scroll");
    const [leaving, setLeaving] = useState(null); // the tab just switched away from
    const [near, setNear] = useState(false);
    const [canRunWebGL, setCanRunWebGL] = useState(false);

    useEffect(() => {
        // WebGL capability is only knowable on the client, after hydration
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setCanRunWebGL(!(isLighthouseOrHeadless() || isSoftwareRenderer()));
        const io = new IntersectionObserver(([entry]) => setNear(entry.isIntersecting), { rootMargin: NEAR_VIEWPORT });
        io.observe(cardRef.current);
        return () => io.disconnect();
    }, []);

    const current = TABS.find((t) => t.id === tab);
    const needsWebGL = tab !== "text";

    useLayoutEffect(() => {
        const tabs = tabsRef.current;
        const pill = pillRef.current;
        const active = tabs?.querySelector('[aria-selected="true"]');
        if (!tabs || !pill || !active) return;

        const place = () => {
            pill.style.width = `${active.offsetWidth}px`;
            pill.style.transform = `translateX(${active.offsetLeft}px)`;
        };

        place();
        const ro = new ResizeObserver(place);
        ro.observe(tabs);
        ro.observe(active);
        return () => ro.disconnect();
    }, [tab]);

    return (
        <div ref={cardRef} className="relative aspect-[16/11] overflow-hidden bg-[#141414] text-[#F4F4F4] max-md:aspect-[4/5]">
            <div className="absolute inset-0">
                {near && (!needsWebGL || canRunWebGL) ? (
                    <Demo key={tab} tab={tab} />
                ) : (
                    <p className="flex h-full items-center justify-center text-[11px] font-semibold tracking-[.14em] text-white/40 uppercase">
                        {current.effect}
                    </p>
                )}
            </div>
            <div ref={tabsRef} className="absolute top-6 left-1/2 z-10 flex -translate-x-1/2 gap-0.5 bg-[#F4F4F4]/90 p-[3px]" role="tablist" aria-label="Effect type">
                <span
                    ref={pillRef}
                    aria-hidden="true"
                    className="absolute inset-y-[3px] left-0 bg-[#1D1D1D] transition-[transform,width] duration-[600ms] ease-[cubic-bezier(.16,1,.3,1)]"
                />
                {TABS.map((t) => (
                    <button
                        key={t.id}
                        type="button"
                        role="tab"
                        aria-selected={tab === t.id}
                        onClick={() => {
                            if (t.id === tab) return;
                            setLeaving(tab);
                            setTab(t.id);
                            onTab?.();
                        }}
                        className={`relative z-1 h-[30px] px-3.5 font-avenir text-[13px] transition-colors duration-[600ms] ease-[cubic-bezier(.16,1,.3,1)] ${tab === t.id ? "text-[#F4F4F4]" : "text-[#1D1D1D]"} ${leaving === t.id && tab !== t.id ? "motion-safe:animate-[hx-tab-release_.9s_ease-out_both]" : ""}`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>
            <p className="pointer-events-none absolute bottom-4 left-4 z-10 bg-black/50 px-2.5 py-1 text-[11px] font-semibold tracking-[.14em] text-white/80 uppercase backdrop-blur-sm">
                {current.effect}
            </p>
        </div>
    );
}
