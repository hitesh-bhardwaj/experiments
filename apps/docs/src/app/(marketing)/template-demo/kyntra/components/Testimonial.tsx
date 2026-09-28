// Built using Hyperiux Vault: https://vault.hyperiux.com

"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import Image, { type StaticImageData } from "next/image";
import gsap from "gsap";
import { SplitText } from "gsap/SplitText";
import SmoothInfiniteCarousel, {
  type KeyboardSlider,
} from "./smooth-carousel/SmoothInfiniteCarousel";
import CarouselNavButtons from "./Buttons/NavButtons";

import sarah from "../assets/testimonial/sarah.webp";
import james from "../assets/testimonial/james.webp";
import priya from "../assets/testimonial/priya.webp";
import daniel from "../assets/testimonial/daniel.webp";
import marcus from "../assets/testimonial/marcus.webp";

import { FadeUp, ParaAnim } from "./Animations/gsapAnim";

if (typeof window !== "undefined") {
  gsap.registerPlugin(SplitText);
}

type Testimonial = {
  quote: string;
  name: string;
  meta: string;
  image: StaticImageData;
};

const TESTIMONIALS: Testimonial[] = [
  {
    quote:
      "The thing I didn't expect to love was the history. I can open the apartment and see every repair we've done since moving in. When the AC had the same problem twice, Kyntra already knew the previous technician, the unit and what had been repaired.",
    name: "Sarah Mitchell",
    meta: "Kyntra member for 18 months",
    image: sarah,
  },
  {
    quote:
      "Booking a professional used to mean three phone calls and re-explaining everything. Now I describe the problem once, Kyntra pulls the appliance record and the right person shows up with context.",
    name: "James Whitfield",
    meta: "Kyntra member for 11 months",
    image: james,
  },
  {
    quote:
      "We manage two properties and every warranty, invoice and service visit lives in the right place. Nothing gets lost between tenants anymore.",
    name: "Priya Nair",
    meta: "Kyntra member for 2 years",
    image: priya,
  },
  {
    quote:
      "The maintenance reminders alone paid for the subscription. Small things get handled before they turn into the expensive kind.",
    name: "Daniel Osei",
    meta: "Kyntra member for 7 months",
    image: daniel,
  },
  {
    quote:
      "What sold me was the handover. When we sold the flat, the buyers got the entire service history in one link instead of a shoebox of receipts.",
    name: "Marcus Bennett",
    meta: "Kyntra member for 14 months",
    image: marcus,
  },
];

const SHIFT_DURATION = 0.9;
const SHIFT_EASE = "power3.inOut";

const IMAGE_HIDDEN_CLIP = "inset(50%)";
const IMAGE_VISIBLE_CLIP = "inset(0%)";
const IMAGE_REVEAL_DURATION = 0.6;
const LINES_DURATION = 0.72;
const LINES_STAGGER = 0.06;

const TEXT_FADE_DURATION = 0.24;

const THUMB_HIDE_DELAY = 0.75;

const LEFT_BLEED = 0.4;

const STRIP_REPEATS = 2;

const GRID_GAP_VW = 1.5;
const bleed = (thumbVw: number, gapVw: number) =>
  `min(calc(${thumbVw}vw * ${LEFT_BLEED} + ${gapVw}vw), ${GRID_GAP_VW}vw)`;

const BLEED_VARS = {
  "--exp-bleed-desktop": bleed(13, 1.6),
  "--exp-bleed-tablet": bleed(25, 1.6),
  "--exp-bleed-mobile": bleed(26, 3),
} as CSSProperties;

/** Invisible spacer, fixes card height */
const LONGEST_QUOTE = TESTIMONIALS.reduce(
  (longest, t) => (t.quote.length > longest.length ? t.quote : longest),
  "",
);

const STRIP = Array.from(
  { length: TESTIMONIALS.length * STRIP_REPEATS },
  (_, i) => TESTIMONIALS[i % TESTIMONIALS.length],
);

