"use client";

import React, { useState, useEffect, useRef, memo } from "react";
import gsap from "gsap";
import { useLenis } from "lenis/react";
import { CheckIcon } from "../../utils/Icons";
import Button from "../WebsiteComps/Button";
import SplitLine from "../WebsiteComps/SplitLine";
import { useUser } from "@clerk/nextjs";
import ShimmerText from "../WebsiteComps/ShimmerText";
import RazorpayCheckoutButton from "../Payments/RazorpayCheckoutButton";
import LineReveal from "../Animations/LineReveal";

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
      gsap.to(containerRef.current, { y: target, duration: 0.55, ease: "power3.out" });
    }
  }, [digit]);

  return (
    <span
      className="overflow-hidden h-[1em] leading-none inline-block relative transition-all duration-300 [--pd-w:0.64em] max-md:[--pd-w:0.64em]"
      style={{ width: visible ? "var(--pd-w)" : "0", opacity: visible ? 1 : 0 }}
    >
      <span ref={containerRef} className="flex flex-col will-change-transform">
        {DIGITS.map((d) => (
          <span key={d} className="flex h-[1em] items-center justify-center leading-none">
            {d}
          </span>
        ))}
      </span>
    </span>
  );
});

PriceDigit.displayName = "PriceDigit";

// Renders a price as individual animated digit slots. The yearly amount
// always has more digits than monthly (e.g. "20"->"179", "1999"->"17990") -
// the extra leading digits fade in/out via `visible`, the shared trailing
// slots flip their value between the monthly and yearly figure.
function PriceDigits({ monthlyAmount, yearlyAmount, isYearly }) {
  const monthlyDigits = String(monthlyAmount).split("");
  const yearlyDigits = String(yearlyAmount).split("");
  const leadCount = yearlyDigits.length - monthlyDigits.length;

  return (
    <>
      {yearlyDigits.slice(0, leadCount).map((d, i) => (
        <PriceDigit key={`lead-${i}`} digit={d} visible={isYearly} />
      ))}
      {monthlyDigits.map((d, i) => (
        <PriceDigit
          key={`trail-${i}`}
          digit={isYearly ? yearlyDigits[leadCount + i] : d}
        />
      ))}
    </>
  );
}

const PRICING = {
  USD: { symbol: "$", monthly: 20, yearly: 179 },
  INR: { symbol: "₹", monthly: 999, yearly: 8999 },
};

const freeFeatures = [
  "30+ production-ready effects",
  "Copy-paste + CLI install",
  "Commercial-friendly usage",
  "Code you own"
];
const ProFeatures = [
  "All 150+ effects",
  "New effects added regularly.",
  "Priority access to upcoming packs",
  "Hyperiux CLI install + auth",
  "Dependency, performance & reduced-motion notes",
  "Code you own, commercial-friendly",
];

