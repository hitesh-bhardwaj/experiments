// Built using Hyperiux Vault: https://vault.hyperiux.com

"use client";

import React, {
  forwardRef,
  useImperativeHandle,
  useEffect,
  useRef,
  type ReactNode,
  type CSSProperties,
} from "react";
import Core, { type CoreConfig } from "./core";
import gsap from "gsap";

export class KeyboardSlider extends Core {
  #tickerFn: () => void;
  #currentTilt: number = 0;
  #hadActiveTilt: boolean = false;

  constructor(wrapper: HTMLElement, config?: Partial<CoreConfig>) {
    super(wrapper, config);

    this.#tickerFn = this.update.bind(this);
    gsap.ticker.add(this.#tickerFn);
    this.#addKeyboardEvents();
  }

  #handleKeydown = (e: KeyboardEvent) => {
    if (!this.isVisible) return;

    // Numbers 0-9 pressed
    if (/^[0-9]$/.test(e.key)) {
      const slideIndex = parseInt(e.key, 10);
      if (this.config.infinite) {
        // automatically takes the shortest path
        this.goToIndex(slideIndex);
      } else {
        if (slideIndex > this.items.length - 1) return;
        this.goToIndex(slideIndex);
      }
      return;
    }

    // Arrows and spacebar
    switch (e.key) {
      case "ArrowLeft":
        this.goToPrev();
        break;
      case "ArrowRight":
        this.goToNext();
        break;
      case " ":
        e.preventDefault();
        this.goToNext();
        break;
    }
  };

  #addKeyboardEvents() {
    window.addEventListener("keydown", this.#handleKeydown);
  }

  override update(): void {
    super.update();
    this.#applyTilt();
  }

  #applyTilt(): void {
    if (!this.items || this.items.length === 0) return;

    const diff = this.config.variableWidth
      ? (this.target - this.current) / (this.viewport?.itemWidth || 300)
      : this.target - this.current;

    // Tilt angle proportional to swipe direction and speed (clamped for subtle effect)
    const targetTilt = Math.max(-5, Math.min(5, diff * 4.2));

    // Smooth inertia damping back to rest (0deg)
    const smoothing = 14;
    const dt = this.deltaTime ? Math.min(this.deltaTime, 0.05) : 0.016;
    this.#currentTilt +=
      (targetTilt - this.#currentTilt) * (1 - Math.exp(-smoothing * dt));

    const tilt = Math.abs(this.#currentTilt) > 0.01 ? this.#currentTilt : 0;

    // If tilt is 0 and was already at rest, skip DOM manipulation entirely
    if (tilt === 0 && Math.abs(targetTilt) < 0.001) {
      if (this.#hadActiveTilt) {
        this.#hadActiveTilt = false;
        for (let i = 0; i < this.items.length; i++) {
          const item = this.items[i];
          const card = (item.firstElementChild || item) as HTMLElement;
          if (card) {
            card.style.transform = "";
            card.style.willChange = "";
          }
        }
      }
      return;
    }

    this.#hadActiveTilt = true;
    const tiltStr = `rotate(${tilt.toFixed(2)}deg)`;

    for (let i = 0; i < this.items.length; i++) {
      const item = this.items[i];
      const card = (item.firstElementChild || item) as HTMLElement;
      if (card) {
        card.style.transform = tiltStr;
        card.style.transformOrigin = "center 85%";
        card.style.willChange = "transform";
      }
    }
  }

  override destroy() {
    window.removeEventListener("keydown", this.#handleKeydown);
    gsap.ticker.remove(this.#tickerFn);

    if (this.items) {
      for (let i = 0; i < this.items.length; i++) {
        const item = this.items[i];
        const card = (item.firstElementChild || item) as HTMLElement;
        if (card) {
          card.style.transform = "";
          card.style.willChange = "";
        }
      }
    }

    super.destroy();
  }
}

export interface SmoothInfiniteCarouselRef {
  goToNext: () => void;
  goToPrev: () => void;
  goToIndex: (index: number) => void;
  getSlider: () => KeyboardSlider | null;
}

export interface SmoothInfiniteCarouselProps {
  children?: ReactNode;
  config?: Partial<CoreConfig>;
  className?: string;
  wrapperClassName?: string;
  itemClassName?: string;
  style?: CSSProperties;
  wrapperStyle?: CSSProperties;
}

const SmoothInfiniteCarousel = forwardRef<
  SmoothInfiniteCarouselRef,
  SmoothInfiniteCarouselProps
>(function SmoothInfiniteCarousel(
  {
    children,
    config,
    className = "",
    wrapperClassName = "",
    itemClassName = "",
    style = {},
    wrapperStyle = {},
  },
  ref
) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const sliderRef = useRef<KeyboardSlider | null>(null);

  const childArray = React.Children.toArray(children).filter(Boolean);

  useImperativeHandle(
    ref,
    () => ({
      goToNext: () => sliderRef.current?.goToNext(),
      goToPrev: () => sliderRef.current?.goToPrev(),
      goToIndex: (index: number) => sliderRef.current?.goToIndex(index),
      getSlider: () => sliderRef.current,
    }),
    []
  );

  useEffect(() => {
    if (!wrapperRef.current || childArray.length === 0) return;

    const slider = new KeyboardSlider(wrapperRef.current, {
      infinite: true,
      snap: true,
      variableWidth: false,
      dragSensitivity: 0.005,
      lerpFactor: 0.12,
      scrollSensitivity: 1,
      snapStrength: 0.1,
      ...config,
    });

    sliderRef.current = slider;

    return () => {
      slider.destroy();
      sliderRef.current = null;
    };
  }, [childArray.length, config]);

  return (
    <div className={`w-full overflow-hidden ${className}`} style={style}>
      <div
        ref={wrapperRef}
        className={`flex w-full select-none cursor-grab active:cursor-grabbing ${wrapperClassName}`}
        style={{ touchAction: "pan-y", ...wrapperStyle }}
      >
        {childArray.map((child, idx) => (
          <div
            key={idx}
            className={`shrink-0 ${itemClassName}`}
          >
            {child}
          </div>
        ))}
      </div>
    </div>
  );
});

export default SmoothInfiniteCarousel;
