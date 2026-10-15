// Built using Hyperiux Vault: https://vault.hyperiux.com
"use client";

import gsap from "gsap";
import React, { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

export interface AnimatedTabItem {
  id?: string | number;
  label: string;
  content: ReactNode;
}

export interface AnimatedTabsCompProps {
  tabs?: AnimatedTabItem[];
  defaultActiveIndex?: number;
  className?: string;
  animationType?: 'fade' | 'slide';
  slideDistance?: number;
  accentColor?: string;
  duration?: number;
}

const AnimatedTabsComp = ({
 tabs = [],
 defaultActiveIndex = 0,
 className ="",
 animationType ="slide", //"fade" |"slide"
 slideDistance = 40,
 accentColor ="#ff6b00",
 duration = 0.35,
}: AnimatedTabsCompProps) => {
 const safeDefaultIndex =
 tabs.length > 0
 ? Math.min(Math.max(defaultActiveIndex, 0), tabs.length - 1)
 : 0;

 const [activeTab, setActiveTab] = useState(safeDefaultIndex);
 const labelRefs = useRef<(HTMLButtonElement | null)[]>([]);
 const contentRefs = useRef<(HTMLDivElement | null)[]>([]);
 const activeLineRef = useRef<HTMLDivElement | null>(null);
 const reduceMotionRef = useRef(
 typeof window !=="undefined" &&
 (window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false)
 );
 const baseId = useId();
 const safeDuration = Math.max(0.05, Number(duration) || 0.35);

 useEffect(() => {
 const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
 if (!mq) return;
 const onChange = (event: MediaQueryListEvent) => {
 reduceMotionRef.current = event.matches;
 };
 reduceMotionRef.current = mq.matches;
 mq.addEventListener?.("change", onChange);
 return () => mq.removeEventListener?.("change", onChange);
 }, []);

 const moveActiveLine = (index: number) => {
 const activeLabel = labelRefs.current[index];
 const activeLine = activeLineRef.current;

 if (!activeLabel || !activeLine) return;

 gsap.to(activeLine, {
 x: activeLabel.offsetLeft,
 width: activeLabel.offsetWidth,
 duration: safeDuration,
 ease:"power3.out",
 });
 };

 const animateContent = (currentIndex: number, nextIndex: number) => {
 const currentContent = contentRefs.current[currentIndex];
 const nextContent = contentRefs.current[nextIndex];

 if (!currentContent || !nextContent || currentIndex === nextIndex) return;

 const direction = nextIndex > currentIndex ? 1 : -1;
 // Reduced-motion: opacity fade only - no X slide.
 const useSlide =
 animationType ==="slide" && !reduceMotionRef.current;

 gsap.killTweensOf([currentContent, nextContent]);

 if (useSlide) {
 gsap.to(currentContent, {
 opacity: 0,
 x: -direction * slideDistance,
 duration: safeDuration * 0.75,
 ease:"power2.out",
 onComplete: () => {
 gsap.set(currentContent, {
 display:"none",
 pointerEvents:"none",
 x: 0,
 });

 gsap.set(nextContent, {
 display:"block",
 pointerEvents:"auto",
 opacity: 0,
 x: direction * slideDistance,
 });

 gsap.to(nextContent, {
 opacity: 1,
 x: 0,
 duration: safeDuration,
 ease:"power3.out",
 });
 },
 });
 } else {
 gsap.to(currentContent, {
 opacity: 0,
 duration: safeDuration * 0.65,
 ease:"power2.out",
 onComplete: () => {
 gsap.set(currentContent, {
 display:"none",
 pointerEvents:"none",
 x: 0,
 });

 gsap.set(nextContent, {
 display:"block",
 pointerEvents:"auto",
 opacity: 0,
 x: 0,
 });

 gsap.to(nextContent, {
 opacity: 1,
 duration: safeDuration,
 ease:"power2.out",
 });
 },
 });
 }
 };

 const handleTabClick = (index: number) => {
 if (index === activeTab) return;

 animateContent(activeTab, index);
 moveActiveLine(index);
 setActiveTab(index);
 };

 const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
 const count = tabs.length;
 let nextIndex;

 switch (event.key) {
 case"ArrowRight":
 nextIndex = (index + 1) % count;
 break;
 case"ArrowLeft":
 nextIndex = (index - 1 + count) % count;
 break;
 case"Home":
 nextIndex = 0;
 break;
 case"End":
 nextIndex = count - 1;
 break;
 default:
 return;
 }

 event.preventDefault();
 labelRefs.current[nextIndex]?.focus();
 handleTabClick(nextIndex);
 };

 useLayoutEffect(() => {
 if (!tabs.length) return;

 const activeLabel = labelRefs.current[safeDefaultIndex];
 const activeLine = activeLineRef.current;

 if (activeLabel && activeLine) {
 gsap.set(activeLine, {
 x: activeLabel.offsetLeft,
 width: activeLabel.offsetWidth,
 });
 }

 contentRefs.current.forEach((content, index) => {
 if (!content) return;

 gsap.set(content, {
 display: index === safeDefaultIndex ?"block" :"none",
 opacity: index === safeDefaultIndex ? 1 : 0,
 pointerEvents: index === safeDefaultIndex ?"auto" :"none",
 x: 0,
 });
 });
 }, [tabs, safeDefaultIndex]);

 if (!tabs.length) return null;

 return (
 <div className={`h-full w-full px-[7vw] py-[7vw] max-lg:p-[6vw] max-md:px-[5vw] max-md:py-[8vw] ${className}`}>
 <div className="relative border-b  border-b-black/10">
 <div role="tablist" aria-orientation="horizontal" className="flex gap-[2vw] overflow-x-auto max-lg:gap-[3vw] max-md:gap-[4vw]">
 {tabs.map((tab, index) => (
 <button
 key={tab.id || index}
 ref={(el) => { labelRefs.current[index] = el; }}
 role="tab"
 id={`${baseId}-tab-${index}`}
 aria-selected={activeTab === index}
 aria-controls={`${baseId}-panel-${index}`}
 tabIndex={activeTab === index ? 0 : -1}
 onClick={() => handleTabClick(index)}
 onKeyDown={(event) => handleTabKeyDown(event, index)}
 className="relative cursor-pointer whitespace-nowrap border-none bg-transparent px-[2vw] py-[1vw] transition-colors duration-300 ease-in-out max-lg:px-[2.5vw] max-lg:py-[1.5vw] max-md:px-[3vw] max-md:py-[2.5vw]"
 style={{ color: activeTab === index ? accentColor : "rgba(0,0,0,0.5)" }}
 type="button"
 >
 <span className="text-[1.2vw] font-medium max-lg:text-[2.2vw] max-md:text-[4vw]">{tab.label}</span>
 </button>
 ))}
 </div>

 <div ref={activeLineRef} className="absolute bottom-0 left-0 h-0.5 max-md:h-[0.4vw]" style={{ backgroundColor: accentColor }} />
 </div>

 <div className="relative min-h-[24vw] w-full max-md:overflow-hidden pt-[2vw] max-lg:min-h-[32vw] max-lg:pt-[4vw] max-md:min-h-[48vw] max-md:pt-[5vw]">
 {tabs.map((tab, index) => (
 <div
 key={tab.id || index}
 ref={(el) => { contentRefs.current[index] = el; }}
 role="tabpanel"
 id={`${baseId}-panel-${index}`}
 aria-labelledby={`${baseId}-tab-${index}`}
 tabIndex={0}
 className="h-full w-full"
 style={{
 display: index === safeDefaultIndex ?"block" :"none",
 opacity: index === safeDefaultIndex ? 1 : 0,
 }}
 >
 {tab.content}
 </div>
 ))}
 </div>
 </div>
 );
};

