// Built using Hyperiux Vault: https://vault.hyperiux.com

"use client";
import { useEffect, useState } from "react";
import gsap from "gsap";
import ScrollTrigger from "gsap/dist/ScrollTrigger";
import architecture1 from "./assets/architecture-1.webp";
import architecture2 from "./assets/architecture-2.webp";
import architecture3 from "./assets/architecture-3.webp";
import architecture4 from "./assets/architecture-4.webp";
import architecture5 from "./assets/architecture-5.webp";
import squareIcon from "./assets/icons/square.svg";
import ParallaxImageAnimation from "./effects/parallax-image-animation/ParallaxImageAnimation";
import Image, { type StaticImageData } from "next/image";
import MaskTextReveal from "./effects/mask-text-reveal";
import PrimaryButton from "./PrimaryButton";
gsap.registerPlugin(ScrollTrigger);

const GLASS_PANEL_CLASS =
  "backdrop-blur-[14px] [backdrop-filter:blur(14px)]";

const WorkCardMeta = ({ image }: { image: StaticImageData }) => (
  <div className="flex items-center gap-[0.6vw] max-[1025px]:gap-[1vw] max-md:gap-[2vw]">
    <Image
      src={squareIcon}
      className="h-[1.2vw] w-[1.2vw] object-contain max-[1025px]:h-[2.2vw] max-[1025px]:w-[2.2vw] max-md:h-[4.5vw] max-md:w-[4.5vw]"
      alt="square-icon"
      aria-hidden="true"
    />
    <p className="tracking-tight text-[1vw]">
      {image.width} x {image.height}
    </p>
  </div>
);

const WorkCardPrimaryButton = ({ text }: { text: string }) => (
  <PrimaryButton
    link="#"
    btnText={text}
    className="fadeUp h-[2.9vw] w-fit px-[1vw] pr-[2.35vw] text-[0.85vw] gap-1 [--button-height:2.4vw] [--icon-circle:1.8vw] [--icon-right:0.3vw] max-[1025px]:h-[4vw] max-[1025px]:px-[1.6vw] max-[1025px]:pr-[4.1vw] max-[1025px]:text-[1.5vw] max-[1025px]:[--button-height:4vw] max-[1025px]:[--icon-circle:3vw] max-[1025px]:[--icon-right:0.5vw] max-md:h-[8vw] max-md:px-[3vw] max-md:pr-[8vw] max-md:text-[3vw] max-md:[--button-height:8vw] max-md:[--icon-circle:6vw] max-md:[--icon-right:1vw]"
  />
);

const WorkCardButton = ({ text }: { text: string }) => (
  <div>
    <WorkCardPrimaryButton text={text} />
  </div>
);

const workImages = {
  work5: architecture1,
  work1: architecture2,
  work2: architecture3,
  work4: architecture4,
  work3: architecture5,
};

