// Adapted from the horizontalLoop technique used in
// src/components/templates/lumera/VaultComp/InfiniteCarousel/SmoothInfiniteCarousel.tsx
// (itself GSAP's well-known seamless-infinite-loop helper). Builds a
// paused, repeat:-1 GSAP timeline that cycles `items` through xPercent
// positions so the loop wraps seamlessly with only ONE copy of each item
// in the DOM - no manual array tripling or scroll-position modulo needed.
// The caller decides whether/how it plays (continuous autoplay, drag,
// nav buttons); this function only builds the mechanism.

import gsap from "gsap";

export function horizontalLoop(items, config = {}) {
  items[0].getBoundingClientRect();

  const tl = gsap.timeline({
    repeat: config.repeat,
    paused: true,
    defaults: { ease: "none" },
    onReverseComplete: () => tl.totalTime(tl.rawTime() + tl.duration() * 100),
  });

  const length = items.length;
  const startX = items[0].offsetLeft;
  const times = [];
  const widths = [];
  const xPercents = [];
  let curIndex = 0;

  const pixelsPerSecond = 100 * Math.max(config.speed ?? 1, 0.01);
  const snap = config.snap === false ? (v) => v : gsap.utils.snap(config.snap || 1);

  const populateWidths = () =>
    items.forEach((el, i) => {
      widths[i] = parseFloat(gsap.getProperty(el, "width", "px"));
      xPercents[i] = snap(
        (parseFloat(gsap.getProperty(el, "x", "px")) / widths[i]) * 100 +
          gsap.getProperty(el, "xPercent")
      );
    });

  const getTotalWidth = () =>
    items[length - 1].offsetLeft +
    (xPercents[length - 1] / 100) * widths[length - 1] -
    startX +
    items[length - 1].offsetWidth * gsap.getProperty(items[length - 1], "scaleX") +
    (parseFloat(config.paddingRight) || 0);

  populateWidths();
  if (!widths[0]) return null;

  gsap.set(items, { xPercent: (i) => xPercents[i] });
  gsap.set(items, { x: 0 });

  const totalWidth = getTotalWidth();

  for (let i = 0; i < length; i++) {
    const item = items[i];
    const curX = (xPercents[i] / 100) * widths[i];
    const distanceToStart = item.offsetLeft + curX - startX;
    const distanceToLoop = distanceToStart + widths[i] * gsap.getProperty(item, "scaleX");

    tl.to(
      item,
      {
        xPercent: snap(((curX - distanceToLoop) / widths[i]) * 100),
        duration: distanceToLoop / pixelsPerSecond,
      },
      0
    )
      .fromTo(
        item,
        { xPercent: snap(((curX - distanceToLoop + totalWidth) / widths[i]) * 100) },
        {
          xPercent: xPercents[i],
          duration: (curX - distanceToLoop + totalWidth - curX) / pixelsPerSecond,
          immediateRender: false,
        },
        distanceToLoop / pixelsPerSecond
      )
      .add("label" + i, distanceToStart / pixelsPerSecond);

    times[i] = distanceToStart / pixelsPerSecond;
  }

  function toIndex(index, vars = {}) {
    tl.stopDragTick?.();

    if (Math.abs(index - curIndex) > length / 2) {
      index += index > curIndex ? -length : length;
    }

    const newIndex = gsap.utils.wrap(0, length, index);
    let time = times[newIndex];

    if (time > tl.time() !== index > curIndex) {
      vars.modifiers = { time: gsap.utils.wrap(0, tl.duration()) };
      time += tl.duration() * (index > curIndex ? 1 : -1);
    }

    curIndex = newIndex;
    config.onIndexChange?.(newIndex);
    vars.overwrite = true;
    return tl.tweenTo(time, vars);
  }

  tl.next = (vars) => toIndex(curIndex + 1, vars);
  tl.previous = (vars) => toIndex(curIndex - 1, vars);
  tl.current = () => curIndex;
  tl.toIndex = (index, vars) => toIndex(index, vars);
  tl.updateIndex = () => {
    curIndex = gsap.utils.wrap(0, length, Math.round(tl.progress() * length));
    config.onIndexChange?.(curIndex);
  };
  tl.times = times;

  tl.progress(1, true).progress(0, true);

  if (config.reversed) {
    tl.vars.onReverseComplete();
    tl.reverse();
  }

  if (config.draggable && config.wrapperEl) {
    const wrap = gsap.utils.wrap(0, 1);
    const wrapperEl = config.wrapperEl;

    let ratio = 0;
    let target = 0;
    let current = 0;
    let dragSnap = 0;
    let lastTime = 0;
    let frameId = 0;
    let isPointerDown = false;
    let pointerId = null;
    let startClientX = 0;
    let startTarget = 0;
    let settleTimer = 0;
    let lastMoveX = 0;
    let lastMoveTime = 0;
    let velocity = 0; // progress/sec, smoothed - used to fling on release
    let momentumActive = false;
    let momentumVelocity = 0;

    // Exact 1:1 tracking while the pointer is held (no lag/rubber-band -
    // damping a live drag reads as sticky/rubbery, not smooth). Easing only
    // applies after release, for the momentum coast and final snap.
    const RELEASE_SMOOTHING = 16;
    // Post-release momentum: velocity decays exponentially (friction) each
    // frame instead of the drag just stopping dead where the pointer let go.
    const FRICTION = 3.2;
    const MIN_FLING_VELOCITY = 0.04;
    const MAX_FLING_VELOCITY = 2.5;

    const damp = (cur, tgt, smoothing, deltaTime) =>
      cur + (tgt - cur) * (1 - Math.exp(-smoothing * deltaTime));

    const ensureRatio = () => {
      if (ratio) return;
      populateWidths();
      const totalWidthCache = getTotalWidth();
      ratio = 1 / totalWidthCache;
      dragSnap = totalWidthCache / length;
    };

    const syncIndex = () => tl.updateIndex();

    const snapTargetToNearest = () => {
      ensureRatio();
      const totalWidthCache = 1 / ratio;
      const px = target * totalWidthCache;
      target = (Math.round(px / dragSnap) * dragSnap) / totalWidthCache;
    };

    const tick = () => {
      const now = performance.now();
      const deltaTime = lastTime ? Math.min((now - lastTime) / 1000, 0.05) : 0.016;
      lastTime = now;

      if (momentumActive) {
        current += momentumVelocity * deltaTime;
        momentumVelocity *= Math.exp(-FRICTION * deltaTime);
        target = current;
        tl.progress(wrap(current));
        syncIndex();

        if (Math.abs(momentumVelocity) < MIN_FLING_VELOCITY) {
          momentumActive = false;
          momentumVelocity = 0;
          snapTargetToNearest();
        } else {
          frameId = requestAnimationFrame(tick);
          return;
        }
      }

      current =
        config.reduceMotion || isPointerDown
          ? target
          : damp(current, target, RELEASE_SMOOTHING, deltaTime);

      tl.progress(wrap(current));
      syncIndex();

      if (!isPointerDown && !momentumActive && Math.abs(current - target) < 0.0002) {
        current = target;
        tl.progress(wrap(current));
        syncIndex();
        frameId = 0;
        lastTime = 0;
        return;
      }

      frameId = requestAnimationFrame(tick);
    };

    const ensureTicking = () => {
      if (!frameId) frameId = requestAnimationFrame(tick);
    };

    tl.stopDragTick = () => {
      window.clearTimeout(settleTimer);
      momentumActive = false;
      momentumVelocity = 0;
      if (frameId) {
        cancelAnimationFrame(frameId);
        frameId = 0;
        lastTime = 0;
      }
    };

    tl.scrubBy = (deltaPixels) => {
      ensureRatio();
      current = target = tl.progress();
      target += deltaPixels * ratio;
      ensureTicking();
    };
    tl.snapToNearest = () => {
      ensureRatio();
      current = target = tl.progress();
      snapTargetToNearest();
      ensureTicking();
    };

    let hasCaptured = false;

    const onPointerDown = (event) => {
      ensureRatio();
      tl.stopDragTick();
      isPointerDown = true;
      hasCaptured = false;
      velocity = 0;
      pointerId = event.pointerId;
      startClientX = event.clientX;
      current = target = tl.progress();
      startTarget = target;
      window.clearTimeout(settleTimer);
      // Not capturing here: capturing on every pointerdown (including a
      // plain click with no movement) makes Chromium retarget the
      // resulting click event to this capturing element instead of
      // whatever was actually under the cursor (e.g. a card's <a> link),
      // silently breaking click-through navigation for draggable items
      // that are also links. Only captured once an actual drag is
      // confirmed, in onPointerMove below.
    };

    const onPointerMove = (event) => {
      if (!isPointerDown || event.pointerId !== pointerId) return;
      const deltaX = event.clientX - startClientX;

      if (!hasCaptured) {
        if (Math.abs(deltaX) < 5) return;
        hasCaptured = true;
        wrapperEl.setPointerCapture(pointerId);
        // Velocity sampling starts once the drag is confirmed, not on
        // every micro-jitter before the threshold - keeps the release
        // fling based on actual drag motion rather than click noise.
        lastMoveX = event.clientX;
        lastMoveTime = performance.now();
      }

      const now = performance.now();
      const dt = (now - lastMoveTime) / 1000;
      if (dt > 0.001) {
        const instVelocity = (-(event.clientX - lastMoveX) * ratio) / dt;
        velocity = velocity * 0.75 + instVelocity * 0.25;
      }
      lastMoveX = event.clientX;
      lastMoveTime = now;

      event.preventDefault();
      target = startTarget - deltaX * ratio;
      ensureTicking();
    };

    const onPointerUp = (event) => {
      if (!isPointerDown || event.pointerId !== pointerId) return;
      isPointerDown = false;
      pointerId = null;
      wrapperEl.releasePointerCapture(event.pointerId);
      const stillHovered = config.pauseOnHover && config.isHoveredRef?.current;
      window.clearTimeout(settleTimer);

      if (config.reduceMotion || stillHovered) {
        current = target;
        snapTargetToNearest();
        ensureTicking();
        return;
      }

      if (hasCaptured && Math.abs(velocity) > MIN_FLING_VELOCITY) {
        momentumActive = true;
        momentumVelocity = gsap.utils.clamp(-MAX_FLING_VELOCITY, MAX_FLING_VELOCITY, velocity);
        ensureTicking();
        return;
      }

      settleTimer = window.setTimeout(() => {
        snapTargetToNearest();
        ensureTicking();
      }, 80);
    };

    wrapperEl.addEventListener("pointerdown", onPointerDown);
    wrapperEl.addEventListener("pointermove", onPointerMove);
    wrapperEl.addEventListener("pointerup", onPointerUp);
    wrapperEl.addEventListener("pointercancel", onPointerUp);

    tl.draggable = {
      kill: () => {
        wrapperEl.removeEventListener("pointerdown", onPointerDown);
        wrapperEl.removeEventListener("pointermove", onPointerMove);
        wrapperEl.removeEventListener("pointerup", onPointerUp);
        wrapperEl.removeEventListener("pointercancel", onPointerUp);
        tl.stopDragTick();
      },
    };
  }

  return tl;
}
