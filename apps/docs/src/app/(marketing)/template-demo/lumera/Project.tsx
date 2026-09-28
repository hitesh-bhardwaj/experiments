// Built using Hyperiux Vault: https://vault.hyperiux.com

"use client";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import BlackButton from "./BlackButton";
import SmoothInfiniteCarousel, {
  type KeyboardSlider,
} from "./smooth-carousel/SmoothInfiniteCarousel";
import refinement1 from "./assets/refinement-1.webp";
import refinement2 from "./assets/refinement-2.webp";
import refinement3 from "./assets/refinement-3.webp";
import refinement4 from "./assets/refinement-4.webp";
import refinement5 from "./assets/refinement-5.webp";
import refinement6 from "./assets/refinement-6.webp";
import gsap from "gsap";
import ScrollTrigger from "gsap/dist/ScrollTrigger";
import MaskTextReveal from "./effects/mask-text-reveal";
import { useEnquiryModal } from "./EnquiryModal";
import { FadeUp } from "./gsapAnimations";
gsap.registerPlugin(ScrollTrigger);


const interiorImages = [
  refinement1,
  refinement2,
  refinement3,
  refinement4,
  refinement5,
  refinement6,
];

export default function Project() {
  const { openEnquiryModal } = useEnquiryModal();
  const sliderRef = useRef<KeyboardSlider | null>(null);
  const rafRef = useRef<number | null>(null);
  const [thumb, setThumb] = useState({ width: 100, left: 0 });

  const carouselConfig = useMemo(
    () => ({
      infinite: false,
      snap: false,
      setOffset: ({ wrapperWidth }: { wrapperWidth: number }) => {
        const wrapperEl = sliderRef.current?.wrapper;
        if (!wrapperEl) return wrapperWidth;

        const cs = getComputedStyle(wrapperEl);
        const paddingLeft = parseFloat(cs.paddingLeft || "0");
        const paddingRight = parseFloat(cs.paddingRight || "0");
        const gap = parseFloat(cs.columnGap || "0");
        const itemCount = wrapperEl.children.length;

        // Desired: last item's right edge lands at (wrapperWidth - paddingRight).
        // Core's totalWidth/offset math ignores flex `gap`, so we fold paddingLeft
        // and the accumulated gaps into the offset to compensate.
        return (
          wrapperWidth -
          paddingRight -
          paddingLeft -
          Math.max(0, itemCount - 1) * gap
        );
      },
    }),
    []
  );

  const handleReady = (slider: KeyboardSlider) => {
    sliderRef.current = slider;
  };

  useEffect(() => {
    const tick = () => {
      const slider = sliderRef.current;
      if (slider) {
        const width = Math.min(
          100,
          (slider.viewport.wrapperWidth / slider.viewport.totalWidth) * 100
        );
        const left = slider.progress * (100 - width);
        setThumb({ width, left });
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  useEffect(() => {
    if (globalThis.innerWidth > 1024) {
      const ctx = gsap.context(() => {
        const body = document.body;
        const changeBodyColor = (color: string) => {
          gsap.to(body, {
            backgroundColor: color,
            duration: 1,
            ease: "power2.out",
          });
        };

        ScrollTrigger.create({
          trigger: "#project",
          start: "top 60%",
          end: "bottom 20%",
          onEnter: () => changeBodyColor("#ffffff"),
          onLeaveBack: () => changeBodyColor("#1C1B1A"),
        });
      });
      return () => ctx.revert();
    }
  }, []);

  return (
    <section
      id="project"
      className="w-screen overflow-hidden pt-[8%] pb-[12%] text-[#1c1b1a] max-md:pt-[20%] max-md:pb-[16%] max-[1025px]:py-[10%]"
    >
      <div className="px-[5%]">
        <MaskTextReveal>

        <h2
          data-para-anim
          className="font-medium! text-[#1C1B1A] font-neue-montreal text-[3.8vw] leading-[1.06] tracking-[-0.04em] max-[1025px]:text-[6.8vw] max-md:text-[10vw]"
          >
          A World of Refinement
        </h2>
          </MaskTextReveal>
        <div className="my-[3.5vw] h-px w-full bg-black/15 lineDraw max-md:my-[8vw] max-[1025px]:my-[5vw]" />

        <div className="mb-[4.5vw] grid grid-cols-[minmax(0,1fr)_minmax(18rem,34vw)] items-start gap-[4vw] pl-[23%] pr-[2%] max-[1025px]:grid-cols-1 max-[1025px]:gap-[7vw] max-[1025px]:px-0 max-md:mb-[10vw]">
          <FadeUp>

          <div className="fadeup max-[1025px]:order-1">
            <BlackButton
              btnText="Enquire Now"
              link="#"
              onClick={(event) => {
                event.preventDefault();
                openEnquiryModal();
              }}
              className="bg-[#1c1b1a]"
              borderColor="#1c1b1a"
            />
          </div>
          </FadeUp>
          <MaskTextReveal>

          <p
            data-para-anim
            className="max-w-[38vw] text-[1.25vw] leading-[1.75] tracking-[-0.02em] text-[#1C1B1A] max-[1025px]:max-w-full max-[1025px]:text-[2.5vw] max-md:text-[4.6vw]"
            >
            Immerse yourself in the stylish allure of Lumera Heights, where every
            corner exudes sophistication. This is not just a residence, it&apos;s a
            mark of distinction that embodies the luxurious lifestyle you&apos;ve
            always craved.
          </p>
            </MaskTextReveal>
        </div>
      </div>

      <FadeUp>

      

      <div className="">
        <SmoothInfiniteCarousel
          config={carouselConfig}
          wrapperClassName="fadeup pl-[25.5%] pr-[5%] pb-[1vw] gap-[1.2vw] max-[1025px]:pl-[5%] max-[1025px]:gap-[8vw]"
          itemClassName="cursor-grab active:cursor-grabbing"
          onReady={handleReady}
        >
          {interiorImages.map((src, index) => (
            <div
              key={index}
              className="relative h-[29vw] w-[43vw] shrink-0 overflow-hidden rounded-[1.8vw] max-[1025px]:h-[50vw] max-[1025px]:w-[72vw] max-md:h-[62vw] max-md:w-[84vw]"
            >
              <Image
                src={src}
                alt={`interior-img-${index + 1}`}
                fill
                draggable={false}
                sizes="(max-width: 768px) 84vw, (max-width: 1024px) 72vw, 43vw"
                className="object-cover transition-transform duration-500 ease-in-out hover:scale-105"
              />
            </div>
          ))}
        </SmoothInfiniteCarousel>
        <div
          className="relative overflow-hidden rounded-full bg-[#e5e5e5] mt-[3.6vw] ml-[25.5%] h-[0.4vw] w-[65vw] max-md:mt-[7vw] max-md:ml-10 max-md:h-[1.2vw]  max-md:w-[80vw] max-[1025px]:ml-[8%]"
          aria-hidden="true"
        >
          <div
            className="absolute inset-y-0 rounded-full bg-black"
            style={{ width: `${thumb.width}%`, left: `${thumb.left}%` }}
          />
        </div>
      </div>
      </FadeUp>
    </section>
  );
}
