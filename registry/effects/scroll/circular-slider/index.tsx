// Built using Hyperiux Vault: https://vault.hyperiux.com
"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/dist/ScrollTrigger";
import { ArrowRight } from "lucide-react";
import { useEffect, useRef } from "react";

gsap.registerPlugin(ScrollTrigger);

interface CircularSliderProduct {
 heading?: string;
 text?: string;
 title?: string;
 description?: string;
 link?: string;
 bgColor?: string;
 textColor?: string;
 ctaLabel?: string;
}

interface CircularSliderCompProps {
 heading?: string;
 para?: string;
 data?: CircularSliderProduct[];
 items?: CircularSliderProduct[];
 title?: string;
 subtitle?: string;
 /** Card background colors, cycled across the cards. Overrides item bgColor. */
 cardColors?: string[];
 /** Card text colors, cycled across the cards. Overrides item textColor. */
 textColors?: string[];
 /** Moves the whole wheel up (negative) or down (positive), in vh. */
 verticalOffset?: number;
 gap?: number;
 cardWidth?: number;
 cardHeight?: number;
 showBottomText?: boolean;
}

const CircularSliderComp = ({
 heading,
 para,
 data = [],
 items,
 title,
 subtitle,
 cardColors,
 textColors,
 verticalOffset = 0,
 gap = 24,
 cardWidth = 320,
 cardHeight = 360,
 showBottomText = true,
}: CircularSliderCompProps) => {
 const outerRef = useRef<HTMLElement | null>(null);
 const wheelRef = useRef<HTMLDivElement | null>(null);
 const resolvedItems = (items ?? data).map((item, i) => ({
 ...item,
 bgColor: cardColors?.length ? cardColors[i % cardColors.length] : item.bgColor,
 textColor: textColors?.length ? textColors[i % textColors.length] : item.textColor,
 }));
 const resolvedTitle = title ?? heading;
 const resolvedSubtitle = subtitle ?? para;
 const resolvedGap = Math.max(0, gap);
 const resolvedCardWidth = Math.max(220, cardWidth);
 const resolvedCardHeight = Math.max(240, cardHeight);

 useEffect(() => {
 const ctx = gsap.context(() => {
 const wheel = wheelRef.current as HTMLDivElement;
 const cards = gsap.utils.toArray(".wheel-card") as HTMLElement[];

 // Tracks the rotation (in degrees) needed to bring the last card into
 // view. This depends on the gap prop, so it must be recomputed any
 // time the layout is (re)measured, not hardcoded.
 const rotationTargetRef = { current: 0 };

 const setup = () => {
 const radius = wheel.offsetWidth / 1.1;
 const center = wheel.offsetWidth / 2;
 const total = cards.length;
 const gapAngle = radius > 0 ? resolvedGap / radius : 0;
 const slice = ((0.58 * Math.PI) + gapAngle * Math.max(total - 1, 0)) / Math.max(total, 1);

 cards.forEach((item, i) => {
 const angle = i * slice;
 const x = center + radius * Math.sin(angle);
 const y = center - radius * Math.cos(angle);

 gsap.set(item, {
 rotation: `${angle}_rad`,
 xPercent: -50,
 yPercent: -50,
 x,
 y,
 });
 });

 // The wheel needs to rotate far enough that the last card's angle
 // (which grows as gap increases) is brought fully into place.
 // Previously this was a fixed -87deg, which only matched the last
 // card's position when gap was small; as gap grew, slice grew, the
 // last card's angle exceeded 87deg, and the scroll animation ended
 // before reaching it.
 const lastAngle = (total - 1) * slice;
 rotationTargetRef.current = -(lastAngle * (180 / Math.PI));
 };

 setup();
 window.addEventListener("resize", setup);

 const tween = gsap.to(wheel, {
 rotate: () => rotationTargetRef.current,
 ease:"none",
 scrollTrigger: {
 trigger: outerRef.current,
 start:"top top",
 end:"+=1500 top",
 scrub: 0.25,
 invalidateOnRefresh: true,
 },
 });

 return () => {
 window.removeEventListener("resize", setup);
 tween.kill();
 };
 }, outerRef);

 return () => ctx.revert();
 }, [resolvedGap, resolvedItems.length]);

 return (
 <>

 <section
 ref={outerRef}
 className="max-lg:hidden relative h-[250vh] bg-[#111111]"
 >
 <div
 className="sticky top-0 h-screen flex flex-col items-center justify-between pb-[3%] overflow-hidden"
 >
 <div className="w-full flex justify-center pt-[6%]">
 <h2 className="text-[2.5vw] uppercase tracking-widest text-center">
 {resolvedTitle}
 </h2>
 </div>

 {/* Wheel */}
 <div
 className="absolute top-[65vw] w-full h-screen"
 style={{ transform: `translateY(${verticalOffset}vh)` }}
 >
 <div
 ref={wheelRef}
 className="absolute flex items-center justify-center top-0 left-[49%] -translate-x-1/2 w-screen h-[100vw] max-w-[125vw] max-h-[125vw]"
 >
 {resolvedItems.map((product, i) => (
 <div
 key={i}
 className="wheel-card absolute top-0 left-0"
 style={{ width: `${resolvedCardWidth}px`, height: `${resolvedCardHeight}px` }}
 >
 <SliderCard
 heading={product.title ?? product.heading}
 text={product.description ?? product.text}
 link={product.link}
 bgColor={product.bgColor}
 textColor={product.textColor}
 ctaLabel={product.ctaLabel}
 />
 </div>
 ))}
 </div>
 </div>

 {showBottomText ? (
 <div className="w-full flex justify-center pb-[2%]">
 <p className="font-light uppercase tracking-widest text-[2.2vw] text-center">
 {resolvedSubtitle}
 </p>
 </div>
 ) : null}
 </div>
 </section>

 {/* Mobile / Tablet */}
 <section
 className="hidden max-lg:block py-[15vw] px-[5vw] bg-[#111111]"
 >
 <h2 className="text-center max-lg:text-[3.5vw] max-md:text-[7vw] font-extralight uppercase tracking-widest mb-[10vw]">
 {resolvedTitle}
 </h2>
 <div className="flex flex-col items-center gap-[5vw] max-md:gap-[10vw]">
 {resolvedItems.map((product, i) => (
 <div
 key={i}
 className="max-lg:w-full rounded-[5vw] overflow-hidden"
 style={{ width: "min(85vw, 100%)", maxWidth: `${resolvedCardWidth}px` }}
 >
 <SliderCard
 heading={product.title ?? product.heading}
 text={product.description ?? product.text}
 link={product.link}
 bgColor={product.bgColor}
 textColor={product.textColor}
 ctaLabel={product.ctaLabel}
 />
 </div>
 ))}
 </div>
 {showBottomText ? (
 <p className="text-center font-light uppercase tracking-widest max-lg:text-[2.5vw] max-md:text-[6vw] mt-[10vw]">
 {resolvedSubtitle}
 </p>
 ) : null}
 </section>

 </>
 );
};

