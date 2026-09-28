"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/dist/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { prefersReducedMotion } from "@/lib/motion";
import { shouldSkipRealtimeGPU } from "@/lib/audit";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, useGSAP);
}

/**
 * Raw WebGL rather than three/r3f: this is one fullscreen fragment shader with
 * four uniforms, so a renderer would only add weight to the homepage bundle.
 */
const VERTEX_SHADER = /* glsl */ `
attribute vec2 aPosition;

void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

const FRAGMENT_SHADER = /* glsl */ `
precision highp float;

uniform vec2  uResolution;
uniform float uTime;
/** 0 when the section enters the viewport, 1 when it leaves the top. */
uniform float uProgress;
/** Smoothed scroll velocity, roughly -1..1. Drives the extra deformation. */
uniform float uDeform;
/** 1.0 = fade edges into BG, 0.0 = no edge fade. */
uniform float uEdgeFade;
/** Canvas height / visible height. 1.0 = canvas is exactly the viewport. */
uniform float uOverscan;
uniform float uPixelSize;
uniform float uColorNum;
uniform float uDither;
/** 1.0 = current bend. Lower = flatter band. 0 = no curve. */
uniform float uCurve;

const vec3 BG      = vec3(0.0196);                // #050505 – page background
const vec3 PRIMARY = vec3(1.0, 0.373, 0.0);       // #ff5f00 – primary brand color

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float bayer2(vec2 a) {
  vec2 b = floor(a);
  return fract(dot(b, vec2(0.5, 0.25)));
}

float bayer4(vec2 a) {
  return bayer2(a * 0.5) * 0.25 + bayer2(a);
}

float bayer8(vec2 a) {
  return bayer4(a * 0.5) * 0.25 + bayer2(a);
}

