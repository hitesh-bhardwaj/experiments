"use client";
import Image from "next/image";
import Link from "next/link";
import gsap from "gsap";
import ScrollTrigger from "gsap/dist/ScrollTrigger";
import { useEffect, useRef } from "react";
gsap.registerPlugin(ScrollTrigger);
import Footerbg from "./assets/footer-bg.svg";
import ElenaVossLogo from "./assets/elena-voss.svg";
import FacebookIcon from "./assets/facebook.svg";
import InstagramIcon from "./assets/instagram.svg";
import LinkedInIcon from "./assets/linkedIn.svg";
import TwitterIcon from "./assets/twitter.svg";
import DotFillBtn from "./effects/dot-fill-button/DotFillButton";
import { useGetInTouchModal } from "./GetInTouchModal";

const SocialLinks = [
  { label: "Facebook", href: "#", icon: FacebookIcon },
  { label: "Instagram", href: "#", icon: InstagramIcon },
  { label: "LinkedIn", href: "#", icon: LinkedInIcon },
  { label: "Twitter", href: "#", icon: TwitterIcon },
];

const Footer = () => {
  const footerRef = useRef(null);
  const footerGlassRef = useRef(null);
  const { openModal } = useGetInTouchModal();
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      gsap.set(footerGlassRef.current, { opacity: 1, yPercent: 0 });
      return;
    }

    if (globalThis.innerWidth <= 1025) return;

    const tween = gsap.fromTo(
      footerGlassRef.current,
      {
        // opacity:0,
        yPercent: 20,
      },
      {
        yPercent: 0,
        ease: "power1.out",
        scrollTrigger: {
          trigger: footerRef.current,
          start: "top 60%",
          end: "bottom bottom",
          scrub: true,
          // markers: true,
        },
      },
    );

    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
    };
  }, []);

  return (
    <>
      <footer
        className="relative overflow-hidden px-[4vw] pt-[10vw] max-[1025px]:px-[5vw] max-md:pt-[20vw]"
        id="footer"
        ref={footerRef}
      >
        <Image
          src={Footerbg}
          width={1920}
          height={900}
          alt="Footer Background"
          loading="lazy"
          className="absolute -bottom-20 left-0 right-0 w-full max-md:scale-[5] max-md:bottom-0"
        />
        <div className="relative z-[1]">
          <div
            className="rounded-4xl bg-black/5 border border-white/30 backdrop-blur-2xl px-12 py-12 flex flex-col gap-20 justify-between max-[1025px]:flex-col max-[1025px]:items-center max-[1025px]:gap-10 max-[1025px]:px-8 max-[1025px]:py-15 max-md:px-6 max-md:gap-8"
            ref={footerGlassRef}
          >
            {/* Logo and Contact Info */}

            <div className="flex  justify-between items-start gap-24 footer-content max-[1025px]:gap-10 max-md:gap-16 max-[1025px]:flex-col-reverse max-[1025px]:items-center">
              <Image
                src={ElenaVossLogo}
                width={338}
                height={172}
                alt="Logo"
                loading="lazy"
                className="w-[22vw] max-[1025px]:w-[34vw] max-md:w-[46vw]"
              />

              <div className="flex flex-col gap-[2vw] items-end max-[1025px]:items-center max-[1025px]:text-center max-md:gap-[7vw]">
                <p className="text-[3.4vw] text-end w-[75%] leading-[1.15] max-[1025px]:text-[5vw] max-[1025px]:w-full max-[1025px]:text-center max-md:text-[7.5vw] ">
                  Ready to Bring Your Vision to Life?
                </p>
                <DotFillBtn
                  btnText="Get in Touch"
                  href={"#"}
                  onClick={(e) => {
                    e.preventDefault();
                    openModal();
                  }}
                  textClassName="font-normal text-[1.15vw] max-[1025px]:text-[3vw] max-md:text-[4.2vw]"
                  bgColor="#ffffff"
                  dotColor="#070707"
                  hoverTextColor="#ffffff"
                  textColor="#111111"
                />
              </div>
            </div>

            <div className="flex w-full items-end justify-between gap-36 h-auto  footer-content max-[1025px]:w-full max-[1025px]:items-center max-[1025px]:text-center max-[1025px]:gap-10 max-md:gap-10 max-[1025px]:flex-col ">
              <div className=" w-fit text-foreground">
                <h6 className="uppercase mb-5 text-[1.25vw] max-[1025px]:text-[2.4vw] max-md:text-[4vw]">
                  Reach Out
                </h6>
                <ul className="space-y-2 text-[1.25vw] max-[1025px]:text-[2.4vw] max-md:text-[4vw]">
                  <li className="under-multi-parent">
                    <a
                      href="tel:+1 (415) 309-8274"
                      className="under-multi content-p"
                    >
                      +1 (415) 309-8274
                    </a>
                  </li>

                  <li className="under-multi-parent">
                    <a
                      href="mailto:hello@elenavoss.design"
                      className="under-multi content-p"
                    >
                      hello@elenavoss.design
                    </a>
                  </li>
                </ul>
              </div>

              <div className="flex flex-col justify-between h-fit">
                {/* Social Media Links */}
                <ul className="flex gap-4">
                  {SocialLinks.map((link, index) => (
                    <li key={index} className="group">
                      <Link
                        href={link.href}
                        aria-label={link.label}
                        className="rounded-full relative block p-2.5 border overflow-hidden bg-white/5  transition-all duration-300 ease-in-out group-hover:scale-[0.95]"
                      >
                        <div className="w-5 h-5 flex items-center justify-center">
                          <Image
                            src={link.icon}
                            alt={link.label}
                            className="w-full h-full object-contain group-hover:invert transition-all duration-300 ease-in-out"
                          />
                        </div>
                        <div className="w-full h-full absolute inset-0 origin-center scale-0 group-hover:scale-100 bg-white rounded-full duration-300 ease-in-out z-[-1]"></div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
          <div className="flex justify-between py-8 pt-12 text-lg text-foreground max-md:flex-col max-md:gap-2 max-md:text-sm max-md:text-center max-md:py-6 max-md:pt-8">
            <p>
              Copyright{" "}
              <Link
                href="https://vault.hyperiux.com/"
                target="_blank"
                rel="noopener noreferrer"
              >
                ©
              </Link>{" "}
              Elena Voss Design 2026
            </p>
            <p>
              By: <a href="https://www.hyperiux.com/">Hyperiux</a>
            </p>
          </div>
        </div>
      </footer>
    </>
  );
};

export default Footer;
