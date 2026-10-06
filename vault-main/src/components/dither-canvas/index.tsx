// Built using Hyperiux Vault: https://vault.hyperiux.com

"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { createSuspendedRaf } from "./createSuspendedRaf";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

type MediaSource = string | { src: string };

function subscribeToReducedMotion(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  const mediaQueryList = window.matchMedia(REDUCED_MOTION_QUERY);
  mediaQueryList.addEventListener("change", callback);
  return () => mediaQueryList.removeEventListener("change", callback);
}

function getReducedMotionSnapshot(): boolean {
  return window.matchMedia?.(REDUCED_MOTION_QUERY)?.matches ?? false;
}

function getServerReducedMotionSnapshot(): boolean {
  return false;
}

// React hook form, for JSX output that depends on the preference (not just
// an imperative tween). Safe to call during render - returns false on the
// server.
function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribeToReducedMotion,
    getReducedMotionSnapshot,
    getServerReducedMotionSnapshot
  );
}

/* ── constants  */
const FC = 80;
const FR = 60;
const FN = FC * FR;

const DEFAULT_CHAR_COLUMNS = 145;
const TABLET_MAX_WIDTH = 1025;
const MOBILE_MAX_WIDTH = 639;
const EDGE_LO = 90;
const EDGE_HI = 125;

const EDGES = [".", ",", "=", "+", "-"];
const BRIGHTS = ["H", "Y", "P", "E", "R", "I", "U", "X"];
const ALL_CHARS = [...EDGES, ...BRIGHTS];

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

const TL = 320;
const TS = 10;
const TM = 72;

const TRAIL_CFG = {
  dr: 5,
  drl: 3,
  sc: 3,
  vi: 0.04,
  fb: 0.08,
  fss: 18,
  ffm: 0.15,
  fir: 0.8,
  firl: 1.0,
};

function getResponsiveCharColumns(width: number, baseCharColumns: number): number {
  if (width <= MOBILE_MAX_WIDTH) {
    return Math.round(baseCharColumns * 0.45);
  }

  if (width <= TABLET_MAX_WIDTH) {
    return Math.round(baseCharColumns * 0.55);
  }

  return baseCharColumns;
}

/* ── shaders ── */
const VS = `#version 300 es
in vec2 a_pos;

void main() {
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`;

