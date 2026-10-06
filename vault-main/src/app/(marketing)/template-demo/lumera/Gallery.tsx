// Built using Hyperiux Vault: https://vault.hyperiux.com
"use client";

import { useRef } from "react";
import gsap from "gsap";
import Image, { type StaticImageData } from "next/image";
import { prefersReducedMotion } from "./reducedMotion";
import masterLivingRoomIcon from "./assets/icons/master-living-room.svg";
import privateStudyIcon from "./assets/icons/private-study.svg";
import waterPavilionIcon from "./assets/icons/water-pavilion.svg";
import spaIcon from "./assets/icons/spa.svg";
import sunkenSunIcon from "./assets/icons/sunken-sun.svg";
import beachLoungeIcon from "./assets/icons/beach-lounge.svg";
import poolAndBeachIcon from "./assets/icons/pool-and-beach.svg";
import privateBeachIcon from "./assets/icons/private-beach.svg";
import entranceLobby from "./assets/icons/entrance-lobby.svg";
import featureStaircase from "./assets/icons/feature-staircase.svg";
import gallery1 from "./assets/gallery-1.webp";
import gallery2 from "./assets/gallery-2.webp";
import gallery3 from "./assets/gallery-3.webp";
import gallery4 from "./assets/gallery-4.webp";
import gallery5 from "./assets/gallery-5.webp";
import gallery6 from "./assets/gallery-6.webp";
import gallery7 from "./assets/gallery-7.webp";
import gallery8 from "./assets/gallery-8.webp";
import gallery9 from "./assets/gallery-9.webp";
import gallery10 from "./assets/gallery-10.webp";


import MaskTextReveal from "./effects/mask-text-reveal";
import { FadeUp } from "./gsapAnimations";

interface GalleryFeature {
  name: string;
  icon: StaticImageData;
  image: StaticImageData;
  color: string;
}

const leftFeatures: GalleryFeature[] = [
  {
    name: "Entrance Lobby",
    icon: entranceLobby,
    image: gallery1,
    color: "#E5DCCF",
  },
  {
    name: "Feature Staircase",
    icon: featureStaircase,
    image: gallery2,
    color: "#E0D4C6",
  },
  {
    name: "Private Master Living Room",
    icon: masterLivingRoomIcon,
    image: gallery3,
    color: "#DED2C2",
  },
  {
    name: "Private Study / Cigar Bar",
    icon: privateStudyIcon,
    image: gallery4,
    color: "#E4D9CB",
  },
  {
    name: "Water Pavilion",
    icon: waterPavilionIcon,
    image: gallery5,
    color: "#DDD1C0",
  },
];

const rightFeatures: GalleryFeature[] = [
  {
    name: "Spa",
    icon: spaIcon,
    image: gallery6,
    color: "#E2D7C8",
  },
  {
    name: "Sunken Sun Bed Deck",
    icon: sunkenSunIcon,
    image: gallery7,
    color: "#E6DCCE",
  },
  {
    name: "Beach Lounge & Fireplace",
    icon: beachLoungeIcon,
    image: gallery8,
    color: "#DFD3C3",
  },
  {
    name: "Pool & Beach Shower",
    icon: poolAndBeachIcon,
    image: gallery9,
    color: "#E3D8CA",
  },
  {
    name: "Private Beach",
    icon: privateBeachIcon,
    image: gallery10,
    color: "#E7DDD0",
  },
];

// Matches Awards.tsx's per-card reveal: each hovered feature's image grows
// in from its own center (scale 0 -> slightly over 1) and stacks on top of
// whatever's already there, instead of sliding across. Hovering quickly
// shows several images scaling up over one another rather than one shared
// element being replaced.
const IMAGE_REVEAL_DURATION = 0.45;
const IMAGE_REVEAL_EASE = "power2.out";
const IMAGE_ACTIVE_SCALE = 1.05;

