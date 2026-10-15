// Built using Hyperiux Vault: https://vault.hyperiux.com

'use client'
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { motion } from "motion/react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { AppleStoreButton, PlayStoreButton } from "./Buttons";
import dynamic from "next/dynamic";


const Gradient = dynamic(() => import("./shader/gradient"), { ssr: false });
import phoneMockup from "../assets/kyntra-hero-mockup.webp";
import kyntraHero from "../assets/kyntra-hero.webp";

import { FadeUp, ParaAnim } from "./Animations/gsapAnim";
import { useReducedMotionSync } from "./Animations/reducedMotion";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const Hero = () => {
  const heroRef = useRef<HTMLElement | null>(null);
  const phoneScrollRef = useRef<HTMLDivElement | null>(null);

  // Synchronous: `initial` is read once, so it must be right on first render
  const reduced = useReducedMotionSync();

  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1026px)");
    const sync = () => setIsDesktop(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useGSAP(
    () => {
      const phone = phoneScrollRef.current;
      if (!phone) return;

      // Desktop only: would overlap copy. Reduced motion drops the scrub
      const mm = gsap.matchMedia();

      mm.add(
        "(min-width: 1026px) and (prefers-reduced-motion: no-preference)",
        () => {
          gsap.to(phone, {
            yPercent: 15,
            ease: "none",
            scrollTrigger: {
              trigger: heroRef.current,
              start: "top top",
              end: "bottom top",
              scrub: 0.2,
            },
          });
        },
      );
    },
    { scope: heroRef },
  );

  return (
    <section
      ref={heroRef}
      className="kyntra-hero relative min-h-screen h-full w-full  bg-white"
    >
      {/* Un-nested: the watermark must not sit under an opacity-0 ancestor,
          or it is disqualified as an LCP candidate */}
      <div className="pointer-events-none absolute inset-0">
        <motion.div
          aria-hidden
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
          style={{ willChange: "opacity" }}
          className="absolute inset-x-0 top-0 h-[115vh] max-lg:h-[105vh]"
        >
          {isDesktop ? (
            <Gradient />
          ) : (
          
            <div
              className="absolute inset-0 bg-[linear-gradient(180deg,#000000_0%,#000000_20%,#0A1633_34%,#16295F_48%,#26429C_60%,#3E63D0_70%,#6E8FE2_82%,#B9CCF4_92%,#ffffff_100%)]"
            />
          )}
        </motion.div>

        {/* Oversized KYNTRA watermark - the LCP element, so it carries a real
            alt and is never gated behind an animation */}
        <Image
          src={kyntraHero}
          alt="Kyntra"
          loading="eager"
          fetchPriority="high"
          className="absolute left-1/2 top-[24vh] max-lg:top-[12vh] w-[92vw] max-w-400 -translate-x-1/2 select-none"
        />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen max-w-400 items-center gap-[10vw] px-[5vw] pb-[8vh] pt-[40vh] max-lg:flex-col-reverse max-lg:items-start max-lg:justify-end max-lg:gap-[8vw] max-lg:px-[7vw] max-lg:pb-0 max-lg:pt-[20vh] max-md:gap-[10vw]">
        {/* Phone mockup */}
        <div className="flex w-[33%] shrink-0 justify-center  max-lg:w-full max-md:w-full">
          <motion.div
            initial={{ opacity: 0, y: reduced ? 0 : "110%" }}
            animate={{ opacity: 1, y: 0 }}
            transition={
              reduced
                ? { duration: 0.4, ease: "linear" }
                : { duration: 1.3, ease: [0.16, 1, 0.3, 1] }
            }
            className="ml-20 h-auto w-[25vw] will-change-transform max-lg:ml-0 max-lg:w-[62vw] max-md:w-[80vw]"
          >
            <div ref={phoneScrollRef} className="will-change-transform">
              <Image
                src={phoneMockup}
                alt="Kyntra app manage every room and service from one home dashboard"
                className="h-auto w-full object-contain"
                loading="eager"
                fetchPriority="high"
              />
            </div>
          </motion.div>
        </div>

       
        <div className="flex w-[60%] flex-col gap-[3vw] pt-[30vh] max-lg:w-full max-lg:gap-[6vw] max-lg:pt-0 max-lg:text-left max-md:gap-[7vw]">
          <ParaAnim
            as="h1"
            delay={0.5}
            className="font-helvetica-neue max-lg:leading-[1.8] text-black max-lg:mx-0 max-lg:text-white max-md:max-w-none"
          >
            One App to
            <br />
            Manage Your
          
            Home
          </ParaAnim>

          <ParaAnim
            as="p"
            className="w-[24vw] text-22 leading-[1.6] max-lg:leading-[1.9] tracking-wide text-black max-lg:mx-0 max-lg:w-full max-lg:max-w-[78%] max-lg:text-white max-md:max-w-none"
          >
            Kyntra Remembers Your Home, Tracks What Needs Attention, And Gets
            Trusted Help When Something Needs Doing.
          </ParaAnim>

          <div className="space-y-[1.2vw] mt-[-2vh] max-lg:w-full max-lg:space-y-[4vw] max-md:space-y-[5vw]">
            <div className=" flex flex-wrap items-center gap-[1.2vw] max-lg:w-full  max-lg:flex-col max-lg:items-stretch max-lg:justify-start max-lg:gap-[3vw] max-md:gap-[4vw]">
              <FadeUp delay={0.1} className="max-lg:w-[75vw]">
                <AppleStoreButton href="#app-store" />
              </FadeUp>
              <FadeUp delay={0.2} className="max-lg:w-[75vw]">
                <PlayStoreButton href="#google-play" />
              </FadeUp>
            </div>

            <FadeUp
              delay={0.3}
              className="flex items-center gap-[0.5vw] text-20 text-black max-lg:justify-start max-lg:gap-[1.2vw] max-lg:text-white max-md:gap-[1.5vw]"
            >
              <span className="text-[#12D415] font-medium">4.9 ★ </span>
              <span className="text-20">
                From{" "}
                <span className="font-medium text-black max-lg:text-white">
                  8,400+
                </span>{" "}
                Households Across The UAE
              </span>
            </FadeUp>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
