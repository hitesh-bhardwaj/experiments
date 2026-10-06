import { useEffect, useLayoutEffect } from 'react'
import { LOADER_STORAGE_KEY } from '../Loader'

export function isLoaderRunning() {
    if (typeof window === 'undefined') return false

    return (
        document.body.classList.contains('loader-active') ||
        window.__HYPERIUX_LOADER_RUNNING__ === true
    )
}

export function hasLoaderCompleted() {
    if (typeof window === 'undefined') return false

    return (
        window.sessionStorage.getItem(LOADER_STORAGE_KEY) === 'true' ||
        window.__HYPERIUX_LOADER_COMPLETE__ === true
    )
}

export function markLoaderCompleted() {
    if (typeof window === 'undefined') return

    try {
        window.sessionStorage.setItem(LOADER_STORAGE_KEY, 'true')
    } catch {}

    window.__HYPERIUX_LOADER_COMPLETE__ = true
    window.__HYPERIUX_LOADER_RUNNING__ = false
    document.body.classList.remove('loader-active')
}

export function getPaneHeight(element) {
    if (!element) return 0
    return element.offsetHeight || element.scrollHeight || 0
}

export function getPageScrollProgress() {
    if (typeof window === 'undefined') return 0

    const scrollableHeight =
        document.documentElement.scrollHeight - window.innerHeight

    if (scrollableHeight <= 0) return 1

    return window.scrollY / scrollableHeight
}

export const useIsomorphicLayoutEffect =
    typeof window !== 'undefined' ? useLayoutEffect : useEffect
