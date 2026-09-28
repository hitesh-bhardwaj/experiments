// Built using Hyperiux Vault: https://vault.hyperiux.com

"use client";

import { useRef, type ComponentPropsWithoutRef, type MouseEvent } from "react";
import Link from "next/link";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { SplitText } from "gsap/SplitText";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";

gsap.registerPlugin(useGSAP, SplitText, ScrollToPlugin);

type PrimaryButtonProps = {
  text: string;
  /** Classes for the sliding pill */
  background?: string;
  className?: string;
  href?: string;
} & Omit<ComponentPropsWithoutRef<typeof Link>, "href">;

const PrimaryButton = ({
  text,
  background = "",
  className = "",
  href,
  ...props
}: PrimaryButtonProps) => {
  const parentOnClick = props.onClick;
  const upperText = useRef<HTMLParagraphElement | null>(null);
  const splitInstance = useRef<SplitText | null>(null);
  const splitChars = useRef<Element[]>([]);

  useGSAP(() => {
    if (!upperText.current) return;

    splitInstance.current = SplitText.create(upperText.current, {
      mask: "lines",
      type: "chars",
    });
    splitChars.current = splitInstance.current.chars;

    gsap.set(splitChars.current, { yPercent: 0 });

    return () => {
      splitInstance.current?.revert();
      splitInstance.current = null;
      splitChars.current = [];
    };
  }, []);

  const animateText = (yPercent: number) => {
    if (!splitChars.current.length) return;

    gsap.killTweensOf(splitChars.current);
    gsap.to(splitChars.current, {
      yPercent,
      stagger: 0.008,
      duration: 0.5,
      ease: "power2.out",
      overwrite: "auto",
    });
  };

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    parentOnClick?.(event);

    // Smooth-scroll to hash targets
    if (typeof href === "string" && href.startsWith("#") && href.length > 1) {
      event.preventDefault();

      gsap.to(window, {
        duration: 1,
        ease: "power2.out",
        scrollTo: { y: href, offsetY: 80 },
      });
    }
  };

  return (
    <Link
      href={href || "#"}
      {...props}
      onClick={handleClick}
      onMouseEnter={() => animateText(-100)}
      onMouseLeave={() => animateText(0)}
      prefetch={false}
      className={`text-white-200 group relative inline-flex h-[3.6vw] min-w-[10vw] items-center gap-3 overflow-hidden rounded-full px-[2.5vw] max-md:h-[2vw] max-md:w-fit max-md:min-w-[25vw] max-md:gap-[2vw] max-md:px-[4vw] max-md:py-[4vw] max-sm:h-fit max-sm:min-w-[50vw] max-sm:gap-[4vw] max-sm:px-[5vw] max-sm:py-[4.5vw] ${className}`}
    >
      <div className="z-1 -mt-0.5 overflow-clip leading-[1.2] max-md:mx-auto max-sm:mt-0">
        <p
          ref={upperText}
          className="text-22 buttonTextShadow leading-[1.4] text-white max-sm:text-[4vw]"
        >
          {text}
        </p>
      </div>
      <span
        className={`bg-primary absolute inset-0 rounded-full transition-transform duration-500 group-hover:scale-95 ${background}`}
      />
    </Link>
  );
};

export default PrimaryButton;
