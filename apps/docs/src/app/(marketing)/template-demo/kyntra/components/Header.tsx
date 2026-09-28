// Built using Hyperiux Vault: https://vault.hyperiux.com

"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useLenis } from "lenis/react";
import gsap from "gsap";
import dynamic from "next/dynamic";
import { prefersReducedMotion } from "./Animations/reducedMotion";
import CharStaggerButton from "./effects/char-stagger-button";
import CharStaggerPrimaryButton from "./effects/char-stagger-primary-button";
import kyntraLogo from "../assets/kyntra-logo.webp";

// Above the fold: keep the modal out of the critical bundle until it is used
const EnquiryModal = dynamic(() => import("./EnquiryModal"));


const CLOSED_CLIP = "inset(0% 0% 100% 0%)";
const OPEN_CLIP = "inset(0% 0% 0% 0%)";

// Each label points at its section
const navLinks = [
  { label: "For Homes", target: "#kyntra-about" },
  { label: "Product", target: "#features" },
  { label: "Kyntra Care", target: "#how-it-works" },
  { label: "Stories", target: "#stories" },
  { label: "Resources", target: "#resources" },
];

const Header: React.FC = () => {
  const lenis = useLenis();
  const [hidden, setHidden] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement | null>(null);
  const menuTimelineRef = useRef<gsap.core.Timeline | null>(null);
  // Nothing should play on the first render - the sheet just starts hidden.
  const menuOpenedRef = useRef(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const lastYRef = useRef(0);
  const [enquiryOpen, setEnquiryOpen] = useState(false);
  const [enquiryUsed, setEnquiryUsed] = useState(false);
  const [revealed, setRevealed] = useState(false);

  const openEnquiryModal = () => {
    setMenuOpen(false);
    setEnquiryUsed(true);
    setEnquiryOpen(true);
  };

  const closeEnquiryModal = () => setEnquiryOpen(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setRevealed(true), 1000);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY;

      setIsScrolled(currentY > 150);

      if (currentY > lastYRef.current && currentY > 100) {
        setHidden(true);
      } else if (currentY < lastYRef.current) {
        setHidden(false);
      }
      lastYRef.current = currentY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  useEffect(() => {
    const overlay = mobileMenuRef.current;
    if (!overlay) return;

    const rows = overlay.querySelectorAll<HTMLElement>("[data-mobile-menu-row]");

    const cleanup = () => {
      menuTimelineRef.current?.kill();
      menuTimelineRef.current = null;
    };

    menuTimelineRef.current?.kill();
    gsap.killTweensOf([overlay, ...Array.from(rows)]);

    // First render: park the sheet out of view without animating.
    if (!menuOpen && !menuOpenedRef.current) {
      gsap.set(overlay, { autoAlpha: 0, clipPath: CLOSED_CLIP });
      return cleanup;
    }

    const reduce = prefersReducedMotion();
    const timeline = gsap.timeline();
    menuTimelineRef.current = timeline;

    if (menuOpen) {
      menuOpenedRef.current = true;
      gsap.set(overlay, { autoAlpha: 1 });

      if (reduce) {
        timeline
          .set(overlay, { clipPath: OPEN_CLIP })
          .fromTo(overlay, { opacity: 0 }, { opacity: 1, duration: 0.2 })
          .set(rows, { opacity: 1, y: 0 });
        return cleanup;
      }

      timeline
        .fromTo(
          overlay,
          { clipPath: CLOSED_CLIP },
          { clipPath: OPEN_CLIP, duration: 0.5, ease: "power3.inOut" },
          0,
        )
        .fromTo(
          rows,
          { opacity: 0, y: 24 },
          {
            opacity: 1,
            y: 0,
            duration: 0.5,
            ease: "power3.out",
            stagger: 0.05,
            clearProps: "opacity,transform",
          },
          0.18,
        );

      return cleanup;
    }

    if (reduce) {
      timeline.to(overlay, { autoAlpha: 0, duration: 0.15 });
      return cleanup;
    }

    timeline
      .to(
        rows,
        {
          opacity: 0,
          y: 12,
          duration: 0.2,
          ease: "power2.in",
          stagger: { each: 0.02, from: "end" },
        },
        0,
      )
      .to(overlay, { clipPath: CLOSED_CLIP, duration: 0.38, ease: "power3.inOut" }, 0.06)
      .set(overlay, { autoAlpha: 0 });

    return cleanup;
  }, [menuOpen]);

  const handleNavScroll = (
    event: React.MouseEvent<HTMLAnchorElement>,
    target: string,
  ) => {
    event.preventDefault();
    setMenuOpen(false);

    if (lenis) {
      lenis.scrollTo(target, { duration: 2 });
      return;
    }

    document.querySelector(target)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 px-[3vw] py-[1.1vw] transition-all duration-700 ease-out max-[1025px]:px-[5%] max-[1025px]:py-[5%] ${
        !revealed
          ? "-translate-y-full"
          : hidden
            ? "-translate-y-full max-[1025px]:translate-y-0"
            : "translate-y-0"
      } ${isScrolled ? "bg-black/30  backdrop-blur-md" : ""}`}
    >
      <div className="flex items-center justify-between">
        <Link
          href="/templates/kyntra"
          className="relative z-60 flex items-center"
          aria-label="Kyntra home"
        >
          <div className="h-fit w-[8vw] max-[1025px]:w-[20vw] max-md:w-[26vw]">
            <Image
              src={kyntraLogo}
              alt="Kyntra"
              className="h-full w-full object-contain"
              loading="eager"
              fetchPriority="high"
            />
          </div>
        </Link>

        <nav className="flex items-center gap-[3vw] max-[1025px]:hidden">
          {navLinks.map((link) => (
            <CharStaggerButton
              key={link.label}
              text={link.label}
              href={link.target}
              onClick={(event) => handleNavScroll(event, link.target)}
              hoverColor="#ffffff"
              className="text-white"
              textClassName="font-aeonik-pro text-22 "
            />
          ))}
        </nav>

        <div className="max-[1025px]:hidden">
          <CharStaggerPrimaryButton
            data-mobile-menu-row
            text="Get Started"
            href="#get-started"
            onClick={(event) => {
              event.preventDefault();
              openEnquiryModal();
            }}
            hoverColor="#000000"
            showArrow
            className="rounded-full bg-white px-[1.8vw] py-[0.7vw] text-black"
            textClassName="font-aeonik-pro text-22 tracking-tight"
            iconClassName="text-black"
          />
        </div>

        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-label={
            menuOpen ? "Close navigation menu" : "Open navigation menu"
          }
          aria-expanded={menuOpen}
          className="relative z-60 hidden h-[6vw] w-[7vw] shrink-0 items-center justify-center max-[1025px]:flex max-md:h-[8vw] max-md:w-[9vw]"
        >
          <span className="relative block h-[3vw] w-[5.5vw] max-md:h-[4vw] max-md:w-[7vw]">
            <span
              className={`absolute left-0 top-[10%] h-px w-full bg-white transition-all duration-300 ${
                menuOpen
                  ? "translate-y-[1.2vw] rotate-45 max-md:translate-y-[1.6vw]"
                  : ""
              }`}
            />
            <span
              className={`absolute left-0 top-[50%] h-px w-full bg-white transition-all duration-300 ${
                menuOpen ? "opacity-0" : "opacity-100"
              }`}
            />
            <span
              className={`absolute left-0 top-[90%] h-px w-full bg-white transition-all duration-300 ${
                menuOpen
                  ? "translate-y-[-1.2vw] -rotate-45 max-md:translate-y-[-1.6vw]"
                  : ""
              }`}
            />
          </span>
        </button>
      </div>

      <div
        ref={mobileMenuRef}
        style={{ clipPath: CLOSED_CLIP, visibility: "hidden", opacity: 0 }}
        className="fixed inset-0 z-50 hidden h-dvh bg-black px-[5%] pb-[5vw] pt-[28vw] max-[1025px]:block max-md:pt-[34vw]"
      >
        <nav className="flex h-full flex-col justify-between">
          <div className="flex flex-col gap-[5vw] max-md:gap-[7vw]">
            {navLinks.map((link) => (
              <CharStaggerButton
                key={link.label}
                data-mobile-menu-row
                text={link.label}
                href={link.target}
                onClick={(event) => handleNavScroll(event, link.target)}
                hoverColor="rgba(255,255,255,0.7)"
                className="text-white"
                textClassName="font-helvetica-neue text-[9vw] font-medium leading-none max-md:text-[9vw]"
              />
            ))}
          </div>

          <CharStaggerPrimaryButton
            text="Get Started"
            href="#get-started"
            onClick={(event) => {
              event.preventDefault();
              openEnquiryModal();
            }}
            hoverColor="#000000"
            showArrow
            className="h-[13vw] w-full justify-center rounded-full bg-white px-[6vw] text-black max-md:h-[16vw]"
            textClassName="font-aeonik-pro text-[3.4vw] font-medium max-md:text-[4.6vw]"
            iconClassName="text-black"
          />
        </nav>
      </div>

      {enquiryUsed && (
        <EnquiryModal open={enquiryOpen} onClose={closeEnquiryModal} />
      )}
    </header>
  );
};

export default Header;
