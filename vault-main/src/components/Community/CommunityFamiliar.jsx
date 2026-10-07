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
import { useCommunity } from "./community-store";
import { CritiqueCard, FeaturedCard, TeardownCard, VoteCard } from "./WhyJoinPanels";


const FAMILIAR = [
  { text: "You’ve rebuilt the same scroll reveal six times this year." },
  { text: "You spent an hour on one easing curve. Nobody noticed.", em: "You", after: " did." },
  { text: "Someone called your page transition “just an animation.”" },
  { text: "You shipped something beautiful, with nobody around who’d really get it." },
];

gsap.registerPlugin(ScrollTrigger, useGSAP);

const SPY_OFFSET = 140; 

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
    <div ref={rootRef} className="relative z-1 mx-auto  bg-[#F4F4F4] text-[#1D1D1D]" data-zone="sheet" data-sound-flow="off">
      <section className="mx-auto max-w-[1536px] px-[4.5vw] py-[7vw]" aria-labelledby="fam-h">
        <ol className="mt-12 flex flex-col px-[1vw]">
          {FAMILIAR.map((item, i) => (
            <li
              key={item.text}
              data-fam
              className={`flex items-baseline gap-4 border-t border-[rgba(29,29,29,.1)] py-[1.9vw] max-md:py-6 last:border-b`}
            >
              <span className={`w-[70px] shrink-0 max-sm:w-[44px] font-avenir text-[11px] font-medium tracking-[.14em] uppercase transition-colors duration-1200 ease-[cubic-bezier(.16,1,.3,1)] ${lit === i ? "text-primary" : "text-[#B4B4B4]"}`}>
                {String(i + 1).padStart(2, "0")}
              </span>
              <p className={`min-w-0 flex-1 font-aeonik font-light  text-[2.8vw] leading-[1.12] tracking-[-.03em] transition-colors duration-1200 ease-[cubic-bezier(.16,1,.3,1)] ${lit === i ? "text-[#1D1D1D]" : "text-[#B4B4B4]"}`}>
                {item.text}
                {item.em && <> <em className="text-primary not-italic">{item.em}</em>{item.after}</>}
              </p>
            </li>
          ))}
        </ol>
        <LineReveal as="h2" className={`font-aeonik font-normal tracking-[-.035em] leading-[1.02]  text80 mt-[7vw] max-w-[45vw] max-[1025px]:max-w-[80vw] max-md:max-w-full`}>
          You’re not the only one. <span className="gradient-text-animate gradient-text-single">There’s a room for this.</span>
        </LineReveal>
      </section>

      <div className="mx-auto flex max-w-[1536px] gap-8 px-[4.5vw] pb-[10vw] max-[1025px]:flex-col" id="why">
        <div className="sticky top-1/2 -translate-y-1/2 flex mt-[6vw] min-w-0 flex-[.8] flex-col items-start gap-4.5 self-start max-[1025px]:hidden">
          {/* <p className="eyebrow label">Why join</p> */}
          {PANELS.map((p, i) => (
            <button
              key={p.nav}
              type="button"
              aria-current={spy === i ? "true" : undefined}
              onClick={() => goToPanel(i)}
              className={`font-aeonik font-normal tracking-[-.035em] leading-[1.02] text-left text-[2.6vw] transition-colors duration-900 ease-[cubic-bezier(.16,1,.3,1)] ${spy === i ? "text-[#1D1D1D]" : "text-[#B4B4B4] hover:text-[#8a8a8a]"}`}
            >
              {p.nav}
            </button>
          ))}
        </div>
        <div className="flex min-w-0 flex-[1.6] flex-col gap-[14vw]">
          {PANELS.map(({ title, text, Card }, i) => (
            <article key={title} data-panel={i}>
              <Card joined={joined} />
              <LineReveal as="h3" className="mt-[1.8vw] max-md:mt-[5vw] text32 font-aeonik text-[2.6vw]! max-md:text-[4vw]! max-sm:text-[6.6vw]!">{title}</LineReveal>
              <p data-fadeup-delay="0.15" className="fadeup mt-[1vw] max-md:mt-[3vw] max-w-[52ch] text22 font-avenir text-[1.1vw]! leading-[1.6]! max-md:text-[2.2vw]! max-sm:text-[4.1vw]! text-[#6B6B6B]">{text}</p>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
