'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';
import SplitText from 'gsap/SplitText';
import { prefersReducedMotion } from '@/lib/motion';

const TEXT_REVEAL_STYLE_PREFIX = 'tfa-style-';
const SPLIT_CHARACTER_SELECTOR = '.split-chars';

const REDUCED_MOTION_DURATION = 0.4;
const REDUCED_MOTION_EASE = 'power1.out';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger, SplitText);
}

/**
 * Scroll-scrubbed character fill - each character warms from `dimColor`
 * through `primaryColor` to `textColor` as the section passes the viewport.
 *
 * Under `prefers-reduced-motion: reduce` the heading still fades in once, but
 * in `textColor` from the start - no split, no scrubbed character stagger.
 */
export function TextFillAnimation({
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
}) {
  // State and refs
  const sectionRef = useRef(null);
  const textRef = useRef(null);

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

      #${id}.tfa-preload .split__wrapper ${SPLIT_CHARACTER_SELECTOR},
      #${id}.tfa-preload .split__wrapper ${SPLIT_CHARACTER_SELECTOR}.show {
        transition: none;
        animation: none;
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

      // A fade is not motion, so the heading still reveals itself - but in its
      // final colour, with no split and no scrubbed character stagger.
      if (prefersReducedMotion()) {
        gsap.set(textElement, { color: textColor });

        gsap.fromTo(
          textElement,
          { opacity: 0 },
          {
            opacity: 1,
            duration: REDUCED_MOTION_DURATION,
            ease: REDUCED_MOTION_EASE,
            scrollTrigger: {
              trigger: sectionRef.current,
              start: 'top 70%',
              once: true,
            },
          }
        );

        return;
      }

      // Mute the CSS transition/animation while the timeline is wired up, so
      // reloading mid-scroll doesn't replay the colour keyframe on every
      // already-revealed character at once (the one-off "blink").
      const section = sectionRef.current;
      section?.classList.add('tfa-preload');

      const split = SplitText.create(textElement, {
        type: 'words chars',
        aria: false,
        tag: 'span',
        charsClass: 'split-chars',
      });

      gsap.set(textElement, {
        opacity: 1,
      });

      const characters = Array.from(
        textElement.querySelectorAll(SPLIT_CHARACTER_SELECTOR)
      );

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

      // Once ScrollTrigger has applied the scrubbed starting state, pin the
      // already-revealed characters to their final look (no entry animation)
      // and lift the mute. Characters scrolled into afterwards still pop.
      const raf = requestAnimationFrame(() => {
        characters.forEach((char) => {
          if (char.classList.contains('show')) {
            char.style.animation = 'none';
            char.style.transition = 'none';
          }
        });

        section?.classList.remove('tfa-preload');
      });

      return () => {
        cancelAnimationFrame(raf);
        section?.classList.remove('tfa-preload');
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

        <div className="split__wrapper tfa-text-wrapper relative z-10 mx-auto">
          <h2
            ref={textRef}
            className={`tfa-heading opacity-0 font-display font-medium leading-[1.18] max-md:leading-[1.4]! ${className}`}
          >
            {text}
          </h2>
        </div>
      </div>
    </section>
  );
}
