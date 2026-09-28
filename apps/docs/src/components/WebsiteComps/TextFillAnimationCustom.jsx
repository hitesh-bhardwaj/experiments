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

export default function TextFillAnimationCustom({
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
  as: Tag = 'div',
}) {
  const sectionRef = useRef(null);
  const textRef = useRef(null);

  useEffect(() => {
    const styleId = `${TEXT_REVEAL_STYLE_PREFIX}${id}`;
    const styleElement = document.createElement('style');

    styleElement.id = styleId;
    styleElement.textContent = `
      #${id} .split__wrapper ${SPLIT_CHARACTER_SELECTOR} {
        color: ${dimColor};
        will-change: color;
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
        aria: false,
        tag: 'span',
        charsClass: 'split-chars',
      });

      gsap.set(textElement, {
        opacity: 1,
      });

      const characters = split.chars?.length
        ? Array.from(split.chars)
        : gsap.utils.toArray(
            textElement.querySelectorAll(SPLIT_CHARACTER_SELECTOR)
          );

      // Contiguous reveal cursor. Forward = start fill tweens (finish even if
      // you stop). Backward = hard-snap the whole string so in-flight fills
      // can't complete later and leave white orphans.
      let revealed = 0;

      gsap.set(characters, {
        color: dimColor,
      });

      const playFill = (char, { immediate = false } = {}) => {
        gsap.killTweensOf(char);

        if (immediate) {
          gsap.set(char, { color: textColor, overwrite: true });
          return;
        }

        gsap.fromTo(
          char,
          { color: dimColor },
          {
            keyframes: [
              { color: primaryColor, duration: 0.15 },
              { color: textColor, duration: 0.25 },
            ],
            ease: 'none',
            overwrite: true,
          }
        );
      };

      const snapToTarget = (target) => {
        gsap.killTweensOf(characters);

        if (target > 0) {
          gsap.set(characters.slice(0, target), {
            color: textColor,
            overwrite: true,
          });
        }

        if (target < characters.length) {
          gsap.set(characters.slice(target), {
            color: dimColor,
            overwrite: true,
          });
        }

        revealed = target;
      };

      const syncFromProgress = (progress, { immediate = false } = {}) => {
        const target = Math.min(
          characters.length,
          Math.max(0, Math.round(progress * characters.length))
        );

        if (target === revealed) return;

        // Scroll up / refresh jump backward: kill every fill and snap clean.
        if (target < revealed || immediate) {
          snapToTarget(target);
          return;
        }

        for (let i = revealed; i < target; i++) {
          playFill(characters[i]);
        }

        revealed = target;
      };

      ScrollTrigger.create({
        trigger: sectionRef.current,
        start: 'top top',
        end: 'bottom bottom',
        // No scrub on the counter - lagged scrub was overshooting on reverse
        // and re-starting fills that then finished white after a reset.
        onUpdate: (self) => {
          syncFromProgress(self.progress);
        },
        onRefresh: (self) => {
          syncFromProgress(self.progress, { immediate: true });
        },
      });

      return () => {
        gsap.killTweensOf(characters);
        split.revert();
      };
    }, sectionRef);

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

  return (
    <section
      id={id}
      ref={sectionRef}
      className={`relative h-[250vh] w-full ${containerClassName}`}
      style={{ backgroundColor }}
    >
      <div className="sticky top-0 flex h-screen items-center justify-center overflow-x-hidden">
        <div className="split__wrapper tfa-text-wrapper relative z-10 mx-auto text-center">
          <Tag
            ref={textRef}
            className={`tfa-heading opacity-0 font-neue-haas leading-[1.18] ${className}`}
          >
            {text}
          </Tag>
        </div>
      </div>
    </section>
  );
}
