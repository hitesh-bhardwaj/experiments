// Built using Hyperiux Vault: https://vault.hyperiux.com
"use client";

import { gsap } from "gsap";
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";

function prefersReducedMotion() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
}

export interface ShearWipeStat {
  label: string;
  title: string;
  desc: string;
}

type ActivePanel = 'components' | 'showcase';

interface ShearWipeCompProps {
  componentHighlights?: ShearWipeStat[];
  showcaseStats?: ShearWipeStat[];
  clipPathDuration?: number;
  componentsTextColor?: string;
  componentsBackgroundColor?: string;
  showcaseTextColor?: string;
  showcaseBackgroundColor?: string;
}


const ShearWipeComp = ({
  componentHighlights = [],
  showcaseStats = [],
  clipPathDuration = 0.9,
  componentsTextColor = '#0D47A1',
  componentsBackgroundColor = '#E3F2FD',
  showcaseTextColor = '#ffffff',
  showcaseBackgroundColor = '#0D47A1',
}: ShearWipeCompProps) => {
  const [activePanel, setActivePanel] = useState<ActivePanel>('components');
  const overlayRef = useRef<HTMLDivElement>(null);
  const mobileTabTextColor = activePanel === 'components' ? componentsTextColor : showcaseTextColor;
  const mobileUnderlineColor = activePanel === 'components' ? componentsTextColor : showcaseTextColor;
  const mobileBackgroundColor = activePanel === 'components' ? componentsBackgroundColor : showcaseBackgroundColor;

  const componentsTabRef = useRef<HTMLButtonElement>(null);
  const showcaseTabRef = useRef<HTMLButtonElement>(null);
  const activeLineRef = useRef<HTMLSpanElement>(null);
  const componentsContentRef = useRef<HTMLDivElement>(null);
  const showcaseContentRef = useRef<HTMLDivElement>(null);
  const isFirstMobileRender = useRef(true);
  const isTransitioningRef = useRef(false);
  const isFirstPanelEffect = useRef(true);

  // Animate panel open/close
  useEffect(() => {
    if (isFirstPanelEffect.current) {
      isFirstPanelEffect.current = false;
      return;
    }

    if (overlayRef.current) {
      const targetClipPath =
        activePanel === 'showcase'
          ? 'polygon(7.75% 0%, 100% 0%, 100% 100%, 11.25% 100%)'
          : 'polygon(92.5% 0%, 100% 0%, 100% 100%, 88.5% 100%)';

      if (prefersReducedMotion()) {
        gsap.set(overlayRef.current, { clipPath: targetClipPath, pointerEvents: 'auto' });
        isTransitioningRef.current = false;
        return;
      }

      isTransitioningRef.current = true;
      gsap.set(overlayRef.current, { pointerEvents: 'none' });

      gsap.to(overlayRef.current, {
        clipPath: targetClipPath,
        duration: clipPathDuration,
        ease: 'power3.inOut',
        overwrite: 'auto',
        onComplete: () => {
          isTransitioningRef.current = false;
          gsap.set(overlayRef.current, { pointerEvents: 'auto' });
        },
      });
    }
  }, [activePanel]);

  // --- Hover animations ---
  // Ignored while a swipe is mid-flight so hovering the opposite edge can't
  // hijack the clip-path tween that's already running.
  const handleHover = (side: ActivePanel) => {
    if (!overlayRef.current || isTransitioningRef.current || prefersReducedMotion()) return;

    if (side === 'showcase' && activePanel === 'components') {
      gsap.to(overlayRef.current, {
        clipPath: 'polygon(90% 0%, 100% 0%, 100% 100%, 86% 100%)',
        duration: 0.6,
        ease: 'power2.out',
        overwrite: 'auto',
      });
    }

    if (side === 'components' && activePanel === 'showcase') {
      gsap.to(overlayRef.current, {
        clipPath: 'polygon(10.5% 0%, 100% 0%, 100% 100%, 14% 100%)',
        duration: 0.6,
        ease: 'power2.out',
        overwrite: 'auto',
      });
    }
  };

  const handleHoverOut = () => {
    if (!overlayRef.current || isTransitioningRef.current || prefersReducedMotion()) return;

    if (activePanel === 'showcase') {
      gsap.to(overlayRef.current, {
        clipPath: 'polygon(7.75% 0%, 100% 0%, 100% 100%, 11.25% 100%)',
        duration: 0.6,
        ease: 'power2.inOut',
        overwrite: 'auto',
      });
    } else {
      gsap.to(overlayRef.current, {
        clipPath: 'polygon(92.5% 0%, 100% 0%, 100% 100%, 88.5% 100%)',
        duration: 0.6,
        ease: 'power2.inOut',
        overwrite: 'auto',
      });
    }
  };

  // Position the tab underline + set initial panel visibility on mount
  useLayoutEffect(() => {
    const activeTabEl = activePanel === 'components' ? componentsTabRef.current : showcaseTabRef.current;

    if (activeTabEl && activeLineRef.current) {
      gsap.set(activeLineRef.current, {
        x: activeTabEl.offsetLeft,
        width: activeTabEl.offsetWidth,
      });
    }

    gsap.set(componentsContentRef.current, {
      display: activePanel === 'components' ? 'block' : 'none',
      opacity: activePanel === 'components' ? 1 : 0,
    });

    gsap.set(showcaseContentRef.current, {
      display: activePanel === 'showcase' ? 'block' : 'none',
      opacity: activePanel === 'showcase' ? 1 : 0,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Animate the tab underline + crossfade the tab content on change
  useEffect(() => {
    if (isFirstMobileRender.current) {
      isFirstMobileRender.current = false;
      return;
    }

    const activeTabEl = activePanel === 'components' ? componentsTabRef.current : showcaseTabRef.current;
    const reducedMotion = prefersReducedMotion();

    if (activeTabEl && activeLineRef.current) {
      if (reducedMotion) {
        gsap.set(activeLineRef.current, {
          x: activeTabEl.offsetLeft,
          width: activeTabEl.offsetWidth,
        });
      } else {
        gsap.to(activeLineRef.current, {
          x: activeTabEl.offsetLeft,
          width: activeTabEl.offsetWidth,
          duration: 0.45,
          ease: 'power3.out',
        });
      }
    }

    const showEl = activePanel === 'components' ? componentsContentRef.current : showcaseContentRef.current;
    const hideEl = activePanel === 'components' ? showcaseContentRef.current : componentsContentRef.current;

    if (!showEl || !hideEl) return;

    gsap.killTweensOf([showEl, hideEl]);

    if (reducedMotion) {
      gsap.set(hideEl, { display: 'none', opacity: 0 });
      gsap.set(showEl, { display: 'block', opacity: 1 });
      return;
    }

    gsap.to(hideEl, {
      opacity: 0,
      duration: 0.25,
      ease: 'power2.out',
      onComplete: () => {
        gsap.set(hideEl, { display: 'none' });
        gsap.set(showEl, { display: 'block', opacity: 0 });

        gsap.to(showEl, {
          opacity: 1,
          duration: 0.4,
          ease: 'power2.out',
        });
      },
    });
  }, [activePanel]);

  return (
    <div className="relative w-full min-h-screen overflow-hidden">
      {/* Page Background */}
      <div className="absolute inset-0" style={{ backgroundColor: componentsBackgroundColor }} />

      {/* Mobile Background - follows the active tab independently of the desktop clip-wipe overlay */}
      <div
        className="hidden max-lg:block absolute inset-0 transition-colors duration-300 ease-in-out"
        style={{ backgroundColor: mobileBackgroundColor }}
      />

      <div className="max-lg:hidden relative w-full h-screen px-[10vw]">
        {/* Base Panel - Components */}
        <div className="flex h-full items-center">
          <div className="w-full flex items-center justify-center p-[6vw]">
            <div className="w-[45vw] space-y-[1vw]" style={{ color: componentsTextColor }}>
              <h2 className="text-[3vw] font-bold font-display leading-[1.2] whitespace-nowrap">Design that feels alive</h2>
              <p className="text-[1.5vw]">
                Every component reacts and transitions naturally , turning interfaces from static to alive.
              </p>
            </div>
          </div>

          {/* Vertical Text on Right Edge */}
          <div
            className="absolute right-[-10%] top-1/2 -translate-y-1/2 cursor-pointer z-50"
            onMouseEnter={() => handleHover('showcase')}
            onMouseLeave={() => handleHoverOut()}
            onClick={() => setActivePanel('showcase')}
          >
            <div className="text-[7vw] font-medium leading-none tracking-tight origin-center rotate-90 whitespace-nowrap" style={{ color: showcaseTextColor }}>
              Showcase
            </div>
          </div>
        </div>

        {/* Overlay Panel - Showcase */}
        <div
          ref={overlayRef}
          className="absolute inset-0 pointer-events-auto px-[10vw]"
          style={{
            clipPath: 'polygon(92.5% 0%, 100% 0%, 100% 100%, 88.5% 100%)',
          }}
        >
          <div className="absolute inset-0" style={{ backgroundColor: showcaseBackgroundColor }} />

          <div className="flex h-screen items-center relative">
            <div className="w-full flex items-center justify-center p-[6vw]">
              <div className="w-[45vw] space-y-[1vw]" style={{ color: showcaseTextColor }}>
                <h2 className="text-[3vw] font-bold font-display leading-[1.2] whitespace-nowrap">Motion with meaning</h2>
                <p className="text-[1.5vw]">
                  Animations explain, creating clarity and confidence across every screen.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Left Edge Label */}
        <div
          className="absolute left-[-15%] top-1/2 -translate-y-1/2 cursor-pointer z-50"
          onMouseEnter={() => handleHover('components')}
          onMouseLeave={() => handleHoverOut()}
          onClick={() => setActivePanel('components')}
        >
          <div className="text-[7vw] font-medium leading-none tracking-tight origin-center -rotate-90 whitespace-nowrap" style={{ color: componentsTextColor }}>
            Components
          </div>
        </div>
      </div>

      <div className="hidden max-lg:block px-[6vw] max-md:px-[6vw] pt-[16vw] pb-[10vw] max-md:pt-[26vw] max-md:pb-[14vw]">
        <div role="tablist" aria-orientation="horizontal" className="relative flex gap-[6vw] max-md:gap-[7vw] border-b border-black/15">
          <button
            ref={componentsTabRef}
            role="tab"
            type="button"
            aria-selected={activePanel === 'components'}
            onClick={() => setActivePanel('components')}
            className={`pb-[2vw] max-md:pb-[3.5vw] text-[2.4vw] max-md:text-[5vw] font-medium leading-none transition-opacity duration-300 ease-in-out ${activePanel === 'components' ? '' : 'opacity-35'}`}
            style={{ color: mobileTabTextColor }}
          >
            Components
          </button>
          <button
            ref={showcaseTabRef}
            role="tab"
            type="button"
            aria-selected={activePanel === 'showcase'}
            onClick={() => setActivePanel('showcase')}
            className={`pb-[2vw] max-md:pb-[3.5vw] text-[2vw] max-md:text-[5vw] font-medium leading-none transition-opacity duration-300 ease-in-out ${activePanel === 'showcase' ? '' : 'opacity-35'}`}
            style={{ color: mobileTabTextColor }}
          >
            Showcase
          </button>

          <span ref={activeLineRef} className="absolute bottom-0 left-0 h-[0.2vw] max-md:h-[0.6vw] transition-colors duration-300 ease-in-out" style={{ backgroundColor: mobileUnderlineColor }} />
        </div>

        <div className="relative mt-[8vw] max-md:mt-[10vw]">
          {/* Components tab content */}
          <div ref={componentsContentRef}>
            <h2 className="text-[6vw] max-md:text-[7.5vw] font-display leading-[1.15] mb-[3vw] max-md:mb-[5vw]" style={{ color: componentsTextColor }}>
              Design that feels alive
            </h2>
            <p className="text-[2.1vw] max-md:text-[4vw] leading-relaxed opacity-70 mb-[6vw] max-md:mb-[9vw]" style={{ color: componentsTextColor }}>
              Every component reacts and transitions naturally , turning interfaces from static to alive.
            </p>
          </div>

          {/* Showcase tab content */}
          <div ref={showcaseContentRef} className="absolute inset-0">
            <h2 className="text-[6vw] max-md:text-[7.5vw] font-display leading-[1.15] mb-[3vw] max-md:mb-[5vw]" style={{ color: showcaseTextColor }}>
              Motion with meaning
            </h2>
            <p className="max-md:text-[4vw] leading-relaxed opacity-70 mb-[7vw] max-md:mb-[10vw]" style={{ color: showcaseTextColor }}>
              Animations explain, creating clarity and confidence across every screen.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

interface ShearWipeProps {
  clipPathDuration?: number;
  componentsTextColor?: string;
  componentsBackgroundColor?: string;
  showcaseTextColor?: string;
  showcaseBackgroundColor?: string;
}

const ShearWipe = ({
  clipPathDuration,
  componentsTextColor = '#0D47A1',
  componentsBackgroundColor = '#E3F2FD',
  showcaseTextColor = '#ffffff',
  showcaseBackgroundColor = '#0D47A1',
}: ShearWipeProps) => {
  return (
    <ShearWipeComp
      clipPathDuration={clipPathDuration}
      componentsTextColor={componentsTextColor}
      componentsBackgroundColor={componentsBackgroundColor}
      showcaseTextColor={showcaseTextColor}
      showcaseBackgroundColor={showcaseBackgroundColor}
    />
  );
};

export default ShearWipe;
