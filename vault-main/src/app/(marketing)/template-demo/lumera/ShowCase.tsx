// Built using Hyperiux Vault: https://vault.hyperiux.com

"use client";
import React, { useEffect, useState, useRef } from "react";
import gsap from "gsap";
import ScrollTrigger from "gsap/dist/ScrollTrigger";
import showcasePoster from "./assets/video-poster.webp";
import MaskTextReveal from "./effects/mask-text-reveal";
import { FadeUp } from "./gsapAnimations";
gsap.registerPlugin(ScrollTrigger);

const nearbyLandmarks = ["Burj Khalifa", "Dubai Mall", "Downtown Dubai", "Palm Jumeirah"];
const dubaiLivingVideo = new URL("./assets/dubai-living.mp4", import.meta.url).toString();

const ShowCase = () => {
  const [isMobile, setIsMobile] = useState(false);

  const checkIsMobile = () => {
    setIsMobile(window.innerWidth < 1024);
  };

  useEffect(() => {
    const frameId = window.requestAnimationFrame(checkIsMobile);
    window.addEventListener("resize", checkIsMobile);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", checkIsMobile);
    };
  }, []);

  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoLoaded, setVideoLoaded] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const video = videoRef.current;
            if (video && !videoLoaded) {
              video.src = dubaiLivingVideo;
              video.load();
              video.play();
              setVideoLoaded(true);
            }
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.5 }
    );

    const videoElement = videoRef.current;
    if (videoElement) {
      observer.observe(videoElement);
    }

    return () => {
      if (videoElement) observer.unobserve(videoElement);
    };
  }, [videoLoaded]);

  useEffect(() => {
    if (globalThis.innerWidth > 1024) {
      const ctx = gsap.context(() => {
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: "#showcase",
            start: "40% 80%",
            end: "bottom bottom",
            scrub: 0.25,
          },
        });
        tl.to(".video-block", {
          width: "90vw",
          height: "40vw",
          yPercent: 30,
          right: "5%",
          ease: "power1.out",
          duration: 5,
        });
        tl.to(".inner-detail", {
          opacity: 1,
          duration: 1,
        });
      });
      return () => ctx.revert();
    }
  }, []);

  return (
    <section
      id="showcase"
      className="py-[10%]  relative z-5 max-lg:pb-[15%]"
      data-scroll
      data-scroll-speed={isMobile ? undefined : "-0.3"}
    >
      <div className={`px-[5%] h-full relative`}>
        <div className="flex w-full gap-[10vw] max-lg:flex-col">
          <MaskTextReveal className="w-[50%] max-lg:w-full">

          <h2
            data-para-anim
            className={` text-[#1C1B1A] font-neue-montreal font-medium! text-[3.8vw] leading-[1.2]  max-lg:text-[6.8vw] max-md:text-[8.8vw] max-lg:w-full`}
            >
            At the Heart of
            <br />
            Dubai Living
          </h2>
            </MaskTextReveal>

           
          <div className="w-[40vw] h-[22vw] overflow-hidden rounded-full video-block absolute right-[10%] rtl:left-[10%] rtl:right-auto max-lg:w-[90vw] max-lg:h-[50vw] max-lg:static max-lg:rounded-[4vw]">
            <video
              ref={videoRef}
              poster={showcasePoster.src}
              muted
              loop
              playsInline
              className="w-full h-full object-cover object-center"
            ></video>
            <div
              className={`inner-detail absolute bottom-[8%] left-1/2 translate-x-[-50%] z-6 flex items-center gap-[2vw] rounded-full bg-black/30 backdrop-blur-[10px] px-[2.2vw] py-[1.2vw] opacity-0 max-lg:static max-lg:mt-[4vw] max-lg:w-fit max-lg:flex-wrap max-lg:gap-[3vw] max-lg:px-[5vw] max-lg:py-[4vw] max-lg:opacity-100 max-md:opacity-100`}
            >
              <p data-para-anim className="text-[1.1vw] leading-tight text-white max-lg:text-[3vw]">
                Nearby
                <br />
                Landmarks:
              </p>
              <div className="flex items-center  gap-[2vw] max-lg:flex-wrap max-lg:gap-[3vw]">
                {nearbyLandmarks.map((landmark, index) => (
                  <React.Fragment key={landmark}>
                    {index !== 0 && <span className="h-[1.4vw] w-px shrink-0 bg-white/40 max-lg:hidden" />}
                    <p data-para-anim className="whitespace-nowrap text-[1.1vw] text-white max-lg:text-[3vw]">
                      {landmark}
                    </p>
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>

        </div>

        <div className="w-full h-full mt-[48vw] flex justify-end max-lg:mt-[7vw]">
          <MaskTextReveal className="w-[40%] max-lg:w-full">

          <p data-para-anim className=" max-md:text-[4.2vw] max-lg:text-[3vw] mr-[5vw] text-[1.2vw] text-black  tracking-wide">
            Perfectly located in one of Dubai&apos;s most prestigious districts, Lumera Heights offers unmatched access to culture, business, and lifestyle destinations.
          </p>
          </MaskTextReveal>
        </div>
      </div>
    </section>
  );
};

export default ShowCase;
