// Built using Hyperiux Vault: https://vault.hyperiux.com

"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import gsap from "gsap";
import ScrollTrigger from "gsap/dist/ScrollTrigger";
import CharStaggerPrimaryButton from "./effects/char-stagger-primary-button";

// Loaded on first interaction
const EnquiryModal = dynamic(() => import("./EnquiryModal"));

import { FadeUp, ParaAnim } from "./Animations/gsapAnim";
import { prefersReducedMotion } from "./Animations/reducedMotion";
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const KYNTRA_PRIMARY = "#0205FA";

const STEPS = [
  {
    title: "Tell us what you need",
    description: "Choose a service or describe your problem.",
  },
  {
    title: "Choose your professional",
    description: "Compare ratings, experience and pricing.",
  },
  {
    title: "Pick a time",
    description: "Schedule a visit when it's convenient.",
  },
  {
    title: "Get it done",
    description: "Track the service and payment from Kyntra.",
  },
];

const LINE_HEIGHT = 150;

export default function HowKyntraWorks() {
  const [enquiryOpen, setEnquiryOpen] = useState(false);
  const [enquiryUsed, setEnquiryUsed] = useState(false);
  const sectionRef = useRef<HTMLElement | null>(null);
  const lineRefs = useRef<(SVGLineElement | null)[]>([]);
  const dotRefs = useRef<(SVGCircleElement | null)[]>([]);
  const stepRefs = useRef<HTMLDivElement[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const ctx = gsap.context(() => {
     
      if (prefersReducedMotion()) {
        lineRefs.current.forEach((line) => {
          if (!line) return;
          gsap.set(line, { strokeDasharray: "none", strokeDashoffset: 0 });
        });
        gsap.set(dotRefs.current, {
          fill: KYNTRA_PRIMARY,
          attr: { cy: LINE_HEIGHT },
        });
        stepRefs.current.forEach((step) => {
          gsap.set(step, { opacity: 1 });
          const heading = step.querySelector<HTMLHeadingElement>(".step-title");
          if (heading) gsap.set(heading, { color: KYNTRA_PRIMARY });
        });
        return;
      }

      // One scrubbed timeline draws the line
      const masterTL = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "10% 55%",
          end: "90% 70%",
          scrub: 0.4,
        },
      });

      lineRefs.current.forEach((line, index) => {
        if (!line) return;
        const dot = dotRefs.current[index];

        gsap.set(line, {
          strokeDasharray: LINE_HEIGHT,
          strokeDashoffset: LINE_HEIGHT,
        });

        if (index === 0) {
          masterTL.to(dot, { fill: KYNTRA_PRIMARY, duration: 0.1 });
        }

        masterTL.to(line, { strokeDashoffset: 0, ease: "none" });

        if (dot) {
          masterTL.fromTo(
            dot,
            { attr: { cy: 0 } },
            { attr: { cy: LINE_HEIGHT }, ease: "none" },
            "<",
          );

          if (index > 0) {
            masterTL.to(dot, { fill: KYNTRA_PRIMARY, duration: 0.1 }, "<0.1");
          }
        }
      });

      // Each step fades up, heading blues
      stepRefs.current.forEach((step) => {
        const heading = step.querySelector<HTMLHeadingElement>(".step-title");
        const scrollTrigger = {
          trigger: step,
          start: "top 65%",
          end: "top 45%",
          scrub: 0.2,
        };

        gsap.fromTo(
          step,
          { opacity: 0.3 },
          { opacity: 1, ease: "power2.out", scrollTrigger },
        );

        if (heading) {
          gsap.fromTo(
            heading,
            { color: "#000000" },
            { color: KYNTRA_PRIMARY, ease: "none", scrollTrigger },
          );
        }
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      id="how-it-works"
      ref={sectionRef}
      className="kyntra-container relative w-full bg-white text-black"
    >
    
      <div className="mx-auto flex max-w-400 flex-col gap-[2vw] max-[1025px]:gap-[8vw] text-center">
        <ParaAnim
          as="h2"
          className="font-helvetica-neue leading-[1.15] font-normal tracking-[-0.02em] max-[1025px]:text-[6vw] max-md:text-[8vw]"
        >
          How Kyntra Works
        </ParaAnim>

        <ParaAnim
          as="p"
          className="text-24 mx-auto tracking-wide w-[60vw] leading-[1.6] text-black max-[1025px]:max-w-full  max-[1025px]:w-full"
        >
          Kyntra Makes It Simple To Get Any Home Service Done In Just A Few
          Steps. First, You Tell Us What You Need By Choosing A Service Or
          Describing The Issue You&apos;re Facing At Home.
        </ParaAnim>
      </div>

      <div className="relative mx-auto mt-[5vw] max-[1025px]:mt-[5vh] flex w-full flex-col items-center">
        {STEPS.map((step, index) => (
          <div key={step.title} className="flex mb-[2vw] w-full flex-col items-center">
            <TimelineConnector
              addLineRef={(el) => { lineRefs.current[index] = el; }}
              addDotRef={(el) => { dotRefs.current[index] = el; }}
            />

            <div
              ref={(el) => {
                if (el) stepRefs.current[index] = el;
              }}
              className="mt-[2vw] mb-[1vw] max-[1025px]:mt-[6vw] max-[1025px]:mb-[4vw] space-y-[1vw] text-center max-[1025px]:space-y-[1vh]"
            >
              <h3 className="step-title font-helvetica-neue text-[1.65vw] font-normal max-md:text-[6vw]">
                {step.title}
              </h3>
              <p className="text-22 text-[#333333] ">
                {step.description}
              </p>
            </div>
          </div>
        ))}
      </div>

      <FadeUp className="mt-[4vw] flex justify-center">
        <CharStaggerPrimaryButton
          text="Book Your First Service"
          href="#"
          onClick={(event) => {
            event.preventDefault();
            setEnquiryUsed(true);
            setEnquiryOpen(true);
          }}
          hoverColor="#ffffff"
          showArrow
          className="rounded-full px-[2.5vw] py-[1vw] text-white max-md:px-[6vw] max-md:py-[3vw]"
          textClassName="font-aeonik-pro text-22 tracking-tight max-md:text-[3.5vw]"
          iconClassName="text-white"
          style={{ backgroundColor: KYNTRA_PRIMARY }}
        />
      </FadeUp>

      {enquiryUsed && (
        <EnquiryModal open={enquiryOpen} onClose={() => setEnquiryOpen(false)} />
      )}
    </section>
  );
}

function TimelineConnector({
  addLineRef,
  addDotRef,
}: {
  addLineRef: (el: SVGLineElement | null) => void;
  addDotRef: (el: SVGCircleElement | null) => void;
}) {
  return (
    <svg width="20" height={LINE_HEIGHT} className="overflow-visible">
      <line
        x1="10"
        y1="0"
        x2="10"
        y2={LINE_HEIGHT}
        stroke="#D1D5DB"
        strokeWidth="1"
      />
      {/* Progress fill, drawn on scroll */}
      <line
        ref={addLineRef}
        x1="10"
        y1="0"
        x2="10"
        y2={LINE_HEIGHT}
        stroke={KYNTRA_PRIMARY}
        strokeWidth="1"
      />
      {/* Dot travels down the line */}
      <circle
        ref={addDotRef}
        cx="10"
        cy="0"
        r="6"
        fill="#f8f8f8"
        stroke={KYNTRA_PRIMARY}
        strokeWidth="1"
      />
    </svg>
  );
}
