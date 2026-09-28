// Built using Hyperiux Vault: https://vault.hyperiux.com
'use client'
import {
  forwardRef,
  useId,
  useEffect,
  useLayoutEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
  type AnimationEvent,
  type ComponentPropsWithoutRef,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { dimensionPresets, themePresets, buildRimCSS, buildPulseConfig, REDUCED_MOTION_SCALE } from './styles';
import { attachPulse } from './PulseDriver';

// Runs synchronously before the browser paints on the client, but degrades to a
// no-op-safe useEffect on the server (avoids the SSR useLayoutEffect warning).
const useBrowserLayoutEffect = typeof document !== 'undefined' ? useLayoutEffect : useEffect;

function usePreferredScheme(): 'dark' | 'light' {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window === 'undefined') return 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      setTheme(e.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return theme;
}

function usePrefersReducedMotion(): boolean {
  const [reduceMotion, setReduceMotion] = useState(() =>
    typeof window !== 'undefined'
      ? (window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false)
      : false
  );

  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!mq) return;

    const onChange = (event: MediaQueryListEvent) => setReduceMotion(event.matches);
    // matchMedia isn't available during SSR, so the real value can only be
    // read after mount - this can't be a lazy useState initializer without
    // risking a hydration mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReduceMotion(mq.matches);
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);

  return reduceMotion;
}

function pickTheme(theme: 'dark' | 'light' | 'auto', schemeName: 'dark' | 'light'): 'dark' | 'light' {
  return theme === 'auto' ? schemeName : theme;
}

/**
 * BeamBorder component - Animated border beam effect for React (JSX + Tailwind)
 *
 * Sizes:
 *   Rotate family: 'sm' | 'md' (default) | 'line'
 *   Pulse family:  'pulse-outside' | 'pulse-inner'
 * Color variants: 'colorful' (default) | 'mono' | 'ocean' | 'sunset'
 * Theme: 'dark' (default) | 'light' | 'auto'
 *
 * Static layout on the wrapper/bloom is handled with Tailwind utilities below;
 * the animated gradient system is per-instance generated CSS (see styles.js) -
 * that part cannot be expressed with Tailwind classes.
 *
 * @example
 * ```jsx
 * <BeamBorder>
 *   <Card>Content</Card>
 * </BeamBorder>
 * ```
 */
export type BeamBorderProps = {
  children?: ReactNode;
  size?: 'sm' | 'md' | 'line' | 'pulse-outside' | 'pulse-inner';
  colorVariant?: 'colorful' | 'mono' | 'ocean' | 'sunset';
  theme?: 'dark' | 'light' | 'auto';
  staticColors?: boolean;
  duration?: number;
  active?: boolean;
  borderRadius?: number;
  brightness?: number;
  saturation?: number;
  hueRange?: number;
  strength?: number;
  beamWidth?: number;
  className?: string;
  style?: CSSProperties;
  onActivate?: () => void;
  onDeactivate?: () => void;
  onAnimationEnd?: (e: AnimationEvent<HTMLDivElement>) => void;
} & Omit<ComponentPropsWithoutRef<'div'>, 'children' | 'style' | 'className' | 'onAnimationEnd'>;