const Gallery = () => {
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLElement>(null);

  const handleImageHover = (feature: GalleryFeature) => {
    const { image: imgSrc, color } = feature;

    if (bodyRef.current) {
      if (prefersReducedMotion()) {
        bodyRef.current.style.backgroundColor = color;
      } else {
        gsap.to(bodyRef.current, { backgroundColor: color, duration: 0.5 });
      }
    }

    const previewContainer = previewContainerRef.current;
    if (!previewContainer) return;

    const newImg = document.createElement("img");
    newImg.src = imgSrc.src;
    newImg.style.position = "absolute";
    newImg.style.inset = "0";
    newImg.style.objectFit = "cover";

    previewContainer.appendChild(newImg);

    if (prefersReducedMotion()) {
      // No animation to wait on - everything behind it can go immediately.
      Array.from(previewContainer.children)
        .filter((child) => child !== newImg)
        .forEach((child) => child.remove());
      return;
    }

    gsap.fromTo(
      newImg,
      { scale: 0 },
      {
        scale: IMAGE_ACTIVE_SCALE,
        duration: IMAGE_REVEAL_DURATION,
        ease: IMAGE_REVEAL_EASE,
        onComplete: () => {
          // Once fully grown this image opaquely covers everything BEHIND
          // it, so only its older siblings (appended before it) are safe to
          // drop here. Deliberately never touches anything appended AFTER
          // it: under fast hovering, several images can be mid-grow at
          // once, and this tween's onComplete can fire after a newer image
          // has already been appended on top of it - removing that newer,
          // still-animating (or still-loading) image is exactly what made
          // fast hovers look like "the new image never rendered and the
          // old one just vanished." Walking only previousElementSibling
          // guarantees a completed image can never delete something newer
          // than itself.
          let sibling = newImg.previousElementSibling;
          while (sibling) {
            const toRemove = sibling;
            sibling = sibling.previousElementSibling;
            gsap.killTweensOf(toRemove);
            toRemove.remove();
          }
        },
      }
    );
  };

  const renderColumn = (columnFeatures: GalleryFeature[]) => {
    return (
      <div className="flex flex-col gap-[3vw] w-full max-[1025px]:gap-[4vw]">
        {columnFeatures.map((feature, index) => (
          <div
            key={index}
            className="cursor-pointer"
            onMouseEnter={() => handleImageHover(feature)}
          >
            <div className="fadeup flex gap-[2vw]  items-center pb-[1vw] max-md:gap-[4vw] max-[1025px]:pb-[1.5vw]">
              <div className="h-[2.6vw] w-[2.6vw] shrink-0 max-md:w-[9vw] max-md:h-[9vw] max-[1025px]:w-[3.5vw] max-[1025px]:h-[3.5vw]">
                <div className="w-full h-full relative">
                  <Image
                    quality={100}
                    loading="lazy"
                    src={feature.icon}
                    fill
                    sizes="(max-width: 768px) 9vw, (max-width: 1024px) 3.5vw, 2.6vw"
                    alt={feature.name}
                  />
                </div>
              </div>
              <h4 className="font-head uppercase text-[1.25vw] tracking-wide max-md:text-[3.8vw] max-[1025px]:text-[2.2vw] text-[#2B2B2B]">
                {feature.name}
              </h4>
            </div>
            <div className="bg-[#11111154] w-full h-px lineDraw"></div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <section className="py-[5%] bg-[#E0D4C6] relative z-10 max-md:py-[10%] max-[1025px]:py-[7%]" ref={bodyRef}>
      <div className="px-[5%] max-md:px-[6%]">
        <MaskTextReveal>

        <h2
          data-title-anim
          className={`font-neue-montreal font-medium! text-[#1C1B1A] text-[3.8vw] leading-[1.2] max-[1025px]:text-[6.8vw] max-md:text-[8.8vw] mb-[2vw]`}
          >
          Core Features
        </h2>
          </MaskTextReveal>

          <MaskTextReveal className="w-[40%] max-[1025px]:w-full">

        <p data-para-anim className=" max-md:py-[3vw] max-[1025px]:text-[3.5vw] max-md:text-[4.2vw] text-[1.25vw] text-[#1C1B1A] tracking-wide ">
          The interiors of Lumera Heights reflect a refined balance of modern luxury and functional elegance.
        </p>
          </MaskTextReveal>

          <FadeUp>

          
        <div className="w-full mt-[6vw]  mb-[2vw] relative flex items-start justify-between gap-[3vw] max-[1025px]:flex-col max-md:gap-[4vw]">
          <div className="w-[27%] my-auto max-[1025px]:w-full max-[1025px]:order-1">{renderColumn(leftFeatures)}</div>

          <div className="w-[33%] h-[45vw] shrink-0 z-10 overflow-hidden relative fadeup max-[1025px]:static max-[1025px]:w-full max-md:w-full max-md:h-[120vw] max-[1025px]:h-[70vw] max-[1025px]:order-0">
            <div className="w-full h-full relative overflow-hidden" ref={previewContainerRef}>
              <Image
                src={leftFeatures[0].image}
                alt="Core feature preview"
                fill
                sizes="(max-width: 1024px) 100vw, 33vw"
                quality={100}
                className="object-cover w-full h-full"
              />
            </div>
          </div>

          <div className="w-[27%] my-auto max-[1025px]:w-full max-[1025px]:order-2">{renderColumn(rightFeatures)}</div>
        </div>
        </FadeUp>
      </div>
    </section>
  );
};

export default Gallery;
