// Built using Hyperiux Vault: https://vault.hyperiux.com

"use client";

import React, {
  useEffect,
  useRef,
  type ReactNode,
  type CSSProperties,
} from "react";
import Core, { type CoreConfig } from "./core";
import gsap from "gsap";

export class KeyboardSlider extends Core {
  #tickerFn: () => void;

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

  override destroy() {
    window.removeEventListener("keydown", this.#handleKeydown);
    gsap.ticker.remove(this.#tickerFn);
    super.destroy();
  }
}

export interface SmoothInfiniteCarouselProps {
  children?: ReactNode;
  config?: Partial<CoreConfig>;
  className?: string;
  wrapperClassName?: string;
  itemClassName?: string;
  style?: CSSProperties;
  wrapperStyle?: CSSProperties;
  onReady?: (slider: KeyboardSlider) => void;
}

export default function SmoothInfiniteCarousel({
  children,
  config,
  className = "",
  wrapperClassName = "",
  itemClassName = "",
  style = {},
  wrapperStyle = {},
  onReady,
}: SmoothInfiniteCarouselProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const sliderRef = useRef<KeyboardSlider | null>(null);
  // Read through a ref instead of closing over the prop directly - onReady
  // is caller-supplied and often a fresh inline function every render;
  // declaring it as a dependency of the setup effect below would tear down
  // and rebuild the whole slider (losing drag/scroll state) on every parent
  // re-render, not just when the carousel itself actually needs to
  // reinitialize.
  const onReadyRef = useRef(onReady);

  const childArray = React.Children.toArray(children).filter(Boolean);

  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

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
    onReadyRef.current?.(slider);

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
}
