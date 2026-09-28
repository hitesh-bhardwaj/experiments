"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import SVGPathComp from "./SVGPathComp";

const wavePath =
  "M1 209.434C58.5872 255.935 387.926 325.938 482.583 209.434C600.905 63.8051 525.516 -43.2211 427.332 19.9613C329.149 83.1436 352.902 242.723 515.041 267.302C644.752 286.966 943.56 181.94 995 156.5";

const circlePath =
  "M498 165 m -120, 0 a 120,120 0 1,0 240,0 a 120,120 0 1,0 -240,0";

const spiralPath =
  "M0 165C120 40 240 290 360 165C480 40 600 290 720 165C840 40 960 290 1080 165";

const svgPathImages = [
  "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/h-01.jpg",
  "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/h-02.jpg",
  "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/h-03.jpg",
  "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/h-13.jpg",
  "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/h-05.jpg",
  "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/h-06.jpg",
  "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/h-07.jpg",
  "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/h-08.jpg",
  "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/h-09.jpg",
  "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/h-10.jpg",
  "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/h-11.jpg",
  "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/h-12.jpg",
  "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/h-13.jpg",
  "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/h-14.jpg",
  "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/h-15.jpg",
];

const tabs = [
  {
    id: "circle",
    label: "Circle",
    path: circlePath,
    viewBox: "0 0 996 330",
    className: "h-full w-full scale-[1.1] max-[1025px]:scale-[1.55] max-md:scale-[1.95]",
    repeat: 1,
    baseVelocity: 8,
  },
  {
    id: "spiral",
    label: "Spiral",
    path: wavePath,
    viewBox: "0 0 996 330",
    className: "h-full w-full scale-[1.05] max-[1025px]:scale-[1.35] max-md:scale-[1.75]",
    repeat: 1.5,
    baseVelocity: 8,
  },
  {
    id: "wave",
    label: "Wave",
    path: spiralPath,
    viewBox: "0 0 1080 330",
    className: "h-full w-full scale-[1.08] max-[1025px]:scale-[1.3] max-md:scale-[1.65]",
    repeat: 1,
    baseVelocity: 8,
  },
];

const imgs = svgPathImages.map((src) => ({
  src,
  link: "/",
}));

interface SVGPathProps {
  bgColor?: string;
  baseVelocity?: number;
  dragSensitivity?: number;
  slowDownFactor?: number;
  draggable?: boolean;
}
export default function SVGPath({
  bgColor = "#000000",
  baseVelocity = 8,
  dragSensitivity = 0.1,
  slowDownFactor = 0.3,
  draggable = true,
}: SVGPathProps) {
  const [activeTab, setActiveTab] = useState("circle");

  const currentTab = useMemo(() => {
    return tabs.find((tab) => tab.id === activeTab) || tabs[0];
  }, [activeTab]);

  return (
    <>

      <section className="relative flex h-[180vh] w-dvw items-center justify-center overflow-hidden" style={{ backgroundColor: bgColor }}>
        <div className="fixed inset-0 h-svh w-dvw overflow-hidden" style={{ backgroundColor: bgColor }}>
          <div className="pointer-events-auto fixed left-1/2 bottom-[5%] max-[1025px]:bottom-[7%] z-20 flex -translate-x-1/2 items-center gap-[0.8vw] rounded-full border border-white/15 bg-white/10 p-[0.35vw] backdrop-blur-md  max-[1025px]:gap-[1.2vw] max-[1025px]:p-[0.7vw] max-md:w-fit max-[1025px]:h-fit max-md:justify-center max-md:gap-[2vw] max-md:p-[1.4vw]">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`rounded-full px-[1.2vw] py-[0.6vw] text-[0.9vw] font-medium transition-all duration-300 ease-in-out max-[1025px]:px-[2.4vw] max-[1025px]:py-[1.1vw] max-[1025px]:text-[1.8vw] max-md:px-[4vw] max-md:py-[2.2vw] max-md:text-[3.4vw] ${
                    isActive
                      ? "bg-white text-black"
                      : "bg-transparent text-white/65 hover:text-white"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <SVGPathComp
            key={`${currentTab.id}-${currentTab.path}`}
            path={currentTab.path}
            viewBox={currentTab.viewBox}
            baseVelocity={baseVelocity}
            slowdownOnHover
            slowDownFactor={slowDownFactor}
            draggable={draggable}
            useScrollVelocity
            repeat={currentTab.repeat}
            dragSensitivity={dragSensitivity}
            className={currentTab.className}
            responsive
            grabCursor
          >
            {imgs.map((img, i) => (
              <Link prefetch={false} key={`${currentTab.id}-${i}`} href={img.link}>
                <div className="h-full w-14 duration-300 ease-in-out hover:scale-150 max-[1025px]:w-16 max-md:w-18">
                  <Image
                    src={img.src}
                    alt={`Marquee path image ${i + 1}`}
                    width={56}
                    height={100}
                    className="h-full w-full object-cover"
                    draggable={false}
                  />
                </div>
              </Link>
            ))}
          </SVGPathComp>
        </div>
      </section>
    </>
  );
}
