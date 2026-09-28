// Built using Hyperiux Vault: https://vault.hyperiux.com

"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type WheelEvent as ReactWheelEvent } from "react";
import InfiniteGrid from "./InfiniteGrid";

const OVERLAY_ASPECT_RATIO = 16 / 9;

function getOverlayMetrics(vw: number, vh: number) {
  const isMobile = vw <= 768;
  const isTablet = !isMobile && vw <= 1025;

  let thumbsH: number;
  let maxW: number;
  let maxH: number;

  if (isMobile) {
    thumbsH = 132;
    maxW = vw * 0.92;
    maxH = vh - thumbsH - 56;
  } else if (isTablet) {
    thumbsH = 148;
    maxW = vw * 0.82;
    maxH = vh - thumbsH - 64;
  } else {
    thumbsH = 156;
    maxW = vw * 0.72;
    maxH = vh - thumbsH - 72;
  }

  let targetW = maxW;
  let targetH = targetW / OVERLAY_ASPECT_RATIO;

  if (targetH > maxH) {
    targetH = maxH;
    targetW = targetH * OVERLAY_ASPECT_RATIO;
  }

  return {
    thumbsH,
    targetW: Math.round(targetW),
    targetH: Math.round(targetH),
  };
}
function getCenteredOverlayTop(vw: number, vh: number, targetH: number) {
  return Math.round((vh - targetH) / 2);
}

interface ExpandedState {
  index: number;
  rect: { left: number, top: number, width: number, height: number };
  vw: number;
  vh: number;
  target: { left: number, top: number, width: number, height: number };
  thumbsH: number;
}

interface SlideState {
  from: number;
  to: number;
  dir: number;
}

interface InfiniteGridGalleryImage {
  src?: string;
  url?: string;
  caption?: string;
  title?: string;
}

interface InfiniteGridGalleryProps {
  images?: Array<string | InfiniteGridGalleryImage>;
  columns?: number;
  gap?: number;
  speed?: number;
  imageScale?: number;
}

