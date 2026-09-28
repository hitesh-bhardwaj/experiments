// Built using Hyperiux Vault: https://vault.hyperiux.com

"use client";

import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import Image, { type StaticImageData } from "next/image";
import gsap from "gsap";
import ScrollTrigger from "gsap/dist/ScrollTrigger";
import { SplitText } from "gsap/dist/SplitText";
import project1 from "../../assets/project-1-new.webp";
import project11 from "../../assets/project-1.1.webp";
import project12 from "../../assets/project-1.2.webp";
import project13 from "../../assets/project-1.3.webp";
import project14 from "../../assets/project-1.4.webp";
import project2 from "../../assets/project-2.webp";
import project21 from "../../assets/project-2.1.webp";
import project22 from "../../assets/project-2.2.webp";
import project23 from "../../assets/project-2.3.webp";
import project24 from "../../assets/project-2.4.webp";
import project3 from "../../assets/project-3-new.webp";
import project31 from "../../assets/project-3.1.webp";
import project32 from "../../assets/project-3.2.webp";
import project33 from "../../assets/project-3.3.webp";
import project34 from "../../assets/project-3.4.webp";
import project4 from "../../assets/project-4-new.webp";
import project41 from "../../assets/project-4.1.webp";
import project42 from "../../assets/project-4.2.webp";
import project43 from "../../assets/project-4.3.webp";
import project44 from "../../assets/project-4.4.webp";
import CharStaggerButton from "../char-stagger-button";
import { FadeUp } from "../../gsapAnimations";

gsap.registerPlugin(ScrollTrigger, SplitText);


export const FEATURE_SECTION_ID = "lumera-features";

const TEXT_FILL_STYLE_PREFIX = "lumera-tfa-style-";
const SPLIT_CHARACTER_SELECTOR = ".split-chars";
const TEXT_FILL_HOLD_VH = 100;
const TEXT_FILL_COPY =
  "Life above the City, Where Every Moment is Framed by Sweeping Skyline Views and Natural Light.";

interface FeatureStat {
  value: string;
  label: string;
}

interface FeatureItem {
  number: string;
  title: string;
  description: string;
  image: StaticImageData;
  thumbnails: StaticImageData[];
  cta: string;
  stats: FeatureStat[];
}

const RESIDENCE_DATA: FeatureItem[] = [
  {
    number: "01",
    title: "The Palm Residence",
    description:
      "A contemporary beachfront villa shaped around open spaces, uninterrupted sea views and effortless indoor-outdoor living.",
    image: project1,
    thumbnails: [project11, project12, project13, project14],
    cta: "View Residence",
    stats: [
      { value: "12,400 sq. ft.", label: "Living Area" },
      { value: "06", label: "Bedrooms" },
      { value: "08", label: "Bathrooms" },
      { value: "AED 48,000,000", label: "Price" },
    ],
  },
  {
    number: "02",
    title: "Skyline Crest Penthouse",
    description:
      "An expansive penthouse retreat with wraparound terraces, double-height entertaining spaces and panoramic city views in every direction.",
    image: project2,
    thumbnails: [project21, project22, project23, project24],
    cta: "Explore Penthouse",
    stats: [
      { value: "9,850 sq. ft.", label: "Living Area" },
      { value: "05", label: "Bedrooms" },
      { value: "07", label: "Bathrooms" },
      { value: "AED 36,500,000", label: "Price" },
    ],
  },
  {
    number: "03",
    title: "Lagoon Courtyard Villa",
    description:
      "A tranquil villa collection centered around private gardens, water-facing lounges and refined interiors crafted for everyday ease.",
    image: project3,
    thumbnails: [project31, project32, project33, project34],
    cta: "Discover Villa",
    stats: [
      { value: "10,200 sq. ft.", label: "Living Area" },
      { value: "05", label: "Bedrooms" },
      { value: "06", label: "Bathrooms" },
      { value: "AED 29,900,000", label: "Price" },
    ],
  },
  {
    number: "04",
    title: "Marina Horizon Estate",
    description:
      "A statement residence overlooking the water, pairing spa-style amenities, curated entertaining zones and a seamless resort atmosphere.",
    image: project4,
    thumbnails: [project41, project42, project43, project44],
    cta: "See Estate",
    stats: [
      { value: "14,100 sq. ft.", label: "Living Area" },
      { value: "07", label: "Bedrooms" },
      { value: "09", label: "Bathrooms" },
      { value: "AED 54,000,000", label: "Price" },
    ],
  },
];

