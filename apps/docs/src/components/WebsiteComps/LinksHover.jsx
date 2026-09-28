"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import gsap from "gsap";

const DEFAULT_EASE = "power2.out";

function splitCharacters(text) {
  return text.split("").map((char, index) => ({
    char: char === " " ? "\u00A0" : char,
    key: `${char}-${index}`,
  }));
}

/** Per-character slide reveal link with optional underline. */
export default function LinkHover({
  href = "#",
  children,
  target = "_blank",
  className = "",
  ease = DEFAULT_EASE,
  duration = 0.5,
  lineDuration = 0.55,
  stagger = 0.01,
  idleColor = "#ffffff",
  hoverColor = "#ff5f00",
  underlineColor = "#ff5f00",
  showUnderline = true,
  textShadowClass = "",
}) {
  const linkRef = useRef(null);
  const layersRef = useRef({ chars: null, shadows: null, line: null });
  const [isMounted, setIsMounted] = useState(false);

  // SSR-safe mounted flag - pre-mount renders a plain Link (children as
  // plain text) and only switches to the GSAP-animated per-character markup
  // once mounted, so the ref the GSAP setup effect below targets actually
  // exists in the DOM. Can't be a lazy useState initializer without risking
  // a hydration mismatch.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMounted(true);
  }, []);

  const text = String(children);
  const characters = useMemo(() => splitCharacters(text), [text]);

  useEffect(() => {
    if (!isMounted) return;
    const link = linkRef.current;
    if (!link) return;

    const chars = link.querySelectorAll("[data-crl-char]");
    const shadows = link.querySelectorAll("[data-crl-shadow]");
    const line = link.querySelector("[data-crl-line]");

    layersRef.current = { chars, shadows, line };

    const ctx = gsap.context(() => {
      gsap.set(chars, { yPercent: 0, color: idleColor, force3D: true });
      gsap.set(shadows, { yPercent: 110, color: idleColor, force3D: true });

      if (line) {
        gsap.set(line, {
          scaleX: 0,
          transformOrigin: "left center",
          force3D: true,
        });
      }
    }, link);

    return () => ctx.revert();
  }, [isMounted, idleColor, hoverColor, text]);

  const runHoverAnimation = useCallback(
    (isHovering) => {
      const { chars, shadows, line } = layersRef.current;
      if (!chars?.length || !shadows?.length) return;

      gsap.killTweensOf([chars, shadows, line].filter(Boolean));

      if (isHovering) {
        gsap.to(chars, {
          yPercent: -110,
          color: hoverColor,
          duration,
          stagger,
          ease,
          overwrite: true,
        });

        gsap.to(shadows, {
          yPercent: 0,
          color: hoverColor,
          duration,
          stagger,
          ease,
          overwrite: true,
        });

        if (line) {
          gsap.set(line, { transformOrigin: "left center" });
          gsap.to(line, {
            scaleX: 1,
            duration: lineDuration,
            ease,
            overwrite: true,
          });
        }

        return;
      }

      gsap.to(chars, {
        yPercent: 0,
        color: idleColor,
        duration,
        stagger,
        ease,
        overwrite: true,
      });

      gsap.to(shadows, {
        yPercent: 110,
        color: idleColor,
        duration,
        stagger,
        ease,
        overwrite: true,
      });

      if (line) {
        gsap.set(line, { transformOrigin: "right center" });
        gsap.to(line, {
          scaleX: 0,
          duration: lineDuration,
          ease,
          overwrite: true,
        });
      }
    },
    [duration, ease, hoverColor, idleColor, lineDuration, stagger],
  );

  const handleEnter = useCallback(() => runHoverAnimation(true), [runHoverAnimation]);
  const handleLeave = useCallback(() => runHoverAnimation(false), [runHoverAnimation]);

  if (!isMounted) {
    return (
      <Link
        href={href}
        target={target}
        className={`relative block w-fit overflow-hidden text-16 leading-[1.15] ${textShadowClass} ${className}`}
        style={{ color: idleColor }}
      >
        {children}
      </Link>
    );
  }

  return (
    <Link
      ref={linkRef}
      href={href}
      target={target}
      className={`relative block w-fit overflow-hidden text-16 leading-[1.15] ${textShadowClass} ${className}`}
      style={{ color: idleColor }}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      onFocus={handleEnter}
      onBlur={handleLeave}
    >
      <span className="relative block overflow-hidden pb-[0.22vw]">
        <span className="flex" aria-hidden="true">
          {characters.map(({ char, key }) => (
            <span
              key={`base-${key}`}
              data-crl-char
              className={`inline-block whitespace-pre will-change-transform ${textShadowClass}`}
            >
              {char}
            </span>
          ))}
        </span>

        <span className="absolute left-0 top-0 flex" aria-hidden="true">
          {characters.map(({ char, key }) => (
            <span
              key={`accent-${key}`}
              data-crl-shadow
              className={`inline-block whitespace-pre will-change-transform ${textShadowClass}`}
            >
              {char}
            </span>
          ))}
        </span>
      </span>

      {showUnderline && (
        <span
          data-crl-line
          className="absolute bottom-0 left-0 h-px w-full scale-x-0 will-change-transform"
          style={{ backgroundColor: underlineColor }}
        />
      )}

      <span className="sr-only">{text}</span>
    </Link>
  );
}
