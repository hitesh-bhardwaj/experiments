// Built using Hyperiux Vault: https://vault.hyperiux.com
"use client";

import React, { useEffect, useState } from "react";

export interface ChevronBirdProps {
    isActive?: boolean;
    size?: number;
    strokeWidth?: number;
    prefersReducedMotion?: boolean;
    duration?: number;
    className?: string;
}

export const ChevronBird = ({
    isActive = false,
    size = 14,
    strokeWidth = 10,
    prefersReducedMotion = false,
    duration = 0.32,
    className = "mt-[0.25vw]",
}: ChevronBirdProps) => {
    return (
        <div
            className={className}
            style={{ transitionDuration: prefersReducedMotion ? '0s' : `${duration}s` }}
        >
        <svg
            viewBox="0 0 100 100"
            width={size}
            height={size}
            fill="none"
            aria-hidden="true"
            style={{
                transform:
                    isActive ? 'translateY(-25%)' : 'translateY(0%)',
                transition: prefersReducedMotion ? 'none' : `transform ${duration}s ease-in-out`,
            }}
        >
            <g>
                <path
                    d="M10 50H50"
                    stroke="currentColor"
                    strokeWidth={strokeWidth}
                    strokeLinecap="square"
                    style={{
                        transformBox: 'view-box',
                        transformOrigin: '50px 50px',
                        transform:
                            isActive ? 'rotate(-42deg)' : 'rotate(42deg)',
                        transition: prefersReducedMotion ? 'none' : `transform ${duration}s ease-in-out`,
                    }}
                />
                <path
                    d="M90 50H50"
                    stroke="currentColor"
                    strokeWidth={strokeWidth}
                    strokeLinecap="square"
                    style={{
                        transformBox: 'view-box',
                        transformOrigin: '50px 50px',
                        transform:
                            isActive ? 'rotate(42deg)' : 'rotate(-42deg)',
                        transition: prefersReducedMotion ? 'none' : `transform ${duration}s ease-in-out`,
                    }}
                />
            </g>
        </svg>

        </div>
    );
}

export interface CrossProps {
    isActive?: boolean;
    isHovered?: boolean;
    size?: number;
    prefersReducedMotion?: boolean;
    duration?: number;
    className?: string;
}

const Cross = ({
 isActive = false,
 isHovered = false,
 size = 24,
 prefersReducedMotion = false,
 duration = 0.32,
 className ="",
}: CrossProps) => {
 const rotation = (isActive ? 315 : 180) + (!prefersReducedMotion && isHovered ? 180 : 0);

 return (
 <div
 className={`flex items-center relative justify-center motion-reduce:transition-none ${className}`}
 style={{
  width: size,
  height: size,
  transform: `rotate(${rotation}deg)`,
  transitionProperty: 'transform',
  transitionDuration: prefersReducedMotion ? '0s' : `${duration}s`,
  transitionTimingFunction: 'ease-in-out',
 }}
 >
 <span
 className='absolute block w-full h-0.5 bg-current transition-transform ease-in-out motion-reduce:transition-none'
 style={{ transitionDuration: prefersReducedMotion ? '0s' : `${duration}s` }}
 />
 <span
 className='absolute block w-full h-0.5 bg-current transition-transform rotate-90 ease-in-out motion-reduce:transition-none'
 style={{ transitionDuration: prefersReducedMotion ? '0s' : `${duration}s` }}
 />
 </div>
 );
}

export interface PlusProps {
    isActive?: boolean;
    isHovered?: boolean;
    size?: number;
    prefersReducedMotion?: boolean;
    duration?: number;
    className?: string;
}