export default function HorizontalFeatureRevealSection() {
  const uid = useId().replace(/:/g, "");
  const sectionId = FEATURE_SECTION_ID;
  const textFillId = `lumera-residences-${uid}-textfill`;
  const imageParallaxRange = 20;

  const textFillSlideRef = useRef<HTMLDivElement | null>(null);
  const textFillHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkIsMobile = () => setIsMobile(window.innerWidth <= 1025);
    checkIsMobile();
    window.addEventListener("resize", checkIsMobile);
    return () => window.removeEventListener("resize", checkIsMobile);
  }, []);

  useEffect(() => {
    const styleId = `${TEXT_FILL_STYLE_PREFIX}${textFillId}`;
    const styleElement = document.createElement("style");

    styleElement.id = styleId;
    styleElement.textContent = `
      @keyframes lumera-color-transition-${textFillId} {
        0% { color: rgba(28, 27, 26, 0.18); }
        30% { color: rgba(28, 27, 26, 0.7); }
        100% { color: #1c1b1a; }
      }

      #${textFillId} .split__wrapper ${SPLIT_CHARACTER_SELECTOR} {
        transition: color .4s;
        color: rgba(28, 27, 26, 0.18);
      }

      #${textFillId} .split__wrapper ${SPLIT_CHARACTER_SELECTOR}.show {
        animation: lumera-color-transition-${textFillId} .5s;
        color: #1c1b1a;
      }
    `;

    document.head.appendChild(styleElement);

    const ctx = gsap.context(() => {
      const isDesktop = window.innerWidth > 1025;
      const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      // Split the heading into characters up front - both branches below
      // need it, they just differ in how the reveal is driven.
      const headingElement = textFillHeadingRef.current;
      let textFillSplit: SplitText | null = null;
      let characters: Element[] = [];

      if (headingElement) {
        textFillSplit = SplitText.create(headingElement, {
          type: "words chars",
          aria: false as never,
          tag: "span",
          charsClass: "split-chars",
        });

        gsap.set(headingElement, { opacity: 1 });
        characters = Array.from(
          headingElement.querySelectorAll(SPLIT_CHARACTER_SELECTOR),
        );
      }

      let containerTween: gsap.core.Tween | undefined;

      if (isDesktop) {
        gsap.set(".lumera-residence-image, .lumera-residence-number, .lumera-residence-title, .lumera-residence-copy, .lumera-residence-stat, .lumera-residence-cta", { opacity: 1 });

        containerTween = gsap.to(".lumera-residence-track", {
          xPercent: -80.24,
          ease: "none",
          scrollTrigger: {
            trigger: `#${sectionId}`,
            start: `top+=${TEXT_FILL_HOLD_VH}vh top`,
            end: "bottom bottom",
            scrub: true,
          },
        });

        if (characters.length) {
          if (reduceMotion) {
            gsap.set(characters, { className: "split-chars show" });
          } else {
            gsap.timeline({
              scrollTrigger: {
                trigger: `#${sectionId}`,
                start: "top 40%",
                end: `top+=${TEXT_FILL_HOLD_VH * 0.5}vh top`,
                scrub: 0.3,
              },
            }).to(
              characters,
              {
                className: "split-chars show",
                duration: 0.4,
                stagger: 0.04,
                ease: "power2.inOut",
              },
              0,
            );
          }
        }
      } else if (characters.length) {
        if (reduceMotion) {
          gsap.set(characters, { className: "split-chars show" });
        } else {
          gsap.timeline({
            scrollTrigger: {
              trigger: `#${textFillId}`,
              start: "top 80%",
              end: "bottom 40%",
              scrub: 0.3,
            },
          }).to(
            characters,
            {
              className: "split-chars show",
              duration: 0.4,
              stagger: 0.04,
              ease: "power2.inOut",
            },
            0,
          );
        }
      }

      if (!isDesktop) {
        return () => {
          textFillSplit?.revert();
        };
      }

      const cards = gsap.utils.toArray<HTMLElement>(".lumera-residence-card");

      cards.forEach((card) => {
        const animateTarget = (
          selector: string,
          animation: gsap.TweenVars,
          splitType: "chars,lines" | "lines" = "lines",
          delay = 0,
        ) => {
          const element = card.querySelector(selector);
          if (!element) {
            return;
          }

          const split = new SplitText(element, {
            type: splitType,
            mask: "lines",
          });

          const targets = splitType === "chars,lines" ? split.chars : split.lines;

          gsap.from(
            targets,
            {
              ...animation,
              stagger: 0.05,
              duration: 0.7,
              delay,
              ease: "power2.out",
              scrollTrigger: {
                trigger: card,
                start: "left center",
                toggleActions: "play none none reverse",
                horizontal: true,
                containerAnimation: containerTween,
              },
            },
          );
        };

        animateTarget(".lumera-residence-number", { y: 120, rotate: 8 }, "chars,lines");
        animateTarget(".lumera-residence-title", { yPercent: 100 });

        card.querySelectorAll(".lumera-residence-copy").forEach((element, index) => {
          const split = new SplitText(element, { type: "lines", mask: "lines" });

          gsap.from(
            split.lines,
            {
              yPercent: 100,
              stagger: 0.05,
              duration: 0.7,
              delay: index * 0.05,
              ease: "power2.out",
              scrollTrigger: {
                trigger: card,
                start: "left center",
                toggleActions: "play none none reverse",
                horizontal: true,
                containerAnimation: containerTween,
              },
            },
          );
        });

        gsap.from(card.querySelectorAll(".lumera-residence-stat"), {
          y: 40,
          opacity: 0,
          stagger: 0.08,
          duration: 0.6,
          ease: "power2.out",
          scrollTrigger: {
            trigger: card,
            start: "left center",
            toggleActions: "play none none reverse",
            horizontal: true,
            containerAnimation: containerTween,
          },
        });

        const image = card.querySelector<HTMLElement>(".lumera-residence-image");
        if (image) {
          gsap.fromTo(
            image,
            { xPercent: -imageParallaxRange },
            {
              xPercent: imageParallaxRange,
              ease: "none",
              scrollTrigger: {
                trigger: card,
                start: "left right",
                end: "50% left",
                scrub: true,
                horizontal: true,
                // markers:true,
                containerAnimation: containerTween,
              },
            },
          );
        }
      });

      ScrollTrigger.refresh();

      return () => {
        textFillSplit?.revert();
      };
    });

    return () => {
      ctx.revert();
      document.getElementById(styleId)?.remove();
    };
  }, [sectionId, textFillId]);

  return (
    <section
      id={sectionId}
      className="relative h-[850vh] bg-[#F3F3F3] text-[#1c1b1a] max-[1025px]:h-auto"
    >
      <div className="sticky top-0 h-screen overflow-hidden max-[1025px]:static max-[1025px]:h-auto">
        <div
          className="lumera-residence-track flex h-full w-fit gap-0  max-[1025px]:flex-col max-[1025px]:gap-[12vw]  max-[1025px]:pb-[15%]"
          style={{ "--card-gap": "4vw" } as CSSProperties}
        >
          <div
            id={textFillId}
            ref={textFillSlideRef}
            className="flex h-screen w-screen flex-none items-center justify-center overflow-hidden bg-white px-[5vw] max-[1025px]:h-auto max-[1025px]:w-full max-[1025px]:py-[20vh]"
          >
            <div className="split__wrapper relative z-10 mx-auto w-[80%] max-[1025px]:w-[90%]">
              <h2
                ref={textFillHeadingRef}
                className="text-center text-[3.8vw] font-neue-montreal leading-[1.3] font-medium! text-[#1c1b1a] opacity-0 max-[1025px]:opacity-100 max-[1025px]:text-[5vw] max-md:text-[8.5vw] max-[1025px]:leading-[1.08]"
              >
                {TEXT_FILL_COPY}
              </h2>
            </div>
          </div>

          {RESIDENCE_DATA.map((item) => {
            const CardTag = isMobile ? FadeUp : "article";
            return (
            <CardTag
              key={item.number}
              {...(isMobile ? { as: "article" as const } : {})}
              className="lumera-residence-card max-[1025px]:px-[6%]  flex h-screen w-[98vw] flex-none overflow-hidden rounded-none bg-[#F3F3F3] max-[1025px]:h-auto max-[1025px]:w-full max-[1025px]:flex-col"
            >
              <div className="h-full w-[42%] overflow-hidden max-md:h-[60vh] max-[1025px]:h-[60vh]  max-[1025px]:w-full max-[1025px]:rounded-[4vw]">
                <Image
                  src={item.image}
                  alt={item.title}
                  width={1000}
                  height={1000}
                  quality={95}
                  className="lumera-residence-image h-full w-full object-cover opacity-0 scale-[1.2] max-[1025px]:translate-x-0 max-[1025px]:scale-100 max-[1025px]:opacity-100"
                />
              </div>

              <div className="flex  flex-col justify-between px-[3.5vw] py-[3.5vw] max-[1025px]:w-full max-[1025px]:px-0 max-[1025px]:pt-[7vw]">
                <div>
                  <p className="lumera-residence-number text-[#1c1b1a] font-neue-montreal text-[5.8vw] font-medium! leading-none max-[1025px]:text-[7vw]  opacity-0 max-md:text-[12vw] max-[1025px]:opacity-100">
                    {item.number}
                  </p>

                  <h3 className="lumera-residence-title mt-[2vw] max-[1025px]:text-[5vw] font-neue-montreal text-[3.8vw] font-medium!  leading-[1.2] text-[#1c1b1a] tracking-tighter opacity-0 max-[1025px]:mt-[5vw] max-[1025px]:max-w-full max-md:text-[7vw] max-[1025px]:opacity-100">
                    {item.title}
                  </h3>

                  <p className="lumera-residence-copy mt-[3vw] max-w-[38vw] text-[1.25vw] leading-[1.6] text-[#1c1b1a] opacity-0 max-[1025px]:mt-[6vw] max-[1025px]:max-w-full max-[1025px]:text-[3vw] max-md:text-[4vw] max-[1025px]:opacity-100">
                    {item.description}
                  </p>

                  <div className="mt-[2.2vw] grid grid-cols-4 max-[1025px]:mt-[7vw] max-[1025px]:grid-cols-2">
                    {item.stats.map((stat, index) => (
                      <div
                        key={`${item.number}-${stat.label}`}
                        className={`lumera-residence-stat w-[14vw] max-[1025px]:w-[45vw] relative py-[0.95vw] opacity-0 max-[1025px]:py-[4vw] max-[1025px]:opacity-100 ${
                          index === 0 ? "pr-[2vw]" : "pl-[2vw] pr-[1.2vw]"
                        } ${
                          index === item.stats.length - 1 ? "pr-0" : ""
                        } max-[1025px]:px-0`}
                      >
                        {index !== 0 ? (
                          <span
                            aria-hidden="true"
                            className="absolute left-0 top-1/2 h-[6vw] w-px -translate-y-1/2 bg-[#DADADA] max-[1025px]:hidden"
                          />
                        ) : null}
                        <p className="text-[1.45vw] font-medium! leading-none tracking-[-0.04em] max-[1025px]:text-[3.5vw] max-md:text-[5vw]">
                          {stat.value}
                        </p>
                        <p className="mt-[0.8vw] text-[1.25vw] text-black max-[1025px]:mt-[1.8vw] max-[1025px]:text-[2.5vw] max-md:text-[3.2vw]">
                          {stat.label}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-[1vw] flex flex-col items-start justify-between gap-[2vw] max-md:flex-wrap max-[1025px]:mt-[8vw] max-[1025px]:flex-col max-[1025px]:items-start">

                  <div className="flex max-md:flex-gap gap-[1vw] max-[1025px]:gap-[3vw]">
                    {item.thumbnails.map((thumb, index) => (
                     
                      <div
                        
                        key={`${item.number}-thumb-${index}`}
                        className="overflow-hidden h-[6.2vw] w-[6.2vw]  rounded-md bg-[#ddd4ca] max-[1025px]:rounded-[4vw] group max-[1025px]:h-[20vw] max-[1025px]:w-[20vw]"
                        >
                        <Image
                          src={thumb}
                          alt={`${item.title} preview ${index + 1}`}
                          width={1000}
                          height={1000}
                          quality={95}
                          className="  object-cover group-hover:scale-[1.2] duration-300 ease-in-out transition-all h-full w-full "
                          />
                      </div>
                   
                    ))}
                  </div>
           

                  <CharStaggerButton
                    text={item.cta}
                    href="#"
                    
                    hoverColor="#1c1b1a"
                    className="lumera-residence-cta gap-[1vw]  pb-[0.6vw] text-[#1c1b1a] opacity-0 transition-opacity max-[1025px]:pb-[1.8vw] max-[1025px]:pt-[4vw] max-[1025px]:opacity-100"
                    textClassName="font-neue-montreal text-[1.2vw] leading-none max-[1025px]:text-[6vw]"
                  />
                </div>
              </div>
            </CardTag>
            );
          })}
        </div>
      </div>
    </section>
  );
}
