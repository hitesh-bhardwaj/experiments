// Built using Hyperiux Vault: https://vault.hyperiux.com

"use client";

import type { MouseEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronUp } from "lucide-react";

import { FooterParallax } from "./ParallaxFooter";
import lumeraLogo from "../../assets/icons/lumera-logo-black.webp";
import facebookIcon from "../../assets/icons/socials/facebook.svg";
import xIcon from "../../assets/icons/socials/x.svg";
import instagramIcon from "../../assets/icons/socials/instagram.svg";
import linkedinIcon from "../../assets/icons/socials/linkedin.svg";
import CharStaggerButton from "../char-stagger-button";

import { FadeUp } from "../../gsapAnimations";

const socialLinks = [
  { src: facebookIcon, label: "Facebook" },
  { src: xIcon, label: "Twitter" },
  { src: instagramIcon, label: "Instagram" },
  { src: linkedinIcon, label: "LinkedIn" },
];

const ParallaxFooter = () => {
  const handleScrollTop = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <FooterParallax
      id="footer"
      outerClassName="footer-body"
      footerClassName="overflow-hidden  bg-[#E0D4C6] px-[5%] text-[#1C1B1A] max-md:px-[6%] max-md:py-[10%] max-[1025px]:pt-[5%]"
    >
      <div className="flex flex-col pt-[5%] pb-[2%]">
        <div className="relative mb-[7vw] flex w-full items-center justify-between max-md:gap-0 max-[1025px]:flex-col-reverse">
          <FadeUp className="flex items-center justify-center gap-[1vw] max-md:mb-[5vw] max-md:gap-[3vw]">
            {socialLinks.map(({ src, label }) => (
              <Link href="#" key={label} aria-label={label}>
                <div className="relative flex size-[2.7vw] group duration-300 transition-all ease-in-out items-center justify-center overflow-hidden rounded-full bg-[#1C1B1A] border border-[#1C1B1A] p-[0.75vw] max-md:h-[10vw] max-md:w-[10vw] max-md:p-[2.5vw] max-[1025px]:h-[5vw] max-[1025px]:w-[5vw] max-[1025px]:p-[1.3vw]">
                  <Image src={src} alt={label} width={24} height={24} className="h-full duration-300 transition-all ease-in-out group-hover:brightness-0 w-full object-contain relative z-2" />
            <span className="bg-white rounded-full scale-0 absolute origin-center group-hover:scale-100 w-full h-full duration-300 ease-in-out "/>
                    
                </div>
              </Link>
            ))}
          </FadeUp>

          <FadeUp className="absolute top-1/2 left-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center max-md:mb-[10vw] max-md:translate-y-0 max-[1025px]:static max-[1025px]:mb-[6vw] max-[1025px]:w-[40vw] max-[1025px]:translate-x-0 max-md:w-[55vw]">
            <Link href="/" className="h-auto w-[11vw] max-md:w-[30vw] max-[1025px]:w-[16vw]">
              <Image
                src={lumeraLogo}
                alt="Lumera"
                height={1000}
                width={1000}
                className="h-full w-full object-cover"
              />
            </Link>
          </FadeUp>

          <FadeUp className="max-[1025px]:hidden">
            <Link aria-label="Scroll Top" href="#" onClick={handleScrollTop} className="group">
              <div className="relative flex h-[3vw] w-[3vw] items-center justify-center overflow-hidden rounded-full bg-[#1C1B1A] max-md:absolute max-md:top-[5%] max-md:right-[5%] max-md:h-[9.2vw] max-md:w-[9vw] max-[1025px]:h-[5vw] max-[1025px]:w-[5vw]">
                <ChevronUp
                  className="absolute h-[1.5vw] w-[1.5vw] text-white transition-transform duration-500 ease-in-out group-hover:translate-y-[-180%] max-md:h-[4.5vw] max-md:w-[4.5vw] max-[1025px]:h-[2.4vw] max-[1025px]:w-[2.4vw]"
                  strokeWidth={1.8}
                />
                <ChevronUp
                  className="absolute h-[1.5vw] w-[1.5vw] translate-y-[180%] text-white transition-transform duration-500 ease-in-out group-hover:translate-y-0 max-md:h-[4.5vw] max-md:w-[4.5vw] max-[1025px]:h-[2.4vw] max-[1025px]:w-[2.4vw]"
                  strokeWidth={1.8}
                />
              </div>
            </Link>
          </FadeUp>
        </div>

        <div className="flex flex-col items-center justify-center gap-3 text-[#1C1B1A]">
          <FadeUp className="w-fit">
   
              <CharStaggerButton
                href="tel:+12125550186"
                text="+1 (212) 555-0186"
                lineBottom='-5%'
                lineHeight="0.18vw"
                className="text-[#1C1B1A]"
                textClassName="font-neue-montreal text-[3.4vw] font-medium leading-none max-md:text-[5.5vw] max-[1025px]:text-[5vw]"
              />
 
          </FadeUp>
          <FadeUp className="w-fit">
           
              <CharStaggerButton
                href="mailto:hello@lumeraheights.com"
                text="hello@lumeraheights.com"
                lineHeight="0.18vw"
                lineBottom='-5%'
                className="text-[#1C1B1A]"
                textClassName="font-neue-montreal text-[3.2vw] font-medium max-md:text-[5.5vw] max-[1025px]:text-[5vw]"
              />
      
          </FadeUp>
        </div>

        <div className="fadeup flex items-center justify-between pt-[7vw] max-md:gap-[5vw] max-[1025px]:flex-col max-[1025px]:gap-[3vw]">
          <div className="max-[1025px]:order-1 max-[1025px]:w-[70%]">
            <p className="text-[1vw] text-[#1C1B1A] normal-case max-md:text-[3.5vw] max-[1025px]:text-center max-[1025px]:text-[2.5vw]">
              <Link
                href="https://vault.hyperiux.com/"
                target="_blank"
                rel="noopener noreferrer"
              >
                ©
              </Link>{" "}
              2026 Lumera. All Rights Reserved
            </p>
          </div>
          <div className="absolute bottom-[7%] max-[1025px]:bottom-[20%] -translate-x-1/2 left-1/2 w-[35%] max-[1025px]:ml-0 max-[1025px]:w-[80%]">
            <p className="text-center text-[#1C1B1A] text-[1vw] leading-[1.2] max-md:text-[3.5vw] max-[1025px]:text-center max-[1025px]:text-[2.5vw]">
              Sheikh Mohammed Bin Rashid Blvd Dubai, United Arab Emirates
            </p>
          </div>
          <CharStaggerButton
            showArrow={false}
            href="#"
            text="Privacy Policy"
            className="max-[1025px]:order-3 max-[1025px]:pt-[8vh] text-[#1C1B1A]"
            textClassName="text-[1vw] max-md:text-[3.2vw] max-[1025px]:text-[2.5vw]"
          />
        </div>
      </div>
    </FooterParallax>
  );
};

export default ParallaxFooter;
