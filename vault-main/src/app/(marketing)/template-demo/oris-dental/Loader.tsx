'use client'

import React, { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import OrisDentalLogo from './assets/OrisDental.svg'
import { getDownloadRatio, getModelLoadState } from './teeth-3d/modelLoadState'

/** Share of the bar owned by the raw GLB download. */
const DOWNLOAD_CEILING = 92
/** Where the bar creeps to while the downloaded bytes are being parsed. */
const STALL_CEILING = 97
/** Floor the bar creeps along before the first chunk lands, so it is never frozen at 0. */
const WARMUP_CEILING = 15
/** Asymptote for the parse/compile phase; the last point is bought by a real frame. */
const PARSED_TARGET = 99.4
/** How long we wait for the first rendered frame after the model parses. */
const READY_GRACE_MS = 2500
/** No bytes at all by now means there is no 3D on this device -- do not hold the page. */
const NO_START_TIMEOUT_MS = 4000
/** Absolute ceiling. A slow CDN must never strand the visitor on a blue screen. */
const HARD_TIMEOUT_MS = 14000
/** Beat at 100% before the fade starts. */
const HOLD_AT_FULL_MS = 350
/** Matches the CSS fade duration below. */
const REMOVE_AFTER_MS = 750
/** Exponential smoothing rate, in units of "per second". */
const EASE_RATE = 5

export default function Loader({ onComplete }: { onComplete?: () => void }) {
    const [completed, setCompleted] = useState(false)
    const [visible, setVisible] = useState(true)
    const fillRef = useRef<HTMLDivElement | null>(null)
    const finishedRef = useRef(false)
    const onCompleteRef = useRef(onComplete)

    // Kept in a ref so a new callback identity never restarts the animation.
    useEffect(() => {
        onCompleteRef.current = onComplete
    }, [onComplete])

    useEffect(() => {
        const start = performance.now()
        let last = start
        let raf = 0
        let shown = 0
        let fullBytesAt = 0
        let parsedAt = 0
        let holdTimer: ReturnType<typeof setTimeout> | undefined
        let removeTimer: ReturnType<typeof setTimeout> | undefined

        const write = (value: number) => {
            const el = fillRef.current
            if (el) el.style.clipPath = `inset(0 ${(100 - value).toFixed(2)}% 0 0)`
        }

        const finish = () => {
            if (finishedRef.current) return
            finishedRef.current = true

            holdTimer = setTimeout(() => {
                setCompleted(true)
                if (typeof window !== 'undefined') {
                    ;(window as any).__orisLoaderFinished = true
                    window.dispatchEvent(new CustomEvent('oris-loader-finished'))
                }
                onCompleteRef.current?.()
                removeTimer = setTimeout(() => setVisible(false), REMOVE_AFTER_MS)
            }, HOLD_AT_FULL_MS)
        }

        const tick = (now: number) => {
            const state = getModelLoadState()
            const elapsed = now - start

            if (state.parsed && !parsedAt) parsedAt = now

            let target: number

            if (state.ready) {
                target = 100
            } else if (state.parsed) {
                // Shaders are compiling and the first frame has not landed. Keep inching
                // rather than parking on a number, so the wait never reads as a hang.
                const settle = 1 - Math.exp(-(now - parsedAt) / 1500)
                target = STALL_CEILING + (PARSED_TARGET - STALL_CEILING) * settle
            } else {
                const ratio = getDownloadRatio()
                if (ratio >= 1) {
                    // The denominator is nominal, so "all bytes in" is a strong hint
                    // rather than a fact. Creep on instead of claiming to be done.
                    if (!fullBytesAt) fullBytesAt = now
                    const settle = 1 - Math.exp(-(now - fullBytesAt) / 2000)
                    target = DOWNLOAD_CEILING + (STALL_CEILING - DOWNLOAD_CEILING) * settle
                } else {
                    // The warm-up floor only leads while the first chunk is in flight.
                    const warmup = WARMUP_CEILING * (1 - Math.exp(-elapsed / 1200))
                    target = Math.max(ratio * DOWNLOAD_CEILING, warmup)
                }
            }

            const stalledAfterParse = parsedAt > 0 && now - parsedAt > READY_GRACE_MS
            const neverStarted = elapsed > NO_START_TIMEOUT_MS && state.bytesLoaded === 0
            if (stalledAfterParse || neverStarted || elapsed > HARD_TIMEOUT_MS) target = 100

            // Frame-rate independent easing. dt is clamped because the GLTF parse blocks
            // the main thread outright -- without the clamp the bar would teleport on the
            // first frame after the stall instead of catching up smoothly.
            const dt = Math.min((now - last) / 1000, 1 / 20)
            last = now
            shown += (target - shown) * (1 - Math.exp(-EASE_RATE * dt))

            if (target >= 100 && shown > 99.5) shown = 100
            write(shown)

            if (shown >= 100) {
                finish()
                return
            }

            raf = requestAnimationFrame(tick)
        }

        raf = requestAnimationFrame(tick)

        return () => {
            cancelAnimationFrame(raf)
            if (holdTimer) clearTimeout(holdTimer)
            if (removeTimer) clearTimeout(removeTimer)
        }
    }, [])

    if (!visible) return null

    return (
        <aside
            aria-label="Loading"
            className={`fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-gradient-to-b from-[#3365e2] to-[#0f2b82] text-white transition-all duration-700 ease-[cubic-bezier(0.85,0,0.15,1)] ${
                completed ? 'opacity-0 pointer-events-none scale-105' : 'opacity-100 pointer-events-auto'
            }`}
        >
            {/* Ambient soft glow */}
            <div className="absolute w-[20vw] h-[20vw] rounded-full bg-white/10 blur-3xl pointer-events-none" />

            {/* Clean Watermark Logo Fill */}
            <div className="relative z-10 flex flex-col items-center select-none px-6">
                <div className="relative w-[32vw] max-w-[360px] min-w-[220px] aspect-[1872/334]">
                    {/* Background faint watermark outline */}
                    <Image
                        src={OrisDentalLogo}
                        alt="OrisDental"
                        fill
                        className="object-contain opacity-20 pointer-events-none"
                        priority
                    />

                    {/* Foreground filled watermark. Driven straight from rAF -- a CSS
                        transition here would trail the real progress by its own duration,
                        which is what read as lag. */}
                    <div
                        ref={fillRef}
                        className="absolute inset-0 pointer-events-none"
                        style={{ clipPath: 'inset(0 100% 0 0)', willChange: 'clip-path' }}
                    >
                        <Image
                            src={OrisDentalLogo}
                            alt="OrisDental"
                            fill
                            className="object-contain"
                            priority
                        />
                    </div>
                </div>
            </div>
        </aside>
    )
}
