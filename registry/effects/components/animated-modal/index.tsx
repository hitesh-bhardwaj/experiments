// Built using Hyperiux Vault: https://vault.hyperiux.com
"use client";

import { X } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

export interface PopupSection {
  heading?: string;
  paragraph?: string;
  list?: string[];
}

export interface ScrollablePopupContentProps {
  title?: string;
  subtitle?: string;
  sections?: PopupSection[];
  className?: string;
  size?: number;
  backgroundColor?: string;
  textColor?: string;
  roundedness?: number;
}

const ScrollablePopupContent = ({
    title = "Popup Title",
    subtitle = "",
    sections = [],
    className = "",
    size = 72,
    backgroundColor = "#ffffff",
    textColor = "#111111",
    roundedness = 24,
}: ScrollablePopupContentProps) => {
    const safeSize = Math.min(96, Math.max(40, Number(size) || 72));
    const safeRoundedness = Math.max(0, Number(roundedness) || 0);

    return (
        <div
            className={`mx-auto max-h-[82vh] overflow-hidden shadow-[0_20px_80px_rgba(0,0,0,0.18)] max-lg:max-h-[84vh] max-md:max-h-[86vh] ${className}`}
            style={{
                width: `min(${safeSize}%, 960px)`,
                borderRadius: `${safeRoundedness}px`,
                backgroundColor,
                color: textColor,
            }}
        >
            <div className="h-full max-h-[82vh] overflow-y-auto p-[2.4vw] scrollbar-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-black/20 max-lg:max-h-[84vh] max-lg:p-[4vw] max-md:max-h-[86vh] max-md:px-[5vw] max-md:py-[6vw]">
                <div className="border-b border-black/8 pb-[1.6vw]">
                    <p
                        className="mb-[0.6vw] text-[0.85vw] uppercase tracking-[0.08em] opacity-55 font-semibold max-lg:mb-[1vw] max-lg:text-[1.6vw] max-md:mb-[1.8vw] max-md:text-[3vw]"
                    >
                        Overview
                    </p>
                    <h2
                        className="mb-[1vw] text-[2.2vw] leading-none font-semibold max-lg:mb-[1.6vw] max-lg:text-[4.6vw] max-md:mb-[2.5vw] max-md:text-[7vw]"
                    >
                        {title}
                    </h2>
                    {subtitle ? (
                        <p className="w-[80%] text-[1vw] leading-[1.7] opacity-80 max-lg:w-full max-lg:text-[1.9vw] max-md:text-[3.6vw] max-md:leading-[1.7]">
                            {subtitle}
                        </p>
                    ) : null}
                </div>

                <div className="flex flex-col gap-[2vw] pt-[1.8vw] max-lg:gap-[3.2vw] max-lg:pt-[3vw] max-md:gap-[5vw] max-md:pt-[5vw]">
                    {sections.map((section, index) => (
                        <div key={index} className="flex flex-col gap-[0.9vw] max-lg:gap-[1.4vw] max-md:gap-[2.4vw]">
                            {section.heading ? (
                                <h3
                                    className="text-[1.25vw] leading-[1.2] font-semibold max-lg:text-[2.4vw] max-md:text-[4.4vw]"
                                >
                                    {section.heading}
                                </h3>
                            ) : null}

                            {section.paragraph ? (
                                <p className="text-[1vw] leading-[1.8] opacity-80 max-lg:text-[1.9vw] max-md:text-[3.6vw] max-md:leading-[1.8]">
                                    {section.paragraph}
                                </p>
                            ) : null}

                            {section.list?.length ? (
                                <ul className="flex flex-col gap-[0.6vw] pl-[1.2vw] max-lg:gap-[1vw] max-lg:pl-[2.2vw] max-md:gap-[1.8vw] max-md:pl-[4vw] [&>li]:text-[1vw] [&>li]:leading-[1.7] [&>li]:opacity-80 max-lg:[&>li]:text-[1.85vw] max-md:[&>li]:text-[3.4vw] max-md:[&>li]:leading-[1.7]">
                                    {section.list.map((item, itemIndex) => (
                                        <li key={itemIndex}>{item}</li>
                                    ))}
                                </ul>
                            ) : null}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export interface AnimatedModalContentProps {
  isOpen?: boolean;
  onClose?: () => void;
  children?: ReactNode;
  className?: string;
  contentClassName?: string;
  showCloseButton?: boolean;
  closeOnBackdrop?: boolean;
  closeOnEsc?: boolean;
  closeButtonClassName?: string;
  ariaLabel?: string;
  ariaLabelledby?: string;
  overlayOpacity?: number;
  duration?: number;
}

const AnimatedModalContent = ({
  isOpen = false,
  onClose,
  children,
  className = "",
  contentClassName = "",
  showCloseButton = true,
  closeOnBackdrop = true,
  closeOnEsc = true,
  closeButtonClassName = "",
  ariaLabel = "Dialog",
  ariaLabelledby,
  overlayOpacity = 0.82,
  duration = 0.5,
}: AnimatedModalContentProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const previousFocusRef = useRef<Element | null>(null);
  const safeOverlayOpacity = Math.min(1, Math.max(0, Number(overlayOpacity) || 0));
  const safeDuration = Math.max(0.05, Number(duration) || 0.5);

  useEffect(() => {
    if (!isOpen) return;

    const container = containerRef.current;

    previousFocusRef.current = document.activeElement;

    const getFocusable = (): HTMLElement[] => {
      if (!container) return [];
      return (Array.from(
        container.querySelectorAll(
          'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      ) as HTMLElement[]).filter((el) => el.offsetParent !== null || el === document.activeElement);
    };

    container?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (closeOnEsc && e.key === "Escape") {
        onClose?.();
        return;
      }

      if (e.key !== "Tab") return;

      const items = getFocusable();
      if (items.length === 0) {
        e.preventDefault();
        container?.focus();
        return;
      }

      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      const inside = container?.contains(active);

      if (e.shiftKey && (active === first || !inside)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !inside)) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      // Return focus to whatever triggered the modal.
      (previousFocusRef.current as any)?.focus?.();
    };
  }, [isOpen, onClose, closeOnEsc]);

  return (
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabelledby ? undefined : ariaLabel}
      aria-labelledby={ariaLabelledby}
      tabIndex={-1}
      data-lenis-prevent
      {...(!isOpen ? { inert: true, "aria-hidden": "true" } : {})}
      className={`
        fixed inset-0 z-9999
        ${isOpen ? "visible pointer-events-auto" : "invisible pointer-events-none"}
        ${className}
      `}
      // Opacity is faded on the backdrop and content separately (not on this
      // root): a backdrop-filter inside a fading parent pops in instead of
      // fading. Visibility flips after the fade-out finishes.
      style={{
        transition: `visibility 0s linear ${isOpen ? 0 : safeDuration}s`,
      }}
    >
      <button
        type="button"
        aria-label="Close modal"
        onClick={closeOnBackdrop ? onClose : undefined}
        className={`
          absolute inset-0
          cursor-pointer border-0
          backdrop-blur-md
          transition-opacity ease-out
          ${isOpen ? "opacity-100" : "opacity-0"}
        `}
        style={{
          backgroundColor: `rgba(0,0,0,${safeOverlayOpacity})`,
          transitionDuration: `${safeDuration}s`,
        }}
      />

      {showCloseButton && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClose?.();
          }}
          aria-label="Close modal"
          className={`
            absolute z-99999
            flex items-center justify-center
            rounded-full border-0
            bg-black/80 text-white
            cursor-pointer
            backdrop-blur-md
            transition-all duration-300
            ${isOpen ? "opacity-100" : "opacity-0"}
            hover:scale-[1.04]
            hover:bg-white/20
            pointer-events-auto
            touch-manipulation
            min-w-10 min-h-10

            top-[1.5vw] right-[1.5vw] w-[3vw] h-[3vw]
            max-lg:top-8 max-lg:right-8 max-lg:w-14 max-lg:h-14
            max-md:top-4 max-md:right-4 max-md:w-10 max-md:h-10

            ${closeButtonClassName}
          `}
        >
          <X size={24} className="pointer-events-none" />
        </button>
      )}

      <div
        className={`
          relative z-1
          flex h-screen w-screen items-center
          px-0
          transition-opacity
          ${isOpen ? "opacity-100" : "opacity-0"}

          max-lg:px-0
          max-md:justify-center max-md:px-0

          ${contentClassName}
        `}
        style={{ transitionDuration: `${safeDuration}s` }}
      >
        {children}
      </div>
    </div>
  );
};

const popupSections: PopupSection[] = [
  {
    heading: "Project Overview",
    paragraph:
      "This development is envisioned as a premium mixed-use destination, combining residential comfort, retail convenience, and elevated lifestyle experiences in one cohesive ecosystem.",
    list: [
      "Prime urban location with excellent access",
      "Integrated amenities for work, wellness, and leisure",
      "Architecture focused on long-term livability",
    ],
  },
  {
    heading: "Design Philosophy",
    paragraph:
      "Every detail has been planned to create an experience that feels contemporary, intuitive, and timeless. The emphasis is on spatial openness, natural light, and refined materials.",
    list: [
      "Open-plan living concepts",
      "Daylight-first spatial planning",
      "Contemporary material palette",
    ],
  },
  {
    heading: "Investment Potential",
    paragraph:
      "With strong connectivity, growing infrastructure, and a carefully positioned offering, the project is designed to appeal to both end-users and long-term investors seeking sustained value.",
    list: [
      "High-demand micro-market",
      "Future-forward development strategy",
      "Strong long-term appreciation potential",
    ],
  },
  {
    heading: "Lifestyle Experience",
    paragraph:
      "The experience extends beyond residences, offering amenities and shared spaces that promote wellness, community, and a more balanced urban lifestyle.",
    list: [
      "Curated leisure and wellness zones",
      "Community-first shared spaces",
      "Elevated everyday convenience",
    ],
  },
];

export default function AnimatedModal({
  showCloseButton = true,
  closeOnBackdrop = true,
  closeOnEsc = true,
  size = 72,
  overlayOpacity = 0.82,
  duration = 0.5,
  backgroundColor = "#ffffff",
  textColor = "#111111",
  roundedness = 24,
}) {
  const [isContentOpen, setIsContentOpen] = useState(false);

  return (
    <div className="flex w-full items-center justify-center bg-white">
      <button
        type="button"
        onClick={() => {
          setIsContentOpen(true);
        }}
        className="
          cursor-pointer rounded-full border-0 bg-[#111111] px-[2vw] py-[1vw]
          text-white transition-all duration-300 hover:scale-[1.03]
          text-[1vw]
          max-lg:px-[4vw] max-lg:py-[2vw] max-lg:text-[2.2vw]
          max-md:px-[6vw] max-md:py-[3.5vw] max-md:text-[4vw]
        "
      >
        Open Modal
      </button>

      <AnimatedModalContent
        className="h-full backdrop-blur-none "
        isOpen={isContentOpen}
        onClose={() => setIsContentOpen(false)}
        showCloseButton={showCloseButton}
        closeOnBackdrop={closeOnBackdrop}
        closeOnEsc={closeOnEsc}
        overlayOpacity={overlayOpacity}
        duration={duration}
      >
        <ScrollablePopupContent
          title="A Deeper Look at the Project"
          subtitle="Explore the thinking, design strategy, and long-term value proposition behind the development."
          sections={popupSections}
          size={size}
          backgroundColor={backgroundColor}
          textColor={textColor}
          roundedness={roundedness}
        />
      </AnimatedModalContent>

    </div>
  );
}
