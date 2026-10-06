// Built using Hyperiux Vault: https://vault.hyperiux.com

"use client";

import Image from "next/image";
import React, { useEffect, useRef } from "react";
import gsap from "gsap";
import ScrollTrigger from "gsap/dist/ScrollTrigger";
import { useLenis } from "lenis/react";
import PrimaryButton from "./PrimaryButton";
import BlackButton from "./BlackButton";
import { useEnquiryModal } from "./EnquiryModal";
import NumberCounter from "./effects/number-counter";
import heroBackground from "./assets/hero.webp";
import arrowDownIcon from "./assets/icons/arrow-down.svg";
import { FadeUp } from "./gsapAnimations";
import MaskTextReveal from "./effects/mask-text-reveal";
import { prefersReducedMotion } from "./reducedMotion";

gsap.registerPlugin(ScrollTrigger);

const heroStats = [
  { value: "4.2M+", suffix: "/AED", label: "Starting Price" },
  { value: "80+", label: "Stories" },
  { value: "1,000 FT+", label: "Sky Elevation" },
  { value: "Q4 2027", label: "Handover" },
];

const Hero: React.FC = () => {
  const heroImageWrapperRef = useRef<HTMLDivElement>(null);
  const lenis = useLenis();
  const { openEnquiryModal } = useEnquiryModal();

  useEffect(() => {
    const ctx = gsap.context(() => {
      if (prefersReducedMotion()) {
        gsap.set(".hero-fadeup, .linedraw", { clearProps: "opacity,transform" });
        if (heroImageWrapperRef.current) {
          gsap.set(heroImageWrapperRef.current, { yPercent: 0 });
        }
        return;
      }

      gsap.from(".hero-fadeup", {
        yPercent: 50,
        opacity: 0,
        duration: 1,
        stagger: 0.01,
        delay: 2.5,
      });
      gsap.from(".linedraw", {
        scrollTrigger: {
          trigger: ".linedraw",
          start: "top 95%",
        },
        scaleX: 0,
        transformOrigin: "left",
        duration: 1,
        yPercent: 100,
        ease: "power4.out",
        delay: 2.5,
      });

      if (heroImageWrapperRef.current) {
        gsap.fromTo(
          heroImageWrapperRef.current,
          { yPercent: 0 },
          {
            yPercent: 15,
            ease: "none",
            scrollTrigger: {
              trigger: heroImageWrapperRef.current,
              start: "top top",
              end: "bottom top",
              scrub: true,
            },
          }
        );
      }
    });
    return () => ctx.revert();
  }, []);


  const handleNavScroll = (event: React.MouseEvent<HTMLAnchorElement>, target: string) => {
    event.preventDefault();

    if (lenis) {
      lenis.scrollTo(target, { duration: 2 });
      return;
    }

    document.querySelector(target)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
      <section id="hero" className="relative overflow-hidden">
        <div className="relative isolate flex min-h-[200vh] w-screen flex-col gap-[5vw] px-[5%] py-[3%] max-[1025px]:min-h-[240vw] max-[1025px]:gap-[8vw] max-[1025px]:py-[7%]">
          {/* The largest thing painted above the fold, so it carries the LCP.
              An aria-hidden / alt="" image is never an LCP candidate, and the
              headings above are all inside SplitText wrappers, which are. */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden z-[-1]">
            <div ref={heroImageWrapperRef} className="relative h-full w-full">
              <Image
                quality={65}
                src={heroBackground}
                alt="Lumera Heights luxury residences in Dubai"
                fill
                sizes="(max-width: 1025px) 100vw, 1920px"
                loading="eager"
                fetchPriority="high"
                className="h-full w-full object-cover object-top"
              />
            </div>
          </div>

          <div className="relative z-10 flex h-screen flex-col justify-end gap-[8vw] max-[1025px]:gap-[12vw]">
            <div className="flex flex-col gap-[3vw] max-[1025px]:gap-[6vw] mb-30">
              <MaskTextReveal delay={2} eager>
                <h1 className="font-neue-montreal font-medium! flex flex-col gap-[1vw] text-[10vw] leading-[0.94]   uppercase text-[#EEEEEE] max-[1025px]:gap-[4vw] max-md:text-[12vw] max-[1025px]:text-[10vw]">
                  <span>Exceptional</span>
                  <div className="flex items-end gap-[1.8vw] max-[1025px]:flex-col max-[1025px]:items-start max-[1025px]:gap-[4vw]">
                    <span>Living In Dubai</span>
                    <FadeUp
                      as="a"
                      aria-label="Scroll to about section"
                      href="#about"
                      onClick={(event) => handleNavScroll(event, "#about")}
                      className="group relative flex h-[6.5vw] w-[6.5vw] items-center justify-center self-center overflow-hidden rounded-full border-4 border-white text-white opacity-100 transition-colors  max-[1025px]:h-[18vw] max-[1025px]:w-[18vw] max-[1025px]:self-start"
                    >
                      <Image
                        src={arrowDownIcon}
                        alt=""
                        className="absolute h-[2.3vw] w-auto object-contain transition-transform duration-500 ease-in-out group-hover:translate-y-[180%] max-[1025px]:h-[7vw]"
                      />
                      <Image
                        src={arrowDownIcon}
                        alt=""
                        className="absolute h-[2.3vw] w-auto translate-y-[-180%] object-contain transition-transform duration-500 ease-in-out group-hover:translate-y-0 max-[1025px]:h-[7vw]"
                      />
                    </FadeUp>
                  </div>
                </h1>
              </MaskTextReveal>
            </div>
          </div>

          <div className="relative z-10 flex min-h-screen pb-20 flex-col justify-between gap-[8vw] max-[1025px]:min-h-[110vw] max-[1025px]:gap-[10vw]">
            <div className="flex flex-col gap-[4vw] max-[1025px]:gap-[8vw]">
              <div className="w-[38vw] text-white max-[1025px]:w-full">
                <MaskTextReveal>
                  <p className="text-[1.45vw] max-[1025px]:text-[3vw] max-md:leading-[1.4] max-md:text-[5vw]  leading-[1.65] text-[#EEEEEE] ">
                    A curated collection of remarkable residences across Dubai&apos;s most sought-after addresses, selected for their design, location and way of life.
                  </p>
                </MaskTextReveal>
              </div>

              <div className="flex items-center gap-[1vw] max-md:flex-col max-md:items-start max-md:gap-[4vw] max-md:w-[80%] max-[1025px]:flex-wrap max-[1025px]:gap-[3vw]">
                <FadeUp delay={0.7}>
                  <PrimaryButton
                    link="#works"
                    btnText="Explore Our Collection"
                    onClick={(event) => handleNavScroll(event, "#works")}
                    className="max-md:w-[70vw] "
                  />
                </FadeUp>
                <FadeUp delay={0.7}>
                  <BlackButton
                    link="#"
                    btnText="Speak With an Advisor"
                    onClick={(event) => {
                      event.preventDefault();
                      openEnquiryModal();
                    }}
                    className="border max-md:w-[70vw] border-white shadow-2xl drop-shadow-2xl"
                  />
                </FadeUp>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-[5vw] self-stretch max-[1025px]:grid-cols-2 max-md:gap-[3vw] max-[1025px]:gap-[3vw]">
              {heroStats.map((stat) => (
                <FadeUp
                  key={stat.label}
                  className="rounded-[1.2vw] bg-white/5 px-[1.5vw] py-[2vw] max-md:py-[5vw] max-[1025px]:py-[4vw] font-neue-montreal text-center backdrop-blur-2xl max-[1025px]:rounded-[4vw] flex flex-col justify-between max-md:min-h-[12vh] min-h-[19vh] border border-[#F9F9F91A]"
                >
                  <p className="inline-flex items-end justify-center gap-[0.25vw] text-[2.9vw] font-medium leading-none text-white max-[1025px]:gap-[1vw] max-[1025px]:text-[6vw]">
                    <NumberCounter value={stat.value} />
                    {stat.suffix && (
                      <span className="mb-[0.15vw] text-[0.75vw] font-normal leading-none max-[1025px]:mb-[0.4vw] max-[1025px]:text-[2.5vw]">
                        {stat.suffix}
                      </span>
                    )}
                  </p>
                  <p className="text-[1.1vw] text-white max-[1025px]:text-[3vw]">
                    {stat.label}
                  </p>
                </FadeUp>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default Hero;
