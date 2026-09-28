// Built using Hyperiux Vault: https://vault.hyperiux.com

'use client'

import ImageTrail from './MagneticTrail'
import { useEffect, useState } from 'react'

function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setPrefersReducedMotion(mediaQuery.matches)
    update()
    mediaQuery.addEventListener('change', update)
    return () => mediaQuery.removeEventListener('change', update)
  }, [])

  return prefersReducedMotion
}

interface MagneticImageTrailProps {
  trailLength?: number
  magnetStrength?: number
  scaleIn?: number
  scaleOut?: number
  lerp?: number
  size?: number
}

const Content = () => (
  <main className="relative min-h-screen max-md:h-screen w-full overflow-hidden bg-[#f4f4f1] text-black">

    <div className="absolute top-[30%] left-1/2 w-[50%] hidden max-[1025px]:flex -translate-x-1/2 -translate-y-1/2 h-fit max-md:w-[70%] px-6 text-center">
      <p className="rounded-xl bg-black/10 px-5 py-3 leading-[1.2] text-base text-black backdrop-blur-sm">
        Follow the motion. <br />
        Open on desktop for the full magnetic effect
      </p>
    </div>

    {/* content */}
    <section className="flex min-h-screen items-end px-8 pb-8">
      <div>
        <h1 className="font-mono text-[8vh] max-md:text-[15vw] leading-none w-[30vw] font-black uppercase">
          Magnetic
          <br />
          Image Trail
        </h1>

        <p className="mt-6 font-mono text-sm uppercase tracking-[0.25em] text-black/40">
          Cursor · Images · Momentum
        </p>
      </div>
    </section>

  </main>
)

export default function MagneticImageTrail(props: MagneticImageTrailProps) {
  const [isMobile, setIsMobile] = useState<boolean | null>(null)
  const prefersReducedMotion = usePrefersReducedMotion()

  useEffect(() => {
    const check = () => {
      setIsMobile(window.innerWidth < 1025)
    }

    check()
    window.addEventListener('resize', check)

    return () => window.removeEventListener('resize', check)
  }, [])

  // prevent desktop component flash during hydration
  if (isMobile === null) return null

  return isMobile ? (
    <Content />
  ) : (
    <>
      <ImageTrail {...props} />
      {prefersReducedMotion && (
        <div
          aria-live="polite"
          className="pointer-events-none fixed bottom-4 right-4 z-9000 w-fit max-w-65 rounded-md border border-black/10 bg-white/40 p-3 text-center max-[1025px]:hidden"
        >
          <h2 className="text-sm leading-none text-[#111111]">
            The images keep pulling.
          </h2>
          <p className="mt-2 text-xs leading-5 text-black/65">
            Magnetic Image Trail animates images being drawn toward your
            cursor in real time. Pausing that motion would remove the
            effect.
          </p>
        </div>
      )}
    </>
  )
}
