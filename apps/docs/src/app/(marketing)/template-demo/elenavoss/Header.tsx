"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import gsap from "gsap";
import ElenaVossLogo from "./assets/elena-voss.svg";
import DotFillBtn from "./effects/dot-fill-button/DotFillButton";
import { useGetInTouchModal } from "./GetInTouchModal";
import Link from "next/link";

const SCROLL_BLUR_THRESHOLD_RATIO = 0.4;
const HEADER_HIDE_DURATION = 0.5;

const Header = () => {
  const [scrolled, setScrolled] = useState(false);
  const { openModal } = useGetInTouchModal();
  const headerRef = useRef<HTMLElement | null>(null);
  const lastScrollYRef = useRef(0);
  const hiddenRef = useRef(false);
  // A ref (not state) since this is only read inside the scroll handler
  // below, not rendered - a live-changing media query shouldn't force a
  // re-render just to update it.
  const prefersReducedMotionRef = useRef(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    prefersReducedMotionRef.current = mq.matches;
    const onChange = (e: MediaQueryListEvent) => {
      prefersReducedMotionRef.current = e.matches;
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    // Hero.tsx's own intro reveal also animates this element's yPercent
    // (via gsap.fromTo targeting #header directly) - using gsap here too,
    // rather than a Tailwind translate-y class, keeps both writers on the
    // same inline-style-driven property instead of a class/inline-style
    // specificity fight where the class would silently lose.
    lastScrollYRef.current = window.scrollY;

    const handleScroll = () => {
      const currentY = window.scrollY;
      setScrolled(currentY > window.innerHeight * SCROLL_BLUR_THRESHOLD_RATIO);

      // The hide-on-scroll-down/show-on-scroll-up slide is skipped under
      // reduced motion - the header just stays put. The backdrop-blur
      // toggle above is left alone: it's a filter amount, not a moving
      // element, so it isn't the kind of motion reduced-motion guards
      // against.
      if (!prefersReducedMotionRef.current) {
        const delta = currentY - lastScrollYRef.current;
        if (delta > 0 && currentY > 0 && !hiddenRef.current) {
          hiddenRef.current = true;
          gsap.to(headerRef.current, { yPercent: -100, duration: HEADER_HIDE_DURATION, ease: "power3.out" });
        } else if (delta < 0 && hiddenRef.current) {
          hiddenRef.current = false;
          gsap.to(headerRef.current, { yPercent: 0, duration: HEADER_HIDE_DURATION, ease: "power3.out" });
        }
      }
      lastScrollYRef.current = currentY;
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      <header
        ref={headerRef}
        className={`w-screen h-fit py-[1.5vw] flex items-center justify-between px-[4vw] fixed inset-0 z-99 opacity-0 transition-[backdrop-filter] duration-500 ease-out max-[1025px]:py-[3vw] max-[1025px]:px-[5vw] max-md:py-4 ${
          scrolled ? "backdrop-blur-lg" : "backdrop-blur-none"
        }`}
        id="header"
      >
        <Link className="" href={"/"}>
          <Image
            src={ElenaVossLogo}
            width={338}
            height={172}
            alt="Logo"
            loading="lazy"
            className="w-[12vw] max-[1025px]:w-[25vw] max-md:w-[34vw]"
          />
        </Link>
        <DotFillBtn
          btnText="Get in Touch"
          href={"#"}
          onClick={(e) => {
            e.preventDefault();
            openModal();
          }}
          className="border border-white/20!"
          textClassName="font-normal text-[1.15vw] max-[1025px]:text-[3vw] max-md:text-[4.2vw]"
          bgColor="#ffffff"
          dotColor="#070707"
          hoverTextColor="#ffffff"
          textColor="#111111"
        />
      </header>
    </>
  );
};

export default Header;
