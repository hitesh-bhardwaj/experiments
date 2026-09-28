'use client'
import  { useEffect, useRef } from "react";
import Link from "next/link";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/dist/ScrollTrigger";
import { ArrowRight } from "lucide-react";
import { usePrefersReducedMotion } from "@/lib/motion";

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
 backgroundColor?: string;
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
 backgroundColor = "#111111",
 gap = 24,
 cardWidth = 320,
 cardHeight = 360,
 showBottomText = true,
}: CircularSliderCompProps) => {
 const outerRef = useRef<HTMLElement | null>(null);
 const wheelRef = useRef<HTMLDivElement | null>(null);
 const reducedMotion = usePrefersReducedMotion();
 const resolvedItems = items ?? data;
 const resolvedTitle = title ?? heading;
 const resolvedSubtitle = subtitle ?? para;
 const resolvedGap = Math.max(0, gap);
 const resolvedCardWidth = Math.max(220, cardWidth);
 const resolvedCardHeight = Math.max(240, cardHeight);

 useEffect(() => {
 const ctx = gsap.context(() => {
 const wheel = wheelRef.current as HTMLDivElement;
 const cards = gsap.utils.toArray(".wheel-card") as HTMLElement[];

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
 };

 setup();
 window.addEventListener("resize", setup);

 gsap.to(wheel, {
 rotate: -87,
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
 };
 }, outerRef);

 return () => ctx.revert();
 }, [resolvedGap, resolvedItems.length]);

 return (
 <>

 <section
 ref={outerRef}
 className="max-md:hidden relative h-[250vh]"
 style={{ backgroundColor }}
 >
 <div
 className="sticky top-0 h-screen flex flex-col items-center justify-between pb-[3%] overflow-hidden"
 >
 <div className="w-full flex justify-center pt-[6%] ">
 <h1 className="text-[2.5vw] uppercase tracking-widest text-center">
 {resolvedTitle}
 </h1>
 </div>

 {/* Wheel */}
 <div className="absolute top-[65vw] w-full h-screen">
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
 className="hidden max-md:block py-[16vw] max-sm:py-[22vw] px-[5vw]"
 style={{ backgroundColor }}
 >
 <h2 className="text-center max-md:text-[4vw] max-sm:text-[7vw] font-extralight uppercase tracking-widest mb-[10vw]">
 {resolvedTitle}
 </h2>
 <div className="flex flex-col items-center gap-[5vw] max-sm:gap-[10vw]">
 {resolvedItems.map((product, i) => (
 <div
 key={i}
 className="max-md:w-full rounded-[5vw] overflow-hidden"
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
 <p className="text-center font-light uppercase tracking-widest max-md:text-[2.5vw] max-sm:text-[6vw] mt-[10vw]">
 {resolvedSubtitle}
 </p>
 ) : null}
 </section>

 {reducedMotion && (
 <div
 aria-live="polite"
 className="fixed bottom-6 right-6 z-60 w-fit max-w-[min(90vw,26rem)] rounded-md border border-black/10 bg-[#F8F8F3] p-6 text-center shadow-sm"
 >
 <h2 className="text-[1.15vw] max-md:text-[3.5vw] max-[1025px]:text-[2vw] leading-none text-[#111111]">
 This effect can&apos;t be reduced.
 </h2>
 <p className="mx-auto mt-4 text-sm leading-6 text-black/65">
 Reduced motion is enabled, but this effect relies on continuous
 scroll-driven rotation around the wheel, and can&apos;t be
 simplified to a fade without losing the effect entirely.
 </p>
 </div>
 )}
 </>
 );
};

export default CircularSliderComp;


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
 className="w-full h-full max-[1025px]:h-auto rounded-[1.5vw] max-[1025px]:rounded-[5vw] max-md:rounded-2xl flex flex-col items-stretch justify-between gap-10 max-[1025px]:gap-8 max-md:gap-6 hover:shadow-xl transition-all duration-500 px-[10%] max-[1025px]:px-[8%] max-md:px-6 py-20 max-[1025px]:py-12 max-md:py-10"
 style={{
 backgroundColor: bgColor ||"rgba(255,255,255,0.7)",
 color: textColor ||"inherit",
 }}
 >
 <div className="flex flex-col items-center gap-4 max-md:gap-4 justify-center">
 <h2
 className="text-center font-medium text-[1.8vw] max-[1025px]:text-3xl max-md:text-2xl uppercase"
 style={{ color: textColor ||"inherit" }}
 >
 {heading}
 </h2>
 <p
 className="text-[1.15vw] max-md:text-lg max-[1025px]:text-xl text-center mt-[0.5vw] max-md:mt-1"
 style={{ color: textColor ||"inherit" }}
 >
 {text}
 </p>
 </div>

 <div className="mt-[1vw] max-md:mt-2 flex items-center cursor-pointer justify-center gap-[0.5vw] max-md:gap-2 group/btn">
 <span
 className="text-[1vw] max-md:text-xs max-[1025px]:text-lg uppercase tracking-widest"
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
 <Link prefetch={false} href={link} className="block w-full h-full max-[1025px]:h-auto">
 {cardContent}
 </Link>
 );
 };