export const BeamBorder = forwardRef<HTMLDivElement, BeamBorderProps>(function BeamBorder(
  {
    children,
    size = 'md',
    colorVariant = 'sunset',
    theme = 'light',
    duration,
    active = true,
    borderRadius: customBorderRadius,
    brightness: brightnessProp,
    saturation,
    strength = 1,
    beamWidth,
    className,
    style,
    onActivate,
    onDeactivate,
    onAnimationEnd: consumerOnAnimationEnd,
    ...props
  },
  ref
) {
  const rawId = useId();
  const id = rawId.replace(/:/g, '-');
  const schemeName = usePreferredScheme();
  const reduceMotion = usePrefersReducedMotion();
  const hostRef = useRef<HTMLDivElement | null>(null);

  const [isOn, setIsOn] = useState(active);
  const [isClosing, setIsClosing] = useState(false);
  const [onScreen, setOnScreen] = useState(true);
  const [autoRadius, setAutoRadius] = useState<number | null>(null);
  const [glowScale, setGlowScale] = useState({ x: 1, y: 1 });

  // Auto-detect child border radius when no explicit value is provided.
  // useLayoutEffect so the detected radius is applied before the browser paints
  // the first frame - otherwise the beam paints square, then snaps to the child's
  // radius a frame later (a visible corner "glitch" on reload).
  useBrowserLayoutEffect(() => {
    if (customBorderRadius != null) return;
    const el = hostRef.current;
    if (!el) return;

    const detect = () => {
      const child = el.firstElementChild;
      if (!child) return;
      const computed = getComputedStyle(child);
      const raw = parseFloat(computed.borderTopLeftRadius);
      if (!isNaN(raw) && raw > 0) {
        setAutoRadius(raw);
      }
    };

    detect();

    // Re-detect if child layout changes (e.g. CSS loaded late)
    const observer = new MutationObserver(detect);
    observer.observe(el, { childList: true, subtree: false });
    return () => observer.disconnect();
  }, [customBorderRadius, children]);

  // Sync isOn/isClosing to the active prop. Pure derived state (no browser
  // API), so it's adjusted directly during render instead of via an effect.
  if (active && !isOn && !isClosing) {
    setIsOn(true);
  } else if (!active && isOn && !isClosing) {
    setIsClosing(true);
  }

  // Pause the (paint-heavy) animations while the element is scrolled offscreen.
  // This stops per-frame painting entirely for hidden instances without changing
  // their logical active/fading state, so it never fires onActivate/onDeactivate.
  useEffect(() => {
    const el = hostRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      entries => {
        for (const entry of entries) setOnScreen(entry.isIntersecting);
      },
      // Start animating slightly before the element scrolls into view.
      { rootMargin: '256px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Reset glowScale when leaving pulse-outside. Pure derived state (no
  // browser API), so it's adjusted directly during render instead of via an
  // effect.
  if (size !== 'pulse-outside' && (glowScale.x !== 1 || glowScale.y !== 1)) {
    setGlowScale({ x: 1, y: 1 });
  }

  // Pulse Outside glow geometry is authored in fixed pixels for a reference
  // element (~350x140). Measure the actual wrapped element and scale the glow
  // per-axis so the halo grows/shrinks to fit any component it's applied to.
  useEffect(() => {
    if (size !== 'pulse-outside') {
      return;
    }

    const el = hostRef.current;
    if (!el) return;

    const REF_WIDTH = 350;
    const REF_HEIGHT = 140;
    // Allow the glow to both shrink (small buttons) and grow (large cards),
    // with generous bounds to avoid degenerate geometry at the extremes.
    const MIN_SCALE = 0.35;
    const MAX_SCALE = 4;
    const clamp = (value: number) => Math.max(MIN_SCALE, Math.min(MAX_SCALE, value));

    const measure = () => {
      const child = el.firstElementChild;
      if (!child) return;
      const rect = child.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const x = +clamp(rect.width / REF_WIDTH).toFixed(3);
      const y = +clamp(rect.height / REF_HEIGHT).toFixed(3);
      setGlowScale(prev => (prev.x === x && prev.y === y ? prev : { x, y }));
    };

    measure();
    if (typeof ResizeObserver === 'undefined') return;

    const child = el.firstElementChild;
    if (!child) return;

    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(child);
    return () => resizeObserver.disconnect();
  }, [size, children]);

  const onAnimEnd = useCallback(
    (e: AnimationEvent<HTMLDivElement>) => {
      const animationName = e.animationName;

      if (animationName.includes('fade-out')) {
        setIsOn(false);
        setIsClosing(false);
        onDeactivate?.();
      } else if (animationName.includes('fade-in')) {
        onActivate?.();
      }

      consumerOnAnimationEnd?.(e);
    },
    [onActivate, onDeactivate, consumerOnAnimationEnd]
  );

  const activeTheme = pickTheme(theme, schemeName);
  // Preset shapes differ slightly per size (not every size defines
  // brightness/hairlineOpacity), so this is treated as an honest loose bag.
  const finish = themePresets[size][activeTheme] as Record<string, number | string | undefined>;
  const dims = dimensionPresets[size];

  const isBreathe = size === 'pulse-inner' || size === 'pulse-outside';

  // Radius is driven solely by the wrapped child (its Tailwind `rounded-*`),
  // detected at runtime - the beam no longer imposes its own preset radius.
  // Falls back to 0 only for the pre-detection frame.
  const radius = customBorderRadius ?? autoRadius ?? 0;
  const cycle = duration ?? (size === 'line' ? 3.1 : isBreathe ? 2.3 : 1.96);
  const finalBorderWidth = beamWidth ?? dims.borderWidth;
  const sat = saturation ?? finish.saturation;
  const bright = brightnessProp ?? finish.brightness ?? 1.3;
  const hueSpan = size === 'line' ? 13 : 30;
  const frozen = colorVariant === 'mono';

  const instanceCSS = useMemo(
    () =>
      buildRimCSS({
        id,
        borderRadius: radius,
        borderWidth: finalBorderWidth,
        duration: cycle,
        strokeOpacity: finish.strokeOpacity,
        innerOpacity: finish.innerOpacity,
        bloomOpacity: finish.bloomOpacity,
        innerShadow: finish.innerShadow,
        size,
        colorVariant,
        staticColors: frozen,
        brightness: bright,
        saturation: sat,
        hueRange: hueSpan,
        theme: activeTheme,
        hairlineOpacity: finish.hairlineOpacity,
      }),
    [
      id,
      radius,
      finalBorderWidth,
      cycle,
      finish.strokeOpacity,
      finish.innerOpacity,
      finish.bloomOpacity,
      finish.innerShadow,
      finish.hairlineOpacity,
      size,
      colorVariant,
      frozen,
      bright,
      sat,
      hueSpan,
      activeTheme,
    ]
  );

  // Runtime config for the JS breathing driver (null for non-pulse sizes).
  // Under reduced motion, stretch oscillator/hue periods instead of freezing.
  const pulseConfig = useMemo(() => {
    if (!isBreathe) return null;
    const base = buildPulseConfig(size, activeTheme, cycle, hueSpan, frozen, id);
    if (!base || !reduceMotion) return base;
    return {
      oscillators: base.oscillators.map((osc: any) => ({
        ...osc,
        period: osc.period * REDUCED_MOTION_SCALE,
        delay: osc.delay * REDUCED_MOTION_SCALE,
      })),
      hue: base.hue
        ? { ...base.hue, period: base.hue.period * REDUCED_MOTION_SCALE }
        : null,
    };
  }, [isBreathe, size, activeTheme, cycle, hueSpan, frozen, id, reduceMotion]);

  // Drive the Pulse breathing from the shared, fps-capped rAF loop while the
  // instance is on and onscreen.
  useEffect(() => {
    if (!pulseConfig) return;
    if (!(isOn || isClosing) || !onScreen) return;

    const el = hostRef.current;
    if (!el) return;

    return attachPulse(el, pulseConfig);
  }, [pulseConfig, isOn, isClosing, onScreen]);

  const assignRef = useCallback(
    (node: HTMLDivElement | null) => {
      hostRef.current = node;
      if (typeof ref === 'function') {
        ref(node);
      } else if (ref) {
        ref.current = node;
      }
    },
    [ref]
  );

  const rootStyle = {
    ...(style ?? {}),
    '--rim-strength': Math.max(0, Math.min(1, strength)),
    ...(size === 'pulse-outside'
      ? { '--pulse-scale-x': glowScale.x, '--pulse-scale-y': glowScale.y }
      : {}),
  } as CSSProperties & Record<string, string | number>;

  // Static layout via Tailwind. The dynamic border-radius, gradients, masks, and
  // keyframes live in the generated <style> (they can't be Tailwind utilities).
  const layoutClasses =
    size === 'pulse-outside'
      ? 'relative isolate overflow-visible'
      : isBreathe
        ? 'relative isolate overflow-hidden'
        : 'relative overflow-hidden';

  const rootClassName = [layoutClasses, className].filter(Boolean).join(' ');

  return (
    <>
      <style>{instanceCSS}</style>
      <div
        {...props}
        ref={assignRef}
        data-rim={id}
        data-active={isOn && !isClosing ? '' : undefined}
        data-fading={isClosing ? '' : undefined}
        data-paused={isOn && !isClosing && !onScreen ? '' : undefined}
        className={rootClassName}
        style={rootStyle}
        onAnimationEnd={onAnimEnd}
      >
        {children}
        <div data-rim-glow className="pointer-events-none" />
      </div>
    </>
  );
});

export default BeamBorder;
