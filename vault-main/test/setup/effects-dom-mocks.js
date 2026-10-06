// Shared jsdom stubs for the registry-effects render harness. Guarded on
// `window` so this file is a no-op when vitest loads it under the default
// "node" environment (existing non-DOM tests import this same setupFiles list).
if (typeof window !== "undefined") {
  // jsdom doesn't implement 2D canvas drawing (that needs the native `canvas`
  // package) or WebGL at all - this stub is just enough surface area for
  // canvas-drawing effects to run their draw loop once without throwing.
  // Real rendering correctness isn't the goal; see effect-harness.js for how
  // this interacts with the webgl-category effects, which are skipped here.
  const noop = () => {};
  function make2dContextStub() {
    return new Proxy(
      {
        canvas: null,
        measureText: () => ({ width: 0 }),
        createLinearGradient: () => ({ addColorStop: noop }),
        createRadialGradient: () => ({ addColorStop: noop }),
        createPattern: () => null,
        getImageData: (_x, _y, w, h) => ({
          data: new Uint8ClampedArray(Math.max(w, 0) * Math.max(h, 0) * 4),
          width: w,
          height: h,
        }),
        putImageData: noop,
        createImageData: (w, h) => ({
          data: new Uint8ClampedArray(Math.max(w, 0) * Math.max(h, 0) * 4),
          width: w,
          height: h,
        }),
      },
      {
        get(target, prop) {
          if (prop in target) return target[prop];
          if (prop === "canvas") return target.canvas;
          return noop;
        },
        set(target, prop, value) {
          target[prop] = value;
          return true;
        },
      }
    );
  }

  const originalGetContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, ...args) {
    if (type === "2d") return make2dContextStub();
    // webgl/webgl2/experimental-webgl deliberately fall through to jsdom's
    // real (null) behavior - there's no GPU here, and faking one risks
    // masking real bugs. See effect-harness.js for how webgl effects are handled.
    return originalGetContext ? originalGetContext.call(this, type, ...args) : null;
  };

  if (typeof window.ResizeObserver === "undefined") {
    window.ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }

  if (typeof window.IntersectionObserver === "undefined") {
    window.IntersectionObserver = class IntersectionObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return [];
      }
    };
  }

  // jsdom has no Font Loading API - `document.fonts` is undefined, which
  // several text effects hit via `await document.fonts.ready` in a mount
  // effect. Left unstubbed, that throws asynchronously *after* its own test
  // has already finished, and the unhandled rejection was observed corrupting
  // whichever effect's dynamic import happened to be in flight next.
  if (typeof document.fonts === "undefined") {
    Object.defineProperty(document, "fonts", {
      value: {
        ready: Promise.resolve(),
        addEventListener: noop,
        removeEventListener: noop,
        check: () => true,
      },
      configurable: true,
    });
  }

  if (typeof window.OffscreenCanvas === "undefined") {
    window.OffscreenCanvas = class OffscreenCanvas {
      constructor(width, height) {
        this.width = width;
        this.height = height;
      }
      getContext(type) {
        return type === "2d" ? make2dContextStub() : null;
      }
    };
  }

  // jsdom doesn't define SVGPathElement as a distinct constructor at all (no
  // SVG geometry support), so path refs used by scroll-driven SVG mask/draw
  // effects are missing these methods outright - patched onto Element itself
  // since there's no path-specific prototype to target.
  if (!Element.prototype.getTotalLength) {
    Element.prototype.getTotalLength = () => 100;
    Element.prototype.getPointAtLength = () => ({ x: 0, y: 0 });
  }

  // jsdom's default viewport (1024x768) lands exactly on several effects'
  // own "is this mobile?" breakpoint (e.g. `innerWidth < 1025`), making them
  // correctly render null - accurate for that width, but not the desktop
  // preview these effects are actually built for. Widened so the render
  // contract reflects a normal desktop viewing of the component library.
  Object.defineProperty(window, "innerWidth", { value: 1920, configurable: true });
  Object.defineProperty(window, "innerHeight", { value: 1080, configurable: true });

  if (typeof window.matchMedia === "undefined") {
    window.matchMedia = (query) => ({
      matches: false,
      media: query,
      addEventListener: noop,
      removeEventListener: noop,
      addListener: noop,
      removeListener: noop,
      dispatchEvent: () => false,
    });
  }
}