const FS = `#version 300 es
precision highp float;

uniform sampler2D uVideo;
uniform sampler2D uFluid;
uniform sampler2D uAtlas;

uniform vec2 uRes;

uniform int uPhase;
uniform int uTrailN;
uniform int uColorizeFromVideo;
uniform int uSpellBrightChars;

uniform float uCharColumns;
uniform float uVideoZoom;
uniform float uCharZoom;
uniform float uColorBoost;

uniform vec4 uTP[${TM}];
uniform float uTL[${TM}];

out vec4 O;

const float FC = ${FC}.0;
const float FR = ${FR}.0;
const float EL = ${EDGE_LO}.0;
const float EH = ${EDGE_HI}.0;

const int BAYER[16] = int[16](${BAYER.map((v) =>
  Math.round((v / 16) * 255)
).join(",")});

const int CHAR_N = ${ALL_CHARS.length};
const int EDGE_N = ${EDGES.length};
const int BRIGHT_N = ${BRIGHTS.length};

void main() {
  float cw = uRes.x / uCharColumns;
  float rows = ceil(uRes.y / cw) + 1.0;

  float gx = floor(gl_FragCoord.x / cw);
  float gy = floor((uRes.y - gl_FragCoord.y) / cw);

  if (gx >= uCharColumns || gy >= rows) discard;

  vec2 cp = vec2(
    fract(gl_FragCoord.x / cw),
    fract((uRes.y - gl_FragCoord.y) / cw)
  );

  vec2 bp = vec2(
    (gx + 0.5) * cw,
    (gy + 0.5) * cw
  );

  ivec2 fc = ivec2(gx / uCharColumns * FC, gy / rows * FR);
  fc = clamp(fc, ivec2(0), ivec2(int(FC) - 1, int(FR) - 1));

  vec2 flow = texelFetch(uFluid, fc, 0).rg;

  vec2 disp = vec2(0.0);

  for (int i = 0; i < uTrailN; i++) {
    float life = uTL[i];

    if (life <= 0.0) continue;

    vec2 d = bp - uTP[i].xy;
    float dist = length(d);
    float r = 5.0 + life * 3.0;

    if (dist == 0.0 || dist > r) continue;

    float f = pow(1.0 - dist / r, 2.0);

    disp += (d / dist) * f * life * 3.0 + uTP[i].zw * f * 0.04;
  }

  vec2 sp = bp + disp + flow * 6.0;
  vec2 uv = sp / uRes;

  uv = (uv - 0.5) / max(uVideoZoom, 0.0001) + 0.5;
  uv = clamp(uv, 0.0, 1.0);

  vec3 vc = texture(uVideo, uv).rgb;

  float lum = dot(vc, vec3(0.299, 0.587, 0.114));
  float bg = lum * 255.0;

  float hm = min(1.0, length(flow) * 1.1);
  float gray = bg * (1.0 - hm) + (255.0 - bg) * hm;

  float thr = float(BAYER[(int(gy) & 3) * 4 + (int(gx) & 3)]);

  bool invDark = hm > 0.05 && bg > thr && gray <= thr;
  bool lit = gray > thr;

  if (!lit && !invDark) discard;

  float pg = invDark ? bg : gray;

  int ci;

  if (pg >= EL && pg <= EH) {
    if (uSpellBrightChars == 1) {
      ci = (int(gx) + uPhase) % EDGE_N;
    } else {
      ci = uPhase % EDGE_N;
    }
  } else if (pg > EH) {
    if (uSpellBrightChars == 1) {
      ci = EDGE_N + (int(gx) % BRIGHT_N);
    } else {
      ci = EDGE_N + (uPhase % BRIGHT_N);
    }
  } else {
    discard;
  }

  vec2 zcp = (cp - 0.5) * uCharZoom + 0.5;

  if (zcp.x < 0.0 || zcp.x > 1.0 || zcp.y < 0.0 || zcp.y > 1.0) discard;

  float au = (float(ci) + zcp.x) / float(CHAR_N);
  float ca = texture(uAtlas, vec2(au, zcp.y)).a;

  if (ca < 0.05) discard;

  vec3 normalColor = vec3(0.467, 0.478, 0.478);
  vec3 videoColor = vc * uColorBoost;

  vec3 col = invDark
    ? vec3(0.078)
    : mix(normalColor, videoColor, float(uColorizeFromVideo));

  float a = invDark ? (0.55 + hm * 0.45) * ca : ca;

  O = vec4(col * a, a);
}
`;

/* ── helpers ── */
function mkShader(gl: WebGL2RenderingContext, type: number, src: string): WebGLShader {
  const shader = gl.createShader(type) as WebGLShader;

  gl.shaderSource(shader, src);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const error = gl.getShaderInfoLog(shader);

    gl.deleteShader(shader);

    throw new Error(error || "BinaryEffect shader failed to compile");
  }

  return shader;
}

function mkProg(gl: WebGL2RenderingContext): WebGLProgram {
  const program = gl.createProgram() as WebGLProgram;

  gl.attachShader(program, mkShader(gl, gl.VERTEX_SHADER, VS));
  gl.attachShader(program, mkShader(gl, gl.FRAGMENT_SHADER, FS));
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const error = gl.getProgramInfoLog(program);

    gl.deleteProgram(program);

    throw new Error(error || "BinaryEffect program failed to link");
  }

  return program;
}

function mkTex(gl: WebGL2RenderingContext, unit: number): WebGLTexture {
  const texture = gl.createTexture() as WebGLTexture;

  gl.activeTexture(gl.TEXTURE0 + unit);
  gl.bindTexture(gl.TEXTURE_2D, texture);

  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  return texture;
}

