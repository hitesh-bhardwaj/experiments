"use client";

import React, { useRef } from "react";
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

export default function CurvedGradient() {
  const wrapperRef = useRef(null);
  const sectionRef = useRef(null);
  const firstRef = useRef(null);
  const secondRef = useRef(null);

  useGSAP(
    () => {
      const first = firstRef.current;
      const second = secondRef.current;
      const wrapper = wrapperRef.current;
      if (!first || !second || !wrapper) return;

      let split1;
      let split2;

      // ponytail: same fix as RandomBlur/SplitLine - SplitText.create() is a
      // forced-layout DOM mutation; this section is well below the fold, so
      // defer the split until it's nearly on screen instead of on mount.
      const mount = () => {
        split1 = SplitText.create(first, {
          type: "lines",
          linesClass: "split-line",
        });
        split2 = SplitText.create(second, {
          type: "lines",
          linesClass: "split-line",
        });

        gsap.set(split1.lines, { yPercent: 100, opacity: 0 });
        gsap.set(split2.lines, { yPercent: 100, opacity: 0 });

        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: wrapper,
            start: "10% 60%",
            end: "55% 20%",
            scrub: true,
            // markers:true
          },
        });

        // First heading in, then out - then the second takes the same beat.
        tl.to(split1.lines, {
          yPercent: 0,
          opacity: 1,
          ease: "power2.out",
          stagger: 0.08,
        })
          .to(
            split1.lines,
            {
              yPercent: -100,
              opacity: 0,
              ease: "power2.in",
              stagger: 0.08,
            },
            "<.5"
          )
          .to(split2.lines, {
            yPercent: 0,
            opacity: 1,
            ease: "power2.out",
            stagger: 0.08,
          })
          .to(
            split2.lines,
            {
              yPercent: -100,
              opacity: 0,
              ease: "power2.in",
              stagger: 0.08,
            },
            "<.5"
          );

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
        split1?.revert();
        split2?.revert();
      };
    },
    { scope: wrapperRef },
  );

  return (
    <div ref={wrapperRef} className="relative z-200 h-[240vh]">
      <section
        ref={sectionRef}
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
        <h2 ref={firstRef} id="curved-gradient-heading" className={headingClass}>
          What makes an interface memorable is what happens when someone touches it: how a section enters, how a cursor reacts, how a page changes, and how a moment resolves.
        </h2>
        <h2
          ref={secondRef}
          id="curved-gradient-heading-2"
          className={headingClass}
        >
          Most component libraries and page builders stop at the static interface. Interaction is  the layer they never touch.
        </h2>
      </section>
    </div>
  );
}