const tabsData = [
  {
    id: "overview",
    label: "Overview",
    content: (
      <div className="h-full w-full rounded-[1.5vw] border border-black/20  p-[2vw] text-black backdrop-blur-sm max-lg:rounded-[2.5vw] max-lg:p-[4vw] max-md:rounded-[4vw] max-md:p-[5vw]">
        <h2 className="mb-[1vw] text-[2.2vw] font-medium leading-[1.1] max-lg:mb-[2vw] max-lg:text-[4.5vw] max-md:mb-[3vw] max-md:text-[7vw]">
          Digital Experiences That Feel Expensive
        </h2>

        <p className="w-[72%] text-[1.1vw] leading-relaxed text-black/70 max-lg:w-[90%] max-lg:text-[2.2vw] max-md:w-full max-md:text-[4vw] max-md:leading-[1.6]">
          Hyperiux designs and builds premium websites, product interfaces, and
          interaction systems for brands that cannot afford to look like another
          polite rectangle on the internet.
        </p>

        <div className="mt-[2vw] flex gap-[1.5vw] max-lg:mt-[3vw] max-lg:gap-[2.2vw] max-md:mt-[5vw] max-md:flex-col max-md:gap-[3vw]">
          <div className="flex-1 rounded-[1vw] border border-white/10  p-[1.5vw] max-lg:rounded-[1.8vw] max-lg:p-[2.5vw] max-md:rounded-[3vw] max-md:p-[4vw]">
            <h3 className="mb-[0.5vw] text-[2vw] font-semibold leading-none max-lg:mb-[1vw] max-lg:text-[3.8vw] max-md:mb-[1.5vw] max-md:text-[6vw]">
              UX
            </h3>
            <p className="text-[1vw] leading-[1.4] text-black/60 max-lg:text-[1.9vw] max-md:text-[3.7vw] max-md:leading-relaxed">
              Strategy, structure, and product thinking before pixels start behaving.
            </p>
          </div>

          <div className="flex-1 rounded-[1vw] border border-white/10  p-[1.5vw] max-lg:rounded-[1.8vw] max-lg:p-[2.5vw] max-md:rounded-[3vw] max-md:p-[4vw]">
            <h3 className="mb-[0.5vw] text-[2vw] font-semibold leading-none max-lg:mb-[1vw] max-lg:text-[3.8vw] max-md:mb-[1.5vw] max-md:text-[6vw]">
              UI
            </h3>
            <p className="text-[1vw] leading-[1.4] text-black/60 max-lg:text-[1.9vw] max-md:text-[3.7vw] max-md:leading-relaxed">
              Interfaces with sharper hierarchy, stronger taste, and fewer filler sections.
            </p>
          </div>

          <div className="flex-1 rounded-[1vw] border border-white/10  p-[1.5vw] max-lg:rounded-[1.8vw] max-lg:p-[2.5vw] max-md:rounded-[3vw] max-md:p-[4vw]">
            <h3 className="mb-[0.5vw] text-[2vw] font-semibold leading-none max-lg:mb-[1vw] max-lg:text-[3.8vw] max-md:mb-[1.5vw] max-md:text-[6vw]">
              Motion
            </h3>
            <p className="text-[1vw] leading-[1.4] text-black/60 max-lg:text-[1.9vw] max-md:text-[3.7vw] max-md:leading-relaxed">
              Scroll, hover, transition, and WebGL details that earn their place.
            </p>
          </div>
        </div>
      </div>
    ),
  },

  {
    id: "services",
    label: "Services",
    content: (
      <div className="h-full w-full rounded-[1.5vw] border border-black/20  p-[2vw] text-black backdrop-blur-sm max-lg:rounded-[2.5vw] max-lg:p-[4vw] max-md:rounded-[4vw] max-md:p-[5vw]">
        <h2 className="mb-[1vw] text-[2.2vw] font-medium leading-[1.1] max-lg:mb-[2vw] max-lg:text-[4.5vw] max-md:mb-[3vw] max-md:text-[7vw]">
          From Strategy to the Last Hover State
        </h2>

        <div className="mt-[2vw] grid grid-cols-2 gap-[1.5vw] max-lg:mt-[3vw] max-lg:gap-[2.2vw] max-md:mt-[5vw] max-md:grid-cols-1 max-md:gap-[4vw]">
          <div className="rounded-[1vw] border border-white/10  p-[1.4vw] max-lg:rounded-[1.8vw] max-lg:p-[2.2vw] max-md:rounded-[3vw] max-md:p-[4vw]">
            <h4 className="mb-[0.5vw] text-[1.3vw] font-medium leading-[1.2] max-lg:mb-[1vw] max-lg:text-[2.4vw] max-md:mb-[1.5vw] max-md:text-[4.5vw]">
              Website Redesign
            </h4>
            <p className="text-[1vw] leading-relaxed text-black/60 max-lg:text-[1.9vw] max-md:text-[3.8vw] max-md:leading-[1.6]">
              Rebuild tired pages into sharper digital experiences with clearer journeys.
            </p>
          </div>

          <div className="rounded-[1vw] border border-white/10  p-[1.4vw] max-lg:rounded-[1.8vw] max-lg:p-[2.2vw] max-md:rounded-[3vw] max-md:p-[4vw]">
            <h4 className="mb-[0.5vw] text-[1.3vw] font-medium leading-[1.2] max-lg:mb-[1vw] max-lg:text-[2.4vw] max-md:mb-[1.5vw] max-md:text-[4.5vw]">
              Product UX Design
            </h4>
            <p className="text-[1vw] leading-relaxed text-black/60 max-lg:text-[1.9vw] max-md:text-[3.8vw] max-md:leading-[1.6]">
              Flows, screens, systems, and decisions designed for real product use.
            </p>
          </div>

          <div className="rounded-[1vw] border border-white/10  p-[1.4vw] max-lg:rounded-[1.8vw] max-lg:p-[2.2vw] max-md:rounded-[3vw] max-md:p-[4vw]">
            <h4 className="mb-[0.5vw] text-[1.3vw] font-medium leading-[1.2] max-lg:mb-[1vw] max-lg:text-[2.4vw] max-md:mb-[1.5vw] max-md:text-[4.5vw]">
              Creative Frontend
            </h4>
            <p className="text-[1vw] leading-relaxed text-black/60 max-lg:text-[1.9vw] max-md:text-[3.8vw] max-md:leading-[1.6]">
              Next.js, animation, interaction systems, and frontend polish that feels deliberate.
            </p>
          </div>

          <div className="rounded-[1vw] border border-white/10  p-[1.4vw] max-lg:rounded-[1.8vw] max-lg:p-[2.2vw] max-md:rounded-[3vw] max-md:p-[4vw]">
            <h4 className="mb-[0.5vw] text-[1.3vw] font-medium leading-[1.2] max-lg:mb-[1vw] max-lg:text-[2.4vw] max-md:mb-[1.5vw] max-md:text-[4.5vw]">
              CRO & Performance
            </h4>
            <p className="text-[1vw] leading-relaxed text-black/60 max-lg:text-[1.9vw] max-md:text-[3.8vw] max-md:leading-[1.6]">
              Cleaner paths, faster pages, stronger messaging, and fewer leaks in the funnel.
            </p>
          </div>
        </div>
      </div>
    ),
  },

  {
    id: "contact",
    label: "Contact",
    content: (
      <div className="h-full w-full rounded-[1.5vw] border border-black/20  p-[2vw] text-black backdrop-blur-sm max-lg:rounded-[2.5vw] max-lg:p-[4vw] max-md:rounded-[4vw] max-md:p-[5vw]">
        <h2 className="mb-[1vw] text-[2.2vw] font-medium leading-[1.1] max-lg:mb-[2vw] max-lg:text-[4.5vw] max-md:mb-[3vw] max-md:text-[7vw]">
          Bring Us the Messy Part
        </h2>

        <p className="w-[72%] text-[1.1vw] leading-relaxed text-black/70 max-lg:w-[90%] max-lg:text-[2.2vw] max-md:w-full max-md:text-[4vw] max-md:leading-[1.6]">
          Send the brief, the broken homepage, the product flow, or the idea that
          still sounds better in your head. We will help turn it into something
          structured, useful, and memorable.
        </p>

        <div className="mb-[3vw] mt-[2vw] flex gap-[3vw] max-lg:mt-[3vw] max-lg:gap-[5vw] max-md:mt-[5vw] max-md:flex-col max-md:gap-[4vw]">
          <div className="flex flex-col gap-[0.3vw] max-lg:gap-[0.7vw] max-md:gap-[1vw]">
            <p className="text-[0.9vw] leading-[1.3] text-black/45 max-lg:text-[1.7vw] max-md:text-[3.4vw]">
              Email
            </p>
            <span className="text-[1.1vw] font-medium leading-[1.4] max-lg:text-[2.1vw] max-md:text-[4vw]">
              hello@hyperiux.com
            </span>
          </div>

          <div className="flex flex-col gap-[0.3vw] max-lg:gap-[0.7vw] max-md:gap-[1vw]">
            <p className="text-[0.9vw] leading-[1.3] text-black/45 max-lg:text-[1.7vw] max-md:text-[3.4vw]">
              Work With Us
            </p>
            <span className="text-[1.1vw] font-medium leading-[1.4] max-lg:text-[2.1vw] max-md:text-[4vw]">
              Strategy, UX, UI, frontend, CRO
            </span>
          </div>
        </div>
      </div>
    ),
  },
];

interface AnimatedTabsProps {
  defaultActiveIndex?: number;
  animationType?: "fade" | "slide";
  slideDistance?: number;
  accentColor?: string;
  duration?: number;
}

export default function AnimatedTabs({
  defaultActiveIndex = 0,
  animationType = "slide",
  slideDistance = 40,
  accentColor = "#ff6b00",
  duration = 0.35,
}: AnimatedTabsProps) {
  return (
    <section className="min-h-screen w-full bg-white">
      <AnimatedTabsComp
        key={`${defaultActiveIndex}-${animationType}-${slideDistance}`}
        tabs={tabsData}
        defaultActiveIndex={defaultActiveIndex}
        animationType={animationType}
        slideDistance={slideDistance}
        accentColor={accentColor}
        duration={duration}
      />
    </section>
  );
}
