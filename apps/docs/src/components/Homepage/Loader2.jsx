"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { isLighthouseOrHeadless, isSoftwareRenderer } from "@/lib/audit";
import { useLenis } from "lenis/react";

export const LOADER_STORAGE_KEY = "hyperiux-loader-has-run";

// 00 → 27 → 59 → 77 → 99
const LEFT_DIGITS = ["0", "2", "5", "7", "9"];
const RIGHT_DIGITS = ["0", "7", "9", "7", "9"];

function getLoaderOverride() {
  if (typeof window === "undefined") return null;
  const v = new URLSearchParams(window.location.search).get("loader");
  return v === "cold" || v === "skip" ? v : null;
}

function hasLoaderRun() {
  if (typeof window === "undefined") return false;
  const override = getLoaderOverride();
  if (override) return override === "skip";
  try {
    return window.sessionStorage.getItem(LOADER_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function shouldSkipLoader() {
  if (typeof window === "undefined") return false;
  const override = getLoaderOverride();
  if (override) return override === "skip";
  if (isLighthouseOrHeadless() || isSoftwareRenderer()) return true;
  return false;
}

function markLoaderAsRun() {
  try {
    window.sessionStorage.setItem(LOADER_STORAGE_KEY, "true");
  } catch {
    // ignore
  }
}

function setLoaderRuntimeState({ running, complete }) {
  window.__HYPERIUX_LOADER_RUNNING__ = running;
  window.__HYPERIUX_LOADER_COMPLETE__ = complete;
}

function dispatchLoaderComplete(skipped = false) {
  window.dispatchEvent(
    new CustomEvent("loaderComplete", { detail: { skipped } }),
  );
  window.dispatchEvent(
    new CustomEvent("hyperiux:loader-complete", { detail: { skipped } }),
  );
}

function signalLoaderComplete(skipped = false) {
  document.documentElement.classList.remove("loader-first-visit");
  document.body.classList.remove("loader-active");
  markLoaderAsRun();
  setLoaderRuntimeState({ running: false, complete: true });
  dispatchLoaderComplete(skipped);
}

function hideLoaderLayers({ root, progress, footer } = {}) {
  if (root) gsap.set(root, { autoAlpha: 0, pointerEvents: "none" });
  if (progress) gsap.set(progress, { autoAlpha: 0, pointerEvents: "none" });
  if (footer) gsap.set(footer, { autoAlpha: 0, pointerEvents: "none" });
}

const Loader2 = () => {
  const rootRef = useRef(null);
  const progressRef = useRef(null);
  const footerRef = useRef(null);
  const loadingTextRef = useRef(null);
  const scrollLockRef = useRef({
    locked: false,
    scrollY: 0,
    bodyOverflow: "",
    htmlOverflow: "",
    bodyPosition: "",
    bodyTop: "",
    bodyWidth: "",
    bodyTouchAction: "",
    htmlOverscrollBehavior: "",
    stopInterval: null,
    stopRaf: null,
  });
  const [visible, setVisible] = useState(false);
  const [shouldRun, setShouldRun] = useState(false);
  const lenis = useLenis();
  const lenisRef = useRef(lenis);
  useLayoutEffect(() => {
    lenisRef.current = lenis;
  });

  const lockScroll = useCallback(() => {
    if (typeof window === "undefined") return;

    lenisRef.current?.stop?.();
    window.__HYPERIUX_LENIS_LOCKED__ = true;

    const lock = scrollLockRef.current;
    if (!lock.locked) {
      lock.locked = true;
      lock.scrollY = window.scrollY || window.pageYOffset || 0;
      lock.bodyOverflow = document.body.style.overflow;
      lock.htmlOverflow = document.documentElement.style.overflow;
      lock.bodyPosition = document.body.style.position;
      lock.bodyTop = document.body.style.top;
      lock.bodyWidth = document.body.style.width;
      lock.bodyTouchAction = document.body.style.touchAction;
      lock.htmlOverscrollBehavior =
        document.documentElement.style.overscrollBehavior;

      document.documentElement.style.overflow = "hidden";
      document.documentElement.style.overscrollBehavior = "none";
      document.body.style.overflow = "hidden";
      document.body.style.position = "fixed";
      document.body.style.top = `-${lock.scrollY}px`;
      document.body.style.width = "100%";
      document.body.style.touchAction = "none";
    }

    if (!lock.stopInterval) {
      lock.stopInterval = window.setInterval(() => {
        lenisRef.current?.stop?.();
      }, 50);
    }

    const stopEveryFrame = () => {
      if (!scrollLockRef.current.locked) return;
      lenisRef.current?.stop?.();
      scrollLockRef.current.stopRaf =
        window.requestAnimationFrame(stopEveryFrame);
    };

    if (!lock.stopRaf) {
      lock.stopRaf = window.requestAnimationFrame(stopEveryFrame);
    }
  }, []);

  const unlockScroll = useCallback(() => {
    if (typeof window === "undefined") return;

    const lock = scrollLockRef.current;

    if (lock.stopInterval) {
      window.clearInterval(lock.stopInterval);
      lock.stopInterval = null;
    }
    if (lock.stopRaf) {
      window.cancelAnimationFrame(lock.stopRaf);
      lock.stopRaf = null;
    }

    if (lock.locked) {
      document.documentElement.style.overflow = lock.htmlOverflow;
      document.documentElement.style.overscrollBehavior =
        lock.htmlOverscrollBehavior;
      document.body.style.overflow = lock.bodyOverflow;
      document.body.style.position = lock.bodyPosition;
      document.body.style.top = lock.bodyTop;
      document.body.style.width = lock.bodyWidth;
      document.body.style.touchAction = lock.bodyTouchAction;
      window.scrollTo(0, lock.scrollY || 0);
    }

    lock.locked = false;
    window.__HYPERIUX_LENIS_LOCKED__ = false;
    lenisRef.current?.start?.();
    requestAnimationFrame(() => lenisRef.current?.start?.());
  }, []);

  useLayoutEffect(() => {
    document.documentElement.classList.remove("loader-first-visit");

    if (hasLoaderRun() || shouldSkipLoader()) {
      // sessionStorage/DOM-derived - can only be known post-mount.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setVisible(false);
      setShouldRun(false);
      setLoaderRuntimeState({ running: false, complete: true });
      document.body.classList.remove("loader-active");
      requestAnimationFrame(() => {
        dispatchLoaderComplete(true);
      });
      return;
    }

    setVisible(true);
    setShouldRun(true);
    document.body.classList.add("loader-active");
    setLoaderRuntimeState({ running: true, complete: false });

    return () => {
      document.body.classList.remove("loader-active");
    };
  }, []);

  // Freeze page scroll for the entire loader (native + Lenis).
  useLayoutEffect(() => {
    if (!shouldRun || !visible) return;
    lockScroll();
    return () => unlockScroll();
  }, [shouldRun, visible, lockScroll, unlockScroll]);

  // If Lenis mounts mid-loader, stop it immediately.
  useEffect(() => {
    if (!shouldRun || !visible || !lenis) return;
    lenis.stop?.();
  }, [shouldRun, visible, lenis]);

  useEffect(() => {
    if (!shouldRun || !visible) return;

    const root = rootRef.current;
    const progress = progressRef.current;
    const footer = footerRef.current;
    const loadingText = loadingTextRef.current;
    if (!root || !progress) return;

    const finishLoader = () => {
      hideLoaderLayers({ root, progress, footer });
      setVisible(false);
      unlockScroll();
    };

    const ctx = gsap.context(() => {
      const sequence = root.querySelector(".sequence-container");
      const numberContainers = gsap.utils.toArray(
        root.querySelectorAll(".number-container"),
      );
      const digitWidth =
        numberContainers[0]?.querySelector("span")?.offsetWidth || 0;

      if (!digitWidth || !sequence) {
        signalLoaderComplete(false);
        finishLoader();
        return;
      }

      const travel = root.clientWidth - sequence.offsetWidth;
      const step = travel / 4;

      gsap.set(numberContainers, { x: 0 });
      gsap.set(sequence, { x: 0 });
      gsap.set(progress, {
        x: 0,
        // y: parkedY,
        scaleX: 0,
        transformOrigin: "left top",
      });

      const tl = gsap.timeline({
        delay: 0.5,
      });

      // 00 → 27
      tl.to(sequence, { x: `+=${step}`, duration: 0.7, ease: "power2.inOut" })
        .to(
          numberContainers,
          { x: `-=${digitWidth}`, duration: 0.7, ease: "power2.inOut" },
          "<",
        )
        .to(
          progress,
          { scaleX: 0.4, duration: 0.7, ease: "power2.inOut" },
          "<",
        );

      // 27 → 59
      tl.to(sequence, { x: `+=${step}`, duration: 0.7, ease: "power2.inOut" })
        .to(
          numberContainers,
          { x: `-=${digitWidth}`, duration: 0.7, ease: "power2.inOut" },
          "<",
        )
        .to(
          progress,
          { scaleX: 0.6, duration: 0.7, ease: "power2.inOut" },
          "<",
        );

      // 59 → 77
      tl.to(sequence, { x: `+=${step}`, duration: 0.7, ease: "power2.inOut" })
        .to(
          numberContainers,
          { x: `-=${digitWidth}`, duration: 0.7, ease: "power2.inOut" },
          "<",
        )
        .to(
          progress,
          { scaleX: 0.8, duration: 0.7, ease: "power2.inOut" },
          "<",
        );

      // 77 → 99
      tl.to(sequence, { x: `+=${step}`, duration: 0.7, ease: "power2.inOut" })
        .to(
          numberContainers,
          { x: `-=${digitWidth}`, duration: 0.7, ease: "power2.inOut" },
          "<",
        )
        .to(progress, { scaleX: 1, duration: 0.7, ease: "power2.inOut" }, "<");

      tl.to(sequence, {
        x: root.clientWidth,
        duration: 0.7,
        opacity: 0,
        ease: "power2.inOut",
      });

      tl.to(
        progress,
        {
          height:"100vh",
          delay: 0.6,
          duration: 0.4,
          ease: "power2.inOut",
          onComplete: () => {
            gsap.set(progress,{
               bottom:"auto",
               top:"0%",
            })
            gsap.set(root, { autoAlpha: 0, pointerEvents: "none" });
            signalLoaderComplete(false);
          },
        },
        "<",
      );

      if (loadingText) {
        tl.to(
          loadingText,
          {
            opacity: 0,
            duration: 0.5,
            ease: "power2.inOut",
          },
          "<",
        );
      }

      tl.to(progress, {
        // y: -root.clientHeight,
         height:"0vh",
        duration: 0.4,
        ease: "power2.inOut",
        onComplete: finishLoader,
      });
    }, root);

    return () => ctx.revert();
  }, [shouldRun, visible, unlockScroll]);

  if (!visible) return null;

  return (
    <>
      <div
        ref={rootRef}
        id="loader"
        className="fixed inset-0 z-1200 flex h-screen w-screen items-start justify-start overflow-hidden bg-[#0e0e0e] text-[17vw] text-white max-[1025px]:text-[22vw] max-md:text-[28vw]"
      >
        <div className="sequence-container relative z-2 flex h-fit w-fit font-head font-medium">
          <div className="flex w-[10vw] overflow-hidden max-[1025px]:w-[14vw] max-md:w-[16vw]">
            <div className="number-container flex w-fit">
              {LEFT_DIGITS.map((digit) => (
                <span
                  key={`l-${digit}`}
                  className="inline-block w-[10vw] shrink-0 text-center max-[1025px]:w-[14vw] max-md:w-[16vw]"
                >
                  {digit}
                </span>
              ))}
            </div>
          </div>

          <div className="flex w-[10vw] overflow-hidden max-[1025px]:w-[14vw] max-md:w-[16vw]">
            <div className="number-container flex w-fit">
              {RIGHT_DIGITS.map((digit, index) => (
                <span
                  key={`r-${index}-${digit}`}
                  className="inline-block w-[10vw] shrink-0 text-center max-[1025px]:w-[14vw] max-md:w-[16vw]"
                >
                  {digit}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div
        ref={progressRef}
        className="loader-progress pointer-events-none h-[4vh] fixed bottom-0 left-0 z-1300 w-full origin-left bg-[linear-gradient(to_right,#f16b0d,#e61216)] will-change-transform"
      />

      <div
        ref={footerRef}
        className="loader-footer pointer-events-none fixed bottom-0 left-0 z-1300 h-[2vw] w-full max-[1025px]:h-10 max-md:h-9"
      >
        <div className="relative h-full w-full">
          <p
            ref={loadingTextRef}
            className="loader-text-loading absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[1vw] font-medium text-white max-[1025px]:text-sm max-md:text-xs"
          >
            LOADING...
          </p>
        </div>
      </div>
    </>
  );
};

export default Loader2;
