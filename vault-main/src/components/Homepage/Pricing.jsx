"use client";

import React, { useState, useEffect, useRef, memo } from "react";
import gsap from "gsap";
import { CheckIcon } from "../../utils/Icons";
import Button from "../WebsiteComps/Button";
import SplitLine from "./SplitLine";
import Scrolltrigger from "gsap/dist/ScrollTrigger";
import ShimmerText from "../WebsiteComps/ShimmerText";
import LineReveal from "../Animations/LineReveal";
import SplitLineNoMask from "./SplitLineNoMask";
gsap.registerPlugin(Scrolltrigger);

const DIGITS = [...Array(10).keys()];

const PriceDigit = memo(({ digit, visible = true }) => {
  const containerRef = useRef(null);
  const hasMounted = useRef(false);

  useEffect(() => {
    if (!containerRef.current) return;
    const target = `-${parseInt(digit, 10) * 10}%`;
    if (!hasMounted.current) {
      gsap.set(containerRef.current, { y: target });
      hasMounted.current = true;
    } else {
      gsap.to(containerRef.current, {
        y: target,
        duration: 0.55,
        ease: "power3.out",
      });
    }
  }, [digit]);

  return (
    <span
      className="overflow-hidden h-[1em] leading-none inline-block relative transition-all duration-300 [--pd-w:0.64em] max-md:[--pd-w:0.64em]"
      style={{ width: visible ? "var(--pd-w)" : "0", opacity: visible ? 1 : 0 }}
    >
      <span ref={containerRef} className="flex flex-col will-change-transform">
        {DIGITS.map((d) => (
          <span
            key={d}
            className="flex h-[1em] items-center justify-center leading-none"
          >
            {d}
          </span>
        ))}
      </span>
    </span>
  );
});

PriceDigit.displayName = "PriceDigit";

const freeFeatures = [
  "30+ production-ready effects",
  "Copy-paste + CLI install",
  "Commercial-friendly usage",
  "Code you own",
];
const ProFeatures = [
  "All 150+ effects",
  "New effects added regularly.",
  "Priority access to upcoming packs",
  "Hyperiux CLI install + auth",
  "Dependency, performance & reduced-motion notes per effect",
  "Code you own, commercial-friendly",
];

