"use client";
import React, { useCallback, useEffect, useState, useRef } from "react";
import gsap from "gsap";
import SplitText from "gsap/dist/SplitText";

gsap.registerPlugin(SplitText);

interface Slide {
  name: string;
  description: string;
  image: string;
}

interface ClippathSliderCompProps {
  slides?: Slide[];
  clueText?: string;
  showClue?: boolean;
  cursorBg?: string;
  cursorLineColor?: string;
  duration?: number;
}

export default function ClippathSliderComp({ slides = [], clueText, showClue = true, cursorBg = "#ff5f00", cursorLineColor = "#ffffff", duration = 0.75, }: ClippathSliderCompProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [, setNextSlideIndex] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const isInside = useRef(false);

  const [layerA, setLayerA] = useState({ index: 0 });
  const [layerB, setLayerB] = useState({ index: 0 });

  const textRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const linesCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const bgRefA = useRef<HTMLDivElement | null>(null);
  const bgRefB = useRef<HTMLDivElement | null>(null);
  const autoPlayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const splitRef = useRef<InstanceType<typeof SplitText> | null>(null);
  const rafRef = useRef<number | null>(null);
  const activeLayerRef = useRef<"A" | "B">("A");
  const cursorRef = useRef<HTMLDivElement | null>(null);
  const line1Ref = useRef<HTMLSpanElement | null>(null);
  const line2Ref = useRef<HTMLSpanElement | null>(null);

  const mouse = useRef({ x: 0, y: 0 });
  const pos = useRef({ x: 0, y: 0 });

  const prefersReducedMotion = () =>
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true;

  const REDUCED_MOTION_FADE_DURATION = 0.18;
  const REDUCED_MOTION_FADE_EASE = "power2.out";

  const drawStaticLines = useCallback(() => {
    const canvas = linesCanvasRef.current;
    if (!canvas) return;

    const W = canvas.offsetWidth;
    const H = canvas.offsetHeight;
    if (!W || !H) return;

    canvas.width = W;
    canvas.height = H;

    const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
    const cx = W * 0.25;
    const cy = H / 2;
    const R = Math.sqrt(
      Math.max(cx, W - cx) ** 2 + Math.max(cy, H - cy) ** 2
    ) + 10;

    const clockAngle = (hour: number): number => ((hour * 30 - 90) * Math.PI) / 180;
    const pos1 = clockAngle(1.5);
    const pos5 = clockAngle(4.5);
    const gap = 28;

    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    ctx.shadowColor = "transparent";
    ctx.filter = "none";
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1.5;
    ctx.lineCap = "butt";
    ctx.setLineDash([]);

    ctx.beginPath();
    ctx.moveTo(cx + gap * Math.cos(pos1), cy + gap * Math.sin(pos1));
    ctx.lineTo(cx + R * Math.cos(pos1), cy + R * Math.sin(pos1));
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(cx + gap * Math.cos(pos5), cy + gap * Math.sin(pos5));
    ctx.lineTo(cx + R * Math.cos(pos5), cy + R * Math.sin(pos5));
    ctx.stroke();
  }, []);

  // Init
  useEffect(() => {
    if (bgRefA.current) gsap.set(bgRefA.current, { scale: 1.25, opacity: 1, zIndex: 1 });
    if (bgRefB.current) gsap.set(bgRefB.current, { scale: 1.25, opacity: 0, zIndex: 0 });

    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    }
    drawStaticLines();
  }, [drawStaticLines]);

  // Resize
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
      }
      drawStaticLines();
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [drawStaticLines]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotionPreference = () => {
      setReduceMotion(mediaQuery.matches);
    };

    updateMotionPreference();
    mediaQuery.addEventListener("change", updateMotionPreference);

    return () => mediaQuery.removeEventListener("change", updateMotionPreference);
  }, []);

  // TEXT IN
  useEffect(() => {
    if (!textRef.current || isTransitioning) return;

    gsap.set(textRef.current, { opacity: 1 });

    requestAnimationFrame(() => {
      if (splitRef.current) {
        splitRef.current.revert();
        splitRef.current = null;
      }
      const split = new SplitText(".about-slider-text", {
        type: "lines",
        linesClass: "lines",
        mask: "lines",
      });
      splitRef.current = split;
      if (prefersReducedMotion()) {
        gsap.set(split.lines, {
          yPercent: 0,
          opacity: 1,
        });
        return;
      }
      gsap.from(split.lines, {
        yPercent: 100,
        opacity: 0,
        stagger: 0.05,
        duration: 0.5,
        ease: "power2.out",
      });
    });
  }, [currentSlide, isTransitioning, reduceMotion]);

  // FADE OUT TEXT
  const fadeOutText = useCallback(() => {
    return new Promise<void>((resolve) => {
      if (!textRef.current) return resolve();
      gsap.killTweensOf(textRef.current);
      if (prefersReducedMotion()) {
        gsap.to(textRef.current, {
          opacity: 0,
          duration: REDUCED_MOTION_FADE_DURATION,
          ease: REDUCED_MOTION_FADE_EASE,
          onComplete: () => {
            if (splitRef.current) {
              splitRef.current.revert();
              splitRef.current = null;
            }
            resolve();
          },
        });
        return;
      }
      gsap.to(textRef.current, {
        opacity: 0,
        duration: 0.3,
        ease: "power1.out",
        onComplete: () => {
          if (splitRef.current) {
            splitRef.current.revert();
            splitRef.current = null;
          }
          resolve();
        },
      });
    });
  }, []);

  const runSweepAnimation = useCallback(
    (nextIndex: number) => {
    return new Promise<void>((resolve) => {
      const canvas = canvasRef.current;
      if (!canvas) return resolve();

      const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
      const W = canvas.width;
      const H = canvas.height;

      if (prefersReducedMotion()) {
        ctx.clearRect(0, 0, W, H);
        resolve();
        return;
      }

      const img = new Image();
      img.src = slides[nextIndex].image;

      const animate = () => {
        const cx = W * 0.25;
        const cy = H / 2;
        const R = Math.sqrt(
          Math.max(cx, W - cx) ** 2 + Math.max(cy, H - cy) ** 2
        ) + 10;

        const clockAngle = (hour: number): number => ((hour * 30 - 90) * Math.PI) / 180;
        const pos1 = clockAngle(1.5);
        const pos5 = clockAngle(4.5);
        const shortSweep = clockAngle(4.5) - clockAngle(1.5);
        const longSweep = 2 * Math.PI - shortSweep;

        const proxy = { progress: 0, imgScale: 1.5 };

        const draw = () => {
          const p = proxy.progress;
          const s = proxy.imgScale;

          ctx.clearRect(0, 0, W, H);
          ctx.save();

          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.arc(cx, cy, R, pos1, pos1 + shortSweep * p, false);
          ctx.closePath();

          ctx.moveTo(cx, cy);
          ctx.arc(cx, cy, R, pos5, pos5 + longSweep * p, false);
          ctx.closePath();

          ctx.clip("evenodd");

          if (img.complete) {
            const iW = img.naturalWidth || W;
            const iH = img.naturalHeight || H;
            const fitScale = Math.max(W / iW, H / iH);
            const dw = iW * fitScale * s;
            const dh = iH * fitScale * s;
            const dx = (W - dw) / 2;
            const dy = (H - dh) / 2;
            ctx.drawImage(img, dx, dy, dw, dh);
          } else {
            ctx.fillStyle = "#888";
            ctx.fillRect(0, 0, W, H);
          }

          ctx.restore();
        };

        gsap.to(proxy, {
          progress: 1,
          imgScale: 1.25,
          duration,
          // ease:"cubic-bezier(.075, .82, .165, 1)",
          ease: "power2.inOut",
          onUpdate: draw,
          onComplete: () => {
            requestAnimationFrame(() => {
              ctx.clearRect(0, 0, W, H);
              resolve();
            });
          },
        });
      };

      if (img.complete) {
        animate();
      } else {
        img.onload = animate;
        img.onerror = animate;
      }
    });
  }, [slides, duration]);

  // SLIDE CHANGE
  const changeSlide = useCallback(
    async (newIndex: number) => {
    if (isTransitioning || slides.length === 0) return;

    setIsTransitioning(true);
    clearTimeout(autoPlayTimerRef.current ?? undefined);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    }

    setNextSlideIndex(newIndex);

    const outgoingIsA = activeLayerRef.current === "A";
    const outgoingRef = outgoingIsA ? bgRefA : bgRefB;
    const incomingRef = outgoingIsA ? bgRefB : bgRefA;

    if (outgoingIsA) {
      setLayerB({ index: newIndex });
    } else {
      setLayerA({ index: newIndex });
    }

    await new Promise((r) => requestAnimationFrame(r));

    if (incomingRef.current) {
      gsap.set(incomingRef.current, { scale: 1.25, opacity: 0, zIndex: 0 });
    }
    if (outgoingRef.current) {
      gsap.set(outgoingRef.current, { zIndex: 1 });
    }

    if (outgoingRef.current) {
      gsap.killTweensOf(outgoingRef.current);
      if (prefersReducedMotion()) {
        gsap.set(outgoingRef.current, { scale: 1.25 });
      } else {
        gsap.to(outgoingRef.current, {
          scale: 1.0,
          duration,
          ease: "power2.inOut",
        });
      }
    }

    await fadeOutText();
    await runSweepAnimation(newIndex);

    activeLayerRef.current = outgoingIsA ? "B" : "A";

    if (prefersReducedMotion()) {
      const transition = gsap.timeline();

      if (incomingRef.current) {
        gsap.killTweensOf(incomingRef.current);
        gsap.set(incomingRef.current, { zIndex: 1, scale: 1.25 });
      }

      if (outgoingRef.current) {
        gsap.killTweensOf(outgoingRef.current);
      }

      transition.to(
        outgoingRef.current,
        {
          opacity: 0,
          duration: REDUCED_MOTION_FADE_DURATION,
          ease: REDUCED_MOTION_FADE_EASE,
        },
        0
      );

      transition.to(
        incomingRef.current,
        {
          opacity: 1,
          duration: REDUCED_MOTION_FADE_DURATION,
          ease: REDUCED_MOTION_FADE_EASE,
        },
        0
      );

      transition.set(outgoingRef.current, {
        opacity: 0,
        scale: 1.25,
        zIndex: 0,
      });
    } else {
      if (outgoingRef.current) {
        gsap.killTweensOf(outgoingRef.current);
        gsap.set(outgoingRef.current, { opacity: 0, scale: 1.25, zIndex: 0 });
      }

      if (incomingRef.current) {
        gsap.killTweensOf(incomingRef.current);
        gsap.set(incomingRef.current, { zIndex: 1, opacity: 1, scale: 1.25 });
      }
    }

    setCurrentSlide(newIndex);
    setIsTransitioning(false);
  }, [fadeOutText, isTransitioning, runSweepAnimation, slides, duration]);

  const nextSlideNav = useCallback(() => {
    if (slides.length === 0) return;
    changeSlide((currentSlide + 1) % slides.length);
  }, [changeSlide, currentSlide, slides.length]);

  const prevSlideNav = () =>
    changeSlide((currentSlide - 1 + slides.length) % slides.length);

  // AUTO PLAY
  useEffect(() => {
    if (isTransitioning || slides.length === 0) return;
    autoPlayTimerRef.current = setTimeout(() => {
      nextSlideNav();
    }, 8000);
    return () => clearTimeout(autoPlayTimerRef.current ?? undefined);
  }, [isTransitioning, nextSlideNav, slides.length]);

  useEffect(() => {
    const cursor = cursorRef.current;
    const l1 = line1Ref.current;
    const l2 = line2Ref.current;

    if (!cursor || !l1 || !l2) return;

    gsap.set(cursor, {
      xPercent: -50,
      yPercent: -50,
      opacity: 0, scale: 0.6,
    });

    gsap.set(l1, {
      transformOrigin: "100% 50%",
      xPercent: -50,
      yPercent: -50,
      y: -1.5,
      rotation: 45,
      x: 0,
    });

    gsap.set(l2, {
      transformOrigin: "100% 50%",
      xPercent: -50,
      yPercent: -50,
      y: 1.5,
      rotation: -45,
      x: 0,
    });

    let currentSide: "left" | "right" = "right";
    let cursorRafId: number | null = null;

    const handleMove = (e: MouseEvent) => {
      const x = e.clientX;
      const y = e.clientY;
      const target = e.target instanceof Element ? e.target : null;
      const isOverControls = Boolean(
        target?.closest(
          'button, input, textarea, select, a, label, [role="button"], [contenteditable="true"], [class*="remixer-panel"]'
        )
      );

      mouse.current.x = x;
      mouse.current.y = y;

      // guard against top-edge ghost position
      const isOut =
        x <= 0 ||
        y <= 0 ||
        x >= window.innerWidth ||
        y >= window.innerHeight;

      // Out of bounds
      if (isOut || isOverControls) {
        if (isInside.current) {
          isInside.current = false;

          gsap.to(cursorRef.current, {
            opacity: 0,
            scale: 0.6,
            duration: 0.25,
            ease: "power3.inOut",
          });
        }
        return;
      }

      // First entry
      if (!isInside.current) {
        pos.current.x = x;
        pos.current.y = y;

        gsap.set(cursorRef.current, {
          x: x,
          y: y,
        });

        gsap.to(cursorRef.current, {
          opacity: 1,
          scale: 1,
          duration: 0.25,
          ease: "power3.out",
        });

        isInside.current = true;
      }

      // Arrow direction
      const isLeft = x < window.innerWidth / 2;
      const nextSide = isLeft ? "left" : "right";

      if (nextSide !== currentSide) {
        currentSide = nextSide;

        if (nextSide === "left") {
          // <
          gsap.to(line1Ref.current, {
            rotation: 135,
            x: "-1vw",
            duration: 0.35,
            ease: "power3.inOut",
          });

          gsap.to(line2Ref.current, {
            rotation: -135,
            x: "-1vw",
            duration: 0.35,
            ease: "power3.inOut",
          });
        } else {
          // >
          gsap.to(line1Ref.current, {
            rotation: 45,
            x: 4,
            duration: 0.35,
            ease: "power3.inOut",
          });

          gsap.to(line2Ref.current, {
            rotation: -45,
            x: 4,
            duration: 0.35,
            ease: "power3.inOut",
          });
        }
      }
    };

    const handleLeave = () => {
      isInside.current = false;

      gsap.to(cursor, {
        opacity: 0,
        scale: 0.6, duration: 0.25,
        ease: "power3.inOut",
      });
    };

    window.addEventListener("mousemove", handleMove);
    // window.addEventListener("mouseleave", handleLeave);

    // smooth follow
    const render = () => {
      pos.current.x += (mouse.current.x - pos.current.x) * 0.12;
      pos.current.y += (mouse.current.y - pos.current.y) * 0.12;

      gsap.set(cursor, {
        x: pos.current.x,
        y: pos.current.y,
      });

      cursorRafId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseleave", handleLeave);
      if (cursorRafId) cancelAnimationFrame(cursorRafId);
    };
  }, [reduceMotion]);

  if (slides.length === 0) return null;

  const slideLabel = slides[currentSlide]?.name
    ? `${slides[currentSlide].name}, slide ${currentSlide + 1} of ${slides.length}`
    : `Slide ${currentSlide + 1} of ${slides.length}`;

  return (
    <section className="relative w-screen h-screen overflow-hidden">
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {slideLabel}
      </div>

      <div
        ref={bgRefA}
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `url('${slides[layerA.index].image}')`,
          transformOrigin: "center center",
          willChange: "transform",
        }}
      />

      <div
        ref={bgRefB}
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `url('${slides[layerB.index].image}')`,
          transformOrigin: "center center",
          willChange: "transform",
        }}
      />

      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ zIndex: 10 }}
      />

      <canvas
        ref={linesCanvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ zIndex: 20 }}
      />

      <div
        className="absolute inset-0 bg-black/10 pointer-events-none"
        style={{ zIndex: 30 }}
      />

      <div
        className="absolute inset-0"
        style={{ zIndex: 40 }}
        onClick={(e) => {
          if (isTransitioning) return;
          const isLeft = e.clientX < window.innerWidth / 2;
          isLeft ? prevSlideNav() : nextSlideNav();
        }}
      />

      <div
        ref={textRef}
        className="absolute inset-0 text-white pointer-events-none"
        style={{ zIndex: 50 }}
      >
        <h2 className="absolute left-[5%] max-md:left-[1%] top-[50%] max-[1025px]:text-[3vw] w-[20vw] max-md:w-[27vw] text-right -translate-y-1/2 text-[2.5vw] max-md:text-[4vw] font-medium about-slider-text">
          {slides[currentSlide].name}
        </h2>

        <div className="absolute right-[5%] max-md:right-[5%] max-[1025px]:right-[10%] top-[50%] max-[1025px]:w-[40vw] max-md:top-[50%] w-[30vw] max-md:w-[50vw] -translate-y-1/2 flex flex-col items-start leading-[1.1]">

            <p className="text-[1.5vw] max-[1025px]:text-[2.5vw] max-md:text-[4vw] font-light about-slider-text text-shadow-black">
               {slides[currentSlide].description}
            </p>

        </div>

      </div>

      <div
        ref={cursorRef}
        className="fixed max-[1025px]:hidden  top-0 left-0 pointer-events-none z-100"
      >
        <div
          className="w-15 h-15 max-[1025px]:hidden  rounded-full flex items-center justify-center relative"
          style={{ backgroundColor: cursorBg }}
        >
          <div className="relative w-7.5 h-7.5">
            <span
              ref={line1Ref}
              className="absolute left-1/2 top-1/2 w-4 h-0.5"
              style={{ backgroundColor: cursorLineColor }}
            />

            <span
              ref={line2Ref}
              className="absolute left-1/2 top-1/2 w-4 h-0.5"
              style={{ backgroundColor: cursorLineColor }}
            />

          </div>

        </div>
      </div>

      {showClue && clueText && (
        <p className="pointer-events-none absolute bottom-8 left-1/2 z-50 -translate-x-1/2 rounded-full border max-md:w-[70%] border-white/15 bg-black/35 px-6 py-3 text-center font-mono text-sm max-[1025px]:text-base max-md:text-sm leading-relaxed text-white/80  backdrop-blur-md max-md:bottom-6 ">
          {clueText}
        </p>
      )}
    </section>
  );
}
