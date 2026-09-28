"use client";

import dynamic from "next/dynamic";
import {
    Suspense,
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { EffectComposer } from "@react-three/postprocessing";
import { BlendFunction, Effect, EffectAttribute } from "postprocessing";
import * as THREE from "three";

export const MODEL_SRC = "/H.glb";

export const MODEL_DITHER_DEFAULTS = {
    /** Glyph columns across the viewport, in CSS pixels. */
    charColumns: 80,
    charZoom: 1,
    /** Gap between characters (0 = no gap, 1 = max gap). */
    charGap: 0,
    /** Glyph choice: 0 = luminance ramp, 1 = random per cell. */
    charJitter: 1.0,
    /** Match --primary / text-primary (#ff5f00). */
    charColor: "#ff5f00",

    brightness: 0,
    contrast: 12,
    saturation: -100,
    gamma: 1.0,
    brightnessMap: 1.15,
    colorIntensity: 1.15,
    invert: false,
    grain: true,
    grainIntensity: 30,
    grainSize: 2,
    grainSpeed: 50,

    /** Idle motion */
    swayAmplitude: 0.22,
    swaySpeed: 0.35,
    /** How far the pointer tilts the model, in radians. */
    pointerInfluence: 0.45,
    /** Seconds-ish smoothing for the tilt. Lower = snappier. */
    damping: 4,

    /** Cursor light - adds density under the pointer. Set 0 to disable. */
    cursorLightIntensity: 8,
    cursorLightDistance: 3.2,
    /** How far in front of the model the light floats. */
    cursorLightDepth: 1.1,

    /** Cursor reveal - repaints glyphs under the pointer. */
    revealColor: "#ffffff",
    /** Radius in CSS pixels. */
    revealRadius: 100,
    /** 0 = hard edge, 1 = fully feathered. */
    revealSoftness: 0.85,
    /** Peak blend toward revealColor at the centre. */
    revealStrength: 1.0,
    /** Higher = the reveal follows the cursor more tightly. */
    revealDamping: 12,

    /** Cursor scramble - glyphs under the pointer reshuffle. Set 0 to disable. */
    scrambleAmount: 0.85,
    /** Reshuffles per second. */
    scrambleSpeed: 8,

    expandDuration: 2,

    cutoff: 0.09,

    fitMargin: 1.18,
};

/* Glyph ramp, ordered light → dense. Index 0 stays blank. */
const ALL_CHARS = [
    "H", "Y", "P'", "E", "!", "R", "I", "U",
    "X", "0", "@",
];

/*
 * Kept near the on-screen cell size on purpose. Mipmaps can't be used here (see
 * createAtlas), so the less the glyph is minified, the cleaner it samples.
 */
const CELL = 96;
const PADDING = 12;

/*
 * How many click ripples can be in flight at once. Clicks past this are
 * dropped, which needs ~6 clicks inside one expandDuration to hit.
 */
const MAX_RIPPLES = 6;

/**
 * Glyph atlas: one row of characters, sampled by alpha in the shader.
 * flipY is off so the atlas v axis matches the top-down character grid.
 */
function createAtlas() {
    const canvas = document.createElement("canvas");
    canvas.width = CELL * ALL_CHARS.length;
    canvas.height = CELL;

    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = `${CELL - PADDING * 2}px monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#fff";
    ALL_CHARS.forEach((char, index) => {
        ctx.fillText(char, CELL * index + CELL / 2, CELL / 2);
    });

    const texture = new THREE.CanvasTexture(canvas);
    texture.flipY = false;

    // Mipmaps must stay off. The atlas u coordinate is built from fract(), which
    // jumps at every cell boundary, so fragment quads straddling a boundary see a
    // huge UV derivative and drop to the smallest mip - a flat average of the
    // whole atlas. That draws a bright line along every cell edge.
    texture.generateMipmaps = false;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.needsUpdate = true;
    return texture;
}

/*
 * postprocessing compiles effect shaders as GLSL1, so this deliberately avoids
 * GLSL3-only syntax: no const array constructors, no bitwise operators, and
 * texture2D rather than texture.
 */
const ASCII_FRAG = /* glsl */ `
uniform sampler2D uAtlas;
uniform vec3 uCharColor;
uniform float uCharColumns;
uniform float uCharZoom;
uniform float uCharGap;
uniform float uCharJitter;
uniform float uBrightness;
uniform float uContrast;
uniform float uSaturation;
uniform float uGamma;
uniform float uBrightnessMap;
uniform float uColorIntensity;
uniform float uGrainIntensity;
uniform float uGrainSize;
uniform float uGrainSpeed;
uniform float uInvert;
uniform float uGrain;

// Cursor reveal, all in buffer pixels
uniform vec2 uPointer;
uniform vec3 uRevealColor;
// Hard edge and feathered edge, both radii in buffer pixels
uniform float uRevealInner;
uniform float uRevealOuter;
uniform float uRevealStrength;
// Glyph churn inside the cursor disc
uniform float uScrambleAmount;
uniform float uScrambleSpeed;

// Click ripples. uBaseMix is the settled palette (0 = uCharColor, 1 =
// uRevealColor); each in-flight disc repaints toward its own mix as it grows.
// Slots are ordered oldest → newest and unused ones are parked off-screen.
uniform float uBaseMix;
uniform vec2 uRippleCentre[${MAX_RIPPLES}];
uniform float uRippleInner[${MAX_RIPPLES}];
uniform float uRippleOuter[${MAX_RIPPLES}];
uniform float uRippleMix[${MAX_RIPPLES}];

uniform float uCutoff;

const float CHAR_N = ${ALL_CHARS.length}.0;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

// Compact ordered dither, nested 2x2 → 4x4. No lookup table needed.
float bayer2(vec2 a) {
  a = floor(a);
  return fract(a.x * 0.5 + a.y * a.y * 0.75);
}

float bayer4(vec2 a) {
  return bayer2(0.5 * a) * 0.25 + bayer2(a);
}

vec3 applyAdjustments(vec3 c) {
  // Saturation (-100 → fully grey)
  float lum = dot(c, vec3(0.299, 0.587, 0.114));
  float sat = clamp(uSaturation / 100.0, -1.0, 1.0);
  c = mix(vec3(lum), c, sat + 1.0);

  c += uBrightness / 100.0;
  c = (c - 0.5) * (1.0 + uContrast / 100.0) + 0.5;
  c = pow(max(c, 0.0), vec3(1.0 / max(uGamma, 0.001)));
  c *= uBrightnessMap;

  if (uInvert > 0.5) c = 1.0 - c;

  return clamp(c, 0.0, 1.0);
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  float cw = resolution.x / uCharColumns;
  vec2 frag = uv * resolution;

  // Top-down grid so glyph rows stay anchored to the top of the viewport
  float gx = floor(frag.x / cw);
  float gy = floor((resolution.y - frag.y) / cw);
  vec2 cp = vec2(fract(frag.x / cw), fract((resolution.y - frag.y) / cw));

  // One scene sample per cell, taken at the cell centre (back in GL uv space)
  vec2 centre = vec2((gx + 0.5) * cw, resolution.y - (gy + 0.5) * cw);
  vec2 suv = clamp(centre / resolution, 0.0, 1.0);

  vec3 sc = applyAdjustments(texture2D(inputBuffer, suv).rgb);
  float level = clamp(dot(sc, vec3(0.299, 0.587, 0.114)), 0.0, 1.0);

  // Gate before the ramp - dither and jitter can lift a black cell to index 1
  // on their own, which speckles the empty background with stray glyphs
  if (level < uCutoff) {
    outputColor = vec4(0.0, 0.0, 0.0, 1.0);
    return;
  }

  // Cursor falloff, per cell so a glyph reacts as a whole unit rather than
  // being cut through. Needed this early because it drives glyph choice as
  // well as colour. Not named "patch" - that is a reserved word in GLSL ES.
  float cursorDist = distance(centre, uPointer);
  float cursor = (1.0 - smoothstep(uRevealInner, max(uRevealOuter, uRevealInner + 0.001), cursorDist)) * uRevealStrength;

  // Two ways to pick the glyph: a luminance ramp, or a per-cell random draw.
  // uCharJitter blends between them - 1.0 is the fully scattered look. The
  // hash is seeded on the cell only, so a glyph never flickers between frames.
  float dither = (bayer4(vec2(gx, gy)) - 0.5) / CHAR_N * 1.5;
  float ramp = clamp(level + dither, 0.0, 1.0) * (CHAR_N - 1.0);
  float scattered = hash(vec2(gx, gy) * 1.7 + 3.1) * (CHAR_N - 1.0);

  float ci = floor(mix(ramp, scattered, clamp(uCharJitter, 0.0, 1.0)) + 0.5);

  // Cells under the cursor redraw off a stepped clock so the disc reads as
  // churning text rather than per-frame static. Whether a cell churns at all
  // is a per-cell coin flip against the falloff, which frays the rim into
  // scattered flickers instead of a hard circle of motion. The flip is seeded
  // on the cell only, so a given cell stays in or out for the whole pass.
  float churn = clamp(cursor * uScrambleAmount, 0.0, 1.0);
  if (hash(vec2(gx, gy) * 9.1 + 5.7) < churn) {
    float tick = floor(time * max(uScrambleSpeed, 0.001));
    ci = floor(hash(vec2(gx, gy) * 5.3 + tick * 7.13) * (CHAR_N - 1.0) + 0.5);
  }

  ci = clamp(ci, 0.0, CHAR_N - 1.0);

  float zoom = max(uCharZoom, 0.01) * (1.0 - clamp(uCharGap, 0.0, 0.95));
  vec2 zcp = (cp - 0.5) / max(zoom, 0.01) + 0.5;
  if (zcp.x < 0.0 || zcp.x > 1.0 || zcp.y < 0.0 || zcp.y > 1.0) {
    outputColor = vec4(0.0, 0.0, 0.0, 1.0);
    return;
  }

  float ca = texture2D(uAtlas, vec2((ci + zcp.x) / CHAR_N, zcp.y)).a;
  if (ca < 0.05) {
    outputColor = vec4(0.0, 0.0, 0.0, 1.0);
    return;
  }

  // Which palette this cell lands on. All the reveal maths is done on this
  // single blend factor, so a ripple and the cursor patch can't stack into a
  // washed-out double mix. Distances are measured per cell rather than per
  // fragment so a glyph flips as a whole unit instead of being cut through.
  float m = uBaseMix;

  // Oldest first, so a newer disc paints over the ones already under it - a
  // click during a sweep starts turning the colour back from where you clicked.
  for (int i = 0; i < ${MAX_RIPPLES}; i++) {
    float rippleDist = distance(centre, uRippleCentre[i]);
    float ripple = 1.0 - smoothstep(uRippleInner[i], max(uRippleOuter[i], uRippleInner[i] + 0.001), rippleDist);
    m = mix(m, uRippleMix[i], clamp(ripple, 0.0, 1.0));
  }

  // The cursor disc inverts whatever it sits on, so it reads as white over the
  // orange state and orange over the revealed one.
  m = mix(m, 1.0 - m, clamp(cursor, 0.0, 1.0));

  // Keep the floor high so glyphs stay near --primary instead of muddy rust.
  vec3 col = vec3(mix(0.88, 1.05, level) * uColorIntensity)
    * mix(uCharColor, uRevealColor, clamp(m, 0.0, 1.0));

  if (uGrain > 0.5) {
    float gs = max(uGrainSize, 0.5);
    vec2 gp = floor(frag / gs) + floor(time * uGrainSpeed * 0.02);
    col += (hash(gp) - 0.5) * (uGrainIntensity / 100.0) * 0.8;
  }

  outputColor = vec4(clamp(col, 0.0, 1.0) * ca, 1.0);
}
`;

class AsciiEffectImpl extends Effect {
    constructor(config = MODEL_DITHER_DEFAULTS) {
        super("AsciiEffect", ASCII_FRAG, {
            // Required: this effect samples inputBuffer away from the current fragment
            attributes: EffectAttribute.CONVOLUTION,
            blendFunction: BlendFunction.SRC,
            uniforms: new Map([
                ["uAtlas", new THREE.Uniform(createAtlas())],
                ["uCharColor", new THREE.Uniform(new THREE.Color(config.charColor))],
                ["uCharColumns", new THREE.Uniform(config.charColumns)],
                ["uCharZoom", new THREE.Uniform(config.charZoom)],
                ["uCharGap", new THREE.Uniform(config.charGap)],
                ["uCharJitter", new THREE.Uniform(config.charJitter)],
                ["uBrightness", new THREE.Uniform(config.brightness)],
                ["uContrast", new THREE.Uniform(config.contrast)],
                ["uSaturation", new THREE.Uniform(config.saturation)],
                ["uGamma", new THREE.Uniform(config.gamma)],
                ["uBrightnessMap", new THREE.Uniform(config.brightnessMap)],
                ["uColorIntensity", new THREE.Uniform(config.colorIntensity)],
                ["uGrainIntensity", new THREE.Uniform(config.grainIntensity)],
                ["uGrainSize", new THREE.Uniform(config.grainSize)],
                ["uGrainSpeed", new THREE.Uniform(config.grainSpeed)],
                ["uInvert", new THREE.Uniform(config.invert ? 1 : 0)],
                ["uGrain", new THREE.Uniform(config.grain ? 1 : 0)],
                ["uPointer", new THREE.Uniform(new THREE.Vector2(-9999, -9999))],
                ["uRevealColor", new THREE.Uniform(new THREE.Color(config.revealColor))],
                ["uRevealInner", new THREE.Uniform(0)],
                ["uRevealOuter", new THREE.Uniform(0)],
                ["uRevealStrength", new THREE.Uniform(0)],
                ["uScrambleAmount", new THREE.Uniform(config.scrambleAmount)],
                ["uScrambleSpeed", new THREE.Uniform(config.scrambleSpeed)],
                ["uBaseMix", new THREE.Uniform(0)],
                [
                    "uRippleCentre",
                    new THREE.Uniform(
                        Array.from({ length: MAX_RIPPLES }, () => new THREE.Vector2(-1e6, -1e6)),
                    ),
                ],
                ["uRippleInner", new THREE.Uniform(new Array(MAX_RIPPLES).fill(0))],
                ["uRippleOuter", new THREE.Uniform(new Array(MAX_RIPPLES).fill(0))],
                ["uRippleMix", new THREE.Uniform(new Array(MAX_RIPPLES).fill(0))],
                ["uCutoff", new THREE.Uniform(config.cutoff)],
            ]),
        });
    }

    dispose() {
        this.uniforms.get("uAtlas")?.value?.dispose();
        super.dispose();
    }
}

/**
 * Push plain config values into the live uniforms.
 *
 * The effect is built once and mutated from here rather than being rebuilt when
 * config changes: reconstructing it would recompile the shader and re-rasterize
 * the glyph atlas, which is far too heavy to do on every drag of a control.
 *
 * charColumns is authored in CSS pixels; scaling by dpr keeps glyphs the same
 * visual size on retina instead of halving them.
 */
function syncUniforms(effect, config, dpr) {
    const u = effect.uniforms;

    u.get("uCharColumns").value = config.charColumns * dpr;
    u.get("uCharZoom").value = config.charZoom;
    u.get("uCharGap").value = config.charGap;
    u.get("uCharJitter").value = config.charJitter;
    u.get("uBrightness").value = config.brightness;
    u.get("uContrast").value = config.contrast;
    u.get("uSaturation").value = config.saturation;
    u.get("uGamma").value = config.gamma;
    u.get("uBrightnessMap").value = config.brightnessMap;
    u.get("uColorIntensity").value = config.colorIntensity;
    u.get("uGrainIntensity").value = config.grainIntensity;
    u.get("uGrainSize").value = config.grainSize;
    u.get("uGrainSpeed").value = config.grainSpeed;
    u.get("uInvert").value = config.invert ? 1 : 0;
    u.get("uGrain").value = config.grain ? 1 : 0;
    u.get("uScrambleAmount").value = config.scrambleAmount;
    u.get("uScrambleSpeed").value = config.scrambleSpeed;
    u.get("uCutoff").value = config.cutoff;
    u.get("uCharColor").value.set(config.charColor);
    u.get("uRevealColor").value.set(config.revealColor);
}

function AsciiPass({ config }) {
    const dpr = useThree((state) => state.viewport.dpr);
    const canvas = useThree((state) => state.gl.domElement);
    const size = useThree((state) => state.size);

    // Built once; see syncUniforms for why config changes don't rebuild it.
    const effect = useMemo(() => new AsciiEffectImpl(config), []); // eslint-disable-line react-hooks/exhaustive-deps

    const target = useRef({ x: -9999, y: -9999, inside: 0 });
    const smoothed = useRef(new THREE.Vector2(-9999, -9999));
    const strength = useRef(0);

    /** Settled palette: 0 = charColor, 1 = revealColor. Flips once a ripple lands. */
    const baseMix = useRef(0);
    /**
     * In-flight click ripples, oldest first. Each only ever grows - once one has
     * covered the screen its colour becomes the new base and it is retired.
     * Overlapping discs are allowed so a click never has to wait for the sweep
     * before it to finish.
     */
    const ripples = useRef([]);

    useEffect(() => () => effect.dispose(), [effect]);

    useLayoutEffect(() => {
        syncUniforms(effect, config, dpr);
    }, [effect, config, dpr]);

    useEffect(() => {
        // Pointer events are top-down in CSS pixels; the buffer is bottom-up in
        // device pixels
        const toBuffer = (event) => {
            const rect = canvas.getBoundingClientRect();
            return {
                x: (event.clientX - rect.left) * dpr,
                y: (rect.height - (event.clientY - rect.top)) * dpr,
            };
        };

        const onMove = (event) => {
            const point = toBuffer(event);
            target.current.x = point.x;
            target.current.y = point.y;
            target.current.inside = 1;
        };
        const onLeave = () => {
            target.current.inside = 0;
        };
        const onDown = (event) => {
            const point = toBuffer(event);
            target.current.x = point.x;
            target.current.y = point.y;
            target.current.inside = 1;

            // A ripple is pinned to the click that started it, so it can't drift with
            // the cursor mid-flight. A click during a sweep launches its own disc on
            // top rather than being swallowed, so the response is immediate.
            const waves = ripples.current;
            if (waves.length >= MAX_RIPPLES) return;

            // Toggle away from where the newest sweep is heading, not from the
            // settled base - otherwise a second click repaints the colour already on
            // its way in and reads as nothing happening.
            const heading = waves.length > 0 ? waves[waves.length - 1].mix : baseMix.current;
            waves.push({ x: point.x, y: point.y, mix: 1 - heading, progress: 0 });
        };

        window.addEventListener("pointermove", onMove, { passive: true });
        document.addEventListener("pointerleave", onLeave);
        window.addEventListener("blur", onLeave);
        canvas.addEventListener("pointerdown", onDown);

        return () => {
            window.removeEventListener("pointermove", onMove);
            document.removeEventListener("pointerleave", onLeave);
            window.removeEventListener("blur", onLeave);
            canvas.removeEventListener("pointerdown", onDown);
        };
    }, [canvas, dpr]);

    useFrame((_, delta) => {
        const to = target.current;
        const at = smoothed.current;
        const uniforms = effect.uniforms;

        if (strength.current < 0.001 && to.inside === 1) {
            // Snap on first appearance, otherwise it sweeps in from the corner
            at.set(to.x, to.y);
        } else if (to.inside === 1) {
            at.x = THREE.MathUtils.damp(at.x, to.x, config.revealDamping, delta);
            at.y = THREE.MathUtils.damp(at.y, to.y, config.revealDamping, delta);
        }

        const softness = THREE.MathUtils.clamp(config.revealSoftness, 0, 1);
        const patch = config.revealRadius * dpr;
        const feather = patch * softness;

        uniforms.get("uRevealInner").value = patch - feather;
        uniforms.get("uRevealOuter").value = patch;

        strength.current = THREE.MathUtils.damp(strength.current, to.inside, 8, delta);

        uniforms.get("uPointer").value.copy(at);
        uniforms.get("uRevealStrength").value =
            strength.current * config.revealStrength;

        // Grow the click ripples. The hard edge carries a constant-width feather
        // along with it - deriving the feather as a fraction of the radius instead
        // would blow it out to many times the diagonal near the end of the sweep.
        const waves = ripples.current;
        const diagonal = Math.hypot(size.width, size.height) * dpr;

        // Linear, so every edge sweeps at a constant speed. An eased progress would
        // dump most of the travel into the first fraction of the duration and the
        // spread would read as fast however long the duration is set.
        const step = delta / Math.max(config.expandDuration, 0.001);
        for (let i = 0; i < waves.length; i++) {
            waves[i].progress = Math.min(1, waves[i].progress + step);
        }

        // Discs launch in order and travel at the same speed, so only the front one
        // can be finished. At progress 1 it is wider than the diagonal, so it covers
        // the screen from any anchor and handing over to the base is invisible.
        while (waves.length > 0 && waves[0].progress >= 1) {
            baseMix.current = waves.shift().mix;
        }

        uniforms.get("uBaseMix").value = baseMix.current;

        const centres = uniforms.get("uRippleCentre").value;
        const inners = uniforms.get("uRippleInner").value;
        const outers = uniforms.get("uRippleOuter").value;
        const mixes = uniforms.get("uRippleMix").value;

        for (let i = 0; i < MAX_RIPPLES; i++) {
            const wave = waves[i];

            // Spare slots are parked off-screen with a zero radius, so a retired disc
            // leaves no stray blob sitting at the last click
            if (!wave) {
                centres[i].set(-1e6, -1e6);
                inners[i] = 0;
                outers[i] = 0;
                mixes[i] = 0;
                continue;
            }

            const inner = wave.progress * diagonal * 1.05;
            centres[i].set(wave.x, wave.y);
            inners[i] = inner;
            outers[i] = inner + feather;
            mixes[i] = wave.mix;
        }
    });

    return <primitive object={effect} dispose={null} />;
}

function usePrefersReducedMotion() {
    const [reduce, setReduce] = useState(false);

    useEffect(() => {
        const query = window.matchMedia("(prefers-reduced-motion: reduce)");
        const update = () => setReduce(query.matches);
        update();
        query.addEventListener("change", update);
        return () => query.removeEventListener("change", update);
    }, []);

    return reduce;
}

function Model({ config, src }) {
    const { scene } = useGLTF(src);
    const pivot = useRef(null);
    const cursorLight = useRef(null);
    const reduceMotion = usePrefersReducedMotion();

    const camera = useThree((state) => state.camera);
    const size = useThree((state) => state.size);

    // Scratch vectors, reused every frame
    const anchor = useMemo(() => new THREE.Vector3(), []);
    const cursorPoint = useMemo(() => new THREE.Vector3(), []);

    const { model, halfW, halfH } = useMemo(() => {
        const clone = scene.clone(true);

        // The GLB's material is metalness 1 with no env map, which renders black
        const material = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            metalness: 0.2,
            roughness: 0.32,
            side: THREE.DoubleSide,
        });
        clone.traverse((child) => {
            if (child.isMesh) child.material = material;
        });

        const box = new THREE.Box3().setFromObject(clone);
        const center = box.getCenter(new THREE.Vector3());
        const extent = box.getSize(new THREE.Vector3());
        const scale = 2 / Math.max(extent.x, extent.y, 0.0001);

        // Scale first, then offset by the *scaled* centre - the local matrix is
        // composed T * R * S, so an unscaled offset overshoots and the model ends
        // up orbiting a point outside itself.
        clone.scale.setScalar(scale);
        clone.position.copy(center).multiplyScalar(-scale);

        return {
            model: clone,
            halfW: (extent.x * scale) / 2,
            halfH: (extent.y * scale) / 2,
        };
    }, [scene]);

    // Frame the model against whichever axis is tighter so it never crops
    useLayoutEffect(() => {
        const aspect = size.width / Math.max(size.height, 1);
        const vFov = THREE.MathUtils.degToRad(camera.fov);
        const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect);

        const distV = halfH / Math.tan(vFov / 2);
        const distH = halfW / Math.tan(hFov / 2);

        camera.position.set(0, 0, Math.max(distV, distH) * config.fitMargin);
        camera.lookAt(0, 0, 0);
        camera.updateProjectionMatrix();
    }, [camera, size, halfW, halfH, config.fitMargin]);

    useFrame((state, delta) => {
        if (!pivot.current) return;

        const time = reduceMotion ? 0 : state.clock.elapsedTime;
        const pointerX = reduceMotion ? 0 : state.pointer.x;
        const pointerY = reduceMotion ? 0 : state.pointer.y;

        // state.pointer is measured from the centre of the viewport, but the
        // wrapper <group> can move this rig anywhere on screen. Re-measure it
        // from where the model actually lands, otherwise the neutral, untilted
        // pose sits wherever the group was offset to instead of under the
        // cursor, and the tilt reads as lopsided. Clamped so the offset can't
        // push the extremes past the sway range the amplitudes were tuned for.
        pivot.current.getWorldPosition(anchor).project(state.camera);
        const px = reduceMotion ? 0 : THREE.MathUtils.clamp(pointerX - anchor.x, -1, 1);
        const py = reduceMotion ? 0 : THREE.MathUtils.clamp(pointerY - anchor.y, -1, 1);

        const sway = Math.sin(time * config.swaySpeed) * config.swayAmplitude;
        const bob = Math.cos(time * config.swaySpeed * 0.7) * config.swayAmplitude * 0.4;

        const targetY = sway + px * config.pointerInfluence;
        const targetX = bob - py * config.pointerInfluence * 0.6;

        pivot.current.rotation.y = THREE.MathUtils.damp(
            pivot.current.rotation.y, targetY, config.damping, delta,
        );
        pivot.current.rotation.x = THREE.MathUtils.damp(
            pivot.current.rotation.x, targetX, config.damping, delta,
        );

        // Park the light at the cursor's world position, floating in front of the
        // model. It only ever lights geometry, so the background stays empty.
        if (cursorLight.current) {
            // Raw pointer, not the anchored one - the light tracks the cursor
            // itself, it isn't a tilt.
            cursorPoint.set(
                (pointerX * state.viewport.width) / 2,
                (pointerY * state.viewport.height) / 2,
                config.cursorLightDepth,
            );

            // Those are world units, but the light hangs off the same group the
            // model does, so a moved or scaled group would drag it away from the
            // cursor. Convert into the parent's space before writing it.
            cursorLight.current.parent.worldToLocal(cursorPoint);
            cursorLight.current.position.copy(cursorPoint);
        }
    });

    return (
        <>
            <ambientLight intensity={0.3} />
             <ambientLight intensity={0.3} />

            {/* <pointLight
                ref={cursorLight}
                intensity={config.cursorLightIntensity}
                distance={config.cursorLightDistance}
                decay={2}
            /> */}

            <group ref={pivot}>
                <primitive object={model} />
            </group>
        </>
    );
}

useGLTF.preload(MODEL_SRC);

/**
 * The scene itself. Takes a fully-resolved config - no defaults merging here, so
 * the leva wrapper and the plain path feed it through exactly the same door.
 */
export function ModelDitherScene({
    config,
    src,
    className,
    background,
    scale,
    position,
    rotation,
}) {
    return (
        <Canvas
            className={className}
            dpr={[1, 2]}
            camera={{ fov: 35, near: 0.1, far: 200, position: [0, 0, 6] }}
            gl={{ antialias: true }}
        >
            <color attach="background" args={[background]} />

            <Suspense fallback={null}>
                <group scale={scale} position={position} rotation={rotation}>
                    <Model config={config} src={src} />
                </group>
            </Suspense>

            <EffectComposer multisampling={4}>
                <AsciiPass config={config} />
            </EffectComposer>
        </Canvas>
    );
}

/*
 * Loaded on demand so leva stays out of the production bundle - it is only
 * pulled in for the branch that actually renders the panel. It reports values
 * upward rather than wrapping the scene, which keeps the two modules from
 * importing each other.
 */
const ModelDitherControls = dynamic(() => import("./with-leva"), { ssr: false });

/**
 * ASCII/dither pass over a 3D model.
 *
 * Pass `debug` to mount a leva panel bound to this effect's config. The panel
 * drives only these controls - anything else on the page is untouched.
 */
export default function HyperiuxModelDither({
    config,
    debug = false,
    src = MODEL_SRC,
    className = "",
    background = "#141314",
    scale = 1,
    position = [0, 0, 0],
    rotation = [0, 0, 0],
}) {
    const base = useMemo(
        () => ({ ...MODEL_DITHER_DEFAULTS, ...config }),
        [config],
    );

    // Whatever the panel last reported. Null until leva has mounted, and unused
    // entirely when debug is off, so the plain path renders straight from props.
    const [tweaked, setTweaked] = useState(null);
    const active = debug && tweaked ? tweaked : base;

    return (
        <>
            {debug ? <ModelDitherControls base={base} onChange={setTweaked} /> : null}
            <ModelDitherScene
                config={active}
                src={src}
                className={className}
                background={background}
                scale={scale}
                position={position}
                rotation={rotation}
            />
        </>
    );
}
