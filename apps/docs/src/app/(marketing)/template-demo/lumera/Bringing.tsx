// Built using Hyperiux Vault: https://vault.hyperiux.com

"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/dist/ScrollTrigger";

import BlackButton from "./BlackButton";
import bringingPoster from "./assets/video-poster-2.webp";
import { prefersReducedMotion } from "./reducedMotion";
import MaskTextReveal from "./effects/mask-text-reveal";
import { useEnquiryModal } from "./EnquiryModal";
import { FadeUp } from "./gsapAnimations";

gsap.registerPlugin(ScrollTrigger);

const dubaiExperienceVideo = new URL("./assets/dubai-experience.mp4", import.meta.url).toString();

const Bringing = () => {
  const { openEnquiryModal } = useEnquiryModal();
  const BringingRef = useRef<HTMLElement>(null);
  const headingLineOneRef = useRef<HTMLDivElement>(null);
  const headingLineTwoRef = useRef<HTMLDivElement>(null);
  const headingLineThreeRef = useRef<HTMLDivElement>(null);
  const videoWrapperRef = useRef<HTMLDivElement>(null);
  const bodyCopyRef = useRef<HTMLParagraphElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mobileVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (prefersReducedMotion()) return;

    const videos = [videoRef.current, mobileVideoRef.current].filter(
      (video): video is HTMLVideoElement => video !== null
    );
    if (!videos.length) return;

    const loadedVideos = new Set<HTMLVideoElement>();

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const video = entry.target as HTMLVideoElement;
          if (entry.isIntersecting && !loadedVideos.has(video)) {
            video.src = dubaiExperienceVideo;
            video.load();
            video.play();
            loadedVideos.add(video);
            observer.unobserve(video);
          }
        });
      },
      { threshold: 0.5 }
    );

    videos.forEach((video) => observer.observe(video));

    return () => {
      videos.forEach((video) => observer.unobserve(video));
    };
  }, []);

  useEffect(() => {
    if (prefersReducedMotion()) return;

    if (globalThis.innerWidth > 1024 && BringingRef.current) {
      const ctx = gsap.context(() => {
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: BringingRef.current,
            start: "top 50%",
            end: "+=2000 bottom",
            scrub: true,
            // markers:true,
          },
          defaults: {
            ease: "none",
          },
        });
        tl.from(headingLineOneRef.current, {
          xPercent: 120,
          duration: 3,
          ease: "power2.inout",
        }, 0);
        tl.from(headingLineTwoRef.current, {
          xPercent: -120,
          duration: 3,
          ease: "power2.inout",
        }, 0);
        tl.from(headingLineThreeRef.current, {
          xPercent: 120,
          duration: 3,
          ease: "power2.inout",
        }, 0);
        tl.to(videoWrapperRef.current, {
          scale: 4,
          xPercent: -140,
          yPercent: -30,
          position: "absolute",
          duration: 3,
        }, 2.8);
        tl.from(bodyCopyRef.current, {
          y: 50,
          opacity: 0,
          duration: 1,
        }, ">");
      }, BringingRef);
      return () => ctx.revert();
    }
  }, []);

  return (
    <>
    <section id="bringing" className="hidden max-[1025px]:block bg-white isolate py-[10%] max-md:py-[20%] max-[1025px]:py-[10%]">
      <div className="px-[5%] w-full">
        <div className="flex flex-col items-center justify-center w-full gap-[5vw]">
          <div className="flex flex-col gap-2 items-center justify-center">
            <MaskTextReveal>
              <p className="text-[9vw] font-medium text-[#353430] font-neue-montreal leading-[1.1] font-heading uppercase text-center max-[1025px]:leading-[1.3] max-[1025px]:text-[9vw]">
                Better Way To
              </p>
            </MaskTextReveal>
            <MaskTextReveal>
              <p className="text-[9vw] font-medium text-[#353430] font-neue-montreal leading-[1.1] font-heading uppercase text-center max-[1025px]:leading-[1.3] max-[1025px]:text-[9vw]">
                Experience
              </p>
            </MaskTextReveal>
            <MaskTextReveal>
              <p className="text-[9vw] font-medium text-[#353430] font-neue-montreal leading-[1.1] font-heading uppercase text-center max-[1025px]:leading-[1.3] max-[1025px]:text-[9vw]">
                Dubai Property
              </p>
            </MaskTextReveal>
          </div>

          <div className="w-[90vw] h-[50vw] max-md:h-[70vw] rounded-lg overflow-hidden">
            <video
              ref={mobileVideoRef}
              poster={bringingPoster.src}
              muted
              loop
              playsInline
              className="w-full h-full object-cover transition-opacity duration-500"
            />
          </div>

          <div className="w-full flex flex-col items-center gap-[2.5vw]">
            <MaskTextReveal>
              <p className="font-body text-[1.25vw] max-[1025px]:text-[3vw] max-md:text-[4.2vw] text-center">
                We look beyond the listing to understand what makes a property worth considering - from its location and layout to its condition, positioning and long-term relevance. The result is a more focused property journey, built around better information and fewer distractions.
              </p>
            </MaskTextReveal>

            <FadeUp>
              <div className="max-md:pt-4">
                <BlackButton
                  btnText="Speak With an Advisor"
                  link="#"
                  onClick={(event) => {
                    event.preventDefault();
                    openEnquiryModal();
                  }}
                  className="bg-[#1c1b1a]"
                  borderColor="#1c1b1a"
                />
              </div>
            </FadeUp>
          </div>
        </div>
      </div>
    </section>
    <section id="bringing-desktop" className="max-[1025px]:hidden bg-white isolate h-[200vh]" ref={BringingRef}>
      <div className="sticky top-0 h-screen overflow-hidden">
        <div className={`px-[5%] w-full h-full py-[10%] relative max-md:py-[20%] max-[1025px]:py-[10%]`}>
          <div className="flex flex-col items-center justify-center w-full h-full gap-[5vw]">
            <div className="flex flex-col gap-8 items-center justify-center">
              <div ref={headingLineOneRef}>
                <p className={`text-[9vw] font-medium text-[#353430] leading-[1.1] font-neue-montreal uppercase max-[1025px]:leading-[1.3] max-[1025px]:text-[9vw]`}>
                  Better Way To
                </p>
              </div>
              <div ref={headingLineTwoRef} className="w-full h-full flex justify-center gap-[3vw]">
                <p className={`text-[9vw] font-medium text-[#353430] leading-[1.1] font-neue-montreal uppercase max-[1025px]:leading-[1.3] max-[1025px]:text-[9vw]`}>
                  Experience
                </p>
                <div className="h-full w-[20vw] relative rounded-lg max-[1025px]:absolute max-md:top-[30%] max-[1025px]:w-[90vw] max-[1025px]:top-[35%]">
                  <div
                    ref={videoWrapperRef}
                    className="w-[20vw] h-[10vw] absolute z-100 top-0 rounded-[0.6vw] overflow-hidden max-[1025px]:w-[90vw] max-md:h-[70vw] max-[1025px]:h-[50vw]"
                  >
                    <video
                      ref={videoRef}
                      poster={bringingPoster.src}
                      muted
                      loop
                      playsInline
                      className={`w-full h-full object-cover transition-opacity duration-500`}
                    />
                  </div>
                </div>
              </div>
              <div ref={headingLineThreeRef} className="relative z-[-1] max-[1025px]:z-1">
                <p className={`text-[9vw] font-medium text-[#353430] leading-[1.1] font-neue-montreal uppercase max-[1025px]:leading-[1.3] max-[1025px]:text-[9vw]`}>
                  Dubai Property
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
    <div className="max-[1025px]:hidden w-[60%] pb-[10vw] flex flex-col items-center gap-[2.5vw] mx-auto bg-white">
      <MaskTextReveal>
        <p
          ref={bodyCopyRef}
          className={`font-aeonik-pro text-[1.25vw] max-[1025px]:text-[3.5vw] text-center`}
        >
          We look beyond the listing to understand what makes a property worth considering - from its location and layout to its condition, positioning and long-term relevance. The result is a more focused property journey, built around better information and fewer distractions.
        </p>
      </MaskTextReveal>

      <FadeUp>
        <div className="max-md:pt-4">
          <BlackButton
            btnText="Speak With an Advisor"
            link="#"
            onClick={(event) => {
              event.preventDefault();
              openEnquiryModal();
            }}
            className="bg-[#1c1b1a]"
            borderColor="#1c1b1a"
          />
        </div>
      </FadeUp>
    </div>
    </>
  );
};

export default Bringing;