vec3 applyDither(vec2 fragCoord, vec3 color, float pixelSize, float colorNum) {
  if (pixelSize <= 0.0) return color;
  vec2 scaledCoord = floor(fragCoord / pixelSize);
  float threshold = bayer8(scaledCoord) - 0.5;
  if (colorNum > 1.0) {
    float stepSize = 1.0 / (colorNum - 1.0);
    color += threshold * stepSize * 0.85;
    color = clamp(color - 0.05, 0.0, 1.0);
    color = floor(color * (colorNum - 1.0) + 0.5) / (colorNum - 1.0);
  } else {
    color += threshold * 0.1;
    color = clamp(color, 0.0, 1.0);
  }
  return color;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution;

  // The canvas can be taller than the window it sits in, so the band's tails
  // run off-screen instead of stopping at the canvas edge. Everything below is
  // framed to that visible window: arc, travel and width stay identical at any
  // overscan, and only uv still refers to the canvas itself.
  float visibleHeight = uResolution.y / uOverscan;
  float aspect = uResolution.x / visibleHeight;
  float x = (uv.x - 0.5) * aspect;
  float y = (uv.y - 0.5) * uOverscan + 0.5;

  // ── Travel: the band sweeps from below to above the viewport ──
  float travel = mix(-0.55, 1.55, uProgress);

  // ── Curvature: convex dome → flat → concave bowl ──
  // The band has to read as flat exactly when travel puts it on the centre
  // line (uProgress 0.5), so each half ramps to zero on its own slope instead
  // of one lerp between the end curvatures - that would flatten it late, with
  // the band already sitting above centre.
  float fromMid = uProgress - 0.5;
  float baseCurvature = -fromMid * mix(2.5, 1.7, step(0.0, fromMid));
  float curvature = (baseCurvature + uDeform * 0.55) * uCurve;

  // ── Circular-arc shape for semicircle / rainbow contour ──
  float radius = 1.4 + abs(uDeform) * 0.3;
  float r2 = radius * radius;
  float xClamped = clamp(x * x, 0.0, r2 - 0.001);
  float arcBlend = smoothstep(0.15, 0.85, abs(curvature) / 1.3);
  float parabolic = curvature * x * x;
  float circular  = sign(curvature) * (radius - sqrt(r2 - xClamped));
  float arcOffset = mix(parabolic, circular, arcBlend * 0.7);

  float centre = travel - arcOffset;

  // ── Wide band: much broader spread, grows further with scroll speed ──
  float width = 0.48;
  width *= 1.0 + abs(uDeform) * 0.7;

  // ── Single wide Gaussian – naturally fades to zero at edges ──
  float d    = (y - centre) / width;
  float glow = exp(-d * d * 0.8);   // very wide, soft falloff
  float core = exp(-d * d * 3.5);   // brighter centre region

  // ── Color: just BG → PRIMARY, the Gaussian does the mixing ──
  float intensity = glow * glow;                      // softer rolloff
  float brightness = mix(0.15, 1.0, core / max(glow, 0.001));
  brightness = clamp(brightness, 0.0, 1.0);

  // ── Edge fade: dissolve into BG near top & bottom so no hard clip ──
  // With overscan the fade is sized to the hidden strip, so it finishes exactly
  // at the window edge and is never seen.
  float fadeBand = max(0.5 * (1.0 - 1.0 / uOverscan), 0.15);
  float eFade = smoothstep(0.0, fadeBand, uv.y) * smoothstep(1.0, 1.0 - fadeBand, uv.y);
  float fadeMul = mix(1.0, eFade, uEdgeFade);

  vec3 col = BG + PRIMARY * intensity * brightness * fadeMul;

  if (uDither > 0.5) {
    col = applyDither(gl_FragCoord.xy, col, uPixelSize, uColorNum);
  } else {
    // Dither to prevent 8-bit banding on the soft gradient.
    col += (hash(gl_FragCoord.xy + fract(uTime)) - 0.5) / 255.0;
  }

  // Posterising quantises BG down to pure black, which reads as a hard seam
  // against the #050505 page. Put the floor back on the page background.
  col = max(col, BG);

  gl_FragColor = vec4(col, 1.0);
}
`;

const CONTEXT_OPTIONS = {
  alpha: false,
  antialias: false,
  depth: false,
  stencil: false,
  powerPreference: "low-power",
};

const MAX_PIXEL_RATIO = 1.5;

/**
 * Fullscreen curved gradient that arcs, rises and deforms as the section
 * scrolls past. Renders nothing but the page background if WebGL is
 * unavailable, so the section degrades to flat black.
 */
export default function CurvedGradientShader({
  className = "",
  edgeFade = true,
  dither = true,
  pixelSize = 3.0,
  colorNum = 8.0,
  overscan = 1,
  scrollTrigger: scrollTriggerRef,
  scrollStart = "top bottom",
  scrollEnd = "bottom top",
  markers = false,
  curveStrength = 1,
}) {
  const wrapRef = useRef(null);
  const stateRef = useRef({
    progress: 0,
    targetProgress: 0,
    deform: 0,
    targetDeform: 0,
  });
  // ScrollTrigger lives in a `useGSAP` (a layout effect), so it is created -
  // and fires its first onRefresh - before the plain effect below has built
  // the context. The stub therefore records that progress instead of dropping
  // it, and the build applies it as soon as it can draw; otherwise a load with
  // the section already on screen keeps targetProgress at 0 and parks the band
  // off-screen until something else happens to scroll.
  const pendingProgressRef = useRef(null);
  const controlsRef = useRef({
    start() {},
    snapProgress(progress) {
      pendingProgressRef.current = progress;
    },
  });

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    if (shouldSkipRealtimeGPU()) return;

    const reduced = prefersReducedMotion();
    const startedAt = performance.now();

    let canvas = null;
    let gl = null;
    let program = null;
    let buffer = null;
    let uniforms = null;
    let frame = 0;
    let visible = false;

    function compile(type, source) {
      const shader = gl.createShader(type);

      gl.shaderSource(shader, source);
      gl.compileShader(shader);

      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        gl.deleteShader(shader);
        return null;
      }

      return shader;
    }

    function tryGetContext(el) {
      // Shaders are GLSL ES 1.0 (`attribute`, `gl_FragColor`). Prefer WebGL1
      // so a WebGL2 context does not compile them as ES 3.00 and fail silently.
      const next =
        el.getContext("webgl", CONTEXT_OPTIONS) ||
        el.getContext("experimental-webgl", CONTEXT_OPTIONS) ||
        el.getContext("webgl2", CONTEXT_OPTIONS);
      if (next && !next.isContextLost()) return next;
      return null;
    }

    function disposeContext() {
      if (!gl) return;
      if (!gl.isContextLost()) {
        if (buffer) gl.deleteBuffer(buffer);
        if (program) gl.deleteProgram(program);
        gl.getExtension("WEBGL_lose_context")?.loseContext();
      }
      gl = null;
      program = null;
      buffer = null;
      uniforms = null;
    }

    function disposeCanvas() {
      if (!canvas) return;
      canvas.removeEventListener("webglcontextlost", handleContextLost);
      canvas.removeEventListener("webglcontextrestored", handleContextRestored);
      canvas.remove();
      canvas = null;
    }

    function build() {
      stop();
      disposeContext();
      disposeCanvas();

      // React must not own this node. A cached / remounted <canvas> keeps a
      // dead context, and Chrome then paints the unused opaque buffer white.
      const next = document.createElement("canvas");
      next.className = "block h-full w-full";
      wrap.appendChild(next);
      canvas = next;

      gl = tryGetContext(canvas);
      if (!gl) {
        disposeCanvas();
        return false;
      }

      canvas.addEventListener("webglcontextlost", handleContextLost);
      canvas.addEventListener("webglcontextrestored", handleContextRestored);

      const vertex = compile(gl.VERTEX_SHADER, VERTEX_SHADER);
      const fragment = compile(gl.FRAGMENT_SHADER, FRAGMENT_SHADER);

      if (!vertex || !fragment) {
        disposeContext();
        disposeCanvas();
        return false;
      }

      program = gl.createProgram();
      gl.attachShader(program, vertex);
      gl.attachShader(program, fragment);
      gl.linkProgram(program);
      gl.deleteShader(vertex);
      gl.deleteShader(fragment);

      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        disposeContext();
        disposeCanvas();
        return false;
      }

      gl.useProgram(program);

      buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([-1, -1, 3, -1, -1, 3]),
        gl.STATIC_DRAW,
      );

      const position = gl.getAttribLocation(program, "aPosition");
      gl.enableVertexAttribArray(position);
      gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

      uniforms = {
        resolution: gl.getUniformLocation(program, "uResolution"),
        time: gl.getUniformLocation(program, "uTime"),
        progress: gl.getUniformLocation(program, "uProgress"),
        deform: gl.getUniformLocation(program, "uDeform"),
        edgeFade: gl.getUniformLocation(program, "uEdgeFade"),
        overscan: gl.getUniformLocation(program, "uOverscan"),
        pixelSize: gl.getUniformLocation(program, "uPixelSize"),
        colorNum: gl.getUniformLocation(program, "uColorNum"),
        dither: gl.getUniformLocation(program, "uDither"),
        curve: gl.getUniformLocation(program, "uCurve"),
      };

      resize();
      return true;
    }

    function resize() {
      if (!gl || gl.isContextLost() || !uniforms || !canvas) return;

      const ratio = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO);
      const width = Math.max(1, Math.round(wrap.clientWidth * ratio));
      const height = Math.max(1, Math.round(wrap.clientHeight * ratio));

      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      gl.viewport(0, 0, width, height);
      gl.uniform2f(uniforms.resolution, width, height);
    }

    function draw(elapsed) {
      if (!gl || gl.isContextLost() || !uniforms) return;

      const state = stateRef.current;

      gl.uniform1f(uniforms.time, elapsed);
      gl.uniform1f(uniforms.progress, state.progress);
      gl.uniform1f(uniforms.deform, state.deform);
      gl.uniform1f(uniforms.edgeFade, edgeFade ? 1.0 : 0.0);
      gl.uniform1f(uniforms.overscan, overscan);
      gl.uniform1f(uniforms.pixelSize, pixelSize);
      gl.uniform1f(uniforms.colorNum, colorNum);
      gl.uniform1f(uniforms.dither, dither ? 1.0 : 0.0);
      gl.uniform1f(uniforms.curve, curveStrength);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    function loop(now) {
      frame = requestAnimationFrame(loop);

      const state = stateRef.current;

      state.progress += (state.targetProgress - state.progress) * 0.12;
      state.deform += (state.targetDeform - state.deform) * 0.14;
      state.targetDeform *= 0.88;

      draw((now - startedAt) / 1000);
    }

    function start() {
      if (frame || reduced) return;
      if (!gl || gl.isContextLost() || !uniforms) return;
      frame = requestAnimationFrame(loop);
    }

    function stop() {
      if (!frame) return;
      cancelAnimationFrame(frame);
      frame = 0;
    }

    function drawStillFrame() {
      const state = stateRef.current;

      state.progress = 0.5;
      state.deform = 0;
      draw(0);
    }

    function paint() {
      if (reduced) drawStillFrame();
      else draw((performance.now() - startedAt) / 1000);
    }

    function isOnScreen() {
      const rect = wrap.getBoundingClientRect();
      return rect.bottom > 0 && rect.top < window.innerHeight;
    }

    function restore() {
      if (gl?.isContextLost() || !gl) {
        if (!build()) return;
      }
      resize();
      paint();
      visible = isOnScreen();
      if (visible) start();
      ScrollTrigger.refresh();
    }

    function handleContextLost(event) {
      event.preventDefault();
      stop();
    }

    function handleContextRestored() {
      restore();
    }

    controlsRef.current = {
      start,
      snapProgress(progress) {
        const state = stateRef.current;
        state.targetProgress = progress;
        state.progress = progress;
        paint();
        start();
      },
    };

    if (!build()) return;

    // Adopt the progress ScrollTrigger already reported to the stub, so the
    // first painted frame is the band where the scroll position puts it.
    if (pendingProgressRef.current !== null) {
      const state = stateRef.current;
      state.targetProgress = pendingProgressRef.current;
      state.progress = pendingProgressRef.current;
      pendingProgressRef.current = null;
    }

    paint();
    visible = isOnScreen();
    if (visible) start();

    const resizeObserver = new ResizeObserver(() => {
      resize();
      paint();
    });
    resizeObserver.observe(wrap);

    const intersectionObserver = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (visible) {
          if (gl?.isContextLost() || !gl) restore();
          else {
            paint();
            start();
          }
        } else {
          stop();
        }
      },
      { rootMargin: "10% 0px" },
    );
    intersectionObserver.observe(wrap);

    const onPageShow = () => restore();
    const onVisibility = () => {
      if (document.visibilityState === "visible") restore();
      else stop();
    };

    window.addEventListener("pageshow", onPageShow);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      controlsRef.current = {
        start() {},
        snapProgress(progress) {
          pendingProgressRef.current = progress;
        },
      };
      stop();
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      window.removeEventListener("pageshow", onPageShow);
      document.removeEventListener("visibilitychange", onVisibility);
      disposeContext();
      disposeCanvas();
    };
    // edgeFade/overscan/pixelSize/colorNum/dither/curveStrength are only
    // read here to feed the draw() closure; they're treated as static
    // config for the lifetime of this WebGL context (the only call site
    // passes them as fixed literals). Depending on them would tear down
    // and rebuild the whole context - shader compile, buffers, observers,
    // RAF loop - on every prop identity change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useGSAP(
    () => {
      if (prefersReducedMotion() || shouldSkipRealtimeGPU()) return;

      const triggerEl = scrollTriggerRef?.current || wrapRef.current;

      ScrollTrigger.create({
        trigger: triggerEl,
        start: scrollStart,
        end: scrollEnd,
        markers: markers,
        onRefresh: (self) => {
          controlsRef.current.snapProgress(self.progress);
        },
        onUpdate: (self) => {
          const state = stateRef.current;

          state.targetProgress = self.progress;
          state.targetDeform = gsap.utils.clamp(
            -1.5,
            1.5,
            self.getVelocity() / 2000,
          );
          controlsRef.current.start();
        },
      });
    },
    { scope: wrapRef },
  );

  // Extra height is clipped by the sticky section (`overflow-hidden`) rather
  // than a CSS mask on this node - masking a WebGL canvas parent blanks it
  // after client navigations when the compositor re-layers the page.
  const overscanStyle =
    overscan === 1
      ? undefined
      : {
          top: `${-50 * (overscan - 1)}%`,
          height: `${100 * overscan}%`,
        };

  return (
    <div
      ref={wrapRef}
      aria-hidden="true"
      style={overscanStyle}
      className={`pointer-events-none absolute inset-x-0 z-0 ${overscan === 1 ? "inset-y-0" : ""} bg-background ${className}`}
    />
  );
}
