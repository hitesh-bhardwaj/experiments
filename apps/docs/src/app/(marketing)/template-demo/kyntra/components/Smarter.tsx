// Built using Hyperiux Vault: https://vault.hyperiux.com

"use client";

import { useEffect, useRef } from "react";
import Image, { type StaticImageData } from "next/image";
import gsap from "gsap";
import ScrollTrigger from "gsap/dist/ScrollTrigger";

import { ParaAnim } from "./Animations/gsapAnim";
import {
  prefersReducedMotion,
  usePrefersReducedMotion,
} from "./Animations/reducedMotion";

import bookService from "../assets/smarter/book-service.svg";
import visit from "../assets/smarter/visit.svg";
import serviceRecord from "../assets/smarter/service-record.svg";
import home from "../assets/smarter/home.svg";
import maintainance from "../assets/smarter/maintainance.svg";
import cardTexture from "../assets/card-texture.webp";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);

  // Registering the mask centre as <length> lets GSAP tween it and keeps the
  // px unit; without this the custom properties stay unanimatable strings.
  const registerLength = (name: string) => {
    try {
      CSS.registerProperty({
        name,
        syntax: "<length>",
        inherits: false,
        initialValue: "0px",
      });
    } catch {
      // Already registered, or unsupported: the mask still renders, it just
      // snaps to the cursor instead of easing toward it.
    }
  };

  if (typeof CSS !== "undefined" && "registerProperty" in CSS) {
    registerLength("--tx");
    registerLength("--ty");
  }
}

const KYNTRA_PRIMARY = "#134BD6";

// Texture spotlight: a circle of texture follows the cursor on every card.
// The PNG is near-black with light linework, so it screens over the card -
// the dark ground drops out and only the lines show, on blue and on black.
const TEXTURE_OPACITY = 0.9;
const TEXTURE_RADIUS = 170;
const TEXTURE_FEATHER = 0.55;
const TEXTURE_DURATION = 0.45;
const TEXTURE_FOLLOW = 0.35;
const TEXTURE_EASE = "power2.out";

export interface SmarterCardData {
  id: number;
  title: string;
  description: string;
  icon: StaticImageData;
  variant: "primary" | "dark";
}

const SMARTER_CARDS: SmarterCardData[] = [
  {
    id: 1,
    title: "Book a\nService",
    description:
      "Tell Kyntra what your home needs and book the right service at a time that works for you.",
    icon: bookService,
    variant: "primary",
  },
  {
    id: 2,
    title: "Professional\nVisits",
    description:
      "A trusted professional arrives with the details they need to understand your home and the job at hand.",
    icon: visit,
    variant: "dark",
  },
  {
    id: 3,
    title: "Service Gets\nRecorded",
    description:
      "Every completed service is automatically added to your home's history, creating a clear record for future needs.",
    icon: serviceRecord,
    variant: "primary",
  },
  {
    id: 4,
    title: "Kyntra Learns\nYour Home",
    description:
      "Over time, Kyntra builds a better understanding of your home, its systems, preferences, and maintenance patterns.",
    icon: home,
    variant: "dark",
  },
  {
    id: 5,
    title: "Future Maintenance\nGets Easier",
    description:
      "With everything in one place, Kyntra can help you stay ahead of maintenance and make future services faster and simpler.",
    icon: maintainance,
    variant: "primary",
  },
];

