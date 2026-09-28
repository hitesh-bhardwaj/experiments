"use client";

import { useEffect } from "react";
import { Leva, folder, useControls } from "leva";

import { CHAR_SET_NAMES, DEFAULT_CHAR_SET } from "./char-sets";

/**
 * Leva panel for CubeBackgroundAscii.
 *
 * Renders no canvas of its own - it reports the current values up through
 * `onChange` and the effect owns the rendering. That keeps this module a leaf,
 * so it can stay behind a dynamic import without a cycle back into index.jsx.
 *
 * The per-cell sample count is compiled into the shader source, so it is not
 * exposed here. The glyph set is compiled in too, but is worth switching, so it
 * is a control - picking a new one relinks the program and rebuilds the atlas.
 */
export default function CubeAsciiControls({ base, onChange }) {
    const values = useControls("Cube ASCII", {
        Glyphs: folder(
            {
                /** Which characters the ramp is drawn from; see CHAR_SETS. */
                charSet: {
                    value: base.charSet ?? DEFAULT_CHAR_SET,
                    options: CHAR_SET_NAMES,
                },
                charColumns: { value: base.charColumns, min: 20, max: 400, step: 1 },
                charZoom: { value: base.charZoom, min: 0.1, max: 3, step: 0.01 },
                charGap: { value: base.charGap, min: 0, max: 0.95, step: 0.01 },
                /** Sub-step dither on the ramp index; 0 gives hard bands. */
                dither: { value: base.dither, min: 0, max: 1, step: 0.01 },
                /** Compensates the atlas mipmap thinning small glyphs out. */
                glyphGain: { value: base.glyphGain, min: 0.5, max: 4, step: 0.05 },
            },
            { collapsed: false },
        ),

        Framing: folder(
            {
                /** Below 1 shrinks the subject inside the same character grid. */
                videoScale: { value: base.videoScale, min: 0.2, max: 2, step: 0.01 },
                /** Canvas widths/heights from center; positive x right, y down. */
                videoOffsetX: { value: base.videoOffsetX, min: -1, max: 1, step: 0.01 },
                videoOffsetY: { value: base.videoOffsetY, min: -1, max: 1, step: 0.01 },
            },
            { collapsed: false },
        ),

        Levels: folder(
            {
                /**
                 * The pair that decides whether the image is visible at all. The clip is
                 * high-key, so this window has to bracket its actual range or every cell
                 * collapses onto one ramp step.
                 */
                levelsLow: { value: base.levelsLow, min: 0, max: 1, step: 0.005 },
                levelsHigh: { value: base.levelsHigh, min: 0, max: 1, step: 0.005 },
                /** Below 1 pushes more cells onto the blank slots - this sets sparseness. */
                brightnessMap: { value: base.brightnessMap, min: 0.1, max: 3, step: 0.01 },
                /**
                 * Output levels - the slice of the curved tone the glyph ramp spans.
                 * Narrow this onto the range the clip actually lands in or the ramp is
                 * only indexed over its bottom slots and one letter carries the frame.
                 */
                rampLow: { value: base.rampLow ?? 0, min: 0, max: 1, step: 0.005 },
                rampHigh: { value: base.rampHigh ?? 1, min: 0, max: 1, step: 0.005 },
                invert: { value: base.invert },
            },
            { collapsed: false },
        ),

        Image: folder(
            {
                brightness: { value: base.brightness, min: -100, max: 100, step: 1 },
                contrast: { value: base.contrast, min: -100, max: 100, step: 1 },
                saturation: { value: base.saturation, min: -100, max: 100, step: 1 },
                gamma: { value: base.gamma, min: 0.1, max: 3, step: 0.01 },
            },
            { collapsed: true },
        ),

        Color: folder(
            {
                charBrightness: { value: base.charBrightness, min: 0, max: 2, step: 0.01 },
                colorIntensity: { value: base.colorIntensity, min: 0, max: 3, step: 0.01 },
                /** How much cell luminance shades the glyph on top of the ramp. */
                colorFromVideo: { value: base.colorFromVideo, min: 0, max: 1, step: 0.01 },
            },
            { collapsed: true },
        ),

        Fluid: folder(
            {
                fluidEnabled: { value: base.fluidEnabled },
                fluidColor: { value: base.fluidColor },
                /** Coverage - how easily flow paints orange onto glyphs. */
                fluidTint: {
                    value: base.fluidTint ?? 1.2,
                    min: 0,
                    max: 3,
                    step: 0.05,
                    label: "tint (coverage)",
                },
                /** Heat - how neon/hot that orange reads. */
                fluidBoost: {
                    value: base.fluidBoost ?? 1.35,
                    min: 0.5,
                    max: 3,
                    step: 0.05,
                    label: "boost (heat)",
                },
                fluidForceBase: { value: base.fluidForceBase, min: 0, max: 1, step: 0.01 },
                fluidSpeedSat: { value: base.fluidSpeedSat, min: 1, max: 60, step: 0.5 },
                fluidForceMultiplier: {
                    value: base.fluidForceMultiplier, min: 0, max: 1, step: 0.01,
                },
                fluidInnerRadius: {
                    value: base.fluidInnerRadius, min: 0, max: 5, step: 0.05,
                },
                fluidRadiusLife: {
                    value: base.fluidRadiusLife, min: 0, max: 5, step: 0.05,
                },
            },
            { collapsed: false },
        ),

        /**
         * The click wave - the ring that expands from a pointerdown. Separate
         * from Fluid above: that is the hover trail, this is the click.
         */
        "Click Wave": folder(
            {
                waveEnabled: { value: base.waveEnabled ?? true },
                waveColor: { value: base.waveColor ?? "#f55300" },
                waveTint: {
                    value: base.waveTint ?? 0,
                    min: 0,
                    max: 5,
                    step: 0.05,
                    label: "tint (coverage)",
                },
                /** Seconds from click to the ring finishing. */
                waveDuration: {
                    value: base.waveDuration ?? 1.8,
                    min: 0.3,
                    max: 6,
                    step: 0.05,
                    label: "duration (s)",
                },
                /** Travel distance as a fraction of the canvas diagonal. */
                waveReach: {
                    value: base.waveReach ?? 1.25,
                    min: 0.2,
                    max: 3,
                    step: 0.05,
                    label: "reach",
                },
                /** Thickness of the lit band at the moment of the click. */
                waveWidth: {
                    value: base.waveWidth ?? 210,
                    min: 10,
                    max: 600,
                    step: 5,
                    label: "band width (px)",
                },
                /** Share of band cells churning through random glyphs. */
                waveScramble: {
                    value: base.waveScramble ?? 1.0,
                    min: 0,
                    max: 1,
                    step: 0.01,
                    label: "scramble",
                },
                /** Extra brightness at the centre of the band. */
                waveGlow: {
                    value: base.waveGlow ?? 0,
                    min: 0,
                    max: 4,
                    step: 0.05,
                    label: "glow",
                },
            },
            { collapsed: false },
        ),

        Grain: folder(
            {
                grain: { value: base.grain },
                grainIntensity: { value: base.grainIntensity, min: 0, max: 100, step: 1 },
                grainSize: { value: base.grainSize, min: 0, max: 10, step: 0.1 },
                grainSpeed: { value: base.grainSpeed, min: 0, max: 200, step: 1 },
                /** 0 leaves the empty cells pure black. */
                grainOnEmpty: { value: base.grainOnEmpty, min: 0, max: 1, step: 0.01 },
            },
            { collapsed: true },
        ),
    });

    // leva returns a stable object until something actually changes, so this
    // settles after one pass instead of looping against the parent's state.
    useEffect(() => {
        onChange({ ...base, ...values });
    }, [base, values, onChange]);

    // Leva defaults to a fixed top-right portal, so parent `left/right` classes
    // alone do nothing. `fill` keeps the panel inside this positioned shell.
    return (
        <div className="pointer-events-none fixed bottom-4 right-4 z-9999">
            <div className="pointer-events-auto rounded-md w-[20vw] max-w-[calc(100vw-2rem)]">
                <Leva
                    fill
                    flat
                    collapsed
                    titleBar={{ title: "Cube ASCII", drag: true }}
                />
            </div>
        </div>
    );
}
