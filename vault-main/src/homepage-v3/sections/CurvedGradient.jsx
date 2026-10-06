"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/dist/ScrollTrigger";
import SplitText from "gsap/SplitText";
import { useGSAP } from "@gsap/react";

import CurvedGradientShader from "@/homepage-v3/components/CurvedGradientShader";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, SplitText);
}

const headingClass =
  "text64 pointer-events-none absolute left-1/2 top-1/2 z-10 w-full max-w-[65.5vw] -translate-x-1/2 -translate-y-1/2 text-center text-[3.25vw] text-white max-[1025px]:max-w-[85%] max-[1025px]:text-[4.2vw] max-md:max-w-[90%] max-md:text-[5vw]";

// Pinned scroll per text, plus one text's worth of run-in/run-out
const VH_PER_TEXT = 50;

const TEXTS = [
  {
    content: <>Most websites are not broken. They are <span className="gradient-text-animate">forgettable!</span></>,
  },
  {
    content: "What makes an interface memorable is what happens when someone touches it: how a section enters, how a cursor reacts, how a page changes, and how a moment resolves.",
  },
  {
    content: "Most component libraries and page builders stop at the static interface. Interaction is the layer they never touch.",
  },
];

// The dithered curved gradient, pinned while its texts take turns: each one
// rises in line by line, then leaves before the next. Works for any number
// of TEXTS; the scroll length grows with them.
export default function CurvedGradient() {
  const wrapperRef = useRef(null);
  const textRefs = useRef([]);

  useGSAP(
    () => {
      const wrapper = wrapperRef.current;
      const texts = textRefs.current.filter(Boolean);
      if (!wrapper || !texts.length) return;

      let splits = [];

      // SplitText.create() is a forced-layout DOM mutation; this section is
      // well below the fold, so the split waits until it's nearly on screen.
      const mount = () => {
        splits = texts.map((el) => SplitText.create(el, { type: "lines", linesClass: "split-line" }));
        splits.forEach((split) => gsap.set(split.lines, { yPercent: 100, opacity: 0 }));

        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: wrapper,
            start: "10% 60%",
            end: "85% 20%",
            scrub: true,
            // markers:true
          },
        });

        // Each text in, then out - the next takes the same beat
        splits.forEach((split) => {
          tl.to(split.lines, { yPercent: 0, opacity: 1, ease: "power2.out", stagger: 0.08 })
            .to(split.lines, { yPercent: -100, opacity: 0, ease: "power2.in", stagger: 0.08 }, "<.5");
        });

        ScrollTrigger.refresh(true);
      };

      const io = new IntersectionObserver(
        (entries) => {
          if (entries[0]?.isIntersecting) {
            io.disconnect();
            mount();
          }
        },
        { rootMargin: "500px 0px" }
      );
      io.observe(wrapper);

      return () => {
        io.disconnect();
        splits.forEach((split) => split.revert());
      };
    },
    { scope: wrapperRef },
  );

  return (
    <div ref={wrapperRef} className="relative z-200" style={{ height: `${VH_PER_TEXT * (TEXTS.length + 1)}vh` }}>
      <section
        id="curved-gradient"
        className="sticky top-0 isolate h-screen w-full mt-[-8vw] flex items-center justify-center overflow-hidden"
      >
        <CurvedGradientShader
          overscan={1.5}
          edgeFade={false}
          dither={true}
          pixelSize={5.0}
          colorNum={8.0}
          scrollTrigger={wrapperRef}
          scrollStart="top bottom"
          scrollEnd="150% top"
          curveStrength={0.6}
          markers={false}
        />
        {TEXTS.map((text, i) => (
          <h2
            key={i}
            ref={(el) => { textRefs.current[i] = el; }}
            id={i === 0 ? "curved-gradient-heading" : `curved-gradient-heading-${i + 1}`}
            className={headingClass}
          >
            {text.content}
          </h2>
        ))}
      </section>
    </div>
  );
}
