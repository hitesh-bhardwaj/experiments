// Built using Hyperiux Vault: https://vault.hyperiux.com

const EVT_ID = "virtualscroll";

const keyCodes = {
  LEFT: 37,
  UP: 38,
  RIGHT: 39,
  DOWN: 40,
  SPACE: 32,
};

interface Support {
  hasWheelEvent: boolean;
  hasMouseWheelEvent: boolean;
  hasTouch: boolean;
  hasTouchWin: boolean;
  hasPointer: boolean;
  hasKeyDown: boolean;
  isFirefox: boolean;
}

function getSupport(): Support {
  const nav = navigator as Navigator & {
    msMaxTouchPoints?: number;
    msPointerEnabled?: boolean;
  };

  return {
    hasWheelEvent: "onwheel" in document,
    hasMouseWheelEvent: "onmousewheel" in document,
    hasTouch: "ontouchstart" in document,
    hasTouchWin: !!nav.msMaxTouchPoints && nav.msMaxTouchPoints > 1,
    hasPointer: !!nav.msPointerEnabled,
    hasKeyDown: "onkeydown" in document,
    isFirefox: navigator.userAgent.indexOf("Firefox") > -1,
  };
}

let support: Support | undefined;

type LegacyStyle = CSSStyleDeclaration & { msTouchAction: string };

function legacyBodyStyle(): LegacyStyle {
  return document.body.style as LegacyStyle;
}

type EmitterHandler = (payload: VirtualScrollEvent) => void;

interface EmitterEntry {
  fn: EmitterHandler;
  ctx: unknown;
}

class Emitter {
  e: Record<string, EmitterEntry[]> = {};

  on(name: string, callback: EmitterHandler, ctx?: unknown) {
    (this.e[name] || (this.e[name] = [])).push({ fn: callback, ctx });
    return this;
  }

  emit(name: string, payload: VirtualScrollEvent) {
    const entries = (this.e[name] || []).slice();
    for (const entry of entries) entry.fn.call(entry.ctx, payload);
    return this;
  }

  off(name?: string, callback?: EmitterHandler) {
    if (name === undefined) {
      this.e = {};
      return this;
    }

    const entries = this.e[name];
    const kept: EmitterEntry[] = [];

    if (entries && callback) {
      for (const entry of entries) {
        if (entry.fn !== callback) kept.push(entry);
      }
    }

    if (kept.length) this.e[name] = kept;
    else delete this.e[name];

    return this;
  }
}

export interface VirtualScrollEvent {
  x: number;
  y: number;
  deltaX: number;
  deltaY: number;
  originalEvent: Event;
  touchDevice?: boolean;
}

export interface VirtualScrollOptions {
  el?: EventTarget;
  mouseMultiplier?: number;
  touchMultiplier?: number;
  firefoxMultiplier?: number;
  keyStep?: number;
  preventTouch?: boolean;
  unpreventTouchClass?: string;
  useKeyboard?: boolean;
  useTouch?: boolean;
  passive?: boolean;
}

type ResolvedOptions = Required<Omit<VirtualScrollOptions, "el" | "passive">> & {
  passive?: boolean;
};

export default class VirtualScroll {
  #options: ResolvedOptions;
  #el: EventTarget;
  #emitter: Emitter;
  #event: VirtualScrollEvent;
  #touchStart: { x: number; y: number };
  #bodyTouchAction: string | null;

  listenerOptions?: AddEventListenerOptions;

  constructor(options?: VirtualScrollOptions) {
    this.#el = window;
    if (options && options.el) {
      this.#el = options.el;
      delete options.el;
    }

    if (!support) support = getSupport();

    this.#options = Object.assign(
      {
        mouseMultiplier: 1,
        touchMultiplier: 2,
        firefoxMultiplier: 15,
        keyStep: 120,
        preventTouch: false,
        unpreventTouchClass: "vs-touchmove-allowed",
        useKeyboard: true,
        useTouch: true,
      },
      options,
    );

    this.#emitter = new Emitter();
    this.#event = { y: 0, x: 0, deltaX: 0, deltaY: 0, originalEvent: new Event(EVT_ID) };
    this.#touchStart = { x: 0, y: 0 };
    this.#bodyTouchAction = null;

    if (this.#options.passive !== undefined) {
      this.listenerOptions = { passive: this.#options.passive };
    }
  }

