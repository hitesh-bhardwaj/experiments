"use client";

import React, { useRef, useEffect } from "react";
import Link from "next/link";
import gsap from "gsap";

const ArrowSVG = ({ className = "" }) => (
  <svg
    className={className}
    width="10"
    height="13"
    viewBox="0 0 10 13"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M8.24036 7.72066C8.30902 7.64697 8.39182 7.58787 8.48382 7.54688C8.57582 7.50589 8.67513 7.48384 8.77583 7.48207C8.87654 7.48029 8.97656 7.49882 9.06995 7.53654C9.16334 7.57426 9.24817 7.6304 9.31939 7.70162C9.39061 7.77284 9.44676 7.85767 9.48448 7.95106C9.5222 8.04445 9.54072 8.14448 9.53895 8.24518C9.53717 8.34588 9.51513 8.4452 9.47414 8.5372C9.43314 8.6292 9.37404 8.712 9.30035 8.78066L5.30035 12.7807C5.15973 12.9211 4.9691 13 4.77035 13C4.5716 13 4.38098 12.9211 4.24035 12.7807L0.240354 8.78066C0.166667 8.712 0.107565 8.6292 0.0665735 8.5372C0.0255818 8.4452 0.00354045 8.34588 0.00176376 8.24518C-1.2927e-05 8.14448 0.0185113 8.04445 0.0562319 7.95106C0.0939526 7.85767 0.150098 7.77284 0.221317 7.70162C0.292535 7.6304 0.377369 7.57426 0.470758 7.53654C0.564147 7.49882 0.664174 7.48029 0.764877 7.48207C0.86558 7.48384 0.964894 7.50589 1.05689 7.54688C1.14889 7.58787 1.23169 7.64697 1.30035 7.72066L4.02035 10.4407L4.02036 0.750659C4.02036 0.551747 4.09937 0.360981 4.24003 0.220329C4.38068 0.0796762 4.57144 0.000659508 4.77036 0.000659526C4.96927 0.000659543 5.16003 0.0796762 5.30069 0.220329C5.44134 0.360982 5.52036 0.551747 5.52036 0.75066L5.52035 10.4407L8.24036 7.72066Z"
      fill="currentColor"
    />
  </svg>
);

export default function LinkButton({
  href = "#",
  text,
  children,
  tilted = true,
  
  target,
  className = "",
  showArrow = false,
  shimmer = false,
  shimmerBaseColor = "#979797",
  shimmerColor = "#ffffff",
  onClick,
  id,
  underline = 'w-full',
  underlineClassName = "mt-1",
  ...props
}) {
  const underlineRef = useRef(null);
  const isAnimating = useRef(false);
  const labelRef = useRef(null);
  const labelShadowRef = useRef(null);
  const shimmerTl = useRef(null);

  const isExternal = href?.startsWith("http");
  const resolvedTarget = target ?? (isExternal ? "_blank" : "_self");
  const label = text ?? children;

  const autoId = !id && typeof label === "string"
    ? label.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")
    : undefined;

  useEffect(() => {
    if (!shimmer) return;

    const els = [labelRef.current, labelShadowRef.current].filter(Boolean);
    if (!els.length) return;

    gsap.set(els, {
      color: "transparent",
      backgroundColor: shimmerBaseColor,
      backgroundImage: `linear-gradient(115deg, ${shimmerBaseColor} 0%, ${shimmerBaseColor} 28%, ${shimmerColor} 50%, ${shimmerBaseColor} 72%, ${shimmerBaseColor} 100%)`,
      backgroundSize: "130% 100%",
      backgroundRepeat: "no-repeat",
      backgroundPosition: "380% 0%",
      backgroundClip: "text",
      WebkitBackgroundClip: "text",
      WebkitTextFillColor: "transparent",
      willChange: "background-position",
    });

    const tl = gsap.timeline({ repeat: -1 });
    tl.to(els, { backgroundPosition: "-280% 0%", duration: 4, ease: "none" })
      .to({}, { duration: 1 });
    shimmerTl.current = tl;

    return () => {
      shimmerTl.current = null;
      tl.kill();
      gsap.set(els, {
        clearProps:
          "color,backgroundColor,backgroundImage,backgroundSize,backgroundRepeat,backgroundPosition,backgroundClip,WebkitBackgroundClip,WebkitTextFillColor,willChange",
      });
    };
  }, [shimmer, shimmerBaseColor, shimmerColor]);

  const setShimmerPaused = (paused) => {
    if (!shimmer) return;
    const els = [labelRef.current, labelShadowRef.current].filter(Boolean);
    if (!els.length) return;
    if (paused) {
      shimmerTl.current?.pause();
      gsap.set(els, { color: "currentColor", WebkitTextFillColor: "currentColor" });
    } else {
      gsap.set(els, { color: "transparent", WebkitTextFillColor: "transparent" });
      shimmerTl.current?.resume();
    }
  };

  const handleEnter = () => {
    setShimmerPaused(true);

    const el = underlineRef.current;
    if (!el || isAnimating.current) return;
    isAnimating.current = true;
    gsap
      .timeline({ onComplete: () => { isAnimating.current = false; } })
      .to(el, { scaleX: 0, transformOrigin: "right center", duration: 0.3, ease: "power2.in" })
      .to(el, { scaleX: 1, transformOrigin: "left center", duration: 0.3, ease: "power2.out" });
  };

  const handleLeave = () => {
    setShimmerPaused(false);
  };

  const handleClick = (e) => {
    if (href?.startsWith("#")) {
      e.preventDefault();
      const id = href.slice(1);
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    onClick?.(e);
  };

  return (
    <Link
      {...props}
      id={id ?? autoId}
      href={href}
      prefetch={false}
      target={resolvedTarget}
      rel={isExternal ? "noopener noreferrer" : undefined}
      className={`relative text-white group w-fit inline-block pb-1 ${className}`}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      onClick={handleClick}
    >
      <div className="flex items-center gap-[0.5vw] max-[1025px]:gap-2 w-fit cursor-pointer">
        <span className="relative">
          <span className="relative overflow-hidden inline-flex h-[1.4em]">
            <span
              ref={labelRef}
              className="inline-block transition-transform duration-300 ease-in-out group-hover:-translate-y-full"
            >
              {label}
            </span>
            <span
              ref={labelShadowRef}
              className="inline-block absolute left-0 top-0 translate-y-full transition-transform duration-300 ease-in-out group-hover:translate-y-0"
            >
              {label}
            </span>
          </span>
          {underline ? (
            <div
              ref={underlineRef}
              className={`absolute left-0 top-full h-px w-full bg-current ${underlineClassName}`}
            />
          ) : null}
        </span>

        {showArrow && (
          <div className="size-2.5 overflow-hidden mt-0.5">
            <div className="size-2.5 relative transition-transform duration-300 group-hover:translate-y-0 translate-y-[-120%] shrink-0">
              <ArrowSVG className="w-full h-full" />
              <ArrowSVG className="size-2.5 opacity-60 absolute bottom-[-120%]" />
            </div>
          </div>
        )}

        {tilted && (
          <div className="size-2.5 overflow-hidden mt-0.5">
            <div className="size-2.5 relative transition-transform duration-300 group-hover:-translate-y-full group-hover:translate-x-full shrink-0">
              <ArrowSVG className="rotate-[-135deg] w-full h-full" />
              <ArrowSVG className="size-2.5 rotate-[-135deg] absolute -bottom-full -left-full" />
            </div>
          </div>
        )}
      </div>
    </Link>
  );
}
