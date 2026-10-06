"use client";
import gsap from "gsap";
import ScrollTrigger from "gsap/dist/ScrollTrigger";
import { SplitText } from "gsap/dist/SplitText";
import { useEffect, useId, type CSSProperties } from "react";

gsap.registerPlugin(ScrollTrigger, SplitText);

interface FeatureRevealTriggerRange {
  start?: string;
  end?: string;
}

interface FeatureRevealTriggers {
  no?: FeatureRevealTriggerRange;
  title?: FeatureRevealTriggerRange;
  content?: FeatureRevealTriggerRange;
  img?: FeatureRevealTriggerRange;
}

interface FeatureRevealProperty {
  image?: string;
  imgClass?: string;
  no?: string | number;
  number?: string | number;
  titleClass?: string;
  title?: string;
  contentClass?: string;
  paragraphs?: string[];
  triggers?: FeatureRevealTriggers;
}

const defaultPropertiesData: FeatureRevealProperty[] = [];

interface HorizontalScrollCompProps {
  propertiesData?: FeatureRevealProperty[];
  bgColor?: string;
  imageParallaxRange?: number;
  cardGap?: number;
}

export default function HorizontalScrollComp({
  propertiesData = defaultPropertiesData,
  bgColor = "#ffffff",
  imageParallaxRange = 30,
  cardGap = 15,
}: HorizontalScrollCompProps) {
  const uid = useId().replace(/:/g, "");
  const sectionId = `industries-${uid}`;

  useEffect(() => {
    const ctx = gsap.context(() => {
      if (window.innerWidth <= 1025) return;

      const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      gsap.set(
        ".industry-img, .industry-no, .industry-title, .industry-content",
        { opacity: 1 },
      );

      const head = document.querySelector(".industry-head");
      if (head) {
        const headSplit = new SplitText(head, { type: "chars" });

        gsap.from(
          headSplit.chars,
          reduceMotion
            ? {
                opacity: 0,
                stagger: 0.1,
                duration: 1,
                scrollTrigger: {
                  trigger: "#industries",
                  start: "top top",
                  end: "20% top",
                  scrub: true,
                },
              }
            : {
                yPercent: () =>
                  (Math.random() < 0.5 ? 1 : -1) * (200 * Math.random()),
                xPercent: () => 200 * Math.random(),
                stagger: 0.1,
                duration: 1,
                ease: "back.out",
                scrollTrigger: {
                  trigger: "#industries",
                  start: "top top",
                  end: "20% top",
                  scrub: true,
                },
              },
        );
      }

      gsap.to(".industry-container", {
        xPercent: -79,
        ease: "none",
        scrollTrigger: {
          trigger: `#${sectionId}`,
          start: "top top",
          end: "bottom bottom",
          scrub: true,
          // markers: true,
        },
      });

      const cards = document.querySelectorAll(".industry-card");

      cards.forEach((card, i) => {
        const cfg = propertiesData[i]?.triggers || ({} as FeatureRevealTriggers);
        const startNo = cfg.no?.start || "top 70%";
        const endNo = cfg.no?.end || "top 40%";
        const startTitle = cfg.title?.start || "top 70%";
        const endTitle = cfg.title?.end || "top 40%";
        const startContent = cfg.content?.start || "top 70%";
        const endContent = cfg.content?.end || "top 40%";
        const startImg = cfg.img?.start || "top 70%";
        const endImg = cfg.img?.end || "top 40%";

        const noEl = card.querySelector(`[class*="industry-no-"]`);
        if (noEl) {
          const splitNo = new SplitText(noEl, {
            type: "chars,lines",
            mask: "lines",
          });

          gsap.from(
            splitNo.chars,
            reduceMotion
              ? {
                  opacity: 0,
                  stagger: 0.1,
                  duration: 0.7,
                  scrollTrigger: {
                    trigger: "#industries",
                    start: startNo,
                    end: endNo,
                    toggleActions: "play none none reverse",
                  },
                }
              : {
                  y: 150,
                  rotate: 10,
                  stagger: 0.1,
                  duration: 0.7,
                  ease: "power2.out",
                  scrollTrigger: {
                    trigger: "#industries",
                    start: startNo,
                    end: endNo,
                    toggleActions: "play none none reverse",
                  },
                },
          );
        }

        // FIXED: query property-title instead of industry-title
        const titleEl = card.querySelector(`[class*="property-title-"]`);
        if (titleEl) {
          const titleLines = new SplitText(titleEl, {
            type: "lines",
            mask: "lines",
          });

          gsap.set(titleEl, { lineHeight: 1.2 });
          gsap.set(titleLines.lines, { lineHeight: 1.2 });

          gsap.from(
            titleLines.lines,
            reduceMotion
              ? {
                  opacity: 0,
                  stagger: 0.08,
                  duration: 0.7,
                  scrollTrigger: {
                    trigger: "#industries",
                    start: startTitle,
                    end: endTitle,
                    toggleActions: "play none none reverse",
                  },
                }
              : {
                  yPercent: 100,
                  stagger: 0.08,
                  duration: 0.7,
                  ease: "power2.out",
                  scrollTrigger: {
                    trigger: "#industries",
                    start: startTitle,
                    end: endTitle,
                    // markers: true,
                    toggleActions: "play none none reverse",
                  },
                },
          );
        }

        // FIXED: query property-content instead of industry-content
        const contentEls = card.querySelectorAll(`[class*="property-content-"]`);
        contentEls.forEach((contentEl) => {
          const contentLines = new SplitText(contentEl, {
            type: "lines",
            mask: "lines",
          });

          gsap.from(
            contentLines.lines,
            reduceMotion
              ? {
                  opacity: 0,
                  stagger: 0.08,
                  delay: 0.3,
                  duration: 0.7,
                  scrollTrigger: {
                    trigger: "#industries",
                    start: startContent,
                    end: endContent,
                    toggleActions: "play none none reverse",
                  },
                }
              : {
                  yPercent: 100,
                  stagger: 0.08,
                  delay: 0.3,
                  duration: 0.7,
                  ease: "power2.out",
                  scrollTrigger: {
                    trigger: "#industries",
                    start: startContent,
                    end: endContent,
                    toggleActions: "play none none reverse",
                  },
                },
          );
        });

        // this one was already okay, but keep it consistent
        const propertyImgs = card.querySelectorAll(`[class*="industry-img-"]`);
        propertyImgs.forEach((propertyImg) => {
          // Reduced motion: images stay put at translate-x-0, no scroll-tied
          // horizontal parallax.
          if (reduceMotion) {
            gsap.set(propertyImg, { x: 0 });
            return;
          }

          gsap.to(propertyImg, {
            translateX: `${imageParallaxRange}%`,
            ease: "none",
            scrollTrigger: {
              trigger: `#${sectionId}`,
              start: startImg,
              end: endImg,
              scrub: true,
              // markers:true
            },
          });
        });
      });

      ScrollTrigger.refresh();
    });

    return () => ctx.revert();
  }, [propertiesData, sectionId, imageParallaxRange]);


  return (
    <section
      className="w-screen h-[600vh] text-black relative z-10 max-[1025px]:mt-0 max-[1025px]:h-fit max-[1025px]:py-[15%] max-[1025px]:px-[7vw]"
      style={{ backgroundColor: bgColor }}
      id={sectionId}
    >

      <div className="w-screen  overflow-hidden h-screen justify-center items-center sticky top-0 max-[1025px]:static max-[1025px]:w-full max-[1025px]:h-fit max-[1025px]:flex max-[1025px]:flex-col max-[1025px]:items-start">


        <div
          className="flex flex-nowrap w-fit industry-container gap-(--card-gap) max-[1025px]:flex-col max-[1025px]:gap-[10vw] max-md:gap-[15vw]"
          style={{ "--card-gap": `${cardGap}vw` } as CSSProperties & Record<`--${string}`, string>}
        >
          {propertiesData.map((property, index) => (
            <div
              key={index}
              className="w-[80vw] h-screen flex gap-[5vw] industry-card max-[1025px]:h-fit max-[1025px]:flex-col-reverse max-[1025px]:w-full"
            >
              <div className="w-[40vw] h-screen overflow-hidden max-[1025px]:h-[110vw] max-[1025px]:w-full max-[1025px]:rounded-[4vw] max-[1025px]:h-[80vw] max-[1025px]:rounded-[2vw]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={property.image}
                  alt={`property-img-${index + 1}`}
                  className={`w-full h-full translate-x-(--image-shift-start) opacity-0 industry-img industry-${property.imgClass} max-[1025px]:translate-x-0 max-[1025px]:object-cover max-[1025px]:opacity-100`}
                  style={{ "--image-shift-start": `-${imageParallaxRange}%` } as CSSProperties & Record<`--${string}`, string | number>}
                  width={500}
                  height={1080}
                />
              </div>

              <div className="flex flex-col gap-[5vh] w-[60%] pt-[7%] max-[1025px]:pt-0 max-[1025px]:w-full max-[1025px]:gap-[4vw] max-[1025px]:gap-[7vw]">
                <p
                  className={`text-[6em] font-medium font-aeonik text-secondary leading-none opacity-0 industry-no industry-no-${property.no} max-[1025px]:text-[10vw] max-[1025px]:opacity-100`}
                >
                  {property.number}
                </p>

                <div className="w-full h-fit flex flex-col gap-[4vh] max-[1025px]:gap-[7vw]">
                  <h3
                    className={`text-[4em] opacity-0 industry-title max-[1025px]:text-[9vw] max-[1025px]:text-[7.5vw] max-[1025px]:opacity-100 leading-[1.3] ${property.titleClass}`}
                  >
                    {property.title}
                  </h3>

                  <div className="space-y-[1.5vw] max-[1025px]:text-[2.5vw] max-[1025px]:text-[4.2vw]">
                    {(property.paragraphs as string[]).map((para, pIndex) => (
                      <p
                        key={pIndex}
                        className={`opacity-0 industry-content max-[1025px]:opacity-100 ${property.contentClass}`}
                      >
                        {para}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
