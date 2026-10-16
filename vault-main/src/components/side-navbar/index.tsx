/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps -- React Compiler / legacy-pattern rules: fixing risks changing animation timing (see eslint.config.mjs, issue #16); <img> kept for dynamic user-supplied sources. */
// Built using Hyperiux Vault: https://vault.hyperiux.com
"use client";

import gsap from "gsap";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

// Underline that grows in from the right on hover, and retreats back out to
// the right (not just fading in place) when the hover ends - the origin
// flips between right/left so scale-x animates from/to the same edge.
const LINK_LINE_BASE =
  "relative w-fit after:content-[''] after:absolute after:inset-x-0 after:bottom-0 after:block after:h-px after:w-full after:origin-right after:scale-x-0 after:bg-current hover:after:origin-left hover:after:scale-x-100";
const LINK_LINE_ANIMATED = `${LINK_LINE_BASE} after:transition-transform after:duration-500 after:ease-out`;
// Reduced motion: the line appears at full width instead of drawing in.
const LINK_LINE_INSTANT = `${LINK_LINE_BASE} after:transition-none`;

// Read through matchMedia (not only the CSS media query) so the docs
// reduced-motion preview, which overrides matchMedia, is honored too.
function useLinkLineClasses() {
  const [reduce, setReduce] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!mediaQuery) return undefined;
    const update = () => setReduce(mediaQuery.matches === true);
    update();
    mediaQuery.addEventListener?.("change", update);
    return () => mediaQuery.removeEventListener?.("change", update);
  }, []);

  return reduce ? LINK_LINE_INSTANT : LINK_LINE_ANIMATED;
}

export interface NavLinkItem {
  href: string;
  text: string;
  liClassName?: string;
}

export interface SocialLinkItem {
  href: string;
  text: string;
}

interface MenuLinkProps {
  href: string;
  text: string;
  className?: string;
}

const MenuLink = ({ href, text, className = "" }: MenuLinkProps) => {
  const lineClasses = useLinkLineClasses();

  return (
    <Link aria-hidden href={href} className={`block w-fit leading-[1.2] font-medium ${className}`} prefetch={false}>
      <span className={`${lineClasses} block`}>{text}</span>
    </Link>
  )
}

const NAV_LINKS: NavLinkItem[] = [
  { href: "/", text: "Home", liClassName: "overflow-hidden max-lg:mb-[2vw] mb-[1vw]" },
  { href: "#", text: "Read Article", liClassName: "overflow-hidden max-lg:mb-[2vw] mb-[1vw]" },
  { href: "/effects", text: "Effects", liClassName: "overflow-hidden max-lg:mb-[2vw] mb-[1vw]" },
  { href: "/pricing", text: "Pricing", liClassName: "overflow-hidden max-lg:mb-[2vw] mb-[1vw]" },
  { href: "/docs", text: "Docs", liClassName: "overflow-hidden max-lg:mb-[2vw] mb-[1vw]" },

];

const SOCIAL_LINKS: SocialLinkItem[] = [
  { href: "#", text: "Twitter / X" },
  { href: "#", text: "LinkedIn" },
  { href: "#", text: "GitHub" },
  { href: "#", text: "Instagram" },
];

const SocialLink = ({ href, text }: SocialLinkItem) => {
  const lineClasses = useLinkLineClasses();

  return (
  <li className="overflow-hidden">
    <Link
      className="social-link flex items-center group" href={href}>
      <span className={lineClasses}>
        {text}
      </span>
    </Link>
  </li>
  );
};

interface MenuProps {
  menuOpen: boolean;
  navLinks?: NavLinkItem[];
  socialLinks?: SocialLinkItem[];
  panelWidth?: number | string;
  openDuration?: number;
  linksStagger?: number;
  socialsStagger?: number;
  linkColor?: string;
  panelBackgroundColor?: string;
  panelOpacity?: number;
  panelBlur?: PanelBlur;
}

type PanelBlur = "none" | "sm" | "md" | "lg";

const PANEL_BLUR_CLASSES: Record<PanelBlur, string> = {
  none: "",
  sm: "backdrop-blur-sm",
  md: "backdrop-blur-md",
  lg: "backdrop-blur-lg",
};

