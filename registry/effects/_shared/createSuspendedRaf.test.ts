/// <reference types="node" />
/**
 * Regression checks for F-042 createSuspendedRaf (Task 0).
 *
 * Run: node --test registry/effects/_shared/createSuspendedRaf.test.js
 */

import { mock, test } from "node:test";
import assert from "node:assert/strict";
import { createSuspendedRaf } from "./createSuspendedRaf.js";

interface DocumentMock {
  hidden: boolean;
  addEventListener(type: string, handler: (...args: any[]) => void): void;
  removeEventListener(type: string, handler: (...args: any[]) => void): void;
  dispatch(type: string): void;
}

function installBrowserMocks({ hidden = false } = {}) {
  const listeners = new Map<string, Set<(...args: any[]) => void>>();

  const documentMock: DocumentMock = {
    hidden,
    addEventListener(type, handler) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type)!.add(handler);
    },
    removeEventListener(type, handler) {
      listeners.get(type)?.delete(handler);
    },
    dispatch(type) {
      for (const handler of listeners.get(type) ?? []) handler();
    },
  };

  let rafSeq = 0;
  const rafCallbacks = new Map<number, (time: number) => void>();

  const requestAnimationFrame = mock.fn((cb: (time: number) => void) => {
    const id = ++rafSeq;
    rafCallbacks.set(id, cb);
    return id;
  });

  const cancelAnimationFrame = mock.fn((id: number) => {
    rafCallbacks.delete(id);
  });

  (globalThis as any).document = documentMock;
  (globalThis as any).requestAnimationFrame = requestAnimationFrame;
  (globalThis as any).cancelAnimationFrame = cancelAnimationFrame;
  // No IntersectionObserver → offscreen guard no-ops; tab visibility still works.
  delete (globalThis as any).IntersectionObserver;

  return {
    documentMock,
    requestAnimationFrame,
    cancelAnimationFrame,
    flushOneFrame(time = 16) {
      const entries = [...rafCallbacks.entries()];
      rafCallbacks.clear();
      for (const [, cb] of entries) cb(time);
    },
    pendingFrames() {
      return rafCallbacks.size;
    },
  };
}

test("createSuspendedRaf stops scheduling frames when document.hidden becomes true", () => {
  const env = installBrowserMocks({ hidden: false });
  let frames = 0;

  const loop = createSuspendedRaf({
    onFrame: () => {
      frames += 1;
    },
  });

  loop.start();
  assert.equal(env.pendingFrames(), 1, "start should schedule one frame");

  env.flushOneFrame();
  assert.equal(frames, 1);
  assert.equal(env.pendingFrames(), 1, "active loop should reschedule");

  env.documentMock.hidden = true;
  env.documentMock.dispatch("visibilitychange");

  assert.equal(env.pendingFrames(), 0, "hidden tab must cancel pending rAF");
  assert.equal(loop.isActive, false);

  env.flushOneFrame();
  assert.equal(frames, 1, "no frames should run while hidden");

  env.documentMock.hidden = false;
  env.documentMock.dispatch("visibilitychange");

  assert.equal(loop.isActive, true);
  assert.equal(env.pendingFrames(), 1, "visible tab should resume scheduling");

  env.flushOneFrame();
  assert.equal(frames, 2);

  loop.destroy();
  assert.equal(env.pendingFrames(), 0);
});

test("createSuspendedRaf stop() prevents further frames until start()", () => {
  const env = installBrowserMocks({ hidden: false });
  let frames = 0;

  const loop = createSuspendedRaf({
    onFrame: () => {
      frames += 1;
    },
  });

  loop.start();
  env.flushOneFrame();
  assert.equal(frames, 1);

  loop.stop();
  assert.equal(env.pendingFrames(), 0);

  env.documentMock.hidden = true;
  env.documentMock.dispatch("visibilitychange");
  env.documentMock.hidden = false;
  env.documentMock.dispatch("visibilitychange");
  assert.equal(env.pendingFrames(), 0, "stopped loop must not auto-restart");

  loop.start();
  assert.equal(env.pendingFrames(), 1);

  loop.destroy();
});