const SliderCard = ({
 heading,
 text,
 link,
 bgColor,
 textColor,
 ctaLabel = "See More",
}: CircularSliderProduct) => {
 const cardContent = (
 <div
 className="w-full h-full max-lg:h-auto rounded-[1.5vw] max-lg:rounded-[5vw] max-md:rounded-2xl flex flex-col items-stretch justify-between gap-10 max-lg:gap-8 max-md:gap-6 hover:shadow-xl transition-all duration-500 px-[10%] max-lg:px-[8%] max-md:px-6 py-20 max-lg:py-12 max-md:py-10"
 style={{
 backgroundColor: bgColor ||"rgba(255,255,255,0.7)",
 color: textColor ||"inherit",
 }}
 >
 <div className="flex flex-col items-center gap-4 max-md:gap-4 justify-center">
 <h2
 className="text-center font-medium text-[1.8vw] max-lg:text-3xl max-md:text-2xl uppercase"
 style={{ color: textColor ||"inherit" }}
 >
 {heading}
 </h2>
 <p
 className="text-[1.15vw] max-md:text-lg max-lg:text-xl text-center mt-[0.5vw] max-md:mt-1"
 style={{ color: textColor ||"inherit" }}
 >
 {text}
 </p>
 </div>

 <div className="mt-[1vw] max-md:mt-2 flex items-center cursor-pointer justify-center gap-[0.5vw] max-md:gap-2 group/btn">
 <span
 className="text-[1vw] max-md:text-xs max-lg:text-lg uppercase tracking-widest"
 style={{ color: textColor ||"inherit" }}
 >
 {ctaLabel}
 </span>
 <ArrowRight />
 </div>
 </div>
 );

 if (!link) {
 return cardContent;
 }

 return (
 <a href={link} className="block w-full h-full max-lg:h-auto">
 {cardContent}
 </a>
 );
 };

