// Built using Hyperiux Vault: https://vault.hyperiux.com
/**
 * Shared breathing driver for the Pulse effects.
 *
 * The pulse breathing (size / drift / per-quadrant opacity / height) and the
 * slow hue drift used to run as ~15 per-instance CSS `@property` keyframe
 * animations at the display refresh rate (60–120 Hz). Because each value feeds
 * the painted gradients/filters, that repainted the breathing layers 60–120×/s.
 *
 * The motion is very slow (1.6–6.4 s periods), so instead every registered
 * instance is driven from a SINGLE shared requestAnimationFrame loop throttled
 * to ~30 fps. This halves the paint frequency on 60 Hz displays and quarters it
 * on 120 Hz, with no perceptible change to the breathing.
 *
 * Each oscillator ping-pongs a CSS custom property between `a` and `b` with an
 * ease-in-out (cosine) curve over `period` seconds, offset by `delay` seconds so
 * otherwise-identical oscillators desync (matching the former CSS keyframes +
 * animation-delay).
 */

export interface PulseOscillator {
  prop: string;
  a: number;
  b: number;
  period: number;
  delay: number;
  unit: string;
}

export interface PulseDriverConfig {
  oscillators: PulseOscillator[];
  hue: { prop: string, range: number, period: number, continuous: boolean } | null;
}

interface PulseEntry {
  el: HTMLElement;
  config: PulseDriverConfig;
}

const activeSet = new Set<PulseEntry>();

let frameHandle: number | null = null;
let lastTick = 0;

// ~30 fps. Subtract a small slack so a tick that lands a hair early still runs.
const MIN_TICK_GAP = 1000 / 30 - 2;
const TAU = Math.PI * 2;

/** Cosine ease-in-out factor in [0, 1]: 0 at phase 0/1, 1 at phase 0.5. */
function easeCycle(phase: number): number {
  return (1 - Math.cos(TAU * phase)) / 2;
}

function tick(ts: number) {
  frameHandle = requestAnimationFrame(tick);
  if (ts - lastTick < MIN_TICK_GAP) return;
  lastTick = ts;

  const tSec = ts / 1000;

  activeSet.forEach(({ el, config }) => {
    for (const osc of config.oscillators) {
      // Match CSS animation-delay semantics: a positive delay starts later.
      const phase = (tSec - osc.delay) / osc.period;
      const value = osc.a + (osc.b - osc.a) * easeCycle(phase);
      el.style.setProperty(
        osc.prop,
        osc.unit === 'px' ? `${value.toFixed(2)}px` : value.toFixed(4)
      );
    }

    if (config.hue) {
      const { prop, range, period, continuous } = config.hue;
      // `continuous` rotates a full circle (0→range, looping) so every color
      // sweeps through every edge; otherwise drift between -range and +range.
      const value = continuous
        ? ((tSec / period) % 1) * range
        : -range + 2 * range * easeCycle(tSec / period);
      el.style.setProperty(prop, `${value.toFixed(2)}deg`);
    }
  });
}

function ensureLoop() {
  if (frameHandle == null) {
    lastTick = 0;
    frameHandle = requestAnimationFrame(tick);
  }
}

function haltIfEmpty() {
  if (activeSet.size === 0 && frameHandle != null) {
    cancelAnimationFrame(frameHandle);
    frameHandle = null;
  }
}

/**
 * Register an element to be driven by the shared pulse loop.
 *
 * @param config - config from buildPulseConfig() in styles.js
 * @returns cleanup function that unregisters the entry (and
 *          stops the shared loop once no entries remain).
 */
export function attachPulse(el: HTMLElement, config: PulseDriverConfig): () => void {
  const entry = { el, config };
  activeSet.add(entry);
  ensureLoop();
  return () => {
    activeSet.delete(entry);
    haltIfEmpty();
  };
}