const Testimonial = () => {
  const stripRef = useRef<KeyboardSlider | null>(null);

  const [active, setActive] = useState(0);
  const activeRef = useRef(0);

  const imageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const textRefs = useRef<(HTMLDivElement | null)[]>([]);
  const splitsRef = useRef<SplitText[]>([]);
  const cardTweens = useRef<gsap.core.Tween[]>([]);

  const imageTweens = useRef<gsap.core.Tween[]>([]);

  const imageZ = useRef(1);
  const reducedRef = useRef(false);

  const lineRefs = useRef<Element[][]>([]);

  const [hiddenThumb, setHiddenThumb] = useState(0);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stripShiftRef = useRef<HTMLDivElement | null>(null);

  // One tween drives both sliders
  const shiftRef = useRef<gsap.core.Tween | null>(null);
  const progress = useRef({ t: 0 });

  const stripIndexRef = useRef(1);
  const dragCleanup = useRef<(() => void) | null>(null);

  const count = TESTIMONIALS.length;

  const transitionCard = (
    idx: number,
    fromIdx: number,
    opts?: { immediate?: boolean },
  ) => {
    const nextText = textRefs.current[idx];
    const nextImage = imageRefs.current[idx];
    const lines = lineRefs.current[idx];

    cardTweens.current.forEach((tween) => tween.kill());
    cardTweens.current = [];

    if (opts?.immediate || reducedRef.current) {
      textRefs.current.forEach((el, i) => {
        if (el) gsap.set(el, { autoAlpha: i === idx ? 1 : 0 });
      });
      imageTweens.current.forEach((tween) => tween.kill());
      imageTweens.current = [];
      imageRefs.current.forEach((el, i) => {
        if (!el) return;
        gsap.set(el, {
          clipPath: i === idx ? IMAGE_VISIBLE_CLIP : IMAGE_HIDDEN_CLIP,
          zIndex: i === idx ? ++imageZ.current : 1,
        });
      });
      if (lines?.length) gsap.set(lines, { yPercent: 0 });
      return;
    }

    if (nextImage) {
      gsap.set(nextImage, {
        zIndex: ++imageZ.current,
        clipPath: IMAGE_HIDDEN_CLIP,
        autoAlpha: 1,
      });
      imageTweens.current = imageTweens.current.filter((t) => t.isActive());
      imageTweens.current.push(
        gsap.to(nextImage, {
          clipPath: IMAGE_VISIBLE_CLIP,
          duration: IMAGE_REVEAL_DURATION,
          ease: "power2.inOut",
          overwrite: "auto",
        }),
      );
    }

    // Cut stranded cards; quotes never overlap
    textRefs.current.forEach((el, i) => {
      if (!el || i === idx) return;
      if (i === fromIdx) {
        cardTweens.current.push(
          gsap.to(el, {
            autoAlpha: 0,
            duration: TEXT_FADE_DURATION,
            ease: "power2.in",
          }),
        );
      } else {
        gsap.set(el, { autoAlpha: 0 });
      }
    });

    lineRefs.current.forEach((els, i) => {
      if (!els?.length || i === idx) return;
      gsap.set(els, { yPercent: 0 });
    });

    if (nextText) {
      // Hidden until outgoing quote clears
      gsap.set(nextText, { autoAlpha: 0 });
      cardTweens.current.push(
        gsap.to(nextText, {
          autoAlpha: 1,
          duration: 0,
          delay: TEXT_FADE_DURATION,
          overwrite: "auto",
        }),
      );
      if (lines?.length) {
        gsap.set(lines, { yPercent: 100 });
        cardTweens.current.push(
          gsap.to(lines, {
            yPercent: 0,
            duration: LINES_DURATION,
            ease: "power3.out",
            stagger: LINES_STAGGER,
            delay: TEXT_FADE_DURATION,
          }),
        );
      }
    }
  };

  useEffect(() => {
    reducedRef.current = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (!reducedRef.current) {
      textRefs.current.forEach((text, i) => {
        if (!text) return;
        const splits = SplitText.create(text.querySelectorAll("p"), {
          type: "lines",
          mask: "lines",
        });
        const list = Array.isArray(splits) ? splits : [splits];
        splitsRef.current.push(...list);

        lineRefs.current[i] = list.flatMap((split) => split.lines);
      });
    }

    transitionCard(activeRef.current, activeRef.current, { immediate: true });

    return () => {
      shiftRef.current?.kill();
      cardTweens.current.forEach((tween) => tween.kill());
      cardTweens.current = [];
      imageTweens.current.forEach((tween) => tween.kill());
      imageTweens.current = [];
      splitsRef.current.forEach((split) => split.revert());
      splitsRef.current = [];
      if (hideTimer.current) clearTimeout(hideTimer.current);
      dragCleanup.current?.();
      dragCleanup.current = null;
    };
  }, []);

  const getBleedPx = (shiftEl: HTMLElement) => {
    const clip = shiftEl.closest<HTMLElement>(".exp-clip");
    const column = clip?.parentElement;
    if (!clip || !column) return 0;
    return Math.max(0, clip.getBoundingClientRect().width - column.clientWidth);
  };

  const syncStripShift = useCallback(() => {
    const shiftEl = stripShiftRef.current;
    const slider = stripRef.current;
    if (!shiftEl || !slider) return;

    const slot = slider.viewport.itemWidth;
    const bleedPx = getBleedPx(shiftEl);
    const half = slider.viewport.wrapperWidth / 2 - slot / 2 - bleedPx;
    shiftEl.style.transform = `translateX(${-half}px)`;
  }, []);

  const goTo = useCallback(
    (idx: number, opts?: { immediate?: boolean; stripSettled?: boolean }) => {
      const clamped = ((idx % count) + count) % count;
      const strip = stripRef.current;
      if (!strip) return;

      if (shiftRef.current && !opts?.immediate && !opts?.stripSettled) return;

      const from = activeRef.current;
      if (clamped === from && !opts?.immediate) return;
      activeRef.current = clamped;
      setActive(clamped);

      let delta = clamped - from;
      if (delta > count / 2) delta -= count;
      if (delta < -count / 2) delta += count;

      const driveStrip = !opts?.stripSettled;
      if (driveStrip) stripIndexRef.current += delta;

      const stripFrom = strip.scroll;
      const stripTo = driveStrip
        ? strip.scrollForIndex(stripIndexRef.current)
        : stripFrom;

      shiftRef.current?.kill();

      transitionCard(clamped, from, { immediate: opts?.immediate });

      if (opts?.immediate) {
        if (driveStrip) strip.scrollTo(stripTo);
        return;
      }

      if (driveStrip) {
        const p = progress.current;
        p.t = 0;

        shiftRef.current = gsap.to(p, {
          t: 1,
          duration: SHIFT_DURATION,
          ease: SHIFT_EASE,
          overwrite: true,
          onUpdate: () => {
            strip.scrollTo(stripFrom + (stripTo - stripFrom) * p.t);
          },
          onComplete: () => {
            strip.scrollTo(stripTo);
            shiftRef.current = null;
          },
        });
      }

      if (hideTimer.current) clearTimeout(hideTimer.current);
      setHiddenThumb(-1);
      hideTimer.current = setTimeout(
        () => setHiddenThumb(clamped),
        THUMB_HIDE_DELAY * 1000,
      );
    },
    [count],
  );

  const go = (dir: 1 | -1) => goTo(activeRef.current + dir);

  const handleStripSettle = useCallback(
    (current: number) => {
      if (shiftRef.current) return;
  
      stripIndexRef.current = current;
      const centre = ((current % count) + count) % count;
      const target = (centre - 1 + count) % count;
      if (target === activeRef.current) return;
      goTo(target, { stripSettled: true });
    },
    [count, goTo],
  );

  const stripConfig = useMemo(
    () => ({
      infinite: true,
      snap: true,
      variableWidth: true,
      dragSensitivity: 0.005,
      lerpFactor: 0.22,
      setOffset: () => 0,
      onSlideChange: handleStripSettle,
    }),
    [handleStripSettle],
  );

  return (
    <section id="stories" className="relative w-full overflow-hidden bg-white py-[7%] text-black max-[1025px]:py-[20%]">
      <div className="pl-[5%] max-[1025px]:px-[7%] ">
        <ParaAnim
          as="h2"
          className="font-helvetica-neue w-[45vw] text-[3.8vw] leading-[1.1] font-normal tracking-[-0.02em] max-[1025px]:w-[82%] max-[1025px]:text-[6vw] max-md:text-[9vw]"
        >
          Real Homes. Real Experiences
        </ParaAnim>
        <ParaAnim
          as="p"
          className="text-24 mt-[1.6vw]  max-w-[42vw] tracking-wide leading-[1.6] text-black max-[1025px]:mt-[6vw] max-[1025px]:max-w-full max-[1025px]:text-[2.6vw] max-md:text-[4vw]"
        >
          Kyntra Keeps Your Appliances, Repairs, Warranties And Maintenance
          History Together So Every Future Job Starts With Context.
        </ParaAnim>
      </div>

      <div className="mt-[4vw] max-[1025px]:mt-[12vw]  grid grid-cols-[minmax(0,1fr)_36vw] pl-[5%] max-[1025px]:px-[7%] items-start gap-[1.5vw] max-[1025px]:grid-cols-1 max-[1025px]:gap-[8vw]">

        <FadeUp className="border-kyntra-primary relative min-h-[23.5vw] overflow-hidden rounded-[1.6vw] border px-[3vw] py-[3.2vw] max-[1025px]:min-h-0 max-md:rounded-[5vw] max-md:p-[7vw]">
          <div className="flex items-start gap-[2.6vw] max-[1025px]:flex-col max-[1025px]:gap-[5vw] max-md:gap-[6vw]">
         
            <div className="relative aspect-square w-[18vw] shrink-0 overflow-hidden rounded-[1.1vw] max-[1025px]:w-[30vw] max-[1025px]:rounded-[2.5vw] max-md:w-[45vw] max-md:rounded-[4vw]">
              {TESTIMONIALS.map((t, i) => (
                <div
                  key={t.name}
                  ref={(el) => {
                    imageRefs.current[i] = el;
                  }}
                  className="absolute inset-0"
                  style={{ willChange: "clip-path" }}
                >
                  <Image
                    src={t.image}
                    alt={t.name}
                    fill
                    sizes="(max-width: 768px) 45vw, (max-width: 1025px) 30vw, 16vw"
                    className="object-cover grayscale"
                    draggable={false}
                  />
                </div>
              ))}
            </div>

            <div className="relative flex flex-1 flex-col justify-start">
              <svg
                className="h-auto w-16"
                width="79"
                height="59"
                viewBox="0 0 79 59"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M60.5663 58.4512C70.7473 58.4512 79.0005 50.1957 79.0005 40.0111C79.0005 29.8302 70.7473 21.5747 60.5663 21.5747C60.5663 21.5747 60.6555 14.7251 66.2201 4.86679C66.8382 2.89148 65.7364 0.787945 63.7598 0.173382C62.3574 -0.267754 60.8817 0.161037 59.9288 1.15918C47.1337 15.1539 42.1252 31.6248 42.1252 40.0111C42.1252 50.1957 50.3783 58.4512 60.5663 58.4512Z"
                  fill="#134BD6"
                />
                <path
                  d="M18.4413 58.4512C28.6223 58.4512 36.8755 50.1955 36.8755 40.0111C36.8755 29.8302 28.6223 21.5747 18.4413 21.5747C18.4413 21.5747 18.5305 14.7251 24.0951 4.86679C24.7132 2.89148 23.6112 0.787949 21.6348 0.173386C20.2324 -0.26775 18.7567 0.161041 17.8039 1.15919C5.0087 15.1539 6.86646e-05 31.6248 6.86646e-05 40.0111C6.86646e-05 50.1957 8.25326 58.4512 18.4413 58.4512Z"
                  fill="#134BD6"
                />
              </svg>

     
              <div className="relative mt-[1.4vw] max-md:mt-[5vw]">
                <div aria-hidden className="invisible">
                  <p className="text-24 leading-[1.4] text-black max-[1025px]:text-[2.4vw] max-md:text-[4vw]">
                    &ldquo;{LONGEST_QUOTE}&rdquo;
                  </p>
                  <p className="mt-[1.6vw] text-[1.55vw] max-[1025px]:text-[2.6vw] max-md:mt-[6vw] max-md:text-[4.4vw]">
                    &nbsp;
                  </p>
                  <p className="text-22 mt-[0.1vw] max-[1025px]:text-[2vw] max-md:text-[3.6vw]">
                    &nbsp;
                  </p>
                </div>
                {TESTIMONIALS.map((t, i) => (
                  <div
                    key={t.name}
                    ref={(el) => {
                      textRefs.current[i] = el;
                    }}
                    className="absolute inset-x-0 top-0"
                  >
                    <p className="text-24 leading-[1.4] text-black max-[1025px]:text-[2.4vw] max-md:text-[4vw]">
                      &ldquo;{t.quote}&rdquo;
                    </p>
                    <p className="mt-[1.6vw] text-[1.55vw] text-kyntra-primary max-[1025px]:text-[4vw] max-md:mt-[6vw] max-md:text-[5vw]">
                      {t.name}
                    </p>
                    <p className="mt-[0.1vw] text-22 text-black max-[1025px]:text-[2vw] max-md:text-[3.6vw]">
                      {t.meta}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </FadeUp>

        {/* Infinite thumbnail strip */}
        <div className="flex w-full flex-col items-end gap-[2vw] max-[1025px]:items-start">
          <div className="pr-[7vw] max-[1025px]:pr-0">
            <CarouselNavButtons onPrev={() => go(-1)} onNext={() => go(1)} />
          </div>

          <div
            style={BLEED_VARS}
            className="exp-clip -ml-(--exp-bleed) w-[calc(100%+var(--exp-bleed))] overflow-hidden [--exp-bleed:var(--exp-bleed-desktop)] max-[1025px]:hidden [--exp-bleed:var(--exp-bleed-tablet)] max-md:[--exp-bleed:var(--exp-bleed-mobile)]"
          >
            <FadeUp className="w-full">
              <SmoothInfiniteCarousel
                wrapperClassName="exp-strip will-change-transform"
                className="w-full"
                config={stripConfig}
                itemClassName="cursor-grab active:cursor-grabbing"
                onReady={(slider) => {
                  stripRef.current = slider;
                  stripShiftRef.current = slider.wrapper as HTMLDivElement;
              
                  const startDrag = () => {
                    shiftRef.current?.kill();
                    shiftRef.current = null;
                  };
                  slider.wrapper.addEventListener("pointerdown", startDrag);
                  dragCleanup.current?.();
                  dragCleanup.current = () => {
                    slider.wrapper.removeEventListener(
                      "pointerdown",
                      startDrag,
                    );
                  };
                  requestAnimationFrame(() => {
     
                    slider.goToIndex(1);
                    stripIndexRef.current = 1;
                    syncStripShift();
                  });
                }}
              >
                {STRIP.map((t, stripIndex) => {
                  const i = stripIndex % count;
                  return (
                    <div
                      key={`${t.name}-${stripIndex}`}
                      className="pr-[1.6vw] max-md:pr-[3vw]"
                    >
                      <div
                        aria-hidden
                        className={`relative block aspect-square w-[13vw] overflow-hidden rounded-[1vw] max-[1025px]:w-[25vw] max-md:w-[26vw] max-md:rounded-[3vw] ${
                          hiddenThumb === i ? "opacity-0" : "opacity-100"
                        }`}
                      >
                        <Image
                          src={t.image}
                          alt=""
                          fill
                          sizes="(max-width: 768px) 26vw, 13vw"
                          className="object-cover"
                          draggable={false}
                        />
                      </div>
                    </div>
                  );
                })}
              </SmoothInfiniteCarousel>
            </FadeUp>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Testimonial;