const defaultItems = [
  {
    title: "Arrow Fill Button",
    description: "Primary button with an expanding fill and animated arrow",
    bgColor: "#655A7C",
    textColor: "#2A2433",
  },
  {
    title: "Custom Cursor",
    description: "Interactive cursor that transforms every hover",
    bgColor: "#AB92BF",
    textColor: "#3D2E50",
  },
  {
    title: "Text Scramble",
    description: "Dynamic text reveal with glitch-style transitions",
    bgColor: "#AFC1D6",
    textColor: "#2C3E52",
  },
  {
    title: "Hover Reveal Card",
    description: "Cards that come alive on hover interaction",
    bgColor: "#CEF9F2",
    textColor: "#1A5C53",
  },
  {
    title: "Scroll Animations",
    description: "Smooth GSAP-powered scroll-based animations",
    bgColor: "#D6CA98",
    textColor: "#4A3F1A",
  },
  {
    title: "Circular Slider",
    description: "Rotating card slider with immersive motion",
    bgColor: "#655A7C",
    textColor: "#2A2433",
  },
];

const MAX_COLORS = 6;

interface CircularSliderProps {
  items?: CircularSliderProduct[];
  title?: string;
  subtitle?: string;
  gap?: number;
  cardWidth?: number;
  cardHeight?: number;
  showBottomText?: boolean;
  /** Moves the whole wheel up (negative) or down (positive), in vh. */
  verticalOffset?: number;
  /** How many card colors to cycle through (1 to number of cards). */
  cardColorCount?: number;
  cardColor1?: string;
  cardColor2?: string;
  cardColor3?: string;
  cardColor4?: string;
  cardColor5?: string;
  cardColor6?: string;
  /** How many text colors to cycle through (1 to number of cards). */
  textColorCount?: number;
  textColor1?: string;
  textColor2?: string;
  textColor3?: string;
  textColor4?: string;
  textColor5?: string;
  textColor6?: string;
}

const pickColors = (count: number, colors: (string | undefined)[], max: number) =>
  colors.slice(0, Math.min(Math.max(1, Math.round(count)), max)).filter(Boolean) as string[];

const CircularSlider = ({
  items = defaultItems,
  title = "Interfaces that react.",
  subtitle = "Built for motion, crafted for experience.",
  gap = 24,
  cardWidth = 320,
  cardHeight = 360,
  showBottomText = true,
  verticalOffset = 0,
  cardColorCount = 5,
  cardColor1 = "#655A7C",
  cardColor2 = "#AB92BF",
  cardColor3 = "#AFC1D6",
  cardColor4 = "#CEF9F2",
  cardColor5 = "#D6CA98",
  cardColor6 = "#F2B5A7",
  textColorCount = 5,
  textColor1 = "#2A2433",
  textColor2 = "#3D2E50",
  textColor3 = "#2C3E52",
  textColor4 = "#1A5C53",
  textColor5 = "#4A3F1A",
  textColor6 = "#5C2A1F",
}: CircularSliderProps) => {
  const max = Math.min(MAX_COLORS, Math.max(1, items.length));
  return (
    <CircularSliderComp
      items={items}
      title={title}
      subtitle={subtitle}
      gap={gap}
      cardWidth={cardWidth}
      cardHeight={cardHeight}
      showBottomText={showBottomText}
      verticalOffset={verticalOffset}
      cardColors={pickColors(cardColorCount, [cardColor1, cardColor2, cardColor3, cardColor4, cardColor5, cardColor6], max)}
      textColors={pickColors(textColorCount, [textColor1, textColor2, textColor3, textColor4, textColor5, textColor6], max)}
    />
  );
};

export default CircularSlider;
