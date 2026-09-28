"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

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