function Menu({
  menuOpen,
  navLinks = NAV_LINKS,
  socialLinks = SOCIAL_LINKS,
  panelWidth = 50,
  openDuration = 0.5,
  linksStagger = 0.05,
  socialsStagger = 0.05,
  linkColor = "#ffffff",
  panelBackgroundColor = "#000000",
  panelOpacity = 0.2,
  panelBlur = "md",
}: MenuProps) {
  // A bare number is a percentage of the viewport; strings pass through as CSS.
  const resolvedPanelWidth = typeof panelWidth === "number" ? `${panelWidth}%` : panelWidth;
  const menuRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const [serviceOpen, setServiceOpen] = useState(false);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const links = document.querySelectorAll(".link-anim");
    const socialLinks = document.querySelectorAll(".social-link");

    if (menuOpen) {
      if (reduceMotion) {
        gsap.killTweensOf([navRef.current, links, socialLinks]);
        gsap.set(navRef.current, { left: 0, x: 0 });
        gsap.set([...links, ...socialLinks], { clearProps: "all" });
        return;
      }

      const tl = gsap.timeline()
        .to(navRef.current, {
          left: 0,
          x: 0,
          duration: openDuration,
          ease: "power3.out",
        });

      tl.from(links, {
        yPercent: 100,
        duration: 1,
        delay: -0.4,
        ease: "power3.out",
        stagger: linksStagger
      })
        .from(socialLinks, {
          rotationZ: 5,
          yPercent: 100,
          duration: 1,
          delay: -1,
          stagger: socialsStagger,
          ease: "power3.out",
        });
    } else {
      if (reduceMotion) {
        gsap.killTweensOf(navRef.current);
        gsap.set(navRef.current, { left: "99px", x: "100%" });
        setServiceOpen(false);
        return;
      }

      gsap.timeline()
        .to(navRef.current, {
          left: "99px",
          x: '100%',
          duration: openDuration,
          ease: "power3.out",
          onComplete: () => {
            setServiceOpen(false);
          }
        });
    }
  }, [menuOpen]);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const serviceLinks = document.querySelectorAll(".service-links li");
    if (serviceOpen) {
      gsap.to(serviceLinks, {
        opacity: 1,
        x: 0,
        duration: reduceMotion ? 0 : 0.5,
        stagger: reduceMotion ? 0 : 0.05,
      })
    } else {
      gsap.to(serviceLinks, {
        opacity: 0,
        x: reduceMotion ? 0 : 50,
        duration: reduceMotion ? 0 : 0.5,
        stagger: reduceMotion ? 0 : {
          each: 0.02, from: "end"
        }
      })
    }
  }, [serviceOpen]);

  return (
    <div ref={menuRef} className="fixed top-0 z-[199] left-0 right-0 bottom-0 flex items-start justify-end pointer-events-none">
      <nav
        ref={navRef}
        style={{ '--panel-width': resolvedPanelWidth, backgroundColor: `color-mix(in srgb, ${panelBackgroundColor} ${Math.min(Math.max(panelOpacity, 0), 1) * 100}%, transparent)` } as React.CSSProperties}
        className={`relative w-(--panel-width) pointer-events-auto translate-x-[100%] left-[99px] h-full ${PANEL_BLUR_CLASSES[panelBlur] ?? PANEL_BLUR_CLASSES.md} max-md:w-full max-lg:w-[70%]`}
      >
        <div data-lenis-prevent style={{ color: linkColor }} className="w-full h-full px-[5vw] pt-[5.5vw] pb-[3.5vw] relative flex flex-col justify-between items-start max-lg:justify-between max-lg:py-[15vw] max-md:pt-[25vw] max-md:pb-[10vw] overflow-y-auto">
          <ul className="text-[4vw] font-display leading-[1.15] max-md:text-[11.5vw] max-lg:text-[6.5vw]">
            {navLinks.map((link) => (
              <li key={link.text} className={link.liClassName}>
                <MenuLink className="link-anim" href={link.href} text={link.text} />
              </li>
            ))}
          </ul>
          <div className="w-full h-[1px] bg-current py-[0.1vw] my-[6vw] hidden max-md:block"></div>
          <div className="text-[1.1vw] font-medium flex flex-col space-y-[0.5vw] max-md:text-[5vw] max-md:mb-[7vw] max-lg:text-[3vw]">
            <div className="w-fit overflow-hidden">
              <MenuLink
                className="link-anim"
                href="mailto:hello@hyperiux.com"
                text="hello@hyperiux.com"
              />
            </div>

          </div>
          <ul className="flex justify-between items-center text-[1vw] font-medium uppercase w-[90%] max-md:flex-col max-md:items-start max-md:text-[4.5vw] max-md:gap-[1.5vw] max-lg:text-[3vw] max-lg:flex-wrap max-lg:items-start max-lg:gap-[2vw]">
            {socialLinks.map((link) => (
              <SocialLink key={link.text} href={link.href} text={link.text} />
            ))}
          </ul>
        </div>
      </nav>
    </div>
  );
}

