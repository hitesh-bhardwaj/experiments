'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';
import SplitText from 'gsap/SplitText';

const TEXT_REVEAL_STYLE_PREFIX = 'tfa-v3-style-';
const SPLIT_CHARACTER_SELECTOR = '.split-chars';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger, SplitText);
}

/**
 * Scroll-driven character fill, in normal document flow.
 *
 * Unlike TextFillAnimationCustom this never sticks or pins: there is no tall
 * spacer section, no `position: sticky` wrapper and no ScrollTrigger `pin`.
 * The block occupies only its own height and fills as it travels through the
 * viewport, so it can be dropped between other sections without changing the
 * page scroll length.
 */
export default function TextFillAnimationV3({
  text = "Design systems should feel effortless, not like you're fighting your own components every time you build.",
  textColor = '#ffffff',
  primaryColor = '#ff5f00',
  dimColor = '#272727',
  backgroundColor = '',
  className = '',
  id = 'text-fill-v3',
  textSize = '3.25vw',
  textWidth = '90%',
  containerClassName = '',
  mobileTextSize = '7vw',
  mobileTextWidth = '95%',
  tabletTextSize = '5vw',
  tabletTextWidth = '88%',
  start = '15% 75%',
  end = '85% 45%',
  as: Tag = 'p',
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

    let io;

    // ponytail: same fix as RandomBlur/SplitLine/CurvedGradient - defer the
    // forced-layout SplitText.create() until this section is nearly on
    // screen instead of splitting on every mount.
    const context = gsap.context(() => {
      const textElement = textRef.current;
      const section = sectionRef.current;

      if (!textElement || !section) {
        return;
      }

      let split;
      let splitCleanup;

      const mount = () => {
        split = SplitText.create(textElement, {
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

        const prefersReducedMotion = window.matchMedia(
          '(prefers-reduced-motion: reduce)'
        ).matches;

        if (prefersReducedMotion) {
          gsap.set(characters, { color: textColor });

          splitCleanup = () => {
            gsap.killTweensOf(characters);
            split.revert();
          };
          return;
        }

        // Contiguous reveal cursor. Forward = start fill tweens (finish even if
        // you stop). Backward = hard-snap the whole string so in-flight fills
        // can't complete later and leave white orphans.
        let revealed = 0;

        gsap.set(characters, {
          color: dimColor,
        });

        const playFill = (char) => {
          gsap.killTweensOf(char);

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

        // Trigger is the text itself, not a tall spacer - the reveal is mapped to
        // the block crossing the viewport instead of to a pinned scroll distance.
        ScrollTrigger.create({
          trigger: section,
          start,
          end,
          onUpdate: (self) => {
            syncFromProgress(self.progress);
          },
          onRefresh: (self) => {
            syncFromProgress(self.progress, { immediate: true });
          },
        });

        splitCleanup = () => {
          gsap.killTweensOf(characters);
          split.revert();
        };
      };

      io = new IntersectionObserver(
        (entries) => {
          if (entries[0]?.isIntersecting) {
            io.disconnect();
            mount();
          }
        },
        { rootMargin: '500px 0px' }
      );
      io.observe(section);

      return () => {
        io?.disconnect();
        splitCleanup?.();
      };
    }, sectionRef);

    return () => {
      context.revert();
      document.getElementById(styleId)?.remove();
    };
  }, [
    dimColor,
    end,
    id,
    mobileTextSize,
    mobileTextWidth,
    primaryColor,
    start,
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
      className={`relative w-full overflow-x-hidden ${containerClassName}`}
      style={{ backgroundColor }}
    >
      <div className="split__wrapper tfa-text-wrapper relative z-10 mx-auto text-center">
        <Tag
          ref={textRef}
          className={`tfa-heading opacity-0 font-avenir leading-[1.18] ${className}`}
        >
          {text}
        </Tag>
      </div>
    </section>
  );
}
