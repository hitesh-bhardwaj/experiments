'use client'

import { useCallback, useEffect, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import gsap from 'gsap'
import { useLenis } from 'lenis/react'
import { prefersReducedMotion } from '@/lib/motion'
import { useInteraction } from '@/homepage/components/InteractionProvider'
import { GridDots } from '@/components/grid-dots'

/**
 * Site-wide route transition for the main pages, built on the pixel-transition
 * demo (components/pixel-transition): a canvas grid of pixels fills up from the
 * bottom-left on leave, then drains away from the top-left on enter.
 *
 * Navigations between sidebar (workspace) pages are left alone, so they keep
 * their own loading screen (RouteLoading via loading.js / VaultLayout).
 */
const COLS = 40
const ROWS = 40
const COLOR = '#ff5f00'
const DURATION_LEAVE = 1.0
const DURATION_ENTER = 0.8

const easeInOut = (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t)

function drawGrid(canvas, progress, isEnter, fromTopLeft = false) {
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  const w = canvas.clientWidth
  const h = canvas.clientHeight

  const isMobile = window.innerWidth < 640
  const cols = isMobile ? 10 : COLS
  const rows = isMobile ? 50 : ROWS
  const cellW = w / cols
  const cellH = h / rows
  const totalDiag = cols + rows

  ctx.clearRect(0, 0, w, h)
  ctx.fillStyle = COLOR

  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      const diag = fromTopLeft ? c + r : c + (rows - 1 - r)
      const cellDelay = (diag / totalDiag) * 0.45
      const speed = (c + r) % 2 === 0 ? 0.28 : 0.36
      const local = easeInOut(Math.max(0, Math.min(1, (progress - cellDelay) / speed)))

      const fillAmount = isEnter ? 1 - local : local
      if (fillAmount <= 0.001) continue

      const x1 = Math.floor(c * cellW)
      const x2 = Math.floor((c + 1) * cellW) + (isMobile ? 6 : 1)
      const y1 = Math.floor(r * cellH)
      const y2 = Math.floor((r + 1) * cellH) + 1
      const fillH = Math.ceil((y2 - y1) * fillAmount)
      ctx.fillRect(x1, y2 - fillH, x2 - x1, fillH)
    }
  }
}

// Internal workspace routes (skip transition when navigating internally)
const INTERNAL_WORKSPACE_PREFIXES = [
  '/dashboard',
  '/app/dashboard',
  '/effects',
  '/templates',
  '/docs',
  '/legal',
  '/mcp',
  '/demo/aperture-transition',
  '/demo/aperture-transition/page2',
  '/demo/svg-brush-transition',
  '/demo/svg-brush-transition/page2',
  '/demo/sweep-lift-transition',
  '/demo/sweep-lift-transition/page2',
  '/demo/depth-shift-transition',
  '/demo/depth-shift-transition/page2',
  '/demo/radial-slice-transition',
  '/demo/radial-slice-transition/page2',
  '/demo/ascend-transition',
  '/demo/ascend-transition/page2',
  '/demo/chess-grid-transition',
  '/demo/chess-grid-transition/page2',
  '/demo/block-transition',
  '/demo/block-transition/page2',
  '/demo/page-flip-transition',
  '/demo/page-flip-transition/page2',
  '/demo/pixel-transition',
  '/demo/pixel-transition/page2',
  '/templates'
]

function isInternalWorkspaceRoute(path) {
  if (!path) return false
  return INTERNAL_WORKSPACE_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(prefix + '/')
  )
}

function shouldSkipTransition(prevPath, targetPath) {
  // Completely skip transitions for all /templates*** routes
  if (targetPath?.startsWith('/templates') || prevPath?.startsWith('/templates')) {
    return true
  }
  if (isInternalWorkspaceRoute(prevPath) && isInternalWorkspaceRoute(targetPath)) {
    return true
  }
  return false
}

