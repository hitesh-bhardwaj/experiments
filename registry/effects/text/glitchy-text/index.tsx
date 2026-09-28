// Built using Hyperiux Vault: https://vault.hyperiux.com

"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import gsap from "gsap";
import { SplitText } from "gsap/SplitText";

gsap.registerPlugin(SplitText);

type GsapSplitText = InstanceType<typeof SplitText>;

function resetSplitPositions({ splitText, split2, split3, split4 }: {
  splitText: GsapSplitText,
  split2: GsapSplitText,
  split3: GsapSplitText,
  split4: GsapSplitText,
}) {
  gsap.set(split2.chars, { yPercent: 100 });
  gsap.set(split4.chars, { yPercent: 100 });
  gsap.set(splitText.chars, { yPercent: 0 });
  gsap.set(split3.chars, { yPercent: 0 });
}

interface GlitchyTextProps {
  initialDelay?: number;
  replayDelay?: number;
  baseTextColor?: string;
  glitchColor?: string;
}

const GlitchyText = ({
  initialDelay = 2.5,
  replayDelay = 0.2,
  baseTextColor = "#ffffff",
  glitchColor = "#eab308",
}: GlitchyTextProps) => {
  const rootRef = useRef<any>(null);
  const splitRef = useRef<any>({});
  const animationTimelineRef = useRef<any>(null);

  const text1Ref = useRef<any>(null);
  const text2Ref = useRef<any>(null);
  const text3Ref = useRef<any>(null);
  const text4Ref = useRef<any>(null);

  const [isDisabled, setIsDisabled] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    const handleChange = (event: MediaQueryListEvent) => setPrefersReducedMotion(event.matches);
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  const runAnimation = useCallback((delay = 0.2) => {
    const { splitText, split2, split3, split4 } = splitRef.current;

    if (!splitText) return;

    animationTimelineRef.current?.kill();

    gsap.killTweensOf([
      ...splitText.chars,
      ...(split2?.chars ?? []),
      ...(split3?.chars ?? []),
      ...(split4?.chars ?? []),
    ]);

    if (prefersReducedMotion) {
      gsap.set(splitText.chars, { yPercent: 100 });

      const tl = gsap.timeline({ delay });
      animationTimelineRef.current = tl;

      tl.to(splitText.chars, {
        yPercent: 0,
        duration: 0.6,
        ease: "power2.out",
      });

      return;
    }

    if (!split2 || !split3 || !split4) return;

    resetSplitPositions({ splitText, split2, split3, split4 });

    const tl = gsap.timeline({
      delay,
      defaults: {
        duration: 0.6,
        ease: "power2.inOut",
        stagger: 0.025,
      },
    });

    animationTimelineRef.current = tl;

    tl.to(
      splitText.chars,
      {
        yPercent: -100,
      },
      0
    );

    tl.to(
      split3.chars,
      {
        yPercent: -100,
      },
      0.03
    );

    tl.to(
      split2.chars,
      {
        yPercent: 0,
      },
      0.2
    );

    tl.to(
      split4.chars,
      {
        yPercent: 0,
      },
      0.23
    );
  }, [prefersReducedMotion]);

  const handleReplay = () => {
    if (isDisabled) return;

    runAnimation(replayDelay);

    setIsDisabled(true);

    window.setTimeout(() => {
      setIsDisabled(false);
    }, 1800);
  };

  useEffect(() => {
    const root = rootRef.current;

    if (!root) return;

    const splitText = SplitText.create(text1Ref.current, {
      type: "chars,lines",
      linesClass: "lines",
    });

    let split2: GsapSplitText | undefined;
    let split3: GsapSplitText | undefined;
    let split4: GsapSplitText | undefined;

    if (!prefersReducedMotion) {
      split2 = SplitText.create(text2Ref.current, {
        type: "chars,lines",
        linesClass: "lines",
      });

      split3 = SplitText.create(text3Ref.current, {
        type: "chars,lines",
        linesClass: "lines",
      });

      split4 = SplitText.create(text4Ref.current, {
        type: "chars,lines",
        linesClass: "lines",
      });
    }

    splitRef.current = {
      splitText,
      split2,
      split3,
      split4,
    };

    if (prefersReducedMotion) {
      gsap.set(splitText.chars, { yPercent: 100 });
    } else {
      resetSplitPositions({
        splitText,
        split2: split2 as GsapSplitText,
        split3: split3 as GsapSplitText,
        split4: split4 as GsapSplitText,
      });
    }

    runAnimation(prefersReducedMotion ? 0 : initialDelay);

    return () => {
      animationTimelineRef.current?.kill();

      splitText.revert();
      split2?.revert();
      split3?.revert();
      split4?.revert();

      splitRef.current = {};
      animationTimelineRef.current = null;
    };
  }, [
    runAnimation,
    initialDelay,
    prefersReducedMotion,
  ]);

  return (
    <div
      id="glitch-section"
      ref={rootRef}
      className="flex h-screen w-screen flex-col items-center justify-center bg-[#111111]"
    >
      <div className="relative h-[8.2vw] w-full overflow-hidden pl-[0.5vw]" style={{ color: baseTextColor }}>
        <div className="relative h-[6vw] w-full overflow-hidden">
          <p className="absolute left-[2vw] top-0 z-4 text-nowrap text-[6.5vw] italic uppercase leading-none tracking-tighter">
            <span ref={text1Ref} className="block">
              Engineering meets artistry
            </span>
          </p>

          {!prefersReducedMotion && (
            <>
              <p className="absolute left-[2vw] top-0 z-2 text-nowrap text-[6.5vw] italic uppercase leading-none tracking-tighter" style={{ color: glitchColor }}>
                <span ref={text3Ref} className="block">
                  Engineering meets artistry
                </span>
              </p>

              <p className="absolute left-[2vw] top-0 z-8 text-nowrap text-[6.5vw] italic uppercase leading-none tracking-tighter">
                <span ref={text2Ref} className="block">
                  Engineering meets artistry
                </span>
              </p>

              <p className="absolute left-[2vw] top-0 z-6 text-nowrap text-[6.5vw] italic uppercase leading-none tracking-tighter" style={{ color: glitchColor }}>
                <span ref={text4Ref} className="block">
                  Engineering meets artistry
                </span>
              </p>
            </>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={handleReplay}
        disabled={isDisabled}
        className={`mt-10 rounded-lg px-6 py-3 font-bold transition-all duration-300 ease-linear hover:scale-[0.95] ${
          isDisabled ? "cursor-not-allowed bg-gray-500 text-gray-300" : ""
        }`}
        style={!isDisabled ? { backgroundColor: glitchColor, color: "#111111" } : undefined}
      >
        {isDisabled ? "Please wait..." : "Replay Animation"}
      </button>
    </div>
  );
};

export default GlitchyText;
