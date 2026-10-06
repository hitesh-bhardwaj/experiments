"use client";
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import ScrollTrigger from "gsap/dist/ScrollTrigger";
import { FAQWrapper, FAQTitle, FAQContent } from "./effects/animated-faq";
import OverflowTextReveal from "./effects/overflow-text-reveal";

gsap.registerPlugin(ScrollTrigger);

type FaqItem = { question: string; answer: string };

const FAQ_ITEMS: FaqItem[] = [
  {
    question: "Who is Elena Voss and what kind of projects do you take?",
    answer:
      "I am an independent digital designer who helps businesses create, launch, and optimize digital experiences seamlessly. I specialize in responsive web design, modern UX principles, and conversion-driven visual strategies while ensuring accessibility, performance, and refined aesthetics.",
  },
  {
    question: "How quickly can you deliver a complete website for my business?",
    answer:
      "Most projects launch in as little as 48 hours for smaller sites, with larger multi-page builds typically wrapping within two to three weeks depending on scope, content readiness, and how many revision rounds are needed.",
  },
  {
    question:
      "Do you work with existing design systems and content management platforms?",
    answer:
      "Yes - I regularly work inside established design systems and popular CMS platforms alike, adapting to whatever your team already has in place rather than forcing a rebuild from scratch.",
  },
  {
    question: "What design standards do you follow consistently?",
    answer:
      "Every project follows WCAG accessibility guidelines, semantic markup, and performance budgets from day one, alongside a consistent typographic and spacing system so the final product feels cohesive across every screen.",
  },
  {
    question:
      "How do you stay current with emerging design trends and innovations each year?",
    answer:
      "I dedicate time each month to hands-on experimentation with new interaction patterns, tooling, and frameworks, plus regular study of award-winning work, so the craft behind every project keeps pace with where the web is heading.",
  },
];

const Faq = () => {
  const [openIndex, setOpenIndex] = useState(0);
  const rowRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    // Deferred a frame so this isn't a synchronous setState call inside the
    // effect body itself (which forces a cascading extra render right after
    // mount) - matches the same pattern used elsewhere in this template.
    const frameId = window.requestAnimationFrame(() => setPrefersReducedMotion(mq.matches));
    const onChange = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener("change", onChange);
    return () => {
      window.cancelAnimationFrame(frameId);
      mq.removeEventListener("change", onChange);
    };
  }, []);

  useEffect(() => {
    const rows = rowRefs.current.filter(Boolean) as HTMLDivElement[];

    // Rows start at opacity-0 (static class, see below) purely to prevent
    // a FOUC before this effect runs - under reduced motion there's no
    // fade-in to wait for, so they need to be snapped visible immediately
    // instead of staying permanently invisible.
    if (prefersReducedMotion) {
      gsap.set(rows, { opacity: 1, y: 0 });
      return;
    }

    const tweens = rows.map((row) =>
      gsap.fromTo(
        row,
        { opacity: 0, y: 40 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: "power2.out",
          scrollTrigger: {
            trigger: row,
            start: "top 85%",
            toggleActions: "play none none none",
          },
        }
      )
    );

    return () => {
      tweens.forEach((tween) => tween.scrollTrigger?.kill());
      tweens.forEach((tween) => tween.kill());
    };
  }, [prefersReducedMotion]);

  return (
    <section className="w-screen py-[6vw] px-[10vw] relative bg-[#070707] text-white max-[1025px]:px-[5vw]">
      <OverflowTextReveal stagger={0.015}>
        <h2 className="text-[5.5vw] text-center mb-[6vw] max-[1025px]:text-[7vw] max-md:text-[9vw]">
          Frequently Asked Questions
        </h2>
      </OverflowTextReveal>

      <div className="w-full mx-auto ">
        {FAQ_ITEMS.map((item, i) => {
          const isOpen = openIndex === i;
          return (
            <div
              key={item.question}
              ref={(el) => {
                rowRefs.current[i] = el;
              }}
              className="opacity-0"
            >
            <FAQWrapper
              controlledOpen={isOpen}
              onToggle={() => setOpenIndex((prev) => (prev === i ? -1 : i))}
              className="border-b border-white/10 py-8 group max-md:py-5"
              duration={0.5}
            >
              <FAQTitle showIcon={false}>
                {/* showIcon=false collapses FAQTitle to a single non-flex
                                    wrapper around its children, so the row layout (question
                                    left, icon right) needs its own flex container here. */}
                <div className="flex items-center justify-between gap-6 w-full max-md:gap-4">
                  <span className="text-[1.5vw] font-normal max-[1025px]:text-[2.6vw] max-md:text-[4.2vw]">
                    {item.question}
                  </span>

                  <div
                    className={`relative shrink-0 size-14 rounded-full overflow-hidden flex items-center justify-center transition-colors duration-300 ease-out border border-white/20 max-[1025px]:size-11 max-md:size-9 `}
                  >
                    {/* Always-horizontal bar (the "-"), plus a second bar
                                            that rotates between vertical (forming a "+" when
                                            closed) and horizontal (merging into a single "-"
                                            when open). */}
                    <span className="absolute h-[2px] z-2 w-4 rounded-full bg-white max-md:w-3" />
                    <span
                      className={`absolute h-[2px] z-2 w-4 rounded-full bg-white transition-transform duration-300 ease-out max-md:w-3 ${
                        isOpen ? "rotate-0" : "rotate-90"
                      }`}
                    />
                    <div
                      className={`absolute inset-0 w-full h-full bg-linear-to-r from-[#F16B0D] to-[#E61416] group-hover:scale-100 scale-0 ease-in-out origin-center rounded-full  duration-300 ${isOpen ? "scale-100" : "scale-0"}`}
                    />
                  </div>
                </div>
              </FAQTitle>

              <FAQContent className="pt-4 pr-[3vw] w-[80%] max-[1025px]:w-full max-[1025px]:pr-0 max-md:w-full max-md:pr-0">
                <p className="text-[1.25vw] leading-[1.6] text-white/80 max-[1025px]:text-[2.2vw] max-md:text-[3.8vw]">
                  {item.answer}
                </p>
              </FAQContent>
            </FAQWrapper>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default Faq;