export default function Pricing({ padding, content = true, isIndia = false }) {
  const [isYearly, setIsYearly] = useState(true);

  const { isLoaded, isSignedIn, user } = useUser();
  const userPlan = isSignedIn ? (user?.publicMetadata?.plan || "free") : null;
  const currency = isIndia ? "INR" : "USD";
  const { symbol, monthly: monthlyAmount, yearly: yearlyAmount } = PRICING[currency];

  // Anything that links here with a #pricing-cards hash (marketing CTAs,
  // upgrade prompts, etc. - post-signup no longer does, see components/auth/vault-door)
  // needs a manual scroll: Lenis owns scroll and resets position on init, so
  // the browser's native anchor-jump doesn't stick on its own.
  const lenis = useLenis();
  const hasScrolledToHash = useRef(false);

  useEffect(() => {
    if (hasScrolledToHash.current) return;
    if (typeof window === "undefined") return;
    if (window.location.hash !== "#pricing-cards") return;

    const target = document.getElementById("pricing-cards");
    if (!target) return;

    const timer = setTimeout(() => {
      const targetTop = target.getBoundingClientRect().top + window.scrollY;

      if (lenis) {
        lenis.scrollTo(targetTop, { force: true });
      } else {
        window.scrollTo({ top: targetTop, left: 0, behavior: "smooth" });
      }

      hasScrolledToHash.current = true;
    }, 400);

    return () => clearTimeout(timer);
  }, [lenis]);

  return (
    <div className={`h-fit text-background pricing  max-[1025px]:overflow-hidden flex pb-[6vw] flex-col gap-[6vw]  max-[1025px]:gap-[10vw] items-center justify-center min-h-screen  bg-foreground self-padd  w-full ${padding ? padding : "pt-[35vw]! relative z-2 pb-[15vw]!"}`}>
      {content && <div className=" text-center space-y-[4vw] max-[1025px]:space-y-[6vw]">
        <LineReveal as="h2" className="text110 w-[70vw] max-[1025px]:w-full">
          Start free.<br /> Upgrade when you’re ready.
        </LineReveal>
        <SplitLine as="p" className="text24 max-[1025px]:w-[90vw] mx-auto">
          The free core stays free, forever. Pro unlocks everything and every
          new drop.
        </SplitLine>
      </div>}
      <div
        id="pricing-cards"
        className="h-[55vw] max-[1025px]:h-fit max-[1025px]:flex-col-reverse max-[1025px]:gap-[8vw] relative w-full flex justify-between max-md:gap-[15vw] fadeup-cards"
      >
        {/* TOGGLE for mobile */}

        <div className="h-fit max-[1025px]:flex hidden order-last rounded-md  max-md:relative max-md:right-0 max-[1025px]:justify-end right-0   items-center text24 text-background max-[1025px]:top-10 max-md:top-10 top-[-2.8vw]  gap-[1vw] max-md:gap-[4vw] z-0">
          <p
            className={`cursor-pointer font-heading font-medium max-md:font-medium transition-opacity duration-300`}
            onClick={() => setIsYearly(false)}
          >
            Monthly
          </p>
          <button
            onClick={() => setIsYearly(!isYearly)}
            className="p-[.2vw] max-[1025px]:p-[1vw] bg-primary relative flex items-center w-[3.5vw] max-[1025px]:w-[14vw] h-[1.8vw] max-[1025px]:h-[7vw] rounded-full transition-colors duration-300"
            aria-label="Toggle billing cycle"
          >
            <span
              className={`h-[1.4vw] max-[1025px]:h-[5vw] w-[1.4vw] max-[1025px]:w-[5vw] rounded-full bg-foreground transition-transform duration-300 absolute ${isYearly ? "translate-x-[1.7vw] max-[1025px]:translate-x-[7vw]" : "translate-x-0"}`}
            />
          </button>
          <p
            className={`cursor-pointer font-heading font-medium max-md:font-medium transition-opacity duration-300 `}
            onClick={() => setIsYearly(true)}
          >
            Yearly
          </p>
        </div>

        <div className="h-full w-[49%] max-[1025px]:w-full px-[3.5vw] rounded-md max-[1025px]:p-[6vw] flex-col py-[3vw] pb-[5vw] flex items-start max-[1025px]:gap-[10vw] justify-between bg-[#F0F0F0] max-md:rounded-sm">
          <div className="space-y-[1.5vw] max-[1025px]:space-y-[4vw] max-md:space-y-[6vw]">
            <p className="text80 font-medium! font-heading">Free</p>
            <div className="flex gap-[1vw] max-[1025px]:gap-[3vw] items-end">
              <p className="text110 max-md:text-[13vw]! font-medium! font-heading">{symbol}0</p>
              <p className="text24 mb-[1vw] max-[1025px]:mb-2">Forever</p>
            </div>
            <p className="text24 mt-[-1vw] max-[1025px]:mt-[-1vw] max-md:mt-[-3.5vw]">
              For trying real effects in real projects.
            </p>
            <div className="flex flex-col gap-[1.5vw] max-[1025px]:gap-[4.5vw] pt-[2vw] max-md:pt-[5vw]">
              {freeFeatures.map((feature, index) => (
                <div key={index} className="flex items-center w-full">
                  <div className="w-[3vw] max-md:w-[7vw] max-[1025px]:w-[5vw]">
                    <CheckIcon className="w-[1.5vw] h-[1.5vw] rounded-full overflow-hidden max-[1025px]:w-[3.5vw] max-[1025px]:h-[3.5vw] max-md:w-[4vw] max-md:h-[4vw] shrink-0" />
                  </div>
                  <p className="text24 leading-[1.2] max-[1025px]:text-[4.2vw] w-[90%]">
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
              className=" max-[1025px]:w-full max-[1025px]:mb-0 max-md:text-[4vw]"
            />
          </div>
        </div>

        {/* TOGGLE for desktop */}
        <div className="h-fit max-[1025px]:hidden flex rounded-md absolute max-[1025px]:relative max-[1025px]:top-[4vw] max-[1025px]:right-0 max-[1025px]:justify-start right-0  items-center text24 text-background top-[-2.8vw]  gap-[1vw] max-[1025px]:gap-[4vw] z-0">
          <p
            className={`cursor-pointer font-heading font-medium transition-opacity duration-300`}
            onClick={() => setIsYearly(false)}
          >
            Monthly
          </p>
          <button
            onClick={() => setIsYearly(!isYearly)}
            className="p-[.2vw] max-[1025px]:p-[1vw] bg-primary relative flex items-center w-[3.5vw] max-[1025px]:w-[14vw] h-[1.8vw] max-[1025px]:h-[7vw] rounded-full transition-colors duration-300"
            aria-label="Toggle billing cycle"
          >
            <span
              className={`h-[1.4vw] max-[1025px]:h-[5vw] w-[1.4vw] max-[1025px]:w-[5vw] rounded-full bg-foreground transition-transform duration-300 absolute ${isYearly ? "translate-x-[1.7vw] max-[1025px]:translate-x-[7vw]" : "translate-x-0"}`}
            />
          </button>
          <p
            className={`cursor-pointer font-heading font-medium transition-opacity duration-300 `}
            onClick={() => setIsYearly(true)}
          >
            Yearly
          </p>
        </div>

        <div className="h-full rounded-md max-[1025px]:h-fit max-[1025px]:p-[6vw] relative px-[4vw] max-md:rounded-sm flex-col py-[3vw] pb-[5vw] flex items-start max-[1025px]:gap-[10vw] justify-between w-1/2 max-[1025px]:w-full bg-background text-foreground">
          <div className="space-y-[1.5vw] max-[1025px]:space-y-[6vw] w-full">
            <p className="text80 font-heading">Pro</p>

            <div className="flex gap-[1vw] max-[1025px]:gap-[2vw]  items-end">
              <p className="text110 max-md:text-[13vw]! flex items-center font-medium! font-heading">
                <span>$</span>
                <PriceDigit digit="1" visible={isYearly} />
                <PriceDigit digit={isYearly ? "7" : "2"} />
                <PriceDigit digit={isYearly ? "9" : "0"} />
              </p>
              <p className="text24 mb-[1vw] max-[1025px]:mb-2">
                {isYearly ? "Yearly" : "Monthly"}
              </p>
              <div className={`${isYearly ? "opacity-100 delay-300 duration-300" : "opacity-0 pointer-events-none"} w-fit `}>

                <ShimmerText
                  as="div"
                  shimmerColor="#fab389"
                  baseColor="#ff5f00"
                  className={`inline-block w-[15vw] max-[1025px]:w-[28vw] max-md:w-[31vw] max-md:text-[4vw]! `}
                >
                  <p
                    className={`text22 w-full text-nowrap max-md:text-[4vw]! font-heading font-medium! max-[1025px]:mb-2 mb-[.75vw] ml-[1vw]  text-primary transition-opacity duration-300 `}
                  >
                    3 months free
                  </p>
                </ShimmerText>
              </div>
            </div>
            <p className="text24 mt-[-1vw] max-md:leading-[1.2] max-[1025px]:mt-0">
              For developers, founders, and agencies shipping premium work.
            </p>
            <div className="flex flex-col gap-[1.5vw] max-[1025px]:gap-[3.5vw] pt-[2vw] max-md:pt-[3vw]">
              {ProFeatures.map((feature, index) => (
                <div key={index} className="flex items-center w-full">
                  <div className="w-[3vw] max-md:w-[7vw] max-[1025px]:w-[5vw]">
                    <CheckIcon className="w-[1.5vw] h-[1.5vw] max-[1025px]:mt-0 max-md:w-[4vw] max-md:h-[4vw] shrink-0 max-[1025px]:h-[3.5vw] max-[1025px]:w-[3.5vw]" />
                  </div>
                  <p className="text24 leading-[1.2] max-[1025px]:text-[4.2vw] w-[90%]">
                    {feature}
                  </p>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-[1vw] max-[1025px]:space-y-[4vw] w-fit max-[1025px]:w-full">
            <div className="w-fit max-md:w-full">
              {/* Clerk-free by design: the landing page renders without
                            ClerkProvider, so this CTA is always the anonymous
                            variant. Plan-aware pricing lives on /pricing. */}
              <Button
                variant="orange"
                text="Upgrade to Pro"
                id={"upgrade-to-pro-pricing"}

                href="/sign-up"
                className="max-[1025px]:w-full max-md:text-[4vw]"
              />
            </div>
          </div>
        </div>
      </div>
      <SplitLine
        as="p"
        className="text34 max-[1025px]:text-[4vw] max-md:text-[5vw] max-[1025px]:leading-[1.3] relative z-50 text-center w-[65vw] max-[1025px]:w-[85vw]"
      >
        Code you install stays in your repo. Free Core effects are available
        now. Pro downloads, Pro updates, and new Pro effect access require
        active Pro access.
      </SplitLine>
    </div>
  );
}
