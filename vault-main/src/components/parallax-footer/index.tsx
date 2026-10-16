// Built using Hyperiux Vault: https://vault.hyperiux.com
"use client";

import { ArrowRight } from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

import Link from "next/link";
interface FooterParallaxProps {
 children?: ReactNode;
 id?: string;
  outerClassName?: string;
  footerClassName?: string;
  footerStyle?: CSSProperties;
}

const FooterParallax = ({
 children,
 id ="footer",
 outerClassName ="",
 footerClassName ="",
  footerStyle,
}: FooterParallaxProps) => {
 const footerRef = useRef<HTMLElement | null>(null);
 const [height, setHeight] = useState(1);

 useEffect(() => {
 let frameId: number | undefined;

 const updateHeight = () => {
 const el = footerRef.current;
 if (!el) return;

 frameId = requestAnimationFrame(() => {
 const rect = el.getBoundingClientRect();
 setHeight(rect.height);
 });
 };

 updateHeight();

 const el = footerRef.current;
 if (!el) return;

 const resizeObserver = new ResizeObserver(updateHeight);
 resizeObserver.observe(el);

 window.addEventListener("resize", updateHeight);

 return () => {
 cancelAnimationFrame(frameId as number);
 resizeObserver.disconnect();
 window.removeEventListener("resize", updateHeight);
 };
 }, [children]);

 return (
 <div
 id={id}
 className={`w-screen relative z-1 ${outerClassName}`}
 style={{
 height,
 clipPath:"rect(0px, 100%, 100%, 0px)",
 }}
 >
 <footer
 ref={footerRef}
 className={`w-screen fixed bottom-0 left-0 ${footerClassName}`}
 style={footerStyle}
 >
 {children}
 </footer>
 </div>
 );
};

export { FooterParallax };

const ParallaxFooter = ({
 containerBgColor = "#ff6b00",
 footerBgColor = "#1a1a1a",
}) => {
 return (
 <>

 <div
 className="relative z-2 flex h-screen w-screen items-center justify-center"
 style={{ backgroundColor: containerBgColor }}
 >
 <h1 className="text-[4vw] font-medium max-md:text-[8.5vw] w-[70%] text-center">
 Scroll To See Parallax Effect
 </h1>
 </div>
 <FooterParallax
 footerClassName="text-white px-10 py-20"
 footerStyle={{ backgroundColor: footerBgColor }}
 >
 <div className="max-w-7xl mx-auto flex justify-between max-md:flex-col max-md:justify-start max-md:gap-[12vw]">
 <div className="w-[40%] max-lg:w-[70%] max-md:w-[80%]">
 <h2 className="text-5xl font-semibold max-md:text-[7.5vw]">
Let’s build something worth remembering.
 </h2>
 <p className="mt-4 text-sm max-lg:text-xl">
 Fully dynamic height. Add anything here - it just works.
 </p>
 </div>

 <div className="flex items-center justify-end w-fit">
<Link
  href="/effects"
  className="inline-flex items-center gap-1 rounded-full bg-white px-6 py-3 text-[#1a1a1a] transition-transform hover:scale-105"
>
  Browse All Effects
  <ArrowRight className="h-4 w-4" />
</Link>
 </div>
 </div>
 </FooterParallax>

 </>
 );
};

export default ParallaxFooter;
