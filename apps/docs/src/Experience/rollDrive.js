// Shared drag-to-roll state for the rod groups.
//
// The rods only ever spin around their own local longitudinal (X) axis - the
// same axis the ambient animation uses - so they stay perfectly in place and
// just roll. Dragging feeds extra roll into that same axis, with inertia after
// release. Each group owns its own state object so they roll independently.

export const ROLL_SENSITIVITY = 0.01
const ROLL_DAMPING = 0.94
const ROLL_EPSILON = 0.00001

export function createRollState() {
    return { pendingDelta: 0, dragging: false, velocity: 0 }
}

// Called once per frame per group. Returns the roll delta (radians) to add to
// each rod's rotation.x this frame, advancing drag/inertia bookkeeping.
export function consumeRoll(state, active) {
    if (!state) return 0

    if (!active) {
        state.dragging = false
        state.velocity = 0
        state.pendingDelta = 0
        return 0
    }

    if (state.dragging) {
        const delta = state.pendingDelta
        state.velocity = delta // seed inertia with the latest motion
        state.pendingDelta = 0
        return delta
    }

    const delta = state.velocity
    state.velocity *= ROLL_DAMPING
    if (Math.abs(state.velocity) < ROLL_EPSILON) state.velocity = 0
    return delta
}
