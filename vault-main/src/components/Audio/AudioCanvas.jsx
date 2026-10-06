"use client";

import { useEffect, useRef } from "react";
import { prefersReducedMotion } from "@/lib/motion";

const LINE_WIDTH = 1.75;
const MAX_AMPLITUDE_RATIO = 10 / 44; // wave height relative to the button size
const PADDING_RATIO = 10 / 44;
const PHASE_SPEED = 0.05;
const MORPH_OFF_RATE = 0.15; // fast snap back to a line when turned off
const MORPH_ON_ELASTICITY = 0.025;

// Sound toggle: a line that morphs into a travelling sine wave when
// sound is on.
// Controlled: the caller owns the sound state (`isOn`) and what a click does.
export default function AudioCanvas({ isOn = false, onToggle, onHover, size = 44, className = "" }) {
    const canvasRef = useRef(null);
    const buttonRef = useRef(null);
    const stateRef = useRef({ phase: 0, morph: 0, isOn });

    // Latest on/off for the draw loop, without restarting it
    useEffect(() => {
        stateRef.current.isOn = isOn;
    }, [isOn]);

    // One loop draws the wave.
    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (!ctx) return undefined;
        const dpr = window.devicePixelRatio || 1;
        canvas.width = size * dpr;
        canvas.height = size * dpr;
        canvas.style.width = `${size}px`;
        canvas.style.height = `${size}px`;
        ctx.scale(dpr, dpr);

        const reduced = prefersReducedMotion();
        const S = stateRef.current;
        const padding = size * PADDING_RATIO;
        const width = size - padding * 2;
        const centerY = size / 2;
        const maxAmp = size * MAX_AMPLITUDE_RATIO;
        const steps = Math.floor(width * 2.5);
        let raf = 0;

        const draw = () => {
            raf = requestAnimationFrame(draw);

            // Morph: elastic toward the wave when on, a fast snap to a line when off
            if (reduced) S.morph = S.isOn ? 1 : 0;
            else if (S.isOn) {
                const distance = Math.abs(1 - S.morph);
                S.morph += (1 - S.morph) * MORPH_ON_ELASTICITY * (1 - Math.pow(1 - distance, 3));
            } else S.morph += (0 - S.morph) * MORPH_OFF_RATE;
            if (S.isOn && !reduced) S.phase += PHASE_SPEED;

            ctx.clearRect(0, 0, size, size);
            ctx.beginPath();
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = LINE_WIDTH;
            ctx.lineCap = "round";
            ctx.lineJoin = "round";
            for (let i = 0; i <= steps; i++) {
                const t = i / steps;
                const envelope = Math.max(0, Math.cos((t - 0.5) * Math.PI));
                const amplitude = envelope * S.morph * maxAmp * (0.85 + envelope * 0.15);
                const sin = Math.sin(t * Math.PI * 2.5 + S.phase);
                const y = centerY + sin * (1 - 0.15 * sin * sin) * amplitude;
                if (i === 0) ctx.moveTo(padding + t * width, y);
                else ctx.lineTo(padding + t * width, y);
            }
            ctx.stroke();
        };
        raf = requestAnimationFrame(draw);
        return () => cancelAnimationFrame(raf);
    }, [size]);

    return (
        <button
            ref={buttonRef}
            type="button"
            data-sound-toggle
            onClick={onToggle}
            onMouseEnter={() => onHover?.()}
            aria-pressed={isOn}
            aria-label={isOn ? "Turn sound off" : "Turn sound on"}
            title={isOn ? "Sound on" : "Sound off"}
            className={`relative flex shrink-0 cursor-pointer items-center justify-center overflow-hidden bg-white/10 p-0 backdrop-blur-lg ${className}`}
            style={{ width: size, height: size }}
        >
            <canvas ref={canvasRef} className="relative z-10" aria-hidden="true" />
        </button>
    );
}
