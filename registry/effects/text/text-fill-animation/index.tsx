// Built using Hyperiux Vault: https://vault.hyperiux.com

'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';
import SplitText from 'gsap/SplitText';

const TEXT_REVEAL_STYLE_PREFIX = 'tfa-style-';
const SPLIT_CHARACTER_SELECTOR = '.split-chars';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger, SplitText);
}

/**
 * @typedef {Object} TextFillAnimationProps
 * @property {string} [text]
 * @property {string} [textColor]
 * @property {string} [primaryColor]
 * @property {string} [dimColor]
 * @property {string} [backgroundColor]
 * @property {string} [className]
 * @property {string} [id]
 * @property {string} [textSize]
 * @property {string} [textWidth]
 * @property {string} [containerClassName]
 * @property {string} [mobileTextSize]
 * @property {string} [mobileTextWidth]
 * @property {string} [tabletTextSize]
 * @property {string} [tabletTextWidth]
 */

/** @param {TextFillAnimationProps} props */
export default function TextFillAnimation({
  text = "Design systems should feel effortless, not like you're fighting your own components every time you build.",
  textColor = '#111111',
  primaryColor = '#ff6b00',
  dimColor = '#dddddd',
  backgroundColor = '',
  className = '',
  id = 'section-break',
  textSize = '5vw',
  textWidth = '80%',
  containerClassName = '',
  mobileTextSize = '8vw',
  mobileTextWidth = '95%',
  tabletTextSize = '6.5vw',
  tabletTextWidth = '88%',
}: any) {
  // State and refs
  const sectionRef = useRef<any>(null);
  const textRef = useRef<any>(null);

  // Effects
  useEffect(() => {
    const styleId = `${TEXT_REVEAL_STYLE_PREFIX}${id}`;
    const styleElement = document.createElement('style');

    styleElement.id = styleId;
    styleElement.textContent = `
      @keyframes color-transition-${id} {
        0% { color: ${dimColor}; }
        30% { color: ${primaryColor}; }
        100% { color: ${textColor}; }
      }

      #${id} .split__wrapper ${SPLIT_CHARACTER_SELECTOR} {
        transition: color .4s;
        color: ${dimColor};
      }

      #${id} .split__wrapper ${SPLIT_CHARACTER_SELECTOR}.show {
        animation: color-transition-${id} .5s;
        color: ${textColor};
      }

      #${id} .tfa-text-wrapper {
        width: ${textWidth};
      }

      #${id} .tfa-heading {
        font-size: ${textSize};
      }

      @media (min-width: 768px) and (max-width: 1024px) {
        #${id} .tfa-text-wrapper {
          width: ${tabletTextWidth};
        }

        #${id} .tfa-heading {
          font-size: ${tabletTextSize};
        }
      }

      @media (max-width: 767px) {
        #${id} .tfa-text-wrapper {
          width: ${mobileTextWidth};
        }

        #${id} .tfa-heading {
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
        charsClass: 'split-chars',
      });

      gsap.set(textElement, {
        opacity: 1,
      });

      const characters = Array.from(
        textElement.querySelectorAll(SPLIT_CHARACTER_SELECTOR)
      );

      const prefersReducedMotion =
        window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      if (prefersReducedMotion) {
        gsap.set(characters, { className: 'split-chars show' });
      } else {
        gsap
          .timeline({
            scrollTrigger: {
              trigger: sectionRef.current,
              start: 'top top',
              end: 'bottom bottom',
              scrub: 0.25,
            },
          })
          .to(
            characters,
            {
              className: 'split-chars show',
              duration: 0.4,
              stagger: 0.05,
              ease: 'power2.inOut',
            },
            0
          );
      }

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
    id,
    mobileTextSize,
    mobileTextWidth,
    primaryColor,
    tabletTextSize,
    tabletTextWidth,
    textColor,
    textSize,
    textWidth,
  ]);

  // Return
  return (
    <section
      id={id}
      ref={sectionRef}
      className={`relative h-[250vh] w-full ${containerClassName}`}
      style={{ backgroundColor }}
    >
      <div className="sticky top-0 flex h-screen items-center justify-center overflow-x-hidden">
        <div className="absolute left-1/2 top-1/2 h-[70vh] w-[70vh] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#ff6b00]/5 blur-3xl" />
        <div className="absolute bottom-[6vh] left-[5vw] max-w-55">
          <p className="text-sm leading-relaxed text-black/35 max-[1025px]:text-lg max-md:text-sm">
            Less friction.
            <br />
            More building.
          </p>
        </div>

        <div className="absolute bottom-[6vh] right-[5vw] text-right">
          <div className="space-y-1">
            <p className="text-sm text-black/35 max-[1025px]:text-lg max-md:text-sm">
              Systems
            </p>
            <p className="text-sm text-black/35 max-[1025px]:text-lg max-md:text-sm">
              Motion
            </p>
            <p className="text-sm text-black/35 max-[1025px]:text-lg max-md:text-sm">
              Clarity
            </p>
          </div>
        </div>

        <div className="split__wrapper tfa-text-wrapper relative z-10 mx-auto text-center">
          <h2
            ref={textRef}
            className={`tfa-heading opacity-0 font-display font-medium leading-[1.18] tracking-[-0.03em] ${className}`}
          >
            {text}
          </h2>
        </div>
      </div>
    </section>
  );
}
