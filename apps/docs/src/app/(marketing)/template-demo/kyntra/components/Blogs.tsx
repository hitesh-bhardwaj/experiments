// Built using Hyperiux Vault: https://vault.hyperiux.com

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image, { type StaticImageData } from "next/image";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import ScrollTrigger from "gsap/dist/ScrollTrigger";
import SmoothInfiniteCarousel, {
  type KeyboardSlider,
} from "./smooth-carousel/SmoothInfiniteCarousel";
import CarouselNavButtons from "./Buttons/NavButtons";
import CharStaggerPrimaryButton from "./effects/char-stagger-primary-button";
import CharStaggerButton from "./effects/char-stagger-button";
import blog1 from "../assets/blogs/blog1.webp";
import blog2 from "../assets/blogs/blog2.webp";
import blog3 from "../assets/blogs/blog3.webp";
import blog4 from "../assets/blogs/blog4.webp";
import blog5 from "../assets/blogs/blog5.webp";

import { FadeUp, ParaAnim } from "./Animations/gsapAnim";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

type Article = {
  title: string;
  date: string;
  href: string;
  image: StaticImageData;
};

const ARTICLES: Article[] = [
  {
    title: "Why Your AC Usually Warns You Before It Fails",
    date: "09 July 2026",
    href: "#",
    image: blog1,
  },
  {
    title: "The Quiet Cost of Skipping Seasonal Maintenance",
    date: "22 June 2026",
    href: "#",
    image: blog2,
  },
  {
    title: "What a Well-Run Home Actually Looks Like",
    date: "14 June 2026",
    href: "#",
    image: blog3,
  },
  {
    title: "Small Repairs That Prevent Expensive Ones",
    date: "02 June 2026",
    href: "#",
    image: blog4,
  },
  {
    title: "Reading the Signals Your House Is Sending",
    date: "19 May 2026",
    href: "#",
    image: blog5,
  },
];

/** Rate the hover overlay reverses */
const LEAVE_SCALE = 1.5;

const ArticleCard = ({ article }: { article: Article }) => {
  const cardRef = useRef<HTMLElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);

  useGSAP(
    () => {
      const panel = panelRef.current;
      if (!panel) return;

      const content = panel.querySelectorAll<HTMLElement>("[data-panel-item]");
      const image = cardRef.current?.querySelector<HTMLElement>("img");
      const reduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      gsap.set(panel, { yPercent: 100 });
      gsap.set(content, { autoAlpha: 0, y: 16 });

      // One timeline keeps all three synced
      const tl = gsap.timeline({
        paused: true,
        defaults: { ease: "power2.out", overwrite: "auto" },
      });

      tl.to(panel, {
        yPercent: 0,
        duration: reduced ? 0 : 0.75,
        // Symmetric: same curve both ways
        ease: "power2.out",
      });

      if (image) {
        tl.to(
          image,
          { scale: reduced ? 1 : 1.05, duration: reduced ? 0 : 0.75 },
          0,
        );
      }

      // Copy rises as panel still travels
      tl.to(
        content,
        {
          autoAlpha: 1,
          y: 0,
          duration: reduced ? 0 : 0.5,
          stagger: reduced ? 0 : 0.03,
        },
        reduced ? 0 : 0.25,
      );

      tlRef.current = tl;
    },
    { scope: cardRef },
  );

  // Leaves exactly as it arrives
  const handleEnter = () => tlRef.current?.timeScale(1).play();
  const handleLeave = () => tlRef.current?.timeScale(LEAVE_SCALE).reverse();

  return (
    <article
      ref={cardRef}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      onFocusCapture={handleEnter}
      onBlurCapture={handleLeave}
      className="group relative h-[34vw] overflow-hidden w-[30vw] shrink-0  rounded-[1.4vw] max-[1025px]:h-[52vw] max-[1025px]:w-[42vw] max-md:h-[110vw] max-md:w-[82vw] max-md:rounded-[4vw]"
    >
      <Image
        src={article.image}
        alt={article.title}
        fill
        quality={95}
        draggable={false}
        sizes="(max-width: 768px) 82vw, (max-width: 1024px) 42vw, 24vw"
        className="object-cover rounded-lg overflow-hidden"
      />

      {/* Blurred panel, slides up on hover */}
      <div
        ref={panelRef}
        className="absolute inset-x-0 bottom-0 rounded-t-lg  bg-black/40 px-[1.8vw] py-[1.6vw] backdrop-blur-md max-md:px-[6vw] max-md:py-[6vw]"
      >
        <h3
          data-panel-item
          className="w-[90%] text-30 leading-[1.2] font-normal text-white max-[1025px]:text-[3vw] max-md:text-[6vw]"
        >
          {article.title}
        </h3>
        <p
          data-panel-item
          className="text-18 mt-[0.9vw] text-white/70  max-md:mt-[3vw] "
        >
          {article.date}
        </p>
        <div data-panel-item>
          <CharStaggerButton
            text="Read Article"
            href={article.href}
            showLine
            hoverColor="rgba(255,255,255,0.7)"
            className="mt-[1.4vw] text-white max-md:mt-[5vw]"
            textClassName=" text-22 tracking-tight "
            iconClassName="text-white"
          />
        </div>
      </div>
    </article>
  );
};

