// Built using Hyperiux Vault: https://vault.hyperiux.com

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
 className={`relative z-0 w-screen ${outerClassName}`}
 style={{
 height,
 clipPath:"inset(0 0 0 0)",
 }}
 >
 <footer
 ref={footerRef}
 className={`fixed bottom-0 left-0 z-0 w-screen ${footerClassName}`}
 style={footerStyle}
 >
 {children}
 </footer>
 </div>
 );
};

export { FooterParallax };
