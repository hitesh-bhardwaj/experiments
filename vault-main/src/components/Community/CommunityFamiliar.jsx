"use client";

import { useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { useLenis } from "lenis/react";
import LineReveal from "@/components/Animations/LineReveal";
import { useFadeUp } from "@/components/Animations/gsapAnimations";
import { useInteraction } from "@/homepage-v3/components/InteractionProvider";
import { prefersReducedMotion } from "@/lib/motion";
import { FAMILIAR } from "./community-data";
import { useCommunity } from "./community-store";
import { CritiqueCard, FeaturedCard, TeardownCard, VoteCard } from "./WhyJoinPanels";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const SPY_OFFSET = 140; // keeps a panel's card below the fixed header when jumped to

const PANELS = [
  {
    nav: "See how it’s built",
    title: "Monthly live teardowns.",
    text: "We take a Vault effect or an award-winning site apart, frame by frame: the timing, the easing, the performance trade-offs, and the code. Drag the timeline above. That’s the idea, live, with the people who built it.",
    Card: TeardownCard,
  },
  {
    nav: "Get it first",
    title: "New effects land here first.",
    text: "Members get new effects before they hit the public catalog. Test them, break them, tell us what’s missing, and vote on what we build next. The roadmap has your fingerprints on it.",
    Card: VoteCard,
  },
  {
    nav: "Get real critique",
    title: "Critique from people who care.",
    text: "Share work in progress and get specific, kind, useful feedback from developers who can tell 0.4s from 0.6s, and who’ll tell you which one is right.",
    Card: CritiqueCard,
  },
  {
    nav: "Get seen",
    title: "Get seen for the details.",
    text: "Standout work gets featured across Vault and our channels. And when studios ask us for motion-literate developers, the community is where we’ll look first.",
    Card: FeaturedCard,
  },
];

// Light sheet: the "sound familiar?" list lights up line by line, then the
// why-join panels, with a sticky nav that follows whichever panel is centred
export default function CommunityFamiliar() {
  const rootRef = useRef(null);
  const lenis = useLenis();
  const { sound } = useInteraction() ?? {};
  const { joined } = useCommunity();
  const [lit, setLit] = useState(-1);
  const [spy, setSpy] = useState(0);

  useFadeUp(rootRef);

  useGSAP(() => {
    const root = rootRef.current;
    root.querySelectorAll("[data-fam]").forEach((li, i) => {
      ScrollTrigger.create({
        trigger: li,
        start: "top 62%",
        end: "bottom 38%",
        onToggle: (self) => {
          setLit((cur) => (self.isActive ? i : cur === i ? -1 : cur));
          if (self.isActive) sound?.note?.(i);
        },
      });
    });
    root.querySelectorAll("[data-panel]").forEach((panel, i) => {
      ScrollTrigger.create({
        trigger: panel,
        start: "top 55%",
        end: "bottom 55%",
        onToggle: (self) => { if (self.isActive) setSpy(i); },
      });
    });
    if (prefersReducedMotion()) return;
    root.querySelectorAll("[data-panel] > :first-child").forEach((card) => {
      gsap.from(card, { opacity: 0, y: 60, duration: 2, ease: "expo.out", scrollTrigger: { trigger: card, start: "top 90%" } });
    });
  }, { scope: rootRef, dependencies: [sound] });

  const goToPanel = (i) => {
    const panel = rootRef.current.querySelector(`[data-panel="${i}"]`);
    if (!panel) return;
    sound?.note?.(i);
    const top = panel.getBoundingClientRect().top + window.scrollY - SPY_OFFSET;
    if (lenis) lenis.scrollTo(top);
    else window.scrollTo({ top, behavior: prefersReducedMotion() ? "auto" : "smooth" });
  };

  return (
    <div ref={rootRef} className="relative z-1 mx-auto max-w-[calc(100%-2*clamp(0px,1vw,16px))] bg-[#F4F4F4] text-[#1D1D1D]" data-zone="sheet" data-sound-flow="off">
      <section className="mx-auto max-w-[1536px] px-[clamp(1.25rem,3vw,3rem)] pt-[clamp(6rem,16vh,10rem)] pb-[clamp(5rem,12vh,8rem)]" aria-labelledby="fam-h">
        {/* <p className="eyebrow label fadeup" id="fam-h">Sound familiar?</p> */}
        <ol className="mt-12 grid">
          {FAMILIAR.map((item, i) => (
            <li
              key={item.text}
              data-fam
              className={`grid grid-cols-[70px_minmax(0,1fr)] items-baseline gap-4 border-t border-[rgba(29,29,29,.1)] py-[clamp(1.4rem,3vh,2rem)] last:border-b max-sm:grid-cols-[44px_minmax(0,1fr)]`}
            >
              <span className={`font-avenir text-[11px] font-medium tracking-[.14em] uppercase transition-colors duration-1200 ease-[cubic-bezier(.16,1,.3,1)] ${lit === i ? "text-primary" : "text-[#B4B4B4]"}`}>
                {String(i + 1).padStart(2, "0")}
              </span>
              <p className={`font-aeonik font-normal tracking-[-.035em] leading-[1.02] text-[clamp(1.5rem,3vw,2.9rem)] leading-[1.12] tracking-[-.03em] transition-colors duration-1200 ease-[cubic-bezier(.16,1,.3,1)] ${lit === i ? "text-[#1D1D1D]" : "text-[#B4B4B4]"}`}>
                {item.text}
                {item.em && <> <em className="text-primary not-italic">{item.em}</em>{item.after}</>}
              </p>
            </li>
          ))}
        </ol>
        <LineReveal as="h2" className={`font-aeonik font-normal tracking-[-.035em] leading-[1.02]  text-[clamp(2.2rem,4.6vw,4.6rem)] mt-[clamp(4rem,10vh,7rem)]! max-w-[45vw] max-[1025px]:max-w-[80vw] max-md:max-w-full`}>
          You’re not the only one. <span className="gradient-text-animate gradient-text-single">There’s a room for this.</span>
        </LineReveal>
      </section>

      <div className="mx-auto grid max-w-[1536px] grid-cols-[minmax(0,.8fr)_minmax(0,1.6fr)] gap-8 px-[clamp(1.25rem,3vw,3rem)] pb-[clamp(6rem,16vh,10rem)] max-[1025px]:grid-cols-1" id="why">
        <div className="sticky top-[26vh] grid justify-items-start gap-4.5 self-start max-[1025px]:hidden">
          {/* <p className="eyebrow label">Why join</p> */}
          {PANELS.map((p, i) => (
            <button
              key={p.nav}
              type="button"
              aria-current={spy === i ? "true" : undefined}
              onClick={() => goToPanel(i)}
              className={`font-aeonik font-normal tracking-[-.035em] leading-[1.02] text-left text-[clamp(1.5rem,2.3vw,2.2rem)] transition-colors duration-900 ease-[cubic-bezier(.16,1,.3,1)] ${spy === i ? "text-[#1D1D1D]" : "text-[#B4B4B4] hover:text-[#8a8a8a]"}`}
            >
              {p.nav}
            </button>
          ))}
        </div>
        <div className="grid gap-[clamp(8rem,22vh,14rem)]">
          {PANELS.map(({ title, text, Card }, i) => (
            <article key={title} data-panel={i}>
              <Card joined={joined} />
              <h3 className={`font-aeonik font-normal tracking-[-.035em] leading-[1.02] mt-7 text-[clamp(1.25rem,1.6vw,1.5rem)]`}>{title}</h3>
              <p className={`max-w-[40vw] max-[1025px]:max-w-[70vw] max-md:max-w-full text-base leading-[1.65] text-[#9C9C9C] mt-3`}>{text}</p>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