export default function Pricing({ padding, content = true }) {
  const [isYearly, setIsYearly] = useState(true);

  useEffect(() => {
    if (globalThis.innerWidth < 542) {
      gsap.to(".pricing", {
        opacity: 1,
        pointerEvents: "auto",
        scrollTrigger: {
          trigger: ".pricing",
          start: "30% top",
          end: "30% top",
          scrub: true,
          //   markers:true
        },
      });
    }
    if (globalThis.innerWidth >= 542 && globalThis.innerWidth < 1025) {
      gsap.to(".pricing", {
        opacity: 1,
        pointerEvents: "auto",
        scrollTrigger: {
          trigger: ".pricing",
          start: "20% top",
          end: "20% top",
          scrub: true,
          // markers: true
        },
      });
    }

    if (globalThis.innerWidth >= 1025) {
      gsap.to(".pricing", {
        opacity: 1,
        pointerEvents: "auto",
        scrollTrigger: {
          trigger: ".pricing",
          start: "5% top",
          end: "5% top",
          scrub: true,
          //   markers:true
        },
      });
    }
    gsap.fromTo(
      ".fadeup-cards",
      {
        y: 20,
        opacity: 0,
      },
      {
        opacity: 1,
        y: 0,
        duration: 0.8,
        scrollTrigger: {
          trigger: "#pricing-cards",
          start: "top 80%",
          end: "top 80%",
          //   scrub:true,
          //   markers:true
        },
      },
    );
  }, []);

  return (
    <div
      className={`h-[190vw] flex items-end text-background pricing pb-[20vw]! min-h-screen  bg-foreground self-padd  w-full mt-[-100vh] max-lg:mt-[-110vh] max-md:mt-[-100vh] relative z-2 opacity-0 pointer-events-none max-md:h-[920vw] max-lg:h-[550vw]`}
    >
      <div className=" w-full h-fit overflow-hidden flex flex-col gap-[6vw]  max-md:gap-[10vw] items-center justify-center ">
        {content && (
          <div className=" text-center space-y-[4vw] max-md:space-y-[6vw]">
            <LineReveal
              as="h2"
              className="text110 w-full"
            >
              Start Free Today.<br /> Upgrade to Pro for Complete Access.
            </LineReveal>
            <SplitLine
              start="top 60%"
              as="p"
              className="text24 w-[50vw] max-lg:w-[70vw] max-md:w-[85vw] mx-auto"
            >
              Free Core is open today with 30+ source-first effects. Vault Pro
              is available now, unlocking 80+ premium effects across scroll
              systems, cursor effects, text reveals, page transitions, loaders,
              backgrounds, and WebGL scenes.
            </SplitLine>
          </div>
        )}
        <div
          id="pricing-cards"
          className="h-[55vw] max-lg:h-fit max-lg:flex-col-reverse max-lg:gap-[8vw] relative w-full flex gap-[1.5vw] max-md:gap-[15vw] fadeup-cards "
        >
          {/* TOGGLE for mobile */}

          <div className="h-fit max-lg:flex hidden order-last max-md:relative max-md:right-0 max-lg:justify-end right-0   items-center text24 text-background max-lg:top-10 max-md:top-10 top-[-2.8vw]  gap-[1vw] max-md:gap-[4vw] z-0">
            <p
              className={`cursor-pointer font-heading font-medium max-md:font-medium transition-opacity duration-300`}
              onClick={() => setIsYearly(false)}
            >
              Monthly
            </p>
            <button
              onClick={() => setIsYearly(!isYearly)}
              className="p-[.2vw] max-lg:p-[1vw] bg-primary relative flex items-center w-[3.5vw] max-lg:w-[14vw] h-[1.8vw] max-lg:h-[7vw] transition-colors duration-300"
              aria-label="Toggle billing cycle"
            >
              <span
                className={`h-[1.4vw] max-lg:h-[5vw] w-[1.4vw] max-lg:w-[5vw] bg-foreground transition-transform duration-300 absolute ${isYearly ? "translate-x-[1.7vw] max-lg:translate-x-[7vw]" : "translate-x-0"}`}
              />
            </button>
            <p
              className={`cursor-pointer font-heading font-medium max-md:font-medium transition-opacity duration-300 `}
              onClick={() => setIsYearly(true)}
            >
              Yearly
            </p>
          </div>

          <div className="h-full max-lg:w-full px-[4vw] max-lg:p-[6vw] flex-col py-[3vw] pb-[5vw]  flex items-start max-lg:gap-[10vw] justify-between w-1/2 bg-[#F0F0F0]">
            <div className="space-y-[1.5vw] max-lg:space-y-[4vw] max-md:space-y-[6vw]">
              <p className="text80 font-medium! font-heading">Free</p>
              <div className="flex gap-[1vw] max-lg:gap-[3vw] items-end">
                <p className="text110 max-md:text-[13vw]! font-medium! font-heading">$0</p>
                <p className="text24 mb-[1vw] max-lg:mb-2">Forever</p>
              </div>
              <p className="text24 mt-[-1vw] max-lg:mt-[-1vw] max-md:mt-[-3.5vw]">
                For trying real effects in real projects.
              </p>
              <div className="flex flex-col gap-[1.5vw] max-lg:gap-[4.5vw] pt-[2vw] max-md:pt-[5vw]">
                {freeFeatures.map((feature, index) => (
                  <div key={index} className="flex items-center w-full">
                    <div className="w-[3vw] max-md:w-[7vw] max-lg:w-[5vw]">
                      <CheckIcon className="w-[1.5vw] h-[1.5vw] rounded-full overflow-hidden max-lg:w-[3.5vw] max-lg:h-[3.5vw] max-md:w-[4vw] max-md:h-[4vw] shrink-0" />
                    </div>
                    <p className="text24 leading-[1.2] max-lg:text-[4.2vw] w-[90%]">
                      {feature}
                    </p>
                  </div>
                ))}
              </div>
            </div>
            <div className="w-fit max-md:w-full">
              <Button
                variant="outline"
                href="/effects/free"
                text="Browse Free Effects"
                id={"browse-free-effects-pricing"}
                className=" max-lg:w-full max-lg:mb-0 max-md:text-[4vw]"
              />
            </div>
          </div>

          {/* TOGGLE for desktop */}
          <div className="h-fit max-lg:hidden flex absolute max-lg:relative max-lg:top-[4vw] max-lg:right-0 max-lg:justify-start right-0  items-center text24 text-background top-[-2.8vw]  gap-[1vw] max-lg:gap-[4vw] z-0">
            <p
              className={`cursor-pointer font-heading font-medium transition-opacity duration-300`}
              onClick={() => setIsYearly(false)}
            >
              Monthly
            </p>
            <button
              onClick={() => setIsYearly(!isYearly)}
              className="p-[.2vw] max-lg:p-[1vw] bg-primary relative flex items-center w-[3.5vw] max-lg:w-[14vw] h-[1.8vw] max-lg:h-[7vw] transition-colors duration-300"
              aria-label="Toggle billing cycle"
            >
              <span
                className={`h-[1.4vw] max-lg:h-[5vw] w-[1.4vw] max-lg:w-[5vw] bg-foreground transition-transform duration-300 absolute ${isYearly ? "translate-x-[1.7vw] max-lg:translate-x-[7vw]" : "translate-x-0"}`}
              />
            </button>
            <p
              className={`cursor-pointer font-heading font-medium transition-opacity duration-300 `}
              onClick={() => setIsYearly(true)}
            >
              Yearly
            </p>
          </div>

          <div className="h-full max-lg:h-fit max-lg:p-[6vw] relative px-[4vw] flex-col py-[3vw] pb-[5vw] flex items-start max-lg:gap-[10vw] justify-between w-1/2 max-lg:w-full bg-background text-foreground">
            <div className="space-y-[1.5vw] max-lg:space-y-[6vw] w-full">
              <p className="text80 font-heading">Pro</p>

              <div className="flex gap-[1vw] max-lg:gap-[2vw]  items-end">
                <p className="text110 max-md:text-[13vw]! flex items-center font-medium! font-heading">
                  <span>$</span>
                  <PriceDigit digit="1" visible={isYearly} />
                  <PriceDigit digit={isYearly ? "7" : "2"} />
                  <PriceDigit digit={isYearly ? "9" : "0"} />
                </p>
                <p className="text24 mb-[1vw] max-lg:mb-2">
                  {isYearly ? "Yearly" : "Monthly"}
                </p>
                <div className={`${isYearly ? "opacity-100 delay-300 duration-300" : "opacity-0 pointer-events-none"} w-fit `}>

                <ShimmerText
                  as="div"
                  shimmerColor="#fab389"
                  baseColor="#ff5f00"
                  className={`inline-block w-[15vw] max-lg:w-[28vw] max-md:w-[31vw] max-md:text-[4vw]! `}
                >
                  <p
                    className={`text22 w-full text-nowrap max-md:text-[4vw]! font-heading font-medium! max-lg:mb-2 mb-[.75vw] ml-[1vw]  text-primary transition-opacity duration-300 `}
                  >
                    3 months free
                  </p>
                </ShimmerText>
                </div>
              </div>
              <p className="text24 mt-[-1vw] max-md:leading-[1.2] max-lg:mt-0">
                For developers, founders, and agencies shipping premium work.
              </p>
              <div className="flex flex-col gap-[1.5vw] max-lg:gap-[3.5vw] pt-[2vw] max-md:pt-[3vw]">
                {ProFeatures.map((feature, index) => (
                  <div key={index} className="flex items-center w-full">
                    <div className="w-[3vw] max-md:w-[7vw] max-lg:w-[5vw]">
                      <CheckIcon className="w-[1.5vw] h-[1.5vw] max-lg:mt-0 max-md:w-[4vw] max-md:h-[4vw] shrink-0 max-lg:h-[3.5vw] max-lg:w-[3.5vw]" />
                    </div>
                    <p className="text24 leading-[1.2] max-lg:text-[4.2vw] w-[90%]">
                      {feature}
                    </p>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-[1vw] max-lg:space-y-[4vw] w-fit max-lg:w-full">
              <div className="w-fit max-md:w-full">
                {/* Clerk-free by design: the landing page renders without
                    ClerkProvider, so this CTA is always the anonymous
                    variant. Plan-aware pricing lives on /pricing. */}
                <Button
                  variant="orange"
                  text="Upgrade to Pro"
                  id={"upgrade-to-pro-pricing"}
                  href="/sign-up"
                  className="max-lg:w-full max-md:text-[4vw]"
                />
              </div>
            </div>
          </div>
        </div>
        <SplitLineNoMask
          as="p"
          className="text34 max-lg:text-[4vw] max-md:text-[5vw] max-lg:leading-[1.3] relative z-50 text-center w-[65vw] max-lg:w-[85vw]"
        >
          Code you install stays in your repo. Free Core effects are available
          now. Pro downloads, Pro updates, and new Pro effect access require
          active Pro access.
        </SplitLineNoMask>
      </div>
    </div>
  );
}