const HAMBURGER_LINES = [
  {
    d: "M0 70l28-28c2-2 2-2 7-2h64",
    closed: "[stroke-dasharray:30_111.2281341553] [stroke-dashoffset:-50.2281341553]",
    open: "[stroke-dasharray:22.627416998_111.2281341553] [stroke-dashoffset:-16.9705627485]",
  },
  {
    d: "M0 50h99",
    closed: "[stroke-dasharray:30_99] [stroke-dashoffset:-38]",
    open: "[stroke-dasharray:0_99] [stroke-dashoffset:-20]",
  },
  {
    d: "M0 30l28 28c2 2 2 2 7 2h64",
    closed: "[stroke-dasharray:30_111.2281341553] [stroke-dashoffset:-50.2281341553]",
    open: "[stroke-dasharray:22.627416998_111.2281341553] [stroke-dashoffset:-16.9705627485]",
  },
];

interface SideNavbarProps {
  navLinks?: NavLinkItem[];
  socialLinks?: SocialLinkItem[];
  panelWidth?: number | string;
  linkColor?: string;
  panelBackgroundColor?: string;
  panelOpacity?: number;
  panelBlur?: PanelBlur;
  openDuration?: number;
  linksStagger?: number;
  socialsStagger?: number;
}

const SideNavbar = ({
  navLinks,
  socialLinks,
  panelWidth,
  linkColor,
  panelBackgroundColor,
  panelOpacity,
  panelBlur,
  openDuration = 0.5,
  linksStagger = 0.05,
  socialsStagger = 0.05,
}: SideNavbarProps) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [buttonDisabled, setButtonDisabled] = useState(false);

  const handleMenuButtonClick = () => {
    setButtonDisabled(true);

    setMenuOpen((prevState) => {
      const newState = !prevState;

      return newState;
    });

    setTimeout(() => {
      setButtonDisabled(false);
    }, 700);
  };

  return (
    <>
      <header
        className={`fixed top-0 w-full z-[200] transition-all duration-300`}
      >
        <div className="w-full px-[4vw] pt-[2.2%] max-lg:pt-[1%] flex justify-between items-center max-md:py-[4%]">
          <div className="w-fit overflow-hidden">
            <Link prefetch={false} href="/" className="flex items-center gap-3 cursor-pointer">
              <svg width="30" height="30" viewBox="0 0 58 65" fill="none" xmlns="http://www.w3.org/2000/svg" className={` transition-all duration-300 motion-reduce:transition-none`}>
                <path d="M0 0H9.02977V28.5943H0V0Z" fill="#ffffff" />
                <path d="M57.1895 64.7134H48.1597V36.1192H57.1895V64.7134Z" fill="#ffffff" />
                <path d="M0.0195312 36.1192V64.7135H9.0493V42.139L21.5405 37.4737V28.7449L0.0195312 36.1192Z" fill="#ffffff" />
                <path d="M48.1777 22.5746V0.00012207H57.3579V28.5944L34.332 37.8697V28.5944L48.1777 22.5746Z" fill="#ffffff" />
                <path d="M21.9912 29.0459L28.4868 26.8346C28.8573 26.7085 29.2624 26.7316 29.6161 26.8992L34.7834 29.3469M21.9912 29.0459L28.1616 32.2063M21.9912 29.0459V37.1727L28.1616 40.0321M34.7834 29.3469L28.1616 32.2063M34.7834 29.3469C34.7834 32.3443 34.7834 34.1753 34.7834 37.1727L28.1616 40.0321M28.1616 32.2063V40.0321" stroke="#ffffff" strokeWidth="0.902977" />
              </svg>

              <div className="flex  items-center gap-2">
                <svg width="156" height="45" viewBox="0 0 351 43" fill="none" xmlns="http://www.w3.org/2000/svg" className={`transition-all duration-300 motion-reduce:transition-none`}>
                  <path d="M315.441 6.10352e-05H306.862L320.055 15.9603L324.019 21.0695L306.862 42.139H315.591L332.597 21.0695L328.555 15.9603L315.441 6.10352e-05Z" fill="#ffffff" />
                  <path d="M350.055 6.10352e-05H341.326L332.598 10.6853L336.962 15.9527L350.055 6.10352e-05Z" fill="#ffffff" />
                  <path d="M349.905 42.139L341.176 42.139L332.598 31.7548L336.962 26.3369L349.905 42.139Z" fill="#ffffff" />
                  <path d="M264.874 6.10352e-05H258.252V34.0122L269.088 42.139H289.555L300.391 34.0122V6.10352e-05H293.769V29.9349C293.769 30.4164 293.539 30.8688 293.149 31.152L287.543 35.2293C287.286 35.4164 286.976 35.5172 286.658 35.5172H271.985C271.667 35.5172 271.357 35.4164 271.1 35.2293L265.494 31.152C265.104 30.8688 264.874 30.4164 264.874 29.9349V6.10352e-05Z" fill="#ffffff" />
                  <rect x="244.406" y="6.10352e-05" width="6.62183" height="42.1389" fill="#ffffff" />
                  <path d="M195.043 0.000183105H228.002V6.62202H201.665V42.2896H195.043V0.000183105Z" fill="#ffffff" />
                  <path d="M233.269 24.0796L237.182 18.1404V6.62202V0.000183105H195.043V6.62202H230.56V15.8023L225.594 24.0796H233.269Z" fill="#ffffff" />
                  <path d="M221.078 17.7586H201.664V24.3804H217.466L229.205 42.139H237.163L221.078 17.7586Z" fill="#ffffff" />
                  <path d="M182.401 24.3804V17.7585H162.235L153.205 27.9923H162.084L165.245 24.3804H182.401Z" fill="#ffffff" />
                  <path d="M158.322 0H188.421V6.62183H161.031L152.904 15.9526V35.5171H188.421V42.1389H146.282V12.0397L158.322 0Z" fill="#ffffff" />
                  <rect x="97.5234" y="17.7585" width="6.62183" height="24.3804" fill="#ffffff" />
                  <path d="M139.662 0H97.5234V6.62183H133.041V17.7586H111.15L104.534 24.3804H133.643L139.662 18.0595V0Z" fill="#ffffff" />
                  <path d="M55.3826 10.8357L55.3826 0H48.7607L48.7607 14.8991L66.5754 24.2299L66.5193 42.1389H73.1411V24.2299L90.8997 14.7486V0H84.2779V10.8357L69.8302 18.4786L55.3826 10.8357Z" fill="#ffffff" />
                  <rect width="6.62183" height="42.1389" fill="#ffffff" />
                  <rect x="35.5166" width="6.62183" height="42.1389" fill="#ffffff" />
                  <rect x="6.62305" y="17.7585" width="28.8953" height="6.62183" fill="#ffffff" />
                </svg>
              </div>
            </Link>
          </div>
          <div className="flex items-center gap-8 relative z-[205] max-lg:gap-4 max-md:gap-0 max-md:items-start">
            <div className="w-[3.5vw] mr-[-0.5%] h-[3.5vw] max-md:w-[12vw] max-md:h-[15vw] relative max-lg:w-[8vw] max-lg:h-[10vw] max-md:mr-[-5%]">
              <button
                id="header-hamburger"
                disabled={buttonDisabled}
                onClick={handleMenuButtonClick}
                aria-label="Open Menu"
                className="group cursor-pointer pointer-events-auto h-[3.5vw] transition-all fixed z-[200] w-[3.5vw] max-md:w-[12vw] max-md:h-[12vw] max-lg:w-[8vw] max-lg:h-[8vw]"
              >
                <span
                  className={`absolute left-[5px] top-0 -z-10 block h-full w-full scale-[0.6] rounded-[60px] opacity-0 pointer-events-none  duration-300 ease-out group-hover:scale-90 group-hover:opacity-100 ${
                    menuOpen ? "bg-white" : "bg-[#111111]"
                  }`}
                />
                <svg
                  className="overflow-hidden w-full h-full transition-all duration-500 ease-out group-hover:translate-x-[2%] group-hover:scale-[0.7]"
                  viewBox="25 25 50 50"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  {HAMBURGER_LINES.map((line) => (
                    <path
                      key={line.d}
                      d={line.d}
                      className={`fill-none stroke-white stroke-2 [stroke-linecap:round] [stroke-linejoin:round] transition-all duration-500 ease-[cubic-bezier(0.19,1,0.22,1)] ${
                        menuOpen
                          ? `translate-x-[35px] group-hover:stroke-[#111111] ${line.open}`
                          : `translate-x-[3px] ${line.closed}`
                      }`}
                    />
                  ))}
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>
      <div className={`w-screen h-screen fixed inset-0 ${menuOpen ? "brightness-75 pointer-events-auto" : " "} transition-all duration-300 ease-out z-50`}>
        <Image src={"https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/h-27.jpg"} alt="sidenavbar image" className="w-full h-full absolute duration-300 brightness-90 object-cover" width={1920} height={1080} />
       <div className="w-full h-full flex flex-col justify-center items-center gap-[1.5vw] text-white relative z-1 duration-300 max-lg:px-[10vw]">
        <h1 className=" text-[5vw] max-md:text-[12vw] max-lg:text-[7vw]">
          Side Navbar
        </h1>
        <p className="max-lg:text-center">
          Click on the Hamburger to see the SideNavbar effect.
        </p>

       </div>
      </div>
      <Menu
        menuOpen={menuOpen}
        navLinks={navLinks}
        socialLinks={socialLinks}
        panelWidth={panelWidth}
        linkColor={linkColor}
        panelBackgroundColor={panelBackgroundColor}
        panelOpacity={panelOpacity}
        panelBlur={panelBlur}
        openDuration={openDuration}
        linksStagger={linksStagger}
        socialsStagger={socialsStagger}
      />
    </>
  );
};

export default SideNavbar;
