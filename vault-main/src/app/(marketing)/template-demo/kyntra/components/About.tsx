// Built using Hyperiux Vault: https://vault.hyperiux.com

"use client";

import { useRef } from "react";
import Image from "next/image";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import aboutPhone1 from "../assets/about01.webp";
import aboutPhone2 from "../assets/about02.webp";
import aboutPhone3 from "../assets/about03.webp";
import aboutLine from "../assets/about-line.svg";

import { ParaAnim } from "./Animations/gsapAnim";
import { prefersReducedMotion } from "./Animations/reducedMotion";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const About = () => {
  const clusterRef = useRef<HTMLDivElement>(null);
  const midRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const leftRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<HTMLImageElement>(null);

  useGSAP(() => {
    const cluster = clusterRef.current;
    const phones = [midRef.current, rightRef.current, leftRef.current];
    if (!cluster || phones.some((el) => !el)) return;

    
    if (prefersReducedMotion()) {
      gsap.set([...phones, lineRef.current], { opacity: 1 });
      return;
    }

    gsap.set(phones, { opacity: 1 });

   
    const mm = gsap.matchMedia();

    mm.add("(min-width: 1026px)", () => {

      // Waits out the phone stagger
      if (lineRef.current) {
        gsap.to(lineRef.current, {
          scrollTrigger: {
            trigger: cluster,
            start: "top 65%",
            once: true,
          },
          opacity: 1,
          duration: 0.8,
         
          ease: "power2.out",
        });
      }
    });

    mm.add("(max-width: 1025px)", () => {
      phones.forEach((phone) => {
        gsap.from(phone, {
          scrollTrigger: {
            trigger: phone as HTMLDivElement,
            start: "top 85%",
            once: true,
          },
          opacity: 0,
          duration: 0.8,
          ease: "power2.out",
        });
      });
    });

    // Desktop only: drift reads as depth
    mm.add("(min-width: 1026px)", () => {
      const parallax = gsap.timeline({
        scrollTrigger: {
          trigger: '#kyntra-about',
          start: "30% bottom",
          end: "bottom top",
          scrub: 0.5,
        },
      });

      parallax
        .fromTo([leftRef.current, rightRef.current], { y: -72 }, { y: 72 }, 0)
        .fromTo(midRef.current, { y: 72 }, { y: -72 }, 0);
    });

    return () => mm.revert();
  }, []);

  return (
    <section id='kyntra-about' className="kyntra-container  relative w-full h-full overflow-hidden bg-white text-black">
      <div className="mx-auto flex max-w-400 py-[4vh] items-start justify-between gap-[6vw] max-[1025px]:flex-col max-[1025px]:gap-[6vw]">
        <ParaAnim
          as="h2"
          className="font-helvetica-neue w-[35vw] max-[1025px]:w-full leading-[1.15] font-normal tracking-[-0.02em] "
        >
          Everything You Need For a Better Home &amp; Lifestyle
        </ParaAnim>

        <ParaAnim
          as="p"
          className="text-24 w-[33vw] max-[1025px]:w-full leading-[1.6] tracking-wide text-black/80 text-right max-[1025px]:text-left"
        >
          Kyntra gives every home a memory keeping repairs, warranties, maintenance and service history connected, so each future decision starts with context instead of from scratch.
        </ParaAnim>
      </div>

      <div
        ref={clusterRef}
        className="relative mx-auto mt-[10vw] flex max-w-400 items-start justify-center gap-[3vw] max-[1025px]:mt-[10vw] max-[1025px]:flex-col max-[1025px]:items-center max-[1025px]:gap-[8vw]"
      >
      
        <Image
          ref={lineRef}
          src={aboutLine}
          alt=""
          aria-hidden
          className="pointer-events-none absolute top-[70%] left-1/2 w-screen max-w-none -translate-x-1/2 -translate-y-1/2 opacity-0 select-none max-[1025px]:hidden"
        />

        <div
          ref={leftRef}
          className="relative w-[22vw] opacity-0 max-[1025px]:w-[90%]"
        >
          <Image
            src={aboutPhone1}
            alt="Kyntra room control screen"
            className="h-auto w-full object-contain"
          />
        </div>

        <div
          ref={midRef}
          className="z-10 w-[22vw] opacity-0 max-[1025px]:w-[90%]"
        >
          <Image
            src={aboutPhone2}
            alt="Kyntra app - everything your home needs, one app"
            className="h-auto w-full object-contain"
          />
        </div>

        <div
          ref={rightRef}
          className="relative w-[22vw] opacity-0 max-[1025px]:w-[90%]"
        >
          <Image
            src={aboutPhone3}
            alt="Kyntra device search screen"
            className="h-auto w-full object-contain"
          />
        </div>
      </div>
    </section>
  );
};

export default About;
