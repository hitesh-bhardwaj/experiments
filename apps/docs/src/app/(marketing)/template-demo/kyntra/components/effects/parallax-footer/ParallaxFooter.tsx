// Built using Hyperiux Vault: https://vault.hyperiux.com

"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";


export const FOOTER_RESIZE_EVENT = "footer-parallax-resize";

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
 // Pins only when shorter than viewport
 const [parallax, setParallax] = useState(true);

 useEffect(() => {
 let frameId: number | undefined;
 let lastHeight = -1;

 const query = window.matchMedia("(min-width: 1026px)");

 const updateHeight = () => {
 const el = footerRef.current;
 if (!el) return;

 frameId = requestAnimationFrame(() => {
 const rect = el.getBoundingClientRect();
 if (Math.abs(lastHeight - rect.height) <= 0.5) return;

 lastHeight = rect.height;
 setHeight(rect.height);

 // The spacer drives ScrollTrigger's measurements, so anything reading
 // them has to re-measure once the real height lands.
 window.dispatchEvent(new CustomEvent(FOOTER_RESIZE_EVENT));
 });
 };

 const updateMode = () => setParallax(query.matches);

 updateMode();
 updateHeight();

 const el = footerRef.current;
 if (!el) return;

 const resizeObserver = new ResizeObserver(updateHeight);
 resizeObserver.observe(el);

 window.addEventListener("resize", updateHeight);
 query.addEventListener("change", updateMode);

 return () => {
 cancelAnimationFrame(frameId as number);
 resizeObserver.disconnect();
 window.removeEventListener("resize", updateHeight);
 query.removeEventListener("change", updateMode);
 };
 }, [children]);

 return (
 <div
 id={id}
 className={`relative z-0 w-screen ${outerClassName}`}
 style={
 parallax
 ? { height, clipPath:"inset(0 0 0 0)" }
 : undefined
 }
 >
 <footer
 ref={footerRef}
 className={`left-0 z-0 w-screen ${
 parallax ?"fixed bottom-0" :"relative"
 } ${footerClassName}`}
 style={footerStyle}
 >
 {children}
 </footer>
 </div>
 );
};

export { FooterParallax };
