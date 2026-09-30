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
    root.querySelectorAll(".spy-panel .card").forEach((card) => {
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
    <div ref={rootRef} className="sheet" data-zone="sheet">
      <section className="familiar" aria-labelledby="fam-h">
        <p className="eyebrow label fadeup" id="fam-h">Sound familiar?</p>
        <ol className="fam-list">
          {FAMILIAR.map((item, i) => (
            <li key={item.text} data-fam className={lit === i ? "lit" : ""}>
              <span className="fam-n label">{String(i + 1).padStart(2, "0")}</span>
              <p>
                {item.text}
                {item.em && <> <em>{item.em}</em>{item.after}</>}
              </p>
            </li>
          ))}
        </ol>
        <LineReveal as="h2" className="display d2 fam-close">
          You’re not the only one. <span className="gradient-text-animate">There’s a room for this.</span>
        </LineReveal>
      </section>

      <div className="spy" id="why">
        <div className="spy-nav">
          <p className="eyebrow label">Why join</p>
          {PANELS.map((p, i) => (
            <button key={p.nav} type="button" className={spy === i ? "on" : ""} aria-current={spy === i ? "true" : undefined} onClick={() => goToPanel(i)}>
              {p.nav}
            </button>
          ))}
        </div>
        <div className="spy-panels">
          {PANELS.map(({ title, text, Card }, i) => (
            <article key={title} className="spy-panel" data-panel={i}>
              <Card joined={joined} />
              <h3>{title}</h3>
              <p className="body">{text}</p>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