/* ── fluid sim  */
function createFluid() {
  const vx = new Float32Array(FN);
  const vy = new Float32Array(FN);

  const vx0 = new Float32Array(FN);
  const vy0 = new Float32Array(FN);

  const p = new Float32Array(FN);
  const div = new Float32Array(FN);

  const fi = (x: number, y: number): number => {
    return (
      Math.max(0, Math.min(FR - 1, y)) * FC +
      Math.max(0, Math.min(FC - 1, x))
    );
  };

  const bnd = (b: number, a: Float32Array): void => {
    for (let x = 1; x < FC - 1; x += 1) {
      a[fi(x, 0)] = b === 2 ? -a[fi(x, 1)] : a[fi(x, 1)];
      a[fi(x, FR - 1)] =
        b === 2 ? -a[fi(x, FR - 2)] : a[fi(x, FR - 2)];
    }

    for (let y = 1; y < FR - 1; y += 1) {
      a[fi(0, y)] = b === 1 ? -a[fi(1, y)] : a[fi(1, y)];
      a[fi(FC - 1, y)] =
        b === 1 ? -a[fi(FC - 2, y)] : a[fi(FC - 2, y)];
    }
  };

  const diffuse = (b: number, d: Float32Array, s: Float32Array, diff: number, dt: number): void => {
    const a = dt * diff * FN;

    for (let k = 0; k < 4; k += 1) {
      for (let y = 1; y < FR - 1; y += 1) {
        for (let x = 1; x < FC - 1; x += 1) {
          d[fi(x, y)] =
            (s[fi(x, y)] +
              a *
                (d[fi(x - 1, y)] +
                  d[fi(x + 1, y)] +
                  d[fi(x, y - 1)] +
                  d[fi(x, y + 1)])) /
            (1 + 4 * a);
        }
      }

      bnd(b, d);
    }
  };

  const advect = (b: number, d: Float32Array, d0: Float32Array, ux: Float32Array, uy: Float32Array, dt: number): void => {
    const dtx = dt * FC * 1.4;
    const dty = dt * FR * 1.4;

    for (let y = 1; y < FR - 1; y += 1) {
      for (let x = 1; x < FC - 1; x += 1) {
        let px = Math.max(0.5, Math.min(FC - 1.5, x - dtx * ux[fi(x, y)]));
        let py = Math.max(0.5, Math.min(FR - 1.5, y - dty * uy[fi(x, y)]));

        const x0 = Math.floor(px);
        const y0 = Math.floor(py);

        const s1 = px - x0;
        const s0 = 1 - s1;

        const t1 = py - y0;
        const t0 = 1 - t1;

        d[fi(x, y)] =
          s0 *
            (t0 * d0[fi(x0, y0)] + t1 * d0[fi(x0, y0 + 1)]) +
          s1 *
            (t0 * d0[fi(x0 + 1, y0)] +
              t1 * d0[fi(x0 + 1, y0 + 1)]);
      }
    }

    bnd(b, d);
  };

  const project = (ux: Float32Array, uy: Float32Array): void => {
    const hx = 1 / FC;
    const hy = 1 / FR;

    for (let y = 1; y < FR - 1; y += 1) {
      for (let x = 1; x < FC - 1; x += 1) {
        div[fi(x, y)] =
          -0.5 *
          (hx * (ux[fi(x + 1, y)] - ux[fi(x - 1, y)]) +
            hy * (uy[fi(x, y + 1)] - uy[fi(x, y - 1)]));

        p[fi(x, y)] = 0;
      }
    }

    bnd(0, div);
    bnd(0, p);

    for (let k = 0; k < 4; k += 1) {
      for (let y = 1; y < FR - 1; y += 1) {
        for (let x = 1; x < FC - 1; x += 1) {
          p[fi(x, y)] =
            (div[fi(x, y)] +
              p[fi(x - 1, y)] +
              p[fi(x + 1, y)] +
              p[fi(x, y - 1)] +
              p[fi(x, y + 1)]) /
            4;
        }
      }

      bnd(0, p);
    }

    for (let y = 1; y < FR - 1; y += 1) {
      for (let x = 1; x < FC - 1; x += 1) {
        ux[fi(x, y)] -=
          (0.5 * (p[fi(x + 1, y)] - p[fi(x - 1, y)])) / hx;

        uy[fi(x, y)] -=
          (0.5 * (p[fi(x, y + 1)] - p[fi(x, y - 1)])) / hy;
      }
    }

    bnd(1, ux);
    bnd(2, uy);
  };

  return {
    vx,
    vy,
    fi,
    step() {
      diffuse(1, vx0, vx, 0.00002, 0.016);
      diffuse(2, vy0, vy, 0.00002, 0.016);

      project(vx0, vy0);

      advect(1, vx, vx0, vx0, vy0, 0.016);
      advect(2, vy, vy0, vx0, vy0, 0.016);

      project(vx, vy);

      for (let i = 0; i < FN; i += 1) {
        vx[i] *= 0.94;
        vy[i] *= 0.94;
      }
    },
  };
}