const Blogs = () => {
  const sliderRef = useRef<KeyboardSlider | null>(null);
  const carouselWrapperRef = useRef<HTMLDivElement | null>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const ctx = gsap.context(() => {
      const wrapper = carouselWrapperRef.current;
      if (!wrapper) return;

      const trigger = {
        trigger: wrapper,
        start: "top 85%",
        once: true,
      };

      const mm = gsap.matchMedia();

      mm.add(
        "(min-width: 1026px) and (prefers-reduced-motion: no-preference)",
        () => {
          gsap.set(wrapper, { xPercent: 30, opacity: 0 });

          gsap.to(wrapper, {
            xPercent: 0,
            opacity: 1,
            duration: 1.8,
            ease: "power4.out",
            scrollTrigger: trigger,
            onComplete: () => {
              gsap.set(wrapper, { clearProps: "opacity,transform" });
            },
          });
        },
      );

      // Reduced motion: fade, no travel
      mm.add(
        "(min-width: 1026px) and (prefers-reduced-motion: reduce)",
        () => {
          gsap.set(wrapper, { xPercent: 0, opacity: 0 });

          gsap.to(wrapper, {
            opacity: 1,
            duration: 1,
            ease: "power2.out",
            scrollTrigger: trigger,
            onComplete: () => {
              gsap.set(wrapper, { clearProps: "opacity,transform" });
            },
          });
        },
      );

      // Fade on narrow screens, not slide
      mm.add("(max-width: 1025px)", () => {
        gsap.set(wrapper, { xPercent: 0, opacity: 0 });

        gsap.to(wrapper, {
          opacity: 1,
          duration: 1,
          ease: "power2.out",
          scrollTrigger: trigger,
          onComplete: () => {
            gsap.set(wrapper, { clearProps: "opacity,transform" });
          },
        });
      });
    }, carouselWrapperRef);

    return () => ctx.revert();
  }, []);

  useEffect(() => {
    const check = () => {
      const slider = sliderRef.current;
      if (!slider) return;

      const { target, maxScroll } = slider;
      // target in item units, not pixels
      const EPS = 0.02;
      setAtStart(target >= -EPS);
      setAtEnd(maxScroll >= -EPS ? true : target <= maxScroll + EPS);
    };

    check();
    gsap.ticker.add(check);
    return () => gsap.ticker.remove(check);
  }, []);

  const carouselConfig = useMemo(
    () => ({
      infinite: false,
      snap: false,
      // Drag and nav buttons only
      wheelInput: false,
      // Wrapper content box; core counts gaps
      setOffset: ({
        wrapperWidth,
        wrapper,
      }: {
        wrapperWidth: number;
        wrapper: HTMLElement;
      }) => {
        // From viewport; ref is null here
        const cs = getComputedStyle(wrapper);
        const paddingLeft = parseFloat(cs.paddingLeft || "0");
        const paddingRight = parseFloat(cs.paddingRight || "0");

        return wrapperWidth - paddingRight - paddingLeft;
      },
    }),
    [],
  );

  return (
    <section id="resources" className="relative w-full overflow-hidden bg-white py-[7%] text-black max-[1025px]:py-[10%]">
      <div className="px-[5%] max-[1025px]:px-[7%]">
        {/* Heading and copy */}
        <ParaAnim
          as="h2"
          className="font-helvetica-neue w-[55vw] text-[3.8vw] leading-[1.1] font-normal tracking-[-0.02em] max-[1025px]:w-full max-[1025px]:text-[6vw] max-md:text-[9vw]"
        >
          Notes from People Who Spend their Days Inside Homes
        </ParaAnim>
        <ParaAnim
          as="p"
          className="text-24 mt-[1.6vw] max-w-[30vw] leading-[1.6] text-black max-[1025px]:mt-[3vw] max-[1025px]:max-w-full max-[1025px]:text-[2.6vw] max-md:text-[4vw]"
        >
          Practical Perspectives On Maintenance, Ownership And The Systems
          Behind A Well-Run Home.
        </ParaAnim>
      </div>

      <div className="mt-[4vw] flex items-stretch gap-[3vw] pl-[5%] max-[1025px]:pl-0 max-[1025px]:mt-[8vw] max-[1025px]:flex-col max-[1025px]:gap-[6vw]">
        <div className="flex w-[24%] pb-[2vw] shrink-0 flex-col justify-between  max-[1025px]:contents">
          <FadeUp className="w-fit max-[1025px]:order-1 max-[1025px]:px-[7%]">
            <CharStaggerPrimaryButton
              text="All Articles"
              href="#"
              hoverColor="#ffffff"
              showArrow
              className="w-fit rounded-full max-[1025px]:mb-7 bg-[#134BD6] px-[1.8vw] py-[0.7vw] text-white max-[1025px]:px-20 max-[1025px]:py-5"
              textClassName=" text-22 tracking-tight max-[1025px]:text-[2.4vw] max-md:text-[3.6vw]"
              iconClassName="text-white"
            />
          </FadeUp>

          <FadeUp className="w-fit max-[1025px]:order-3 max-[1025px]:px-[7%]" delay={0.1}>
            <CarouselNavButtons
              onPrev={() => sliderRef.current?.goToPrev()}
              onNext={() => sliderRef.current?.goToNext()}
              prevDisabled={atStart}
              nextDisabled={atEnd}
            />
          </FadeUp>
        </div>

        <div
          ref={carouselWrapperRef}
          className="relative min-w-0 flex-1   max-[1025px]:order-2"
        >
          <SmoothInfiniteCarousel
            config={carouselConfig}
            wrapperClassName="pr-[5%] max-[1025px]:px-[7%]  gap-[1.5vw] max-[1025px]:gap-[3.5vw] max-md:gap-[5vw] "
            itemClassName="cursor-grab active:cursor-grabbing"
            onReady={(slider) => {
              sliderRef.current = slider;
            }}
          >
            {ARTICLES.map((article) => (
              <ArticleCard key={article.title} article={article} />
            ))}
          </SmoothInfiniteCarousel>
        </div>
      </div>
    </section>
  );
};

export default Blogs;
