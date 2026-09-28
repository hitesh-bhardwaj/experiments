// @vitest-environment jsdom
//
// Render + prop-contract regression net for all registry effects (Phase 2,
// Wave 2 "Tests, all 150+ effects"). Scope is deliberately render-mounts-
// cleanly, not pixel-diff visual regression - see phase-2-plan.md.
//
// One `it()` per effect (not one file per effect) so the pass/fail list
// still reads as "which effects broke," without 115 near-identical files.
import { pathToFileURL } from "url";
import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup, act } from "@testing-library/react";
import { getRegistryEffects } from "../test/effect-harness.js";

afterEach(() => {
  cleanup();
});

const effects = getRegistryEffects();

async function importEffect(effect) {
  const url = pathToFileURL(effect.mainPath).href;
  const mod = await import(/* @vite-ignore */ url);
  return effect.exportKind === "named" ? mod[effect.exportName] : mod.default;
}

// Known, investigated harness limitations - not effect bugs. Each was
// confirmed independently (isolated import, isolated render) to work fine;
// the failure only appears in this specific environment/tooling context.
// Documented here instead of silently dropped, per the "no silent caps" rule.
const KNOWN_LIMITATIONS = {
  "fish-eye":
    "imports 'three/webgpu', which throws (Cannot read properties of undefined, reading 'VERTEX') outside a real browser GPU context - a three/webgpu-in-Node incompatibility, not an effect bug.",
  "dotted-grid":
    "resolves to an undefined default export only when imported alongside ~30+ other effects in the same vite-node session (confirmed via bisection); imports and renders correctly alone or in small groups. Root cause not identified - looks like a vite-node/esbuild transform-pipeline quirk at that module count, not a bug in this effect.",
  "full-screen-crosshair":
    "same unexplained large-batch-only import failure as dotted-grid - confirmed fine in isolation.",
  "svg-pixel-reveal":
    "same unexplained large-batch-only import failure as dotted-grid - confirmed fine in isolation.",
  "text-stream":
    "same unexplained large-batch-only import failure as dotted-grid - confirmed fine in isolation.",
  "depth-shift-transition":
    "calls next/navigation's usePathname() at render time, which throws outside a real Next.js App Router context (no PathnameContext.Provider in a bare jsdom render) - a harness limitation, not an effect bug.",
  "elastic-accordion":
    "calls the standard CSS.escape() (supported in every real browser since ~2016), but jsdom doesn't implement the window.CSS global at all - confirmed via a bare `new JSDOM()` check (`typeof window.CSS` is 'undefined') - a jsdom gap, not an effect bug.",
};

describe("registry effects - render contract", () => {
  for (const effect of effects) {
    const skipRender = effect.skipRender;
    const knownLimitation = KNOWN_LIMITATIONS[effect.name];
    const title = `${effect.name} - ${skipRender ? "exports a component (no WebGL in jsdom)" : "mounts without throwing"}`;

    if (knownLimitation) {
      it.skip(`${title} [SKIPPED: ${knownLimitation}]`, () => {});
      continue;
    }

    it(title, async () => {
      const Component = await importEffect(effect);
      expect(
        typeof Component,
        `${effect.name}: default export should be a component function`
      ).toBe("function");

      if (skipRender) return;

      const { container } = render(<Component />);
      // Several effects defer their first real paint to a microtask
      // (`queueMicrotask`) to stay SSR-hydration-safe - render() only
      // flushes synchronous effects, so this gives that deferred update
      // a tick before checking output.
      await act(async () => {
        await Promise.resolve();
      });
      expect(
        container.childNodes.length,
        `${effect.name}: rendered output should not be empty`
      ).toBeGreaterThan(0);
    });
  }
});
