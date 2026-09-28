export const MENU_ANIM = {
    duration: 0.26,
    ease: 'power2.out',
    distance: 48,
    fade: true,
    heightDuration: 0.22,
    heightEase: 'power2.out',
    fadeDuration: 0.18,
    widthDuration: 0.32,
    widthEase: 'power2.out',
    // Open/close translate: the shell drops in from slightly above while
    // fading, and lifts back up on close.
    openY: -18,
    openDuration: 0.4,
    openEase: 'power3.out',
    // Links inside the panel rise up from below and fade in, one after the
    // other, once the shell has started opening.
    itemY: 14,
    itemDuration: 0.4,
    itemStagger: 0.035,
    itemDelay: 0.08,
    itemEase: 'power3.out',
}

// Panes cross-fade in place instead of sliding: `distance: 0` removes the
// travel, while the durations keep the swap and resize eased rather than
// instant. Opacity and box size read as a state change, not as movement.
export const REDUCED_MENU_ANIM = {
    ...MENU_ANIM,
    duration: 0.2,
    distance: 0,
    fade: true,
    heightDuration: 0.2,
    widthDuration: 0.2,
    openY: 0,
    openDuration: 0.2,
    itemY: 0,
    itemStagger: 0,
    itemDelay: 0,
    itemDuration: 0.2,
}

export const DROPDOWN_TEXT_ANIM = {
    duration: 0.3,
    leaveDuration: 0.3,
    stagger: 0.008,
    leaveStagger: 0.008,
    ease: 'power3.out',
    leaveEase: 'power3.out',
    idleColor: 'rgba(255, 255, 255, 0.75)',
    hoverColor: '#ffffff',
}

export const LOADER_COMPLETE_EVENT = 'loaderComplete'
export const HYPERIUX_LOADER_COMPLETE_EVENT = 'hyperiux:loader-complete'
