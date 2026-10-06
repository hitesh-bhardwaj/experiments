"use client";

import { useEffect } from "react";
import { Leva, folder, useControls } from "leva";

/**
 * Leva panel for HyperiuxModelDither.
 *
 * Renders no scene of its own - it reports the current values up through
 * `onChange` and the effect owns the rendering. That keeps this module a leaf,
 * so it can stay behind a dynamic import without a cycle back into index.jsx.
 *
 * Every control here belongs to the model ASCII pass. Nothing else on the page
 * is wired to this panel.
 */
export default function ModelDitherControls({ base, onChange }) {
    const values = useControls("Model ASCII", {
        Glyphs: folder(
            {
                charColumns: { value: base.charColumns, min: 20, max: 300, step: 1 },
                charZoom: { value: base.charZoom, min: 0.1, max: 3, step: 0.01 },
                charGap: { value: base.charGap, min: 0, max: 0.95, step: 0.01 },
                charJitter: { value: base.charJitter, min: 0, max: 1, step: 0.01 },
                charColor: { value: base.charColor },
                /** Cells below this luminance draw nothing - raise to clear speckle. */
                cutoff: { value: base.cutoff, min: 0, max: 0.5, step: 0.005 },
            },
            { collapsed: false },
        ),

        Image: folder(
            {
                brightness: { value: base.brightness, min: -100, max: 100, step: 1 },
                contrast: { value: base.contrast, min: -100, max: 100, step: 1 },
                saturation: { value: base.saturation, min: -100, max: 100, step: 1 },
                gamma: { value: base.gamma, min: 0.1, max: 3, step: 0.01 },
                brightnessMap: { value: base.brightnessMap, min: 0.1, max: 3, step: 0.01 },
                colorIntensity: { value: base.colorIntensity, min: 0, max: 3, step: 0.01 },
                invert: { value: base.invert },
            },
            { collapsed: true },
        ),

        Grain: folder(
            {
                grain: { value: base.grain },
                grainIntensity: { value: base.grainIntensity, min: 0, max: 100, step: 1 },
                grainSize: { value: base.grainSize, min: 0.5, max: 10, step: 0.1 },
                grainSpeed: { value: base.grainSpeed, min: 0, max: 200, step: 1 },
            },
            { collapsed: true },
        ),

        Motion: folder(
            {
                swayAmplitude: { value: base.swayAmplitude, min: 0, max: 1.5, step: 0.01 },
                swaySpeed: { value: base.swaySpeed, min: 0, max: 3, step: 0.01 },
                pointerInfluence: { value: base.pointerInfluence, min: 0, max: 2, step: 0.01 },
                damping: { value: base.damping, min: 0.5, max: 20, step: 0.1 },
                fitMargin: { value: base.fitMargin, min: 0.8, max: 3, step: 0.01 },
            },
            { collapsed: true },
        ),

        "Cursor light": folder(
            {
                cursorLightIntensity: {
                    value: base.cursorLightIntensity, min: 0, max: 40, step: 0.1,
                },
                cursorLightDistance: {
                    value: base.cursorLightDistance, min: 0.1, max: 20, step: 0.1,
                },
                cursorLightDepth: {
                    value: base.cursorLightDepth, min: -5, max: 10, step: 0.05,
                },
            },
            { collapsed: true },
        ),

        Reveal: folder(
            {
                revealColor: { value: base.revealColor },
                revealRadius: { value: base.revealRadius, min: 0, max: 600, step: 1 },
                revealSoftness: { value: base.revealSoftness, min: 0, max: 1, step: 0.01 },
                revealStrength: { value: base.revealStrength, min: 0, max: 1, step: 0.01 },
                revealDamping: { value: base.revealDamping, min: 1, max: 40, step: 0.5 },
                scrambleAmount: { value: base.scrambleAmount, min: 0, max: 1, step: 0.01 },
                scrambleSpeed: { value: base.scrambleSpeed, min: 0, max: 60, step: 0.5 },
                /** Seconds for a click ripple to cross the screen. */
                expandDuration: { value: base.expandDuration, min: 0.1, max: 8, step: 0.05 },
            },
            { collapsed: true },
        ),
    });

    // leva returns a stable object until something actually changes, so this
    // settles after one pass instead of looping against the parent's state.
    useEffect(() => {
        onChange({ ...base, ...values });
    }, [base, values, onChange]);

    return <Leva collapsed titleBar={{ title: "Model ASCII" }} />;
}
