"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import gsap from "gsap";
import ScrollTrigger from "gsap/dist/ScrollTrigger";
import portfolio1Img from "./assets/portfolio-img-1.webp";
import portfolio2Img from "./assets/portfolio-img-2.webp";
import portfolio3Img from "./assets/portfolio-img-3.webp";
import portfolio4Img from "./assets/portfolio-img-4.webp";
import OverflowTextReveal from "./effects/overflow-text-reveal";

gsap.registerPlugin(ScrollTrigger);

const PORTFOLIO_ITEMS = [
  {
    name: "Auré Studio",
    tags: ["Photography", "Art Direction"],
    imgSrc: portfolio1Img,
  },
  {
    name: "Veloce",
    tags: ["Automotive", "Brand Experience"],
    imgSrc: portfolio2Img,
  },
  {
    name: "Grain Studio",
    tags: ["Fashion", "Creative Direction"],
    imgSrc: portfolio3Img,
  },
  {
    name: "Aether",
    tags: ["Architecture", "Digital Identity"],
    imgSrc: portfolio4Img,
  },
];

const ROW_HEIGHT_VW = 7;


const Portfolio = () => {
  const dotRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const lineFillRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const curveRef = useRef<HTMLDivElement | null>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const prefersReducedMotionRef = useRef(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    prefersReducedMotionRef.current = mq.matches;
    const frameId = window.requestAnimationFrame(() =>
      setPrefersReducedMotion(mq.matches),
    );
    const onChange = (e: MediaQueryListEvent) => {
      prefersReducedMotionRef.current = e.matches;
      setPrefersReducedMotion(e.matches);
    };
    mq.addEventListener("change", onChange);
    return () => {
      window.cancelAnimationFrame(frameId);
      mq.removeEventListener("change", onChange);
    };
  }, []);

  useEffect(() => {
    const steps = PORTFOLIO_ITEMS.length - 1;

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: "#portfolio",
        start: "10% top",
        end: "bottom bottom",
        scrub: true,
        // Snaps scroll position to the nearest card/content step
        // whenever scrolling stops mid-transition - scoped entirely
        // to this trigger's own range (15% top -> bottom bottom,
        // i.e. while the sticky container above is pinned), since
        // GSAP only ever snaps within the trigger it's attached to.
        // Off under reduced motion, matching this file's existing
        // policy of skipping page-driven auto-motion for it.
        ...(prefersReducedMotionRef.current
          ? {}
          : {
              snap: {
                snapTo: 1 / steps,
                duration: { min: 0.2, max: 0.6 },
                ease: "power1.inOut",
              },
            }),
        // markers: true,
      },
    });

    gsap.set(lineFillRef.current, { scaleY: 0 });
    gsap.set(dotRefs.current[0], {
      backgroundColor: "#ffffff",
      borderColor: "#ffffff",
    });
    dotRefs.current.slice(1).forEach((dot) => {
      gsap.set(dot, {
        backgroundColor: "#F06A0E",
        borderColor: "rgba(255,255,255,0.5)",
      });
    });
    gsap.set(cardRefs.current, { filter: "brightness(1)" });
    if (prefersReducedMotionRef.current) {
      cardRefs.current.slice(1).forEach((card) => {
        gsap.set(card, { opacity: 0 });
      });
    } else {
      cardRefs.current.slice(1).forEach((card) => {
        gsap.set(card, { yPercent: 100 });
      });
    }

    tl.to(lineFillRef.current, { scaleY: 1, ease: "none", duration: steps }, 0);

    for (let i = 0; i < steps; i += 1) {
      if (prefersReducedMotionRef.current) {
        // Slide reads as vestibular-triggering motion under reduced
        // motion - the image just appears in place instead.
        tl.to(
          cardRefs.current[i + 1],
          { opacity: 1, ease: "none", duration: 1 },
          i,
        );
      } else {
        tl.to(
          cardRefs.current[i + 1],
          { yPercent: 0, ease: "power2.inOut", duration: 1 },
          i,
        );
      }
      tl.to(
        cardRefs.current[i],
        { filter: "brightness(0.3)", ease: "power2.inOut", duration: 1 },
        i,
      );
      tl.set(
        dotRefs.current[i + 1],
        { backgroundColor: "#ffffff", borderColor: "#ffffff" },
        i + 1,
      );
    }


    if (!prefersReducedMotionRef.current) {
      if(globalThis.innerWidth > 1024){
      gsap.to(".circle-clip", {
        yPercent: -70,
        ease:"none",
        scrollTrigger: {
          trigger: "#portfolio",
          start: "top bottom",
          end: "30% bottom",
          scrub: true,
          // markers:true,
        },
      });
    }
    else{
      gsap.to(".circle-clip", {
        yPercent: -50,
        ease:"none",
        scrollTrigger: {
          trigger: "#portfolio",
          start: "top bottom",
          end: "30% bottom",
          scrub: true,
          // markers:true,
        },
      });
    }
      

      gsap.set(curveRef.current, {
        clipPath: `ellipse(${150}% 100% at 50% 100%)`,
      });
      gsap.to(curveRef.current, {
        clipPath: `ellipse(${60}% 100% at 50% 100%)`,
        ease:"power2.out",
        scrollTrigger: {
          trigger: "#portfolio",
          start: "top bottom",
          end: "30% bottom",
          scrub: true,
        //   markers: true,
        },
      });
    }
   
  }, []);

  return (
    <section
      className={`relative w-screen h-[360vh] text-white ${prefersReducedMotion ? "pt-[8vw]" : "pt-[8vw] max-[1025px]:pt-[30vw]"}`}
      id="portfolio"
    >
      <div
        ref={curveRef}
        className="w-full h-[50vh]  absolute top-0 left-0 z-2 bg-linear-to-r from-[#F16B0D] to-[#E61416] circle-clip will-change-[clip-path]"
      />

      <div className="w-screen h-screen sticky top-0 z-3 flex flex-col items-center justify-center px-[4vw] gap-[5vw] overflow-hidden bg-linear-to-r from-[#F16B0D] to-[#E61416] max-md:gap-[15vw] max-[1025px]:gap-12 max-[1025px]:px-[5vw]">
        <OverflowTextReveal stagger={0.015}>
          <h2 className="text-[5.5vw] text-center max-[1025px]:text-[6.5vw] max-md:text-[9vw]">
            Award Winning Work
          </h2>
        </OverflowTextReveal>

        <div className="w-full flex items-center gap-[4vw] max-[1025px]:flex-col max-md:gap-[15vw] max-[1025px]:items-start max-[1025px]:gap-16">
          <div className="w-[32%] relative max-md:w-full max-[1025px]:w-[50%]">
            {/* top stays 3.5vw (= ROW_HEIGHT_VW / 2) at every breakpoint - it
                            only depends on the first row's own height, which never
                            changes. Height does need to vary per breakpoint though: it has
                            to span (row height + the gap between rows) * (item count - 1),
                            and the gap between rows below is now different per breakpoint
                            (0 desktop / 4vw tablet / 10vw mobile) - so the line's own
                            height must grow to match, or it falls short of the last dot.
                            Desktop: (7+0)*3=21vw. Tablet: (7+4)*3=33vw. Mobile: (7+10)*3=51vw.
                            These are hand-computed, not derived from ROW_HEIGHT_VW at
                            runtime, since Tailwind's arbitrary-value classes must be static
                            literal strings in source for its scanner to generate CSS for
                            them - update these by hand if ROW_HEIGHT_VW, item count, or the
                            row gaps below ever change. */}
            <div className="absolute left-1 bg-white/20 top-[2.5vw] max-[1025px]:top-[1vw] h-[21vw] max-[1025px]:h-[33vw] max-md:h-[62vw] w-px " />
            <div
              ref={lineFillRef}
              className="absolute left-1 bg-white origin-top top-[2.5vw] max-[1025px]:top-[1vw] h-[21vw] max-[1025px]:h-[33vw] max-md:h-[62vw] w-px "
            />

            <div className="flex flex-col max-[1025px]:gap-[4vw] max-md:gap-[14vw]">
              {PORTFOLIO_ITEMS.map((item, i) => (
                <div
                  key={item.name}
                  className="relative flex items-center gap-[1.2vw] max-md:gap-[5vw]"
                  style={{ height: `${ROW_HEIGHT_VW}vw` }}
                >
                  <span
                    ref={(el) => {
                      dotRefs.current[i] = el;
                    }}
                    className="w-[10px] h-[10px] mt-[-1.5vw] bg-[#F06A0E] rounded-full border shrink-0 max-md:mt-[-7vw] max-[1025px]:mt-[-4vw]"
                  />
                  <div>
                    <h3 className="text-[1.5vw] font-normal max-[1025px]:text-[3.5vw] max-md:text-[5.5vw]">
                      {item.name}
                    </h3>
                    <p className="text-[1vw] max-[1025px]:text-[2.5vw] max-md:text-[4.2vw]">
                      {item.tags.join("  •  ")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="w-full h-[38vw] relative rounded-xl overflow-hidden max-[1025px]:w-full max-[1025px]:h-[52vw] max-[1025px]:rounded-lg  ">
            {PORTFOLIO_ITEMS.map((item, i) => (
              <div
                key={item.name}
                ref={(el) => {
                  cardRefs.current[i] = el;
                }}
                className="absolute inset-0 bg-[#F4EFE9] flex items-center justify-center  rounded-xl overflow-hidden max-[1025px]:rounded-lg"
                style={{ zIndex: i + 1 }}
              >
                <Image
                  src={item.imgSrc}
                  alt="portfolio-img"
                  width={800}
                  height={400}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="absolute w-screen h-[60vh] bottom-[-10%] left-0 overflow-hidden max-[1025px]:bottom-[-13%]">
        <div className="w-[115%] h-[40vh]  absolute bottom-[35%] left-[-7.5%] z-2 bg-linear-to-r from-[#F16B0D] to-[#E61416] blur-2xl max-[1025px]:bottom-[50%] max-[1025px]:w-[120%] max-[1025px]:left-[-10%] max-[1025px]:blur-lg" />
      </div>
    </section>
  );
};

export default Portfolio;
