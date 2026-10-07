"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { LABEL_CLASS, TICKER_INTERVAL_MS } from "./constants";

// Copy for the readout, counted from the real catalogue
function getHudCopy(mode, stats, name) {
  if (mode !== "sign-up") {
    return {
      owner: "Inside the vault",
      count: stats.total,
      unit: "effects",
      caption: `In the vault, across ${stats.categories} categories.`,
      tickerLabel: "In the vault",
      breakdown: [`${stats.free} free`, `${stats.pro} Pro`, "React + Next.js"],
    };
  }

  const firstName = name.trim().split(/\s+/)[0];
  return {
    owner: name.trim() ? `${name.trim()}’s vault` : "Inside the vault",
    count: stats.free,
    unit: "free",
    caption: firstName ? `${firstName}, these are yours the moment you’re in.` : "Yours the moment you’re in. No card needed.",
    tickerLabel: "Free with your account",
    breakdown: [`All ${stats.total} with Pro or Pro+`, `${stats.categories} categories`],
  };
}

// Free effects on sign-up, the whole vault on sign-in; restarts when the list changes
function useTicker(effects, mode) {
  const list = useMemo(() => (mode === "sign-up" ? effects.filter((effect) => effect.tier === "free") : effects), [effects, mode]);
  const [ticker, setTicker] = useState({ list, index: 0 });

  if (ticker.list !== list) setTicker({ list, index: 0 });

  useEffect(() => {
    const timer = setInterval(() => setTicker((current) => ({ ...current, index: current.index + 1 })), TICKER_INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  return list.length ? list[ticker.index % list.length] : null;
}

// Right-hand panel: the core canvas, its tooltip and the readout around it
export function CoreHud({ ref, canvasRef, tooltipRef, mode, stats, effects, name }) {
  // Refs
  const tickerRef = useRef(null);

  // State
  const copy = getHudCopy(mode, stats, name);
  const tickerEffect = useTicker(effects, mode);

  // Effects
  useEffect(() => {
    gsap.fromTo(tickerRef.current, { opacity: 0 }, { opacity: 1, duration: 0.7, ease: "expo.out" });
  }, [tickerEffect]);


  // Render
  return (
    <aside
      ref={ref}
      aria-label="Inside the vault"
      className="relative z-[6] flex min-h-0 flex-col justify-between gap-[2vw] pt-[1vw] pb-[3vw] pl-[6vw] will-change-transform max-[1025px]:pb-6 portrait:row-start-1 portrait:justify-end portrait:pt-0 portrait:pb-4 portrait:pl-0"
    >
      {/* The globe fills the column's content box (inside the left padding)
          behind the readout; core.js sizes itself and tracks the pointer here */}
      <div className="absolute inset-y-0 right-0 left-[6vw] max-[1025px]:hidden">
        <canvas ref={canvasRef} aria-hidden="true" className="absolute inset-0 block size-full" />
        <div
          ref={tooltipRef}
          aria-hidden="true"
          data-on="false"
          className={`${LABEL_CLASS} pointer-events-none absolute top-0 left-0 grid gap-1 border border-white/20 bg-black/30 px-[0.8vw] py-[0.6vw] whitespace-nowrap opacity-0 backdrop-blur-lg transition-opacity duration-300 data-[on=true]:opacity-100`}
        >
          <b data-tip-name className="font-aeonik text-base font-normal tracking-[-.02em] text-white normal-case" />
          <span data-tip-meta className="text-white/50" />
        </div>
      </div>

      {/* Readout rows sit over the globe; pointer passes through to it */}
      <p className={`${LABEL_CLASS} pointer-events-none relative text-white/40 portrait:hidden`}>{copy.owner}</p>

      <div className="pointer-events-none relative grid gap-[0.6vw] portrait:hidden">
        <p className="t96 font-aeonik text-[#F4F4F4]">
          {copy.count}
          <span className="gradient-text-animate ml-[0.3em] text-[0.34em] tracking-[-.01em]">{copy.unit}</span>
        </p>
        <p className="text18 text-light-grey">{copy.caption}</p>
        <p className={`${LABEL_CLASS} mt-[0.6vw] text-white/40`}>
          {copy.tickerLabel} ›{" "}
          <span ref={tickerRef}>
            {tickerEffect && (
              <>
                <b className="font-medium text-white">{tickerEffect.name}</b> · {tickerEffect.category}
                {mode !== "sign-up" && ` · ${tickerEffect.tier === "pro" ? "Pro" : "Free"}`}
              </>
            )}
          </span>
        </p>
        <p className={`${LABEL_CLASS} flex gap-[0.6vw] text-white/30`}>
          {copy.breakdown.map((item, index) => (
            <span key={item} className="flex gap-[0.6vw]">
              {index > 0 && <span className="text-white/20">·</span>}
              {item}
            </span>
          ))}
        </p>
      </div>
    </aside>
  );
}
