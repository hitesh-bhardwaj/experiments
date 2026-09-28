# Shared effect utilities

Canonical source for helpers that get **copied into individual effect packages**
during rollout. Registry effects install one package at a time, so consumers
cannot import from this `_shared/` folder.

Full task write-up: [`F-042.md`](./F-042.md)

## `createSuspendedRaf.js` (F-042 - Task 0)

Pauses continuous `requestAnimationFrame` work when:

1. the tab is hidden (`visibilitychange` / `document.hidden`)
2. the effect root is offscreen (`IntersectionObserver`, same idea as `border-beam`)

### Adopt in an effect (Tasks 1–4)

1. Copy `createSuspendedRaf.js` next to the effect entry (e.g. `webgl/foo/createSuspendedRaf.js`).
2. Add it to that effect’s `registry.json` `files` list.
3. Replace the raw rAF loop:

```js
import { createSuspendedRaf } from "./createSuspendedRaf";

// inside useEffect, after the root/canvas exists:
const loop = createSuspendedRaf({
  root: containerRef.current, // or canvas
  onFrame: (time) => {
    // previous frame() body (without scheduling the next rAF)
  },
});

loop.start();

return () => loop.destroy();
```

For engines that already own their rAF (Three.js, custom clocks), use the gate only:

```js
import { createVisibilityGate } from "./createSuspendedRaf";

const gate = createVisibilityGate({
  root: containerRef.current,
  onChange: (active) => {
    if (active) startEngine();
    else stopEngine();
  },
});

return () => gate.destroy();
```

### Status

- **Task 0:** utility + tests - done  
- **Task 1 (webgl):** rolled out to all `registry/effects/webgl/**` packages - done  
- **Task 2 (cursor):** continuous rAF cursor packages - done  
- **Task 3 (backgrounds):** dither-canvas, spider-particles, dotted-grid - done  
- **Task 4 (scroll):** continuous rAF scroll packages - done  
- **Task 5:** docs sync (`apps/docs/src/components/**`) - done  