  _notify(e: Event) {
    const evt = this.#event;
    evt.x += evt.deltaX;
    evt.y += evt.deltaY;

    this.#emitter.emit(EVT_ID, {
      x: evt.x,
      y: evt.y,
      deltaX: evt.deltaX,
      deltaY: evt.deltaY,
      originalEvent: e,
    });
  }

  _onWheel = (e: WheelEvent) => {
    const options = this.#options;
    const evt = this.#event;
    const legacy = e as WheelEvent & {
      wheelDeltaX?: number;
      wheelDeltaY?: number;
    };

    evt.deltaX = legacy.wheelDeltaX || e.deltaX * -1;
    evt.deltaY = legacy.wheelDeltaY || e.deltaY * -1;

    if (support!.isFirefox && e.deltaMode === 1) {
      evt.deltaX *= options.firefoxMultiplier;
      evt.deltaY *= options.firefoxMultiplier;
    }

    evt.deltaX *= options.mouseMultiplier;
    evt.deltaY *= options.mouseMultiplier;

    this._notify(e);
  };

  _onMouseWheel = (e: Event) => {
    const evt = this.#event;
    const legacy = e as Event & {
      wheelDeltaX?: number;
      wheelDeltaY?: number;
      wheelDelta?: number;
    };

    evt.deltaX = legacy.wheelDeltaX ? legacy.wheelDeltaX : 0;
    evt.deltaY = legacy.wheelDeltaY ? legacy.wheelDeltaY : (legacy.wheelDelta ?? 0);

    this._notify(e);
  };

  _onTouchStart = (e: TouchEvent) => {
    const t = e.targetTouches ? e.targetTouches[0] : (e as unknown as Touch);
    this.#touchStart.x = t.pageX;
    this.#touchStart.y = t.pageY;
  };

  _onTouchMove = (e: TouchEvent) => {
    const options = this.#options;
    if (
      options.preventTouch &&
      !(e.target as Element).classList.contains(options.unpreventTouchClass)
    ) {
      e.preventDefault();
    }

    const evt = this.#event;
    const t = e.targetTouches ? e.targetTouches[0] : (e as unknown as Touch);

    evt.deltaX = (t.pageX - this.#touchStart.x) * options.touchMultiplier;
    evt.deltaY = (t.pageY - this.#touchStart.y) * options.touchMultiplier;

    this.#touchStart.x = t.pageX;
    this.#touchStart.y = t.pageY;

    this._notify(e);
  };

  _onKeyDown = (e: KeyboardEvent) => {
    const evt = this.#event;
    evt.deltaX = evt.deltaY = 0;
    const windowHeight = window.innerHeight - 40;

    switch (e.keyCode) {
      case keyCodes.LEFT:
      case keyCodes.UP:
        evt.deltaY = this.#options.keyStep;
        break;
      case keyCodes.RIGHT:
      case keyCodes.DOWN:
        evt.deltaY = -this.#options.keyStep;
        break;
      case keyCodes.SPACE:
        evt.deltaY = windowHeight * (e.shiftKey ? 1 : -1);
        break;
      default:
        return;
    }

    this._notify(e);
  };

  _bind() {
    if (support!.hasWheelEvent) {
      this.#el.addEventListener(
        "wheel",
        this._onWheel as EventListener,
        this.listenerOptions,
      );
    }

    if (support!.hasMouseWheelEvent) {
      this.#el.addEventListener(
        "mousewheel",
        this._onMouseWheel as EventListener,
        this.listenerOptions,
      );
    }

    if (support!.hasTouch && this.#options.useTouch) {
      this.#el.addEventListener(
        "touchstart",
        this._onTouchStart as EventListener,
        this.listenerOptions,
      );
      this.#el.addEventListener(
        "touchmove",
        this._onTouchMove as EventListener,
        this.listenerOptions,
      );
    }

    if (support!.hasPointer && support!.hasTouchWin) {
      this.#bodyTouchAction = legacyBodyStyle().msTouchAction;
      legacyBodyStyle().msTouchAction = "none";
      this.#el.addEventListener(
        "MSPointerDown",
        this._onTouchStart as EventListener,
        true,
      );
      this.#el.addEventListener(
        "MSPointerMove",
        this._onTouchMove as EventListener,
        true,
      );
    }

    if (support!.hasKeyDown && this.#options.useKeyboard) {
      document.addEventListener("keydown", this._onKeyDown);
    }
  }

  _unbind() {
    if (support!.hasWheelEvent) {
      this.#el.removeEventListener("wheel", this._onWheel as EventListener);
    }

    if (support!.hasMouseWheelEvent) {
      this.#el.removeEventListener(
        "mousewheel",
        this._onMouseWheel as EventListener,
      );
    }

    if (support!.hasTouch) {
      this.#el.removeEventListener(
        "touchstart",
        this._onTouchStart as EventListener,
      );
      this.#el.removeEventListener(
        "touchmove",
        this._onTouchMove as EventListener,
      );
    }

    if (support!.hasPointer && support!.hasTouchWin) {
      legacyBodyStyle().msTouchAction = this.#bodyTouchAction ?? "";
      this.#el.removeEventListener(
        "MSPointerDown",
        this._onTouchStart as EventListener,
        true,
      );
      this.#el.removeEventListener(
        "MSPointerMove",
        this._onTouchMove as EventListener,
        true,
      );
    }

    if (support!.hasKeyDown && this.#options.useKeyboard) {
      document.removeEventListener("keydown", this._onKeyDown);
    }
  }

  on(cb: EmitterHandler, ctx?: unknown) {
    this.#emitter.on(EVT_ID, cb, ctx);

    const events = this.#emitter.e;
    if (events && events[EVT_ID] && events[EVT_ID].length === 1) this._bind();
  }

  off(cb: EmitterHandler, ctx?: unknown) {
    this.#emitter.off(EVT_ID, cb);
    void ctx;

    const events = this.#emitter.e;
    if (!events[EVT_ID] || events[EVT_ID].length <= 0) this._unbind();
  }

  destroy() {
    this.#emitter.off();
    this._unbind();
  }
}
