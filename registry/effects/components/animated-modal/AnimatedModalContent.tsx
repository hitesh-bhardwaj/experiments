
"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

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
        transition-opacity
        ${
          isOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }
        ${className}
      `}
      style={{ transitionDuration: `${safeDuration}s` }}
    >
      <button
        type="button"
        aria-label="Close modal"
        onClick={closeOnBackdrop ? onClose : undefined}
        className="
          absolute inset-0
          cursor-pointer border-0
          backdrop-blur-md
        "
        style={{ backgroundColor: `rgba(0,0,0,${safeOverlayOpacity})` }}
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
            hover:scale-[1.04]
            hover:bg-white/20
            pointer-events-auto
            touch-manipulation
            min-w-10 min-h-10

            top-[1.5vw] right-[1.5vw] w-[3vw] h-[3vw]
            max-[1025px]:top-8 max-[1025px]:right-8 max-[1025px]:w-14 max-[1025px]:h-14
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

          max-[1025px]:px-0
          max-md:justify-center max-md:px-0

          ${contentClassName}
        `}
      >
        {children}
      </div>
    </div>
  );
};

export default AnimatedModalContent;
