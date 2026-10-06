'use client'

/**
 * Module-level load state for the hero teeth model.
 *
 * The Loader and the Canvas mount in the same commit and neither owns the
 * other, so progress has to live outside React. It is polled from the Loader's
 * rAF loop rather than pushed through state -- a 10 MB download fires hundreds
 * of progress events, and re-rendering the Loader on each one is what made the
 * fill stutter in the first place.
 */

export interface ModelLoadState {
    /** Decompressed bytes handed to the GLTF loader so far. */
    bytesLoaded: number
    /** Expected decompressed size, or 0 while still unknown. */
    bytesTotal: number
    /** GLTF resolved: downloaded, parsed, geometry + textures uploaded. */
    parsed: boolean
    /** Scene has actually rendered, so shaders are compiled and nothing stalls on reveal. */
    ready: boolean
}

/**
 * Expected decompressed size of teeth.glb, used purely to pace the bar.
 *
 * The GLB is served gzipped, so the response is chunked and carries no
 * Content-Length -- three's FileLoader then reports `total: 0` on every
 * progress event and leaves nothing to divide by. `loaded` is still exact, so a
 * nominal denominator is enough. A real total always wins over this when the
 * server does send one, and re-exporting the model at a different size only
 * shifts the pacing: completion is gated on the parsed/ready flags below, never
 * on this number.
 */
const NOMINAL_MODEL_BYTES = 10_516_184

const state: ModelLoadState = {
    bytesLoaded: 0,
    bytesTotal: 0,
    parsed: false,
    ready: false,
}

export function getModelLoadState(): ModelLoadState {
    return state
}

export function reportModelDownload(loaded: number, total: number) {
    // Monotonic: a retried or deduplicated request must never walk the bar backwards.
    if (loaded > state.bytesLoaded) state.bytesLoaded = loaded
    if (total > state.bytesTotal) state.bytesTotal = total
}

export function markModelParsed() {
    state.parsed = true
}

export function markModelReady() {
    state.parsed = true
    state.ready = true
}

/** Download progress as 0..1, using the real Content-Length when one exists. */
export function getDownloadRatio(): number {
    const total = state.bytesTotal > 0 ? state.bytesTotal : NOMINAL_MODEL_BYTES
    return Math.min(1, state.bytesLoaded / total)
}