export default function Smarter() {
  // Reactive: layout depends on it
  const reducedMotion = usePrefersReducedMotion();
  const sectionRef = useRef<HTMLElement | null>(null);
  // Spacer length sets sweep speed
  const scrollRangeRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!reducedMotion) return;

    const frame = requestAnimationFrame(() => ScrollTrigger.refresh());
    return () => cancelAnimationFrame(frame);
  }, [reducedMotion]);

  // Reduced motion: drag replaces wheel
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!reducedMotion || !scroller) return;

    let dragging = false;
    let startX = 0;
    let startScroll = 0;

    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      dragging = true;
      startX = event.clientX;
      startScroll = scroller.scrollLeft;
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!dragging) return;
      scroller.scrollLeft = startScroll - (event.clientX - startX);
    };

    const endDrag = () => {
      dragging = false;
    };

    scroller.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", endDrag);
    window.addEventListener("pointercancel", endDrag);

    return () => {
      scroller.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", endDrag);
      window.removeEventListener("pointercancel", endDrag);
    };
  }, [reducedMotion]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const ctx = gsap.context(() => {
      const track = trackRef.current;
      const scrollRange = scrollRangeRef.current;
      if (!track || !scrollRange) return;

      if (prefersReducedMotion()) {
        gsap.set(track, { x: 0, xPercent: 0 });
        return;
      }

      const overflow = () => {
        const viewport = track.parentElement;
        if (!viewport) return 0;
        return Math.max(0, track.scrollWidth - viewport.clientWidth);
      };

      gsap.fromTo(
        track,
        { xPercent: 70 },
        {
          xPercent: 0,
          x: () => -overflow(),
          ease: "none",
          scrollTrigger: {
            trigger: scrollRange,
            start: "top 60%",
            end: "bottom bottom",
            scrub: 0.5,
            invalidateOnRefresh: true,
          },
        },
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  // One quickTo pair per card keeps the mask centre tracking the cursor
  const followers = useRef(new Map<Element, { x: Function; y: Function }>());

  const getFollower = (texture: Element) => {
    let follower = followers.current.get(texture);
    if (!follower) {
      follower = {
        x: gsap.quickTo(texture, "--tx", {
          unit: "px",
          duration: TEXTURE_FOLLOW,
          ease: TEXTURE_EASE,
        }),
        y: gsap.quickTo(texture, "--ty", {
          unit: "px",
          duration: TEXTURE_FOLLOW,
          ease: TEXTURE_EASE,
        }),
      };
      followers.current.set(texture, follower);
    }
    return follower;
  };

  const pointerPosition = (event: React.MouseEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    return {
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
    };
  };

  // Spotlight follows the cursor
  const moveTexture = (event: React.MouseEvent<HTMLDivElement>) => {
    const texture = event.currentTarget.querySelector(".smarter-card-texture");
    if (!texture) return;

    const { x, y } = pointerPosition(event);
    const follower = getFollower(texture);
    follower.x(x);
    follower.y(y);
  };

  const animateTexture = (
    event: React.MouseEvent<HTMLDivElement>,
    show: boolean,
  ) => {
    const texture = event.currentTarget.querySelector(".smarter-card-texture");
    if (!texture) return;

    // Jump the mask to the entry point so it fades in under the cursor
    if (show) {
      const { x, y } = pointerPosition(event);
      gsap.set(texture, { "--tx": `${x}px`, "--ty": `${y}px` });
      getFollower(texture);
    }

    gsap.to(texture, {
      opacity: show ? TEXTURE_OPACITY : 0,
      duration: TEXTURE_DURATION,
      ease: TEXTURE_EASE,
      overwrite: "auto",
    });
  };

  // Shared; both branches render identically
  const cards = SMARTER_CARDS.map((card) => {
    const isPrimary = card.variant === "primary";
    return (
      <div
        key={card.id}
        onMouseEnter={(e) => animateTexture(e, true)}
        onMouseMove={moveTexture}
        onMouseLeave={(e) => animateTexture(e, false)}
        className="relative flex aspect-440/477 max-[1025px]:aspect-auto max-[1025px]:h-[45vh] max-md:h-[100vw] w-[28vw] shrink-0 flex-col overflow-hidden rounded-xl p-[2vw] max-[1025px]:p-[4vw] select-none will-change-transform max-[1025px]:w-[50vw] max-md:w-[76vw] max-md:rounded-3xl max-md:p-6"
        style={{
          backgroundColor: isPrimary ? KYNTRA_PRIMARY : "#0d0d0d",
          border: isPrimary ? "none" : "1px solid rgba(255,255,255,0.25)",
          color: isPrimary ? "#ffffff" : KYNTRA_PRIMARY,
        }}
      >
        <Image
          src={cardTexture}
          alt=""
          aria-hidden
          sizes="(max-width: 767px) 76vw, (max-width: 1025px) 50vw, 28vw"
          className="smarter-card-texture pointer-events-none absolute inset-0 h-full w-full object-cover opacity-0 mix-blend-screen will-change-[opacity,mask-position]"
          style={
            {
              "--tx": "0px",
              "--ty": "0px",
              maskImage: `radial-gradient(circle ${TEXTURE_RADIUS}px at var(--tx) var(--ty), #000 ${
                TEXTURE_FEATHER * 100
              }%, transparent 100%)`,
              WebkitMaskImage: `radial-gradient(circle ${TEXTURE_RADIUS}px at var(--tx) var(--ty), #000 ${
                TEXTURE_FEATHER * 100
              }%, transparent 100%)`,
            } as React.CSSProperties
          }
        />

        {/* Fixed icon zone aligns headings */}
        <div className="relative z-10 flex h-[45%] max-[1025px]:h-[40%] shrink-0 items-start">
          <Image
            src={card.icon}
            alt=""
            aria-hidden
            className="h-[3vw] w-[3vw] object-contain max-[1025px]:h-[5.5vw] max-[1025px]:w-[5.5vw] max-md:h-[12vw] max-md:w-[12vw]"
          />
        </div>

        <div className="relative z-10 flex flex-1 flex-col gap-[1.8vw] max-md:gap-6">
          <h3 className="font-helvetica-neue text-44 leading-[1.15] font-normal tracking-tight whitespace-pre-line text-white max-[1025px]:text-[4vw] max-md:text-[7vw]">
            {card.title}
          </h3>

          <p className="max-w-[96%] text-22 tracking-wide leading-[1.3] font-normal text-white max-[1025px]:text-[2.5vw] max-md:text-[3.6vw]">
            {card.description}
          </p>
        </div>
      </div>
    );
  });

  return (
    <section
      id="smarter"
      ref={sectionRef}
      className={`relative z-10 w-full bg-white ${
        reducedMotion ? "" : "mt-[-20vh] max-[1025px]:mt-0 max-md:mt-[-8vh]"
      }`}
    >
      {/* Scroll range for the pinned sweep */}
      <div
        ref={scrollRangeRef}
        className={`relative ${reducedMotion ? "h-screen" : "h-[190vh]"}`}
      >
        <div
          className={`flex h-screen w-full flex-col justify-center gap-[4vw] max-[1025px]:gap-[6vw] max-md:gap-10 ${
            reducedMotion ? "" : "sticky top-0 overflow-hidden"
          }`}
        >
          <div className="mx-auto flex w-full max-w-400 shrink-0 flex-col gap-[2vw] px-[5%] max-[1025px]:px-[7%] max-md:gap-8">
            <ParaAnim
              as="h2"
              className="font-helvetica-neue w-[60%] max-[1025px]:w-full leading-[1.1] font-normal tracking-[-0.02em] whitespace-pre-line text-black "
            >
              Every Visit Makes Kyntra Smarter About your Home
            </ParaAnim>

            <div className="flex items-center justify-between gap-[4vw] max-[1025px]:flex-col max-[1025px]:items-start max-[1025px]:gap-6">
              <ParaAnim
                as="p"
                className="text-24 max-w-[40vw] leading-normal  text-black max-[1025px]:max-w-full max-[1025px]:text-[2.6vw] max-md:text-[4vw]"
              >Kyntra keeps your appliances, repairs, warranties and maintenance history together so every future job starts with context.
              </ParaAnim>
            </div>
          </div>

          {reducedMotion ? (
         
            <div
              ref={scrollerRef}
              tabIndex={0}
              role="region"
              aria-label="How Kyntra works, scroll horizontally"
              className="w-full shrink-0 cursor-grab overflow-x-auto overscroll-x-contain active:cursor-grabbing"
            >
              <div
                ref={trackRef}
                className="flex w-max shrink-0 gap-[1.9vw] px-[5%] max-[1025px]:gap-[4.4vw] max-[1025px]:px-[7%] max-md:gap-[7vw] max-md:px-[9%]"
              >
                {cards}
              </div>
            </div>
          ) : (
            <div
              ref={trackRef}
              className="flex w-max shrink-0 gap-[1.9vw] px-[5%] max-[1025px]:gap-[4.4vw] max-[1025px]:px-[7%] max-md:gap-[7vw] max-md:px-[9%] will-change-transform"
            >
              {cards}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