const Works = () => {
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

  useEffect(() => {
    if (globalThis.innerWidth > 1024) {
      const ctx = gsap.context(() => {
        const body = document.body;
        const backgroundTitle = document.getElementById("work-bg-title");
        const changeSectionColors = ({
          bodyColor,
          titleColor,
        }: {
          bodyColor: string;
          titleColor: string;
        }) => {
          gsap.to(body, {
            backgroundColor: bodyColor,
            duration: 1,
            ease: "power2.out",
          });

          if (backgroundTitle) {
            gsap.to(backgroundTitle, {
              color: titleColor,
              duration: 1,
              ease: "power2.out",
            });
          }
        };
        ScrollTrigger.create({
          trigger: "#works",
          start: "top 60%",
          end: "bottom 20%",
          onEnter: () =>
            changeSectionColors({
              bodyColor: "#1C1C1C",
              titleColor: "#2A2A2A",
            }),
          onLeaveBack: () =>
            changeSectionColors({
              bodyColor: "#ffffff",
              titleColor: "#ffffff",
            }),
        });

        ScrollTrigger.create({
          trigger: "#project",
          start: "top 60%",
          onEnter: () =>
            changeSectionColors({
              bodyColor: "#ffffff",
              titleColor: "#ffffff",
            }),
          onLeaveBack: () =>
            changeSectionColors({
              bodyColor: "#1C1C1C",
              titleColor: "#2A2A2A",
            }),
        });
      });
      return () => ctx.revert();
    }
  }, []);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const imagePin = document.getElementById("work-bg-icon");
      const triggerSection = document.getElementById("works");
      ScrollTrigger.create({
        trigger: imagePin,
        start: "top 10%",
        endTrigger: triggerSection,
        end: "90% 80%",
        invalidateOnRefresh: true,
        pin: imagePin,
        // markers: true,

      });
    });
    return () => ctx.revert();
  }, []);

  return (
    <>
      <section id="works" className="w-full h-full overflow-hidden max-md:bg-[#1C1B1A] max-[1025px]:bg-[#1C1B1A] max-[1025px]:py-[10%]">
        <div className="relative mx-auto h-full w-full max-[1025px]:w-[85%] max-w-[90%] py-[5%] pb-[12%]">
          <div className="w-full flex justify-center relative z-2">
            <MaskTextReveal className="w-[85%] max-md:w-full max-[1025px]:w-[80%]">

            <h2
              data-para-anim
              className=" text-center font-heading font-neue-montreal text-[3.8vw] capitalize leading-tight text-white  max-md:text-[7vw]  max-[1025px]:text-[5.5vw]"
              >
              Lumera Heights is defined by bold architectural expression , where structure, form, and light come together to create a timeless vertical icon.
            </h2>
              </MaskTextReveal>
          </div>
          <div className="w-full h-full flex-col mt-[10vw] relative z-2 max-[1025px]:mt-[20vw] max-md:mt-[20vw]">
            <div className="flex w-full h-full justify-between max-[1025px]:flex-col max-[1025px]:gap-[10vw] max-md:gap-[10vw]">
              <div
                className="w-[40vw] h-full flex flex-col gap-[2vw] max-md:w-full max-md:gap-[7vw] max-[1025px]:w-full max-[1025px]:mx-auto"
                data-scroll
                data-scroll-speed={isMobile ? undefined : "0.1"}
              >
                <div className="w-[40vw] h-[27vw] relative rounded-[2vw] overflow-hidden p-[2vw] group max-md:w-[85vw] max-md:h-[70vw] max-md:p-[4vw]  max-[1025px]:w-[85vw] max-[1025px]:h-[70vw]">
                  <ParallaxImageAnimation
                    src={workImages.work5}
                    alt="work-img-5"
                    translateY="15%"
                    wrapperClassName="absolute inset-0 h-full w-full group-hover:scale-[1.1] transition-all ease-in-out duration-500"
                    imageClassName="scale-[1.5] -translate-y-[15%]"
                  />
                  <div className={` w-fit h-[3.5vw] p-[1vw] px-[1vw] rounded-[0.8vw] bg-white/40 relative z-3 text-[1.2vw] font-neue-montreal font-neue-montreal font-medium! ${GLASS_PANEL_CLASS} overflow-hidden group-hover:h-[11vw] transition-all ease-in-out duration-300 max-md:text-[3.5vw] max-md:h-[10vw] max-md:px-[3vw] max-md:py-[3vw] max-md:group-hover:h-[30vw] max-[1025px]:text-[2.5vw] max-[1025px]:h-[7vw] max-[1025px]:px-[2vw] text-[1.25vw] max-[1025px]:py-[2vw] max-[1025px]:group-hover:h-[20vw] max-md:w-[30vw]`}>
                    Living Room
                    <div className="w-full h-full flex flex-col gap-[1.5vw] max-[1025px]:mt-[2vw] mt-[0.5vw]">
                      <WorkCardMeta image={workImages.work5} />
                      <WorkCardButton text="View Gallery" />
                    </div>
                  </div>
                </div>

                <MaskTextReveal>

                <p data-para-anim className=" text-white w-[38vw] max-[1025px]:w-full mt-[2vw] max-md:text-[4.2vw] max-[1025px]:text-[3vw] text-[1.25vw] tracking-wide">
                  Every residence is thoughtfully crafted around light, proportion, and timeless materials. From expansive living spaces to serene private retreats, each detail creates an atmosphere of effortless sophistication above it.
                </p>
                </MaskTextReveal>
              </div>

              <div
                className="w-[25vw]  h-fit relative mr-[6%] mt-[40%] z-4 max-md:mt-0 max-md:mr-auto max-[1025px]:mt-0 max-[1025px]:w-full max-[1025px]:mx-auto "
                data-scroll
                data-scroll-speed={isMobile ? undefined : "-0.1"}
              >
                <div className="w-[25vw] max-md:w-[85vw] max-md:h-[70vw] h-[35vw] rounded-[2vw] absolute top-0 left-0 overflow-hidden max-[1025px]:relative p-[1.5vw] group  max-md:p-[4vw] fadeup max-[1025px]:w-[85vw] max-[1025px]:h-[70vw] max-md:ml-0">
                  <ParallaxImageAnimation
                    src={workImages.work1}
                    alt="work-img-1"
                    translateY="15%"
                    wrapperClassName="absolute inset-0 h-full w-full group-hover:scale-[1.1] transition-all ease-in-out duration-500"
                    imageClassName="scale-[1.5] -translate-y-[15%]"
                  />
                  <div className={`w-fit h-[3.5vw] p-[1vw] px-[1vw] rounded-[0.8vw] bg-white/40 relative z-3 text-[1.2vw] font-neue-montreal font-medium! ${GLASS_PANEL_CLASS} overflow-hidden group-hover:h-[11vw] transition-all ease-in-out duration-300 max-md:text-[3.5vw] max-md:h-[10vw] max-md:px-[3vw] max-md:py-[3vw] max-md:group-hover:h-[30vw] max-[1025px]:text-[2.5vw] max-[1025px]:h-[7vw] max-[1025px]:px-[2vw] text-[1.25vw] max-[1025px]:py-[2vw] max-[1025px]:group-hover:h-[20vw] max-md:w-[30vw]`}>
                    Kitchen
                    <div className="w-full h-full flex flex-col gap-[1.5vw] max-[1025px]:mt-[2vw] mt-[0.5vw]">
                      <WorkCardMeta image={workImages.work1} />
                      <WorkCardButton text="View Gallery" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div
              className="w-fit h-full  mt-[30vh] relative max-md:mt-[15vw] max-[1025px]:mt-[15vw] max-[1025px]:mx-auto"
              data-scroll
              data-scroll-speed={isMobile ? undefined : "-0.1"}
            >
              <div className="w-[47vw] h-[35vw] relative rounded-[2vw] overflow-hidden ml-[3%] p-[2vw] group max-md:w-[85vw] max-md:h-[70vw] max-md:ml-0 max-md:p-[4vw] fadeup max-[1025px]:w-[85vw] max-[1025px]:h-[70vw] max-[1025px]:ml-0">
                <ParallaxImageAnimation
                  src={workImages.work2}
                  alt="work-img-2"
                  translateY="15%"
                  wrapperClassName="absolute inset-0 h-full w-full group-hover:scale-[1.1] transition-all ease-in-out duration-500"
                  imageClassName="scale-[1.5] -translate-y-[15%]"
                />
                <div className={`w-fit h-[3.5vw] p-[1vw] px-[1vw] rounded-[0.8vw] bg-white/40 relative z-3 text-[1.2vw] font-neue-montreal font-medium! ${GLASS_PANEL_CLASS} overflow-hidden group-hover:h-[11vw] transition-all ease-in-out duration-300 max-md:text-[3.5vw] max-md:h-[10vw] max-md:px-[3vw] max-md:py-[3vw] max-md:group-hover:h-[30vw] max-[1025px]:text-[2.5vw] max-[1025px]:h-[7vw] max-[1025px]:px-[2vw] text-[1.25vw] max-[1025px]:py-[2vw] max-[1025px]:group-hover:h-[20vw] max-md:w-[30vw]`}>
                  Bedroom
                  <div className="w-full h-full flex flex-col max-[1025px]:mt-[2vw] gap-[1.5vw] mt-[0.5vw]">
                    <WorkCardMeta image={workImages.work2} />
                    <WorkCardButton text="View Gallery" />
                  </div>
                </div>
              </div>
               <MaskTextReveal className="w-[47vw] max-[1025px]:w-[70vw] max-md:w-full max-[1025px]:ml-0 max-md:ml-0 h-full flex ml-[3%] mt-[5vw]">



                <p data-para-anim className="w-[38vw] max-[1025px]:w-full text-white text-left text-[1.25vw] max-[1025px]:text-[3vw] max-md:w-full tracking-wide max-md:text-[4.2vw]">
                 From bespoke finishes to panoramic city views, every space is designed to elevate the everyday. Warm materials, considered proportions, and refined craftsmanship come together to create residences that feel as exceptional as the city beyond them.
                </p>
               
            
               </MaskTextReveal>
            </div>
            <div
              className="w-full h-full flex justify-between max-[1025px]:flex-col max-[1025px]:items-center mt-[15vh] max-md:mt-[10vw] max-md:flex-col max-[1025px]:mt-[10vw]"
              data-scroll
              data-scroll-speed={isMobile ? undefined : "0.1"}
            >
              <div className="w-[40vw] h-[27vw] relative rounded-[2vw] overflow-hidden mt-[10vw] p-[2vw] group max-[1025px]:w-[85vw] max-[1025px]:h-[70vw] max-[1025px]:mt-[10vw] max-md:w-[85vw] max-md:h-[70vw] max-md:mt-[10vw] max-md:p-[4vw] fadeup ">
                <ParallaxImageAnimation
                  src={workImages.work4}
                  alt="work-img-4"
                  translateY="15%"
                  wrapperClassName="absolute inset-0 h-full w-full group-hover:scale-[1.1] transition-all ease-in-out duration-500"
                  imageClassName="scale-[1.5] -translate-y-[15%]"
                />
                <div className={`w-fit h-[3.5vw] p-[1vw] px-[1vw] rounded-[0.8vw] bg-white/40 relative z-3 text-[1.2vw] font-neue-montreal font-medium! ${GLASS_PANEL_CLASS} overflow-hidden group-hover:h-[11vw] transition-all ease-in-out duration-300 max-md:text-[3.5vw] max-md:h-[10vw] max-md:px-[3vw] max-md:py-[3vw] max-md:group-hover:h-[30vw] max-[1025px]:text-[2.5vw] max-[1025px]:h-[7vw] max-[1025px]:px-[2vw] text-[1.25vw] max-[1025px]:py-[2vw] max-[1025px]:group-hover:h-[20vw] max-md:w-[30vw]`}>
                Bedroom
                  <div className="w-full h-full flex flex-col max-[1025px]:mt-[2vw] gap-[1.5vw] mt-[0.5vw]">
                    <WorkCardMeta image={workImages.work4} />
                    <WorkCardButton text="View Gallery" />
                  </div>
                </div>
              </div>
              <div
                className="w-[30vw] h-full flex flex-col items-center gap-[4.5vw] max-md:mt-[10vw] max-md:w-full max-[1025px]:w-full max-[1025px]:mt-[10vw]"
                data-scroll
                data-scroll-speed={isMobile ? undefined : "-0.1"}
              >
                <div className="w-[25vw] h-[35vw] overflow-hidden rounded-[2vw] relative p-[2vw] group max-md:w-[85vw] max-md:h-[70vw] max-md:p-[4vw] fadeup max-[1025px]:w-[85vw] max-[1025px]:h-[70vw]">
                  <ParallaxImageAnimation
                    src={workImages.work3}
                    alt="work-img-3"
                    translateY="15%"
                    wrapperClassName="absolute inset-0 h-full w-full group-hover:scale-[1.1] transition-all ease-in-out duration-500"
                    imageClassName="scale-[1.5] -translate-y-[15%]"
                  />
                  <div className={`w-fit h-[3.5vw] p-[1vw] px-[1vw] rounded-[0.8vw] bg-white/40 relative z-3 text-[1.2vw] font-neue-montreal font-medium! ${GLASS_PANEL_CLASS} overflow-hidden group-hover:h-[11vw] transition-all ease-in-out duration-300 max-md:text-[3.5vw] max-md:h-[10vw] max-md:px-[3vw] max-md:py-[3vw] max-md:group-hover:h-[30vw] max-[1025px]:text-[2.5vw] max-[1025px]:h-[7vw] max-[1025px]:px-[2vw] text-[1.25vw] max-[1025px]:py-[2vw] max-[1025px]:group-hover:h-[20vw] max-md:w-[30vw]`}>
                    Bathroom
                    <div className="w-full h-full flex flex-col max-[1025px]:mt-[2vw] gap-[1.5vw] mt-[0.5vw]">
                      <WorkCardMeta image={workImages.work3} />
                      <WorkCardButton text="View Gallery" />
                    </div>
                  </div>
                </div>
                <MaskTextReveal>

                <p data-para-anim className="text-white max-[1025px]:mt-[4vw] text-[1.25vw] tracking-wide max-md:text-[4.2vw] max-[1025px]:text-[3vw]">
                 Thoughtful interiors, refined materials, and breathtaking views come together in spaces designed for modern living at its highest level.
                </p>
                </MaskTextReveal>
              </div>
            </div>
          </div>
          <div
            className="w-full h-full absolute max-[1025px]:hidden top-[10%] left-0  right-0 work-bg-icon"
            id="work-bg-icon"
          >
            <div className="w-full h-[50vw] pb-6 relative flex items-center justify-center max-md:h-[90vw]">
              <h2
                id="work-bg-title"
                className="w-[60vw] text-center font-medium! text-white text-[14vw] leading-[1.2] max-md:w-[90vw] font-neue-montreal"
              >
                LUMERA HEIGHTS
              </h2>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default Works;
