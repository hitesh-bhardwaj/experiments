// Built using Hyperiux Vault: https://vault.hyperiux.com

'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';
import SplitText from 'gsap/SplitText';

const TEXT_FILL_STYLE_PREFIX = 'tf-style-';
const SPLIT_CHARACTER_SELECTOR = '.tf-char';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger, SplitText);
}

export default function TextFill({
  text = '',
  textColor = '#111111',
  primaryColor = '#134BD6',
  dimColor = '#dddddd',
  backgroundColor = '',
  className = '',
  id = 'text-fill',
  textSize = '5vw',
  textWidth = '80%',
  containerClassName = '',
  mobileTextSize = '8vw',
  mobileTextWidth = '95%',
  tabletTextSize = '6.5vw',
  tabletTextWidth = '88%',
  dimOpacity = 0.55,
  stagger = 0.5,
  primarySpread = 0.6,
  tintRamp = 4.2,
  revealRamp = 5.0,
  start = 'top 75%',
  end = 'bottom 85%',
  scrub = 0.6,
}: any) {
  const sectionRef = useRef<any>(null);
  const textRef = useRef<any>(null);

  useEffect(() => {
    const styleId = `${TEXT_FILL_STYLE_PREFIX}${id}`;
    const styleElement = document.createElement('style');

    styleElement.id = styleId;
    styleElement.textContent = `
      #${id} .tf-text-wrapper {
        width: ${textWidth};
      }

      #${id} .tf-heading {
        font-size: ${textSize};
      }

      #${id} ${SPLIT_CHARACTER_SELECTOR} {
        will-change: color, opacity;
      }

      @media (min-width: 768px) and (max-width: 1024px) {
        #${id} .tf-text-wrapper {
          width: ${tabletTextWidth};
        }

        #${id} .tf-heading {
          font-size: ${tabletTextSize};
        }
      }

      @media (max-width: 767px) {
        #${id} .tf-text-wrapper {
          width: ${mobileTextWidth};
        }

        #${id} .tf-heading {
          font-size: ${mobileTextSize};
        }
      }
    `;

    document.head.appendChild(styleElement);

    const context = gsap.context(() => {
      const textElement = textRef.current;

      if (!textElement) {
        return;
      }

      const split = SplitText.create(textElement, {
        type: 'words chars',
        aria: false as any,
        tag: 'span',
        charsClass: 'tf-char',
      });

      gsap.set(textElement, { opacity: 1 });

      const characters = Array.from(
        textElement.querySelectorAll(SPLIT_CHARACTER_SELECTOR)
      );

      const prefersReducedMotion =
        window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      if (prefersReducedMotion) {
        // No travelling wave and no primary tint: every character fades from
        // the dim colour straight to the final one together, still tied to
        // scroll so the copy resolves as the section arrives.
        gsap.set(characters, { color: dimColor, opacity: dimOpacity });

        gsap.to(characters, {
          color: textColor,
          opacity: 1,
          ease: 'none',
          scrollTrigger: {
            trigger: sectionRef.current,
            start,
            end,
            scrub,
          },
        });

        return () => {
          split.revert();
        };
      }

      gsap.set(characters, { color: dimColor, opacity: dimOpacity });

      const timeline = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start,
          end,
          scrub,
        },
      });

      // Two overlapping passes per character: the dim -> primary tint sweeps
      // ahead of the primary -> final colour reveal, so at any scroll position
      // a band of characters sits mid-blend instead of flipping one by one.
      // tintRamp / revealRamp are each blend's duration: divided by stagger
      // they give how many characters sit mid-gradient, so raising them
      // lengthens the gray->primary and primary->final fades. primarySpread
      // is the gap of solid primary held between the two ramps.
      timeline
        .to(
          characters,
          {
            color: primaryColor,
            opacity: 1,
            duration: tintRamp,
            ease: 'sine.inOut',
            stagger,
          },
          0
        )
        .to(
          characters,
          {
            color: textColor,
            duration: revealRamp,
            ease: 'sine.inOut',
            stagger,
          },
          tintRamp + primarySpread
        );

      return () => {
        split.revert();
      };
    });

    return () => {
      context.revert();
      document.getElementById(styleId)?.remove();
    };
  }, [
    dimColor,
    dimOpacity,
    end,
    id,
    mobileTextSize,
    mobileTextWidth,
    primaryColor,
    primarySpread,
    revealRamp,
    scrub,
    stagger,
    start,
    tabletTextSize,
    tabletTextWidth,
    textColor,
    textSize,
    textWidth,
    tintRamp,
  ]);

  return (
    <section
      id={id}
      ref={sectionRef}
      className={`relative h-screen w-full ${containerClassName}`}
      style={{ backgroundColor }}
    >
      <div className="sticky top-0 flex h-screen items-center justify-center overflow-x-hidden">
        <div className="tf-text-wrapper relative z-10 mx-auto text-center">
          <h3
            ref={textRef}
            className={`tf-heading max-md:text-[9vw]! opacity-0 leading-[1.4] tracking-[-0.03em] ${className}`}
          >
            {text}
          </h3>
        </div>
      </div>
    </section>
  );
}
