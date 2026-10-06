// Built using Hyperiux Vault: https://vault.hyperiux.com

"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import gsap from "gsap";
import ScrollTrigger from "gsap/dist/ScrollTrigger";
import { FooterParallax, FOOTER_RESIZE_EVENT } from "./ParallaxFooter";
import CharStaggerButton from "../char-stagger-button";
import { AppleStoreButton, PlayStoreButton } from "../../Buttons";
import { FadeUp } from "../../Animations/gsapAnim";
import footerImg from "../../../assets/footer.webp";
import klogo from '../../../assets/icons/kyntra-logo.svg';

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const KYNTRA_PRIMARY = "#134BD6";

const FOOTER_BUTTON_TEXT = "#1A1A1A";
// Store buttons sit smaller here than in the hero
const FOOTER_BUTTON_SCALE = 0.8;

const FOOTER_TRIGGER = "#footer";

const FOOTER_DELAY = 0.5;

const serviceLinks = [
  "Plumbing",
  "Electrical",
  "Cleaning",
  "AC Repair",
  "Painting",
];

const connectLinks = [
  "Linkedin",
  "Twitter",
  "Instagram",
  "Facebook",
  "Youtube",
];

const ParallaxFooter = ({ footerBgColor = KYNTRA_PRIMARY }) => {
  const footerImgRef = useRef<HTMLImageElement | null>(null);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  useEffect(() => {
    if (typeof window === "undefined") return;

    const el = footerImgRef.current;
    if (!el) return;

    const trigger = document.querySelector(FOOTER_TRIGGER);
    if (!trigger) return;

    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();

     
      mm.add(
        "(min-width: 1026px) and (prefers-reduced-motion: no-preference)",
        () => {
          gsap.fromTo(
            el,
            { yPercent: 100 },
            {
              yPercent: 0,
              ease: "none",
              scrollTrigger: {
                trigger,
                 start: "top 80%",
                end: "top 12%",
                scrub: 0.2,
                invalidateOnRefresh: true,
                // markers: true,
              },
            },
          );
        },
      );

      // Reduced motion: phone starts placed
      mm.add(
        "(min-width: 1026px) and (prefers-reduced-motion: reduce)",
        () => {
          gsap.set(el, { yPercent: 0, clearProps: "transform" });
        },
      );

      mm.add("(max-width: 1025px)", () => {
        gsap.set(el, { yPercent: 0, clearProps: "transform" });
      });
    });


    let frameId = 0;
    const refresh = () => {
      cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(() => ScrollTrigger.refresh());
    };

    window.addEventListener(FOOTER_RESIZE_EVENT, refresh);
    window.addEventListener("load", refresh);

    if (!el.complete) {
      el.addEventListener("load", refresh);
      el.addEventListener("error", refresh);
    }

    refresh();

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener(FOOTER_RESIZE_EVENT, refresh);
      window.removeEventListener("load", refresh);
      el.removeEventListener("load", refresh);
      el.removeEventListener("error", refresh);
      ctx.revert();
    };
  }, []);

  return (
    <FooterParallax
      footerClassName="text-white"
      footerStyle={{ backgroundColor: footerBgColor }}
    >
      <div className="relative flex h-[80vh] w-full flex-col justify-between px-[5%] pt-[6vw] pb-[2vw] max-[1025px]:h-auto max-[1025px]:px-[7%] max-[1025px]:pt-[12vw] max-[1025px]:pb-0 max-md:pt-[16vw]">
       
        <div className="pointer-events-none absolute bottom-0 left-1/2 w-[22vw] -translate-x-1/2 max-[1025px]:static max-[1025px]:left-auto max-[1025px]:order-3 max-[1025px]:mt-[12vw] max-[1025px]:mb-0 max-[1025px]:w-[55vw] max-[1025px]:translate-x-0 max-[1025px]:self-center max-md:w-[72vw]">
          <Image
            ref={footerImgRef}
            src={footerImg}
            height={900}
            width={900}
            alt="Kyntra app"
            className="h-auto w-full object-contain"
          />
        </div>

        {/* Brand and link columns */}
        <div className="relative flex justify-between gap-[4vw] max-[1025px]:order-1 max-[1025px]:flex-col max-[1025px]:gap-[12vw]">
          {/* Brand column */}
          <div className="flex w-[34vw] flex-col max-[1025px]:w-full">
            <FadeUp
              watch={FOOTER_TRIGGER}
              delay={FOOTER_DELAY}
              className="w-[20vw] max-[1025px]:w-[42vw] max-md:w-[50vw]"
            >
              <Image
                src={klogo}
                width={900}
                height={900}
                alt="Kyntra"
                className="h-auto w-full object-contain brightness-0 invert"
              />
            </FadeUp>

            <FadeUp
              as="p"
              watch={FOOTER_TRIGGER}
              delay={FOOTER_DELAY + 0.08}
              className="text-24 mt-[2vw] w-[24vw] leading-normal text-white/90 max-[1025px]:mt-[4vw] max-[1025px]:w-[60vw] max-[1025px]:text-[2.8vw] max-md:w-[70%] max-md:text-[4vw]"
            >
              Home intelligence, maintenance and trusted services managed from
              one app.
            </FadeUp>

            <FadeUp
              watch={FOOTER_TRIGGER}
              delay={FOOTER_DELAY + 0.16}
              className="mt-[2.5vw] flex gap-[5vw] max-[1025px]:mt-[8vw] max-[1025px]:flex-col max-[1025px]:items-start max-[1025px]:gap-[3.5vw] max-md:gap-[4vw]"
            >
              {/* Same components as the hero */}
              <AppleStoreButton
                href="#"
                scale={FOOTER_BUTTON_SCALE}
             
                className="min-[1026px]:w-[14vw] min-[1026px]:px-[1.2vw] min-[1026px]:py-[0.6vw]"
                style={{
                  backgroundColor: "#ffffff",
                  borderColor: "#ffffff",
                  color: FOOTER_BUTTON_TEXT,
                }}
              />
              <PlayStoreButton href="#" scale={FOOTER_BUTTON_SCALE} />
            </FadeUp>
          </div>

          {/* Link columns */}
          <div className="flex gap-[7vw] max-[1025px]:flex max-[1025px]:justify-between  max-[1025px]:w-full max-[1025px]:grid-cols-2 max-[1025px]:gap-x-[4vw] max-[1025px]:gap-y-0">
            <FooterLinkColumn title="Services" links={serviceLinks} />
            <FooterLinkColumn title="Connect" links={connectLinks} />
          </div>
        </div>

        {/* Bottom bar */}
        <div className="relative flex items-end justify-between max-[1025px]:order-2 max-[1025px]:mt-[14vw] max-[1025px]:items-start">
          <FadeUp
            as="p"
            watch={FOOTER_TRIGGER}
            delay={FOOTER_DELAY + 0.3}
            className="text-22 text-white/90 max-[1025px]:text-[2.8vw] max-md:text-[4vw]"
          >
            <Link
              href="https://vault.hyperiux.com/"
              target="_blank"
              rel="noopener noreferrer"
            >
              &copy;
            </Link>{" "}
            2026 KYNTRA.{" "}
            {/* Wraps to a second line */}
            <span className="hidden max-[1025px]:block">
              All Rights Reserved.
            </span>
            <span className="max-[1025px]:hidden">All Rights Reserved.</span>
          </FadeUp>

          <FadeUp watch={FOOTER_TRIGGER} delay={FOOTER_DELAY + 0.36}>
            <CharStaggerButton
              text="Back To Top"
              href="#"
              showLine
              lineSpansArrow
              showArrow
              icon={ArrowUp}
              iconVariant="single"
              hoverColor="white"
              onClick={(event) => {
                event.preventDefault();
                scrollToTop();
              }}
              className="text-white"
              textClassName="font-aeonik-pro text-22 tracking-tight max-[1025px]:text-[2.6vw] max-md:text-[3.6vw]"
              iconClassName="text-white max-md:hidden"
            />
          </FadeUp>
        </div>
      </div>
    </FooterParallax>
  );
};

const FooterLinkColumn = ({
  title,
  links,
}: {
  title: string;
  links: string[];
}) => (
  <div className="flex flex-col">
    <FadeUp
      as="span"
      watch={FOOTER_TRIGGER}
      delay={FOOTER_DELAY}
      className="text-22 tracking-wide text-white max-[1025px]:text-[2.8vw] max-md:text-[5vw]!"
    >
      {title.toUpperCase()}
    </FadeUp>

    <div className="mt-[1.4vw] flex flex-col gap-[0.3vw] max-[1025px]:mt-[4vw] max-[1025px]:gap-[2.5vw]">
      {links.map((label, index) => (
        <FadeUp
          key={label}
          watch={FOOTER_TRIGGER}
          delay={FOOTER_DELAY + 0.08 + index * 0.06}
        >
          <CharStaggerButton
            text={label}
            href="#"
            hoverColor="white"
            className="text-white"
            textClassName="font-aeonik-pro text-22 tracking-wide max-[1025px]:text-[2.8vw] max-md:text-[4vw]"
          />
        </FadeUp>
      ))}
    </div>
  </div>
);

function ArrowUp({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 19V5M5 12l7-7 7 7" />
    </svg>
  );
}

export default ParallaxFooter;