export default function PixelPageTransition() {
  const pathname = usePathname()
  const router = useRouter()
  const lenis = useLenis()
  const { sound } = useInteraction()

  const canvasRef = useRef(null)
  const loaderRef = useRef(null)
  const tweenRef = useRef(null)
  const stateRef = useRef({ progress: 0 })
  const prevPathRef = useRef(pathname)
  const isFirstRenderRef = useRef(true)
  const isTransitioningRef = useRef(false)
  const forcedTransitionRef = useRef(false)

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const w = window.innerWidth
    const h = window.innerHeight
    canvas.width = Math.ceil(w * dpr)
    canvas.height = Math.ceil(h * dpr)
    canvas.style.width = `${w}px`
    canvas.style.height = `${h}px`
    canvas.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0)
  }, [])

  const setLoaderVisible = useCallback((visible) => {
    const loader = loaderRef.current
    if (!loader) return
    gsap.to(loader, {
      opacity: visible ? 1 : 0,
      duration: visible ? 0.22 : 0.18,
      ease: 'power2.out',
      overwrite: true,
    })
  }, [])

  const animateGrid = useCallback(({ duration, isEnter, fromTopLeft = false, onComplete }) => {
    const canvas = canvasRef.current
    if (!canvas) {
      onComplete()
      return
    }
    canvas.style.opacity = '1'
    canvas.style.pointerEvents = 'all'
    stateRef.current.progress = 0
    drawGrid(canvas, 0, isEnter, fromTopLeft)

    tweenRef.current?.kill()
    tweenRef.current = gsap.to(stateRef.current, {
      progress: 1,
      duration,
      ease: 'none',
      onUpdate: () => drawGrid(canvas, stateRef.current.progress, isEnter, fromTopLeft),
      onComplete: () => {
        drawGrid(canvas, 1, isEnter, fromTopLeft)
        if (isEnter) {
          setLoaderVisible(false)
          canvas.style.opacity = '0'
          canvas.style.pointerEvents = 'none'
        }
        onComplete()
      },
    })
  }, [setLoaderVisible])

  useEffect(() => {
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)
    return () => {
      window.removeEventListener('resize', resizeCanvas)
      tweenRef.current?.kill()
    }
  }, [resizeCanvas])

  // We reset scroll ourselves on reveal, so stop the browser restoring it on top.
  useEffect(() => {
    const previous = window.history.scrollRestoration
    window.history.scrollRestoration = 'manual'
    return () => {
      window.history.scrollRestoration = previous
    }
  }, [])

  // 1. Cover the page with pixels BEFORE the route change on a link click
  useEffect(() => {
    const handleAnchorClick = (e) => {
      const anchor = e.target.closest('a')
      if (!anchor) return

      const href = anchor.getAttribute('href')
      if (!href) return

      if (
        href.startsWith('http') ||
        href.startsWith('//') ||
        href.startsWith('mailto:') ||
        href.startsWith('tel:') ||
        href.startsWith('#') ||
        anchor.target === '_blank' ||
        // In-page view switches (e.g. the vault door's sign-in/sign-up panes)
        anchor.hasAttribute('data-no-page-transition') ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey
      ) {
        return
      }

      const currentPath = window.location.pathname
      let targetPath
      try {
        const url = new URL(href, window.location.origin)
        if (url.origin !== window.location.origin) return
        targetPath = url.pathname
      } catch {
        return
      }
      if (currentPath === targetPath) return

      // data-page-transition opts a link in even inside the workspace (docs prev / next)
      const forced = anchor.dataset.pageTransition !== undefined
      if (!forced && shouldSkipTransition(currentPath, targetPath)) return
      if (prefersReducedMotion()) return

      e.preventDefault()
      if (isTransitioningRef.current) return
      isTransitioningRef.current = true
      forcedTransitionRef.current = forced

      // Silent until the visitor has turned sound on (the engine gates itself)
      sound?.whoosh()
      setLoaderVisible(false)
      animateGrid({
        duration: DURATION_LEAVE,
        isEnter: false,
        onComplete: () => {
          setLoaderVisible(true)
          router.push(href)
        },
      })
    }

    document.addEventListener('click', handleAnchorClick, { capture: true })
    return () => document.removeEventListener('click', handleAnchorClick, { capture: true })
  }, [animateGrid, router, setLoaderVisible, sound])

  // 2. Reveal the new page once the route has changed
  useEffect(() => {
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false
      prevPathRef.current = pathname
      return
    }

    const prevPath = prevPathRef.current
    prevPathRef.current = pathname

    const forced = forcedTransitionRef.current
    forcedTransitionRef.current = false
    if (!isTransitioningRef.current || (!forced && shouldSkipTransition(prevPath, pathname))) {
      isTransitioningRef.current = false
      return
    }

    // router.push() skips next/link's scroll-to-top, so reset native + Lenis
    // scroll while the pixels still hide the page (repeated as content streams in).
    if (!window.location.hash) {
      const resetScroll = () => {
        lenis?.scrollTo?.(0, { immediate: true, force: true })
        window.scrollTo(0, 0)
      }
      resetScroll()
      requestAnimationFrame(resetScroll)
      requestAnimationFrame(() => requestAnimationFrame(resetScroll))
      window.setTimeout(resetScroll, 150)
    }

    setLoaderVisible(true)
    animateGrid({
      duration: DURATION_ENTER,
      isEnter: true,
      fromTopLeft: true,
      onComplete: () => {
        isTransitioningRef.current = false
      },
    })
  }, [pathname, animateGrid, lenis, setLoaderVisible])

  return (
    <>
      {/* Above every page layer - the cookie nudge (z-9000), modals (z-9999) and toasts
          (z-100000) included - so nothing shows through the transition. */}
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="pointer-events-none fixed top-0 left-0 z-100001 h-screen w-screen opacity-0"
      />
      <div
        ref={loaderRef}
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-100002 flex items-center justify-center opacity-0"
      >
        <GridDots size={56} squareSize={8} color="#111111" />
      </div>
    </>
  )
}