export default function InfiniteGridGallery({
  images,
  columns = 4,
  gap = 44,
  speed = 1,
  imageScale = 1,
}: InfiniteGridGalleryProps) {
  const imagesRef = useRef<HTMLDivElement | null>(null);
  const gridRef = useRef<InfiniteGrid | null>(null);

  const expandThumbsRef = useRef<HTMLDivElement | null>(null);
  const expandThumbRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const thumbClickIndexRef = useRef<number | null>(null);

  const thumbDragRef = useRef({
    active: false,
    pointerId: null as number | null,
    startX: 0,
    startScrollLeft: 0,
    moved: false,
  });

  const [expanded, setExpanded] = useState<ExpandedState | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  const [isOpening, setIsOpening] = useState(false);
  const [displayIndex, setDisplayIndex] = useState<number | null>(null);
  const [slide, setSlide] = useState<SlideState | null>(null);
  const [isThumbDragging, setIsThumbDragging] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  const closeTimerRef = useRef<number | undefined>(undefined);
  const slideTimerRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!mq) return;
    const update = () => setReduceMotion(mq.matches);
    update();
    mq.addEventListener?.("change", update);
    return () => mq.removeEventListener?.("change", update);
  }, []);

  const slideDurationMs = reduceMotion ? 0 : 600;
  const openCloseDurationMs = reduceMotion ? 0 : 750;
  const isAnimating = isOpening || isClosing || Boolean(slide);

  const unsplashPool = useMemo(
    () => [
      {
        src: "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/v-01.jpg",
        title: "Velora Drift",
      },
      {
        src: "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/v-02.jpg",
        title: "Zentha Bloom",
      },
      {
        src: "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/v-03.jpg",
        title: "Auralis Fade",
      },
      {
        src: "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/v-04.jpg",
        title: "Nyxara Flow",
      },
      {
        src: "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/v-05.jpg",
        title: "Solune Mist",
      },
      {
        src: "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/v-06.jpg",
        title: "Cryon Pulse",
      },
      {
        src: "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/v-07.jpg",
        title: "Luneth Glow",
      },
      {
        src: "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/v-08.jpg",
        title: "Virel Shift",
      },
      {
        src: "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/v-09.jpg",
        title: "Orvyn Haze",
      },
      {
        src: "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/v-10.jpg",
        title: "Draxen Veil",
      },
      {
        src: "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/h-01.jpg",
        title: "Kaelis Tone",
      },
      {
        src: "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/h-02.jpg",
        title: "Myra Flux",
      },
      {
        src: "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/h-03.jpg",
        title: "Zypher Blend",
      },
      {
        src: "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/h-06.jpg",
        title: "Elyon Sweep",
      },
      {
        src: "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/h-05.jpg",
        title: "Thyra Wave",
      },
    ],
    []
  );

  const sources = useMemo(() => {
    const sourcePool: Array<string | InfiniteGridGalleryImage> =
      Array.isArray(images) && images.length ? images : unsplashPool;

    return Array.from({ length: 120 }, (_, i) => {
        const pick = sourcePool[i % sourcePool.length];
        const src = typeof pick === "string" ? pick : pick.src ?? pick.url ?? unsplashPool[i % unsplashPool.length].src;
        const title = typeof pick === "string" ? `Image ${i + 1}` : pick.caption ?? pick.title;

        return {
          src,
          caption: (() => {
            if (title) return title;
            // Deterministic"random" name per index (stable across reloads).
            const adjectives = [
              "Silent",
              "Soft",
              "Luminous",
              "Velvet",
              "Electric",
              "Drifting",
              "Infinite",
              "Neon",
              "Golden",
              "Hidden",
              "Crystal",
              "Midnight",
              "Warm",
              "Icy",
              "Dusty",
              "Liquid",
              "Misty",
              "Aurora",
              "Calm",
              "Vivid",
            ];

            const nouns = [
              "Horizon",
              "Gradient",
              "Bloom",
              "Echo",
              "Field",
              "Wave",
              "Ridge",
              "Atlas",
              "Canvas",
              "Spectrum",
              "Orbit",
              "Shoreline",
              "Valley",
              "Glade",
              "Tide",
              "Mirage",
              "Pulse",
              "Drift",
              "Skylight",
              "Cascade",
            ];

            const a = adjectives[i % adjectives.length];
            const b = nouns[(i * 7) % nouns.length];
            return `${a} ${b}`;
          })(),
        };
      });
  }, [images, unsplashPool]);

  const data = useMemo(() => {
    const cols = 3;
    const rows = 3;

    const itemW = 400;
    const itemH = 270;
    const gap = 40;
    const startX = 71;
    const startY = 58;

    return Array.from({ length: cols * rows }, (_, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);

      return {
        x: startX + col * (itemW + gap),
        y: startY + row * (itemH + gap),
        w: itemW,
        h: itemH,
      };
    });
  }, []);

  useEffect(() => {
    const el = imagesRef.current;
    if (!el) return;

    const setRvw = () => {
      document.documentElement.style.setProperty(
        "--rvw",
        `${document.documentElement.clientWidth / 100}px`
      );
    };

    setRvw();
    window.addEventListener("resize", setRvw);

    gridRef.current = new InfiniteGrid({
      el,
      sources,
      data,
      originalSize: { w: 1422, h: 1006 },
      columns,
      gap,
      speed,
      imageScale,
      onItemClick: ({ index, rect }) => {
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const { thumbsH, targetW, targetH } = getOverlayMetrics(vw, vh);

        const targetLeft = Math.round((vw - targetW) / 2);
        const targetTop = getCenteredOverlayTop(vw, vh, targetH);

        setIsClosing(false);
        setIsOpening(true);
        setExpanded({
          index,
          rect,
          vw,
          vh,
          target: {
            left: targetLeft,
            top: targetTop,
            width: targetW,
            height: targetH,
          },
          thumbsH,
        });
        setDisplayIndex(index);
        setSlide(null);
      },
    });

    return () => {
      window.removeEventListener("resize", setRvw);
      gridRef.current?.destroy?.();
      gridRef.current = null;
    };
  }, [columns, data, gap, imageScale, sources, speed]);

  const active = expanded ? sources[expanded.index] : null;
  const display = displayIndex === null ? null : sources[displayIndex];

  const centerActiveThumb = useCallback((index: number, behavior: ScrollBehavior = "smooth") => {
    const container = expandThumbsRef.current;
    const activeThumb = expandThumbRefs.current[index];

    if (!container || !activeThumb) return;

    const left =
      activeThumb.offsetLeft -
      container.clientWidth / 2 +
      activeThumb.clientWidth / 2;

    container.scrollTo({ left, behavior });
  }, []);

  const navigateTo = useCallback((nextIndex: number) => {
    if (!expanded) return;
    if (isAnimating) return;

    if (nextIndex === expanded.index) {
      centerActiveThumb(nextIndex, reduceMotion ? "auto" : "smooth");
      return;
    }

    const n = sources.length;
    const currentIndex = expanded.index;
    const forward = (nextIndex - currentIndex + n) % n;
    const backward = (currentIndex - nextIndex + n) % n;
    const dir = forward <= backward ? 1 : -1;

    window.clearTimeout(slideTimerRef.current);

    setSlide({ from: currentIndex, to: nextIndex, dir });
    setExpanded((s) => (!s ? s : { ...s, index: nextIndex }));

    slideTimerRef.current = window.setTimeout(() => {
      setDisplayIndex(nextIndex);
      setSlide(null);
    }, slideDurationMs);
  }, [centerActiveThumb, expanded, isAnimating, sources.length, slideDurationMs, reduceMotion]);

  const closeExpanded = useCallback(() => {
    if (!expanded || isClosing) return;

    setIsClosing(true);
    setIsOpening(false);
    setSlide(null);

    window.clearTimeout(closeTimerRef.current);
    closeTimerRef.current = window.setTimeout(() => {
      setExpanded(null);
      setIsClosing(false);
      setDisplayIndex(null);
    }, openCloseDurationMs);
  }, [expanded, isClosing, openCloseDurationMs]);

  useEffect(() => {
    gridRef.current?.setEnabled?.(!expanded);
  }, [expanded]);

  useEffect(() => {
    if (!expanded) return;

    const id = requestAnimationFrame(() => setIsOpening(false));
    return () => cancelAnimationFrame(id);
  }, [expanded]);

  useEffect(() => {
    if (!expanded) return;

    requestAnimationFrame(() => {
      centerActiveThumb(expanded.index, reduceMotion ? "auto" : "smooth");
    });
  }, [centerActiveThumb, expanded, reduceMotion]);

  useEffect(() => {
    return () => {
      window.clearTimeout(slideTimerRef.current);
      window.clearTimeout(closeTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!expanded) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeExpanded();

      if (e.key === "ArrowLeft") {
        navigateTo((expanded.index - 1 + sources.length) % sources.length);
      }

      if (e.key === "ArrowRight") {
        navigateTo((expanded.index + 1) % sources.length);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [closeExpanded, expanded, navigateTo, sources.length]);

  const onThumbPointerDown = (e: ReactPointerEvent) => {
    const container = expandThumbsRef.current;
    if (!container) return;

    const button = (e.target as HTMLElement).closest("[data-thumb-index]");

    thumbClickIndexRef.current = button
      ? Number(button.getAttribute("data-thumb-index"))
      : null;

    thumbDragRef.current.active = true;
    thumbDragRef.current.pointerId = e.pointerId;
    thumbDragRef.current.startX = e.clientX;
    thumbDragRef.current.startScrollLeft = container.scrollLeft;
    thumbDragRef.current.moved = false;

    setIsThumbDragging(true);
    container.setPointerCapture?.(e.pointerId);
  };

  const onThumbPointerMove = (e: ReactPointerEvent) => {
    if (!thumbDragRef.current.active) return;
    if (thumbDragRef.current.pointerId !== e.pointerId) return;

    const container = expandThumbsRef.current;
    if (!container) return;

    const dx = e.clientX - thumbDragRef.current.startX;

    if (!thumbDragRef.current.moved && Math.abs(dx) > 3) {
      thumbDragRef.current.moved = true;
    }

    container.scrollLeft = thumbDragRef.current.startScrollLeft - dx;
  };

  const endThumbDrag = (e: ReactPointerEvent) => {
    if (!thumbDragRef.current.active) return;
    if (thumbDragRef.current.pointerId !== e.pointerId) return;

    const container = expandThumbsRef.current;
    container?.releasePointerCapture?.(e.pointerId);

    const clickedIndex = thumbClickIndexRef.current;
    const wasDragged = thumbDragRef.current.moved;

    thumbDragRef.current.active = false;
    thumbDragRef.current.pointerId = null;
    thumbClickIndexRef.current = null;

    setIsThumbDragging(false);

    if (!wasDragged && Number.isInteger(clickedIndex)) {
      navigateTo(clickedIndex as number);
    }

    window.setTimeout(() => {
      thumbDragRef.current.moved = false;
    }, 0);
  };

  const onThumbWheel = (e: ReactWheelEvent) => {
    const container = expandThumbsRef.current;
    if (!container) return;

    e.preventDefault();
    container.scrollLeft += e.deltaX || e.deltaY;
  };

  return (
    <>
      <section className="infinite-grid-gallery-root h-screen w-full cursor-grab overflow-hidden bg-white font-mono text-black select-none">
        <div ref={imagesRef} className="infinite-grid-gallery-images relative inline-block h-full w-full overflow-hidden whitespace-nowrap bg-white" />

        {active && expanded && display ? (
          <div
            className={`fixed inset-0 z-60 cursor-default bg-white transition-opacity duration-750 ease-[cubic-bezier(0.785,0.135,0.15,0.86)] motion-reduce:transition-none motion-reduce:duration-0 ${isOpening ? "opacity-0" : ""
              } ${isClosing ? "opacity-0" : ""
              } ${!isOpening && !isClosing ? "opacity-100" : ""}`}
            role="dialog"
            aria-modal="true"
            onMouseDown={() => closeExpanded()}
          >
            <div
              className="fixed inset-0 mt-[-3%] flex flex-col items-center justify-start"
              style={{

                "--thumbsH": `${expanded.thumbsH}px`,
              } as CSSProperties & Record<string, string | number>}
            >
              <div
                className="absolute origin-top-left overflow-hidden bg-[rgba(0,0,0,0.06)] will-change-transform"
                aria-hidden="true"
                onMouseDown={(e) => e.stopPropagation()}
                style={{
                  left: expanded.target.left,
                  top: expanded.target.top,
                  width: expanded.target.width,
                  height: expanded.target.height,
                  aspectRatio: "16 / 9",
                  transform:
                    isOpening || isClosing
                      ? `translate(${expanded.rect.left - expanded.target.left}px, ${expanded.rect.top - expanded.target.top
                      }px) scale(${expanded.rect.width / expanded.target.width}, ${expanded.rect.height / expanded.target.height
                      })`
                      : "translate(0px, 0px) scale(1, 1)",
                  transition: reduceMotion
                    ? "none"
                    : "transform 750ms cubic-bezier(0.785, 0.135, 0.15, 0.86)",
                }}
              >
                {slide ? (
                  <>
                    <img
                      className={`absolute inset-0 block h-full w-full object-cover backface-hidden ${slide.dir > 0
                        ? "infinite-grid-gallery-slide-left-from"
                        : "infinite-grid-gallery-slide-right-from"
                        }`}
                      src={sources[slide.from].src}
                      alt={sources[slide.from].caption}
                    />

                    <img
                      className={`absolute inset-0 block h-full w-full object-cover backface-hidden ${slide.dir > 0
                        ? "infinite-grid-gallery-slide-left-to"
                        : "infinite-grid-gallery-slide-right-to"
                        }`}
                      src={sources[slide.to].src}
                      alt={sources[slide.to].caption}
                    />
                  </>
                ) : (
                  <img
                    className="block h-full w-full object-cover absolute inset-0"
                    src={display.src}
                    alt={display.caption}
                  />
                )}
              </div>

              <button
                type="button"
                className="fixed left-(--nav-left) top-(--nav-top) z-4 grid h-13.5 w-13.5  -translate-y-1/2 place-items-center rounded-full border border-black/12 bg-white/90 text-[30px] leading-none text-black shadow-[0_18px_60px_rgba(0,0,0,0.12)] transition-opacity disabled:cursor-not-allowed disabled:opacity-35 max-[1025px]:left-[calc(50%-70px)] max-[1025px]:top-auto max-[1025px]:bottom-[calc(var(--thumbsH)+55px)] max-[1025px]:h-15 max-[1025px]:w-15 max-[1025px]:translate-y-0 max-[1025px]:text-2xl max-md:left-[calc(50%-70px)] max-md:bottom-[calc(var(--thumbsH)+55px)] max-md:h-15 max-md:w-15 max-md:text-xl"
                style={{
                  "--nav-left": `${Math.max(16, expanded.target.left - 72)}px`,
                  "--nav-top": `${expanded.target.top + expanded.target.height / 2}px`,
                } as CSSProperties & Record<string, string | number>}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={() =>
                  navigateTo((expanded.index - 1 + sources.length) % sources.length)
                }
                aria-label="Previous"
                disabled={isAnimating}
              >
                ‹
              </button>

              <button
                type="button"
                className="fixed right-(--nav-right) top-(--nav-top) z-4 grid h-13.5 w-13.5 -translate-y-1/2 place-items-center rounded-full border border-black/12 bg-white/90 text-[30px] leading-none text-black shadow-[0_18px_60px_rgba(0,0,0,0.12)] transition-opacity disabled:cursor-not-allowed disabled:opacity-35 max-[1025px]:right-[calc(50%-70px)] max-[1025px]:top-auto max-[1025px]:bottom-[calc(var(--thumbsH)+55px)] max-[1025px]:h-15 max-[1025px]:w-15 max-[1025px]:translate-y-0 max-[1025px]:text-2xl max-md:right-[calc(50%-70px)] max-md:bottom-[calc(var(--thumbsH)+55px)] max-md:h-15 max-md:w-15 max-md:text-xl"
                style={{
                  "--nav-right": `${Math.max(
                    16,
                    window.innerWidth - (expanded.target.left + expanded.target.width) - 72
                  )}px`,
                  "--nav-top": `${expanded.target.top + expanded.target.height / 2}px`,
                } as CSSProperties & Record<string, string | number>}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={() => navigateTo((expanded.index + 1) % sources.length)}
                aria-label="Next"
                disabled={isAnimating}
              >
                ›
              </button>

              <div
                className="fixed inset-x-0 bottom-0 grid h-(--thumbsH) grid-cols-1 items-center gap-3 bg-white px-3.5 pb-3.5 max-[1025px]:gap-2.5 max-[1025px]:px-3 max-[1025px]:pb-3 max-md:px-2.5 max-md:pb-2.5 max-md:gap-2"
                aria-label="All images"
                onMouseDown={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-center pt-2.5" aria-hidden="true">
                  <h2 className="mt-[0%] max-w-[min(860px,calc(100vw-40px))] overflow-hidden text-ellipsis whitespace-nowrap px-0 py-1.5 text-center text-[30px] font-medium leading-[1.1] tracking-tighter text-black select-none max-[1025px]:max-w-[92vw] max-[1025px]:text-2xl max-md:max-w-[94vw] max-md:text-lg">
                    {display.caption}
                  </h2>
                </div>
                <div
                  className={`relative w-full border-t border-black/12 pt-3 select-none max-[1025px]:pt-2.5 max-md:pt-2 ${isThumbDragging ? "cursor-grabbing" : "cursor-grab"
                    }`}
                  onPointerDown={onThumbPointerDown}
                  onPointerMove={onThumbPointerMove}
                  onPointerUp={endThumbDrag}
                  onPointerCancel={endThumbDrag}
                  onPointerLeave={endThumbDrag}
                  onWheel={onThumbWheel}
                >
                  <div
                    ref={expandThumbsRef}
                    className={`flex gap-2.5 overflow-x-auto  px-1 scrollbar-none  overscroll-x-contain [touch-action:pan-x] max-[1025px]:gap-[1vw] max-[1025px]:px-0.5 max-md:gap-[2vw] max-md:px-0 ${isThumbDragging ? "cursor-grabbing scroll-auto" : "cursor-grab scroll-smooth"
                      }`}
                    role="list"
                    aria-label="All images"
                  >
                    {sources.map((item, idx) => {
                      const isActive = idx === expanded.index;

                      return (
                        <button
                          key={`${idx}-${item.src}`}
                          type="button"
                          role="listitem"
                          data-thumb-index={idx}
                          className={`relative box-border h-17.5 w-22.5 shrink-0 overflow-hidden border bg-black/4 p-0 transition-all duration-400 ease-out   max-[1025px]:h-15 max-[1025px]:w-20 max-md:h-12 max-md:w-18 ${isActive ? "border-black" : "border-transparent"
                            }`}
                          ref={(el) => {
                            expandThumbRefs.current[idx] = el;
                          }}
                          aria-label={`Open ${item.caption}`}
                        >
                          <img
                            className={`block h-full w-full object-cover transition-[filter] duration-300 ease-[cubic-bezier(0.785,0.135,0.15,0.86)] ${isActive ? "brightness-105" : "brightness-[0.8]"}`}
                            src={item.src}
                            alt={item.caption}
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </section>

      <style jsx global>{`
 html.dragging .infinite-grid-gallery-root {
   cursor: grabbing;
 }

 .infinite-grid-gallery-images .item {
   position: absolute;
   top: 0;
   left: 0;
   will-change: transform;
   white-space: normal;
 }

 .infinite-grid-gallery-images .item-wrapper {
   position: relative;
   height: 100%;
   width: 100%;
   will-change: transform;
 }

 .infinite-grid-gallery-images .item-image {
   overflow: hidden;
   border: 1px solid rgba(0, 0, 0, 0.12);
   background: rgba(0, 0, 0, 0.04);
   transform-origin: 50% 50%;
   transition:
     box-shadow 350ms cubic-bezier(0.785, 0.135, 0.15, 0.86),
     transform 350ms cubic-bezier(0.785, 0.135, 0.15, 0.86);
 }

 .infinite-grid-gallery-images .item:hover .item-image {
   box-shadow: 0 18px 60px rgba(0, 0, 0, 0.12);
   transform: scale(1.015);
 }

 .infinite-grid-gallery-images .item:hover {
   z-index: 2;
 }

 .infinite-grid-gallery-images .item-image img {
   width: 100%;
   height: 100%;
   overflow: hidden;
   object-fit: cover;
   will-change: transform;
   opacity: 0;
   transition: opacity 300ms cubic-bezier(0.785, 0.135, 0.15, 0.86);
 }

 .infinite-grid-gallery-images .item-image img.is-loaded {
   opacity: 1;
 }

 .infinite-grid-gallery-images .caption {
   position: absolute;
   right: 0;
   bottom: 0;
   left: 0;
   display: block;
   width: 100%;
   height: auto;
   padding: 10px;
   font-size: 15px;
   line-height: 1.2;
   letter-spacing: -0.04em;
   opacity: 0;
   white-space: normal;
   user-select: none;
   color: #ffffff;
   background: rgba(255, 255, 255, 0.38);
   backdrop-filter: blur(5px);
   border: 1px solid rgba(0, 0, 0, 0.08);
   transform: translateY(12px);
   transition:
     opacity 350ms cubic-bezier(0.785, 0.135, 0.15, 0.86),
     transform 350ms cubic-bezier(0.785, 0.135, 0.15, 0.86);
   pointer-events: none;
 }

 .infinite-grid-gallery-images .item:hover .caption {
   opacity: 1;
   transform: translateY(0);
 }

 .infinite-grid-gallery-opening-media {
   transform: translate(var(--dx), var(--dy)) scale(var(--sx), var(--sy));
 }

 .infinite-grid-gallery-closing-media {
   transform: translate(var(--dx), var(--dy)) scale(var(--sx), var(--sy));
   transition-duration: 750ms;
 }

 .infinite-grid-gallery-slide-left-from {
   animation: infinite-grid-gallery-slide-from-left 600ms ease-in-out forwards;
 }

 .infinite-grid-gallery-slide-left-to {
   animation: infinite-grid-gallery-slide-to-left 600ms ease-in-out forwards;
 }

 .infinite-grid-gallery-slide-right-from {
   animation: infinite-grid-gallery-slide-from-right 600ms ease-in-out forwards;
 }

 .infinite-grid-gallery-slide-right-to {
   animation: infinite-grid-gallery-slide-to-right 600ms ease-in-out forwards;
 }

 @keyframes infinite-grid-gallery-slide-from-left {
   from {
     transform: translate3d(0%, 0, 0);
   }
   to {
     transform: translate3d(-100%, 0, 0);
   }
 }

 @keyframes infinite-grid-gallery-slide-to-left {
   from {
     transform: translate3d(100%, 0, 0);
   }
   to {
     transform: translate3d(0%, 0, 0);
   }
 }

 @keyframes infinite-grid-gallery-slide-from-right {
   from {
     transform: translate3d(0%, 0, 0);
   }
   to {
     transform: translate3d(100%, 0, 0);
   }
 }

 @keyframes infinite-grid-gallery-slide-to-right {
   from {
     transform: translate3d(-100%, 0, 0);
   }
   to {
     transform: translate3d(0%, 0, 0);
   }
 }

 @media (prefers-reduced-motion: reduce) {
   .infinite-grid-gallery-images .item-image,
   .infinite-grid-gallery-images .item-image img,
   .infinite-grid-gallery-images .caption {
     transition: none !important;
   }

   .infinite-grid-gallery-images .item:hover .item-image {
     transform: none;
   }

   .infinite-grid-gallery-images .item:hover .caption {
     transform: none;
   }

   .infinite-grid-gallery-closing-media {
     transition-duration: 0ms !important;
   }

   .infinite-grid-gallery-slide-left-from,
   .infinite-grid-gallery-slide-left-to,
   .infinite-grid-gallery-slide-right-from,
   .infinite-grid-gallery-slide-right-to {
     animation: none !important;
   }
 }
 `}</style>
    </>
  );
}
