"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { Check, Copy } from "lucide-react";
import { tv } from "tailwind-variants";

const COPY_ICON_RESET_DELAY_MS = 2_000;

const copyButtonStyles = tv({
  slots: {
    button: "cursor-pointer flex items-center justify-center touch-manipulation",
    iconWrap: "",
    icon: "h-full w-full",
  },
  variants: {
    size: {
      sm: { iconWrap: "size-4" },
      md: { iconWrap: "size-5 max-lg:size-6 max-md:size-4" },
    },
    color: {
      primary: { icon: "text-primary" },
      black: { icon: "text-foreground" },
      white: { icon: "text-white" },
    },
  },
  defaultVariants: {
    size: "md",
    color: "white",
  },
});

function cn(...parts) {
  return parts.filter(Boolean).join(" ");
}

function animateIconSwap(element, rotation, onSwapped) {
  return gsap
    .timeline()
    .to(element, {
      scale: 0,
      rotation,
      duration: 0.2,
      ease: "power2.in",
      onComplete: onSwapped,
    })
    .to(element, {
      scale: 1.2,
      rotation: 0,
      duration: 0.3,
      ease: "back.out(1.7)",
    })
    .to(element, {
      scale: 1,
      duration: 0.15,
      ease: "power2.out",
    });
}

async function copyTextToClipboard(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.className = "clipboard-fallback";
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  document.execCommand("copy");
  textArea.remove();
}

/**
 * @param {{
 *   value: string;
 *   size?: "sm" | "md";
 *   color?: "primary" | "black" | "white";
 *   className?: string;
 *   "aria-label"?: string;
 *   disabled?: boolean;
 *   onBeforeCopy?: () => boolean | Promise<boolean>;
 *   onCopiedChange?: (copied: boolean) => void;
 * }} props
 */
export default function CopyBtn({
  value,
  size = "md",
  color = "white",
  className = "",
  "aria-label": ariaLabel = "Copy to clipboard",
  disabled = false,
  onBeforeCopy,
  onCopiedChange,
}) {
  const [copied, setCopiedState] = useState(false);
  const iconRef = useRef(null);
  const resetTimeoutRef = useRef(null);
  const animationTimelineRef = useRef(null);
  // Guards against a second click landing while the first's onBeforeCopy
  // (an async server round-trip) is still pending - without it, a fast
  // double-click/key-repeat fires handleClick twice before either has a
  // chance to disable anything.
  const isHandlingRef = useRef(false);
  const copyButtonSlots = copyButtonStyles({ size, color });

  // Wraps setCopied so callers (e.g. a Tooltip label switching to "Copied!")
  // can react to the same state without duplicating the icon-swap timing.
  function setCopied(next) {
    setCopiedState(next);
    onCopiedChange?.(next);
  }

  function clearCopyAnimation() {
    if (resetTimeoutRef.current !== null) {
      window.clearTimeout(resetTimeoutRef.current);
      resetTimeoutRef.current = null;
    }

    animationTimelineRef.current?.kill();
    animationTimelineRef.current = null;
  }

  function playCopiedAnimation(element) {
    clearCopyAnimation();

    animationTimelineRef.current = animateIconSwap(element, -180, () => {
      setCopied(true);
    });

    resetTimeoutRef.current = window.setTimeout(() => {
      resetTimeoutRef.current = null;

      if (!iconRef.current) return;

      animationTimelineRef.current = animateIconSwap(iconRef.current, 180, () => {
        setCopied(false);
      });
    }, COPY_ICON_RESET_DELAY_MS);
  }

  useEffect(() => () => clearCopyAnimation(), []);

  async function handleClick(event) {
    event.preventDefault();
    event.stopPropagation();

    if (disabled || isHandlingRef.current) return;
    isHandlingRef.current = true;

    try {
      if (onBeforeCopy) {
        const canProceed = await onBeforeCopy();
        if (!canProceed) return;
      }

      await copyTextToClipboard(value);

      if (!iconRef.current) return;

      playCopiedAnimation(iconRef.current);
    } catch {
      // Clipboard failures stay silent.
    } finally {
      isHandlingRef.current = false;
    }
  }

  const iconClassName = copyButtonSlots.icon();

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className={cn(copyButtonSlots.button(), disabled && "cursor-not-allowed opacity-40", className)}
      aria-label={ariaLabel}
    >
      <div ref={iconRef} className={copyButtonSlots.iconWrap()}>
        {copied ? (
          <Check className={iconClassName} aria-hidden />
        ) : (
          <Copy className={iconClassName} aria-hidden />
        )}
      </div>
    </button>
  );
}
