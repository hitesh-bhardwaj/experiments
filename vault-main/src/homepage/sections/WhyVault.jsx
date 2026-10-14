"use client";

import { useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/dist/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { useLenis } from "lenis/react";
import LineReveal from "@/components/Animations/LineReveal";
import { useFadeUp } from "@/components/Animations/gsapAnimations";
import { useSectionOverlay } from "@/components/Animations/useSectionOverlay";
import CodeCard from "../components/why-vault/CodeCard";
import MomentsCard from "../components/why-vault/MomentsCard";
import TuneCard from "../components/why-vault/TuneCard";

const WHY_VAULT_ITEMS = [
    {
        id: "moments",
        nav: "150+ components / 56 free",
        title: "Every moment, already built.",
        body: "Scroll systems, cursor presence, text reveals, transitions, loaders and WebGL scenes. Preview exactly how each one behaves before it touches your project.",
    },
    {
        id: "code",
        nav: "Code you own",
        title: "One command. Real files.",
        body: "The Hyperiux CLI adds only the effect you asked for and only the files it needs. No runtime dependency on us, no lock-in. Inspect it, change it, keep it.",
    },
    {
        id: "tune",
        nav: "Tune everything",
        title: "Your brand, your timing.",
        body: "Copy, layout, timing, easing, breakpoints, hover states, mobile fallbacks and reduced-motion behaviour are all yours to tune. Try it: drag the sliders.",
    },
];

if (typeof window !== "undefined") {
    gsap.registerPlugin(ScrollTrigger, useGSAP);
}

const SCROLL_DURATION = 1.8;
const CARD_TOP_GAP = 20;
export default function WhyVault() {
    const rootRef = useRef(null);
    const lenis = useLenis();
    const [active, setActive] = useState(0);
    const [activations, setActivations] = useState(() => WHY_VAULT_ITEMS.map(() => 0));

    useFadeUp(rootRef);

    useGSAP(() => {
        rootRef.current.querySelectorAll("[data-wv-panel]").forEach((panel) => {
            const index = Number(panel.dataset.wvPanel);
            ScrollTrigger.create({
                trigger: panel,
                start: "top 55%",
                end: "bottom 55%",
                onToggle: (self) => {
                    if (!self.isActive) return;
                    setActive(index);
                    // Counts activations so the tune card can replay each time
                    setActivations((counts) => counts.map((n, i) => (i === index ? n + 1 : n)));
                },
            });
        });
    }, { scope: rootRef });


    useSectionOverlay(rootRef);

    const goTo = (index) => {
        const panel = rootRef.current.querySelector(`[data-wv-panel="${index}"]`);
        const y = window.scrollY + panel.getBoundingClientRect().top - CARD_TOP_GAP;
        if (lenis) lenis.scrollTo(y, { duration: SCROLL_DURATION });
        else window.scrollTo({ top: y, behavior: "smooth" });
    };

    // Each item's card, by id, so the list can grow or shrink freely
    const renderCard = (id, i) => {
        if (id === "moments") return <MomentsCard />;
        if (id === "tune") return <TuneCard replayKey={activations[i]} />;
        // The install walkthrough over its own orange fluid; types once, on first activation
        return <CodeCard play={activations[i] > 0} />;
    };

    return (
        <section
            ref={rootRef}
            id="why"
            aria-label="Why Vault"
            data-sound-flow="off"
            className="section-x relative isolate py-[7%] text-ink"
        >
            {/* The white layer; the content sits on top */}
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-1 bg-light" />
            <div className="site-container flex flex-col gap-[calc(var(--cvw)*7)] max-md:gap-12">
            <div className="grid grid-cols-[minmax(0,.8fr)_minmax(0,1.6fr)] gap-[calc(var(--cvw)*2)] max-md:grid-cols-1 max-md:gap-4">
                {/* Both reveal as the section starts scaling in ("top 85%"),
                    the intro line first, then the heading's lines */}
                <LineReveal as="p" start="top 85%" className="type-body-lg max-w-[calc(var(--cvw)*15)] max-lg:max-w-[36ch]">
                    Production-grade motion, without the production complexity.
                </LineReveal>
                <LineReveal as="h2" start="top 85%" delay={0.2} className="type-h1">
                    Built for Teams Where the Frontend <span className="gradient-text-animate gradient-text-single">Is the Brand.</span>
                </LineReveal>
            </div>

            <div className="grid grid-cols-[minmax(0,.8fr)_minmax(0,1.6fr)] gap-[calc(var(--cvw)*2)] max-md:grid-cols-1">
                <nav className="sticky top-[40svh] grid gap-[calc(var(--cvw)*1.2)] self-start max-md:hidden" aria-label="Why Vault sections">
                    {WHY_VAULT_ITEMS.map((item, i) => (
                        <button
                            key={item.id}
                            type="button"
                            onClick={() => goTo(i)}
                            aria-current={active === i ? "true" : undefined}
                            className={`w-fit justify-self-start text-left type-h2 font-aeonik transition-colors duration-600 ease-[cubic-bezier(.16,1,.3,1)] ${active === i ? "text-ink" : "text-black/20 hover:text-black/40"}`}
                        >
                           <span>{item.nav}</span>
                        </button>
                    ))}
                </nav>

                <div className="grid grid-cols-[minmax(0,1fr)] gap-[calc(var(--cvw)*12)] max-lg:gap-10 max-md:gap-12">
                    {WHY_VAULT_ITEMS.map((item, i) => (
                        <article key={item.id} data-wv-panel={i} className="flex flex-col gap-[calc(var(--cvw)*1.8)] max-md:gap-[calc(var(--cvw)*12)]">
                            <div className="fadeup">{renderCard(item.id, i)}</div>
                            <div className="flex flex-col gap-[calc(var(--cvw)*1)] max-md:gap-[calc(var(--cvw)*3)]">
                                <LineReveal as="h3" className="type-h3">{item.title}</LineReveal>
                                <p data-fadeup-delay="0.15" className="fadeup type-body max-w-[52ch] text-black/60">{item.body}</p>
                            </div>
                        </article>
                    ))}
                </div>
            </div>
            </div>
        </section>
    );
}