function resolveMediaSource(source: MediaSource): string {
  if (typeof source === "string") return source;
  if (source?.src) return source.src;

  return source as unknown as string;
}

function isRemoteUrl(source: string): boolean {
  return /^https?:\/\//i.test(source);
}

async function loadVideoSource(source: MediaSource): Promise<{ src: string; revoke: () => void }> {
  const videoSource = resolveMediaSource(source);

  if (!videoSource) {
    throw new Error("A valid video URL is required.");
  }

  if (!isRemoteUrl(videoSource)) {
    return {
      src: videoSource,
      revoke: () => {},
    };
  }

  const response = await fetch(videoSource, {
    mode: "cors",
    credentials: "omit",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Video request failed with ${response.status}`);
  }

  const objectUrl = URL.createObjectURL(await response.blob());

  return {
    src: objectUrl,
    revoke: () => URL.revokeObjectURL(objectUrl),
  };
}

interface DitherCanvasProps {
  videoSrc?: MediaSource;
  charColumns?: number;
  colorizeFromVideo?: boolean;
  videoZoom?: number;
  charZoom?: number;
  spellBrightChars?: boolean;
  colorBoost?: number;
  disableMobileCursor?: boolean;
  cursorHint?: string;
  showMobileMessage?: boolean;
  className?: string;
}

interface TrailPoint {
  x: number;
  y: number;
  vx: number;
  vy: number;
  b: number;
}

/* ── component  */
export default function DitherCanvas({
  videoSrc = "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/binary-effect-video.mp4",

  /**
   * Lower number = bigger binary characters.
   * Original version: 145
   * V2 bigger version: 100
   */
  charColumns = DEFAULT_CHAR_COLUMNS,

  /**
   * false = fixed grey characters.
   * true = characters take color from video.
   */
  colorizeFromVideo = false,

  /**
   * Original version: 1
   * V2 version: 1.9
   */
  videoZoom = 1,

  /**
   * Lower than 1 makes glyphs visually bigger/tighter.
   * Original version: 1
   * V2 version: 0.9
   */
  charZoom = 1,

  /**
   * false = original phase cycling.
   * true = bright areas spell HYPERIUX across columns.
   */
  spellBrightChars = false,

  colorBoost = 1.4,
  disableMobileCursor = true,
  cursorHint = "Move your cursor to see the binary fluid distortion effect.",
  showMobileMessage = true,
  className = "",
}: DitherCanvasProps) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const configRef = useRef({
    charColumns,
    colorizeFromVideo,
    videoZoom,
    charZoom,
    spellBrightChars,
    colorBoost,
    disableMobileCursor,
  });
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    configRef.current = {
      charColumns,
      colorizeFromVideo,
      videoZoom,
      charZoom,
      spellBrightChars,
      colorBoost,
      disableMobileCursor,
    };
  }, [
    charColumns,
    colorizeFromVideo,
    videoZoom,
    charZoom,
    spellBrightChars,
    colorBoost,
    disableMobileCursor,
  ]);

  useEffect(() => {
    const canvas = ref.current;

    if (!canvas) return undefined;

    const gl = canvas.getContext("webgl2", {
      alpha: false,
      antialias: false,
    });

    if (!gl) return undefined;

    const video = document.createElement("video");

    video.crossOrigin = "anonymous";
    video.loop = true;
    video.muted = true;
    video.autoplay = true;
    video.playsInline = true;

    let isDisposed = false;
    let revokeVideoSource = () => {};

    loadVideoSource(videoSrc)
      .then(({ src, revoke }) => {
        if (isDisposed) {
          revoke();
          return;
        }

        revokeVideoSource = revoke;
        video.src = src;
        video.load();
        video.play().catch(() => {});
      })
      .catch((error) => {
        if (!isDisposed) {
          console.warn(
            `Unable to load BinaryEffect video: ${resolveMediaSource(videoSrc)}. Remote WebGL videos require CORS headers.`,
            error
          );
        }
      });

    let program: WebGLProgram;

    try {
      program = mkProg(gl);
    } catch (error) {
      console.error(error);

      return () => {
        video.pause();
        video.removeAttribute("src");
        video.load();
      };
    }

    gl.useProgram(program);

    const loc = (name: string) => gl.getUniformLocation(program, name);

    const buffer = gl.createBuffer();

    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW
    );

    const aPos = gl.getAttribLocation(program, "a_pos");

    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const videoTex = mkTex(gl, 0);
    const fluidTex = mkTex(gl, 1);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, videoTex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    const CELL = 64;
    const atlasCanvas = document.createElement("canvas");

    atlasCanvas.width = CELL * ALL_CHARS.length;
    atlasCanvas.height = CELL;

    const atlasContext = atlasCanvas.getContext("2d") as CanvasRenderingContext2D;

    atlasContext.font = `${CELL * 0.92}px monospace`;
    atlasContext.textAlign = "center";
    atlasContext.textBaseline = "middle";
    atlasContext.fillStyle = "#fff";

    ALL_CHARS.forEach((char, index) => {
      atlasContext.fillText(char, CELL * (index + 0.5), CELL * 0.5);
    });

    const atlasTex = mkTex(gl, 2);

    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      atlasCanvas
    );

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    gl.uniform1i(loc("uVideo"), 0);
    gl.uniform1i(loc("uFluid"), 1);
    gl.uniform1i(loc("uAtlas"), 2);

    gl.uniform1f(loc("uVideoZoom"), configRef.current.videoZoom);
    gl.uniform1f(loc("uCharZoom"), configRef.current.charZoom);
    gl.uniform1f(loc("uColorBoost"), configRef.current.colorBoost);
    gl.uniform1i(loc("uColorizeFromVideo"), configRef.current.colorizeFromVideo ? 1 : 0);
    gl.uniform1i(loc("uSpellBrightChars"), configRef.current.spellBrightChars ? 1 : 0);

    const fluid = createFluid();
    const fluidData = new Float32Array(FN * 2);

    const mouse = {
      x: -9999,
      y: -9999,
      vx: 0,
      vy: 0,
    };

    const trail: TrailPoint[] = [];
    const now = () => performance.now();

    const isMobile = () => window.matchMedia("(max-width: 639px)").matches;

    const onMove = (event: MouseEvent) => {
      if (configRef.current.disableMobileCursor && isMobile()) return;

      const previousX = mouse.x;
      const previousY = mouse.y;

      mouse.vx = event.clientX - previousX;
      mouse.vy = event.clientY - previousY;
      mouse.x = event.clientX;
      mouse.y = event.clientY;

      if (previousX < 0 || previousY < 0) {
        trail.unshift({
          x: mouse.x,
          y: mouse.y,
          vx: 0,
          vy: 0,
          b: now(),
        });

        return;
      }

      const distance = Math.hypot(mouse.vx, mouse.vy);

      if (distance < 0.5) return;

      const steps = Math.max(1, Math.ceil(distance / TS));
      const birth = now();

      for (let step = 1; step <= steps; step += 1) {
        const t = step / steps;

        trail.unshift({
          x: previousX + mouse.vx * t,
          y: previousY + mouse.vy * t,
          vx: mouse.vx / steps,
          vy: mouse.vy / steps,
          b: birth,
        });

        if (trail.length > TM) {
          trail.length = TM;
        }
      }
    };

    window.addEventListener("mousemove", onMove);

    let width = 0;
    let height = 0;

    const resize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;

      gl.viewport(0, 0, width, height);
      gl.uniform1f(loc("uCharColumns"), getResponsiveCharColumns(width, configRef.current.charColumns));
    };

    resize();

    window.addEventListener("resize", resize);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    const uTP = loc("uTP");
    const uTLoc = loc("uTL");
    const uRes = loc("uRes");
    const uPhase = loc("uPhase");
    const uTrailN = loc("uTrailN");

    let phase = 0;
    let frame = 0;
    const tpBuf = new Float32Array(TM * 4);
    const tlBuf = new Float32Array(TM);

    const loop = createSuspendedRaf({
      root: canvas,
      onFrame: () => {
      if (video.readyState >= 2) {
        const config = configRef.current;
        const timestamp = now();

        const { fb, fss, ffm, fir, firl } = TRAIL_CFG;

        for (let i = trail.length - 1; i >= 0; i -= 1) {
          const point = trail[i];
          const age = timestamp - point.b;

          if (age >= TL) {
            trail.splice(i, 1);
            continue;
          }

          const life = 1 - age / TL;
          const radius = fir + life * firl;
          const gridRadius = Math.ceil(radius);
          const speed = Math.hypot(point.vx, point.vy);
          const force = (fb + Math.min(speed, fss) / fss) * life;

          const cx = ((point.x / width) * FC) | 0;
          const cy = ((point.y / height) * FR) | 0;

          for (let dy = -gridRadius; dy <= gridRadius; dy += 1) {
            for (let dx = -gridRadius; dx <= gridRadius; dx += 1) {
              const dist = Math.hypot(dx, dy);

              if (dist > radius) continue;

              const f = (1 - dist / radius) ** 2;
              const fluidIndex = fluid.fi(cx + dx, cy + dy);

              fluid.vx[fluidIndex] += point.vx * f * force * ffm;
              fluid.vy[fluidIndex] += point.vy * f * force * ffm;
            }
          }
        }

        fluid.step();

        if (frame++ % 8 === 0) {
          phase = (phase + 1) % 255;
        }

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, videoTex);
        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          gl.RGBA,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          video
        );

        for (let i = 0; i < FN; i += 1) {
          fluidData[i * 2] = fluid.vx[i];
          fluidData[i * 2 + 1] = fluid.vy[i];
        }

        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, fluidTex);
        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          gl.RG32F,
          FC,
          FR,
          0,
          gl.RG,
          gl.FLOAT,
          fluidData
        );

        tpBuf.fill(0);
        tlBuf.fill(0);

        for (let i = 0; i < trail.length; i += 1) {
          const point = trail[i];

          tpBuf[i * 4] = point.x;
          tpBuf[i * 4 + 1] = point.y;
          tpBuf[i * 4 + 2] = point.vx;
          tpBuf[i * 4 + 3] = point.vy;

          tlBuf[i] = 1 - (timestamp - point.b) / TL;
        }

        gl.uniform4fv(uTP, tpBuf);
        gl.uniform1fv(uTLoc, tlBuf);
        gl.uniform1i(uTrailN, trail.length);
        gl.uniform2f(uRes, width, height);
        gl.uniform1i(uPhase, phase);
        gl.uniform1f(loc("uCharColumns"), getResponsiveCharColumns(width, config.charColumns));
        gl.uniform1f(loc("uVideoZoom"), config.videoZoom);
        gl.uniform1f(loc("uCharZoom"), config.charZoom);
        gl.uniform1f(loc("uColorBoost"), config.colorBoost);
        gl.uniform1i(loc("uColorizeFromVideo"), config.colorizeFromVideo ? 1 : 0);
        gl.uniform1i(loc("uSpellBrightChars"), config.spellBrightChars ? 1 : 0);

        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      }
      },
    });

    loop.start();

    return () => {
      isDisposed = true;
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);

      loop.destroy();

      video.pause();
      video.removeAttribute("src");
      video.load();
      revokeVideoSource();

      gl.deleteTexture(videoTex);
      gl.deleteTexture(fluidTex);
      gl.deleteTexture(atlasTex);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
    };
  }, [videoSrc]);

  return (
    <>
      <canvas
        ref={ref}
        className={`absolute inset-0 block h-full w-full bg-black ${className}`.trim()}
      />

      <p className="pointer-events-none absolute bottom-6 left-1/2 z-10 -translate-x-1/2 select-none rounded-full border border-white/10 bg-black/30 px-4 py-2 text-sm text-white/80 backdrop-blur-sm max-[1025px]:hidden">
        {cursorHint}
      </p>

      {showMobileMessage && (
        <p className="pointer-events-none absolute bottom-4 left-1/2 hidden -translate-x-1/2 select-none px-4 text-center max-[1025px]:text-sm max-[1025px]:text-lg text-white/50 max-[1025px]:block">
          Open on desktop for the full experience - cursor effect included.
        </p>
      )}

      {reducedMotion && (
        <div
          aria-live="polite"
          className="fixed bottom-6 right-6 z-60 w-fit max-w-[min(90vw,26rem)] rounded-md border border-black/10 bg-[#F8F8F3] p-6 text-center shadow-sm"
        >
          <h2 className="text-[1.15vw] max-md:text-[3.5vw] max-[1025px]:text-[2vw] leading-none text-[#111111]">
            This effect can&apos;t be reduced.
          </h2>
          <p className="mx-auto mt-4 text-sm leading-6 text-black/65">
            Reduced motion is enabled, but this effect is a continuous
            cursor-driven fluid distortion rendered every frame, and
            can&apos;t be simplified to a fade without losing the effect
            entirely.
          </p>
        </div>
      )}
    </>
  );
}
