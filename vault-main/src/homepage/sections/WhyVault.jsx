"use client";

import { useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/dist/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { useLenis } from "lenis/react";
import LineReveal from "@/components/Animations/LineReveal";
import { useFadeUp } from "@/components/Animations/gsapAnimations";
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
            className="relative bg-[#F4F4F4] px-[calc(var(--cvw)*4.5)] py-[7%] max-md:py-[15%]  font-avenir text-[#1D1D1D]  max-md:px-[calc(var(--cvw)*7)]"
        >
            <div className="mx-auto grid max-w-[1536px] grid-cols-[minmax(0,.8fr)_minmax(0,1.6fr)] max-md:gap-4 gap-[calc(var(--cvw)*2)] max-md:grid-cols-1">
                <p className="fadeup type-body-lg max-w-[calc(var(--cvw)*15)] max-lg:max-w-[36ch]">
                    Production-grade motion, without the production complexity.
                </p>
                <LineReveal as="h2" className="type-h1">
                    Built for teams where the frontend <span className="gradient-text-animate gradient-text-single">is the brand.</span>
                </LineReveal>
            </div>

            <div className="mx-auto grid max-w-[1536px] grid-cols-[minmax(0,.8fr)_minmax(0,1.6fr)] gap-[calc(var(--cvw)*2)] pt-[calc(var(--cvw)*5)] max-md:grid-cols-1 max-md:pt-12">
                <nav className="sticky top-1/2 -translate-y-1/2 grid gap-[18px] self-start max-md:hidden" aria-label="Why Vault">
                    {/* <p className="mb-2.5 inline-flex items-center gap-2.5 text-[11px] font-semibold tracking-[.14em] text-[#6B6B6B] uppercase before:size-[5px] before:rounded-full before:bg-primary before:content-['']">
                        Why Vault
                    </p> */}
                    {WHY_VAULT_ITEMS.map((item, i) => (
                        <button
                            key={item.id}
                            type="button"
                            onClick={() => goTo(i)}
                            aria-current={active === i ? "true" : undefined}
                            className={`w-fit justify-self-start text-left type-h2 transition-colors duration-[600ms] ease-[cubic-bezier(.16,1,.3,1)] ${active === i ? "text-[#1D1D1D]" : "text-[#B4B4B4] hover:text-[#8a8a8a]"}`}
                        >
                           <span> {item.nav}</span>
                        </button>
                    ))}
                </nav>

                <div className="grid grid-cols-[minmax(0,1fr)] gap-[clamp(8rem,22vh,14rem)] max-md:gap-8 ">
                    {WHY_VAULT_ITEMS.map((item, i) => (
                        <article key={item.id} data-wv-panel={i}>
                            <div className="fadeup">{renderCard(item.id, i)}</div>
                            <LineReveal as="h3" className="mt-[calc(var(--cvw)*1.8)] max-md:mt-[calc(var(--cvw)*5)] type-h3">{item.title}</LineReveal>
                            <p data-fadeup-delay="0.15" className="fadeup mt-[calc(var(--cvw)*1)] max-md:mt-[calc(var(--cvw)*3)] max-w-[52ch] type-body text-[#6B6B6B]">{item.body}</p>
                        </article>
                    ))}
                </div>
            </div>
        </section>
    );
}
