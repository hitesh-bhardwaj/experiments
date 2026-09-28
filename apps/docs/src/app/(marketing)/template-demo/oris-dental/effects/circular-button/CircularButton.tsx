"use client";

import React, { useRef, useState, type ReactNode, type CSSProperties, type MouseEvent } from "react";
import Link from "next/link";

export interface CircularButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  href?: string;
  children?: ReactNode;
  className?: string;
  innerClassName?: string;
  bgClassName?: string;
  bgColor?: string;
  borderColor?: string;
  size?: number | string;
  onClick?: (e: MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => void;
  style?: CSSProperties;
  ariaLabel?: string;
}

export default function CircularButton({
  href,
  type = "button",
  children,
  className = "",
  innerClassName = "",
  bgClassName = "oris-bg-primary",
  bgColor,
  borderColor,
  onClick,
  style,
  ariaLabel,
  ...rest
}: CircularButtonProps) {
  const spanRef = useRef<HTMLSpanElement | null>(null);
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseEnter = (e: MouseEvent<HTMLElement>) => {
    setIsHovered(true);
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (spanRef.current) {
      spanRef.current.style.left = `${x}px`;
      spanRef.current.style.top = `${y}px`;
      spanRef.current.style.transform = "translate(-50%, -50%) scale(1)";
    }
  };

  const handleMouseLeave = (e: MouseEvent<HTMLElement>) => {
    setIsHovered(false);
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (spanRef.current) {
      spanRef.current.style.left = `${x}px`;
      spanRef.current.style.top = `${y}px`;
      spanRef.current.style.transform = "translate(-50%, -50%) scale(0)";
    }
  };

  const baseClassName = `
    relative inline-flex items-center justify-center overflow-hidden rounded-full
    border border-oris-secondary/20 cursor-pointer select-none
    group size-[3.4vw] min-w-11 min-h-11 max-md:size-12
    ${className}
  `;

  const innerContent = (
    <>
      <span
        ref={spanRef}
        className={`absolute aspect-square rounded-full pointer-events-none ${bgClassName}`}
        style={{
          width: "350%",
          transform: "translate(-50%, -50%) scale(0)",
          transition: "transform 0.8s cubic-bezier(0.25, 1, 0.5, 1)",
          ...(bgColor ? { backgroundColor: bgColor } : {}),
        }}
        aria-hidden="true"
      />
      <span
        className={`relative z-10 flex items-center justify-center transition-colors duration-300 ${innerClassName}`}
        style={{ color: isHovered ? "#ffffff" : "#13314a" }}
      >
        {children}
      </span>
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className={baseClassName}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={onClick}
        aria-label={ariaLabel}
        style={style}
      >
        {innerContent}
      </Link>
    );
  }

  return (
    <button
      type={type}
      className={baseClassName}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      aria-label={ariaLabel}
      style={style}
      {...rest}
    >
      {innerContent}
    </button>
  );
}
