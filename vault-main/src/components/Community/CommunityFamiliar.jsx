"use client";

import { useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { useLenis } from "lenis/react";
import LineReveal from "@/components/Animations/LineReveal";
import { useFadeUp } from "@/components/Animations/gsapAnimations";
import { useInteraction } from "@/homepage/components/InteractionProvider";
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
        end: "max",
        // Lines stay lit once reached, and go dark again only when scrolled back above them
        onEnter: () => { setLit((cur) => Math.max(cur, i)); sound?.note?.(i); },
        onLeaveBack: () => setLit((cur) => Math.min(cur, i - 1)),
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
    <div ref={rootRef} className="relative z-1 bg-light text-ink" data-zone="sheet" data-sound-flow="off">
      <section id="familiar" className="mx-auto flex w-full max-w-[1536px] flex-col gap-[7vw] px-[7.5vw] py-[10%] max-md:gap-[12vw] max-md:px-[6vw]" aria-labelledby="fam-h">
        <ol className="flex flex-col px-[1vw]">
          {FAMILIAR.map((item, i) => (
            <li
              key={item.text}
              data-fam
              className="flex items-baseline gap-[1vw] border-t border-black/10 py-[3vw] last:border-b max-md:gap-[4vw] max-md:py-[6vw]"
            >
              <span className={`type-label w-[5vw] shrink-0 transition-colors duration-1200 ease-[cubic-bezier(.16,1,.3,1)] max-md:w-[11vw] ${lit >= i ? "text-primary" : "text-black/20"}`}>
                {String(i + 1).padStart(2, "0")}
              </span>
              <p className={`type-h2 font-avenir min-w-0 flex-1 font-light! transition-colors duration-1200 tracking-tight ease-[cubic-bezier(.16,1,.3,1)] ${lit >= i ? "text-ink" : "text-black/20"}`}>
                {item.text}
                {item.em && <> <em className=" not-italic">{item.em}</em>{item.after}</>}
              </p>
            </li>
          ))}
        </ol>
        <LineReveal as="h2" id="fam-h" className="type-h1 w-[60%] max-[1025px]:w-[88%] max-md:w-full">
          You’re Not the Only One. <span className="gradient-text-animate gradient-text-single">There’s a Room for This.</span>
        </LineReveal>
      </section>

      <section id="why" className="mx-auto mt-20 flex w-full max-w-[1536px] justify-between gap-[2vw] px-[4.5vw] pb-[10vw] max-[1025px]:flex-col max-md:px-[6vw]">
        <div className="sticky top-[35vh] flex w-[32%] flex-col items-start gap-[1vw] self-start max-[1025px]:hidden">
          {PANELS.map((p, i) => (
            <button
              key={p.nav}
              type="button"
              aria-current={spy === i ? "true" : undefined}
              onClick={() => goToPanel(i)}
              className={`type-h2 font-avenir text-left transition-colors duration-900 ease-[cubic-bezier(.16,1,.3,1)] ${spy === i ? "text-ink" : "text-black/20 hover:text-black/40"}`}
            >
              {p.nav}
            </button>
          ))}
        </div>
        <div className="flex w-[66%] flex-col gap-[14vw] max-[1025px]:w-full max-md:gap-[20vw]">
          {PANELS.map(({ title, text, Card }, i) => (
            <article key={title} data-panel={i} className="flex flex-col gap-[1.8vw] max-md:gap-[5vw]">
              <Card joined={joined} />
              <div className="flex flex-col gap-[1vw] max-md:gap-[3vw]">
                <LineReveal as="h3" className="type-h3">{title}</LineReveal>
                <p data-fadeup-delay="0.15" className="fadeup type-body max-w-[52ch] text-black/60">{text}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