const Plus = ({
 isActive = false,
 isHovered = false,
 size = 24,
 prefersReducedMotion = false,
 duration = 0.32,
 className ="",
}: PlusProps) => {
 const rotation = (isActive ? 180 : 0) + (!prefersReducedMotion && isHovered ? 180 : 0);

 return (
 <div
 className={`flex items-center relative justify-center motion-reduce:transition-none ${className}`}
 style={{
  width: size,
  height: size,
  transform: `rotate(${rotation}deg)`,
  transitionProperty: 'transform',
  transitionDuration: prefersReducedMotion ? '0s' : `${duration}s`,
  transitionTimingFunction: 'ease-in-out',
 }}
 >
 <span
 className='absolute block w-full h-0.5 bg-current transition-transform ease-in-out motion-reduce:transition-none'
 style={{ transitionDuration: prefersReducedMotion ? '0s' : `${duration}s` }}
 />
 <span
 className='absolute block w-full h-0.5 bg-current transition-transform ease-in-out motion-reduce:transition-none'
 style={{
   transform: isActive ?'rotate(180deg)' :'rotate(90deg)',
   transitionDuration: prefersReducedMotion ? '0s' : `${duration}s`,
 }}
 />
 </div>
 );
}

const AnimatedToggle = ({
  size = 96,
  activeColor = "#ff5f00",
  inactiveColor = "#a1a1aa",
  duration = 0.32,
}) => {
  const [chevronActive, setChevronActive] = useState(false);
  const [crossActive, setCrossActive] = useState(false);
  const [plusActive, setPlusActive] = useState(false);
  const [crossHovered, setCrossHovered] = useState(false);
  const [plusHovered, setPlusHovered] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia?.("(prefers-reduced-motion: reduce)");

    const syncReducedMotion = (event: MediaQueryList | MediaQueryListEvent) => {
      const matches = "matches" in event ? event.matches : ((event as any).currentTarget as MediaQueryList).matches;
      setPrefersReducedMotion(matches);
    };

    if (mediaQuery) {
      syncReducedMotion(mediaQuery);
      mediaQuery.addEventListener("change", syncReducedMotion);
    }

    return () => {
      mediaQuery?.removeEventListener("change", syncReducedMotion);
    };
  }, []);

  const chevronIconSize = Math.round(size / 3);
  const iconSize = Math.round(size / 4);

  const boxStyle = {
    "--toggle-size": `${size}px`,
    transitionDuration: prefersReducedMotion ? "0s" : `${duration}s`,
  };

  return (
    <div className="flex gap-8 justify-center">
      <button
        onClick={() => setChevronActive((prev) => !prev)}
        className="cursor-pointer size-(--toggle-size) max-md:size-[calc(var(--toggle-size)*0.75)] rounded-lg flex group items-center justify-center transition-[background-color,transform] motion-reduce:transition-none motion-safe:active:scale-90"
        style={{ ...boxStyle, backgroundColor: chevronActive ? activeColor : inactiveColor }}
      >
        <ChevronBird
          className="mt-2 transition-all motion-reduce:transition-none motion-safe:group-hover:rotate-180 motion-safe:group-hover:translate-y-[-30%]"
          size={chevronIconSize}
          isActive={chevronActive}
          prefersReducedMotion={prefersReducedMotion}
          duration={duration}
        />
      </button>
      <button
        onClick={() => setCrossActive((prev) => !prev)}
        onMouseEnter={() => setCrossHovered(true)}
        onMouseLeave={() => setCrossHovered(false)}
        className="group cursor-pointer size-(--toggle-size) max-md:size-[calc(var(--toggle-size)*0.75)] rounded-lg flex items-center justify-center transition-[background-color,transform] motion-reduce:transition-none motion-safe:active:scale-90"
        style={{ ...boxStyle, backgroundColor: crossActive ? activeColor : inactiveColor }}
      >
        <Cross size={iconSize} isActive={crossActive} isHovered={crossHovered} prefersReducedMotion={prefersReducedMotion} duration={duration} />
      </button>
      <button
        onClick={() => setPlusActive((prev) => !prev)}
        onMouseEnter={() => setPlusHovered(true)}
        onMouseLeave={() => setPlusHovered(false)}
        className="group cursor-pointer size-(--toggle-size) max-md:size-[calc(var(--toggle-size)*0.75)] rounded-lg flex items-center justify-center transition-[background-color,transform] motion-reduce:transition-none motion-safe:active:scale-90"
        style={{ ...boxStyle, backgroundColor: plusActive ? activeColor : inactiveColor }}
      >
        <Plus size={iconSize} isActive={plusActive} isHovered={plusHovered} prefersReducedMotion={prefersReducedMotion} duration={duration} />
      </button>
    </div>
  )
}
export default AnimatedToggle
