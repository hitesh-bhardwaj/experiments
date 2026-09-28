// Built using Hyperiux Vault: https://vault.hyperiux.com

'use client'

import { useEffect, useState, type ComponentProps } from 'react'
import CharacterTrailComp from './CharacterTrailComp'

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

const Content = () => (
  <main className="relative min-h-screen max-md:h-screen w-full overflow-hidden bg-[#f4f4f1] text-black">

    <div className="absolute max-md:bottom-30 max-[1025px]:bottom-30 max-[1025px]:left-1/2 max-[1025px]:-translate-x-1/2  hidden  max-md:w-full max-[1025px]:w-[50%] mx-auto  max-[1025px]:flex h-fit w-[90%] px-6 text-center text-white">
      <p className="rounded-full bg-black/10 px-5 py-3 leading-[1.2] max-md:text-base max-[1025px]:text-xl text-black backdrop-blur-sm">
        Not just something to watch, something to move. Open on desktop
      </p>
    </div>

    {/* content */}
    <section className="flex min-h-screen items-center justify-center px-8 pb-8">
      <div>
        <h1 className="font-mono text-[12vh] max-[1025px]:text-[13vw] max-md:w-full max-[1025px]:w-[90%] max-md:text-[15vw] leading-[1.2]  font-black uppercase">
          Snake Cursor Trail
        </h1>

        <p className="mt-6 font-mono text-sm max-md:text-xs max-[1025px]:text-sm text-center uppercase tracking-[0.25em] text-black/40">
          Sequential · Reactive · Grid Based
        </p>
      </div>
    </section>

    <p className="absolute bottom-8 right-8 max-w-105 text-right font-mono text-sm leading-relaxed text-black/55 max-[1025px]:hidden">
      Wake the grid with your cursor. Draw slow corners, quick turns,
      little loops - the letters will stitch your path into a living trail.
    </p>

  </main>
)

const CharacterTrail = (props: ComponentProps<typeof CharacterTrailComp>) => {
     const [isMobile, setIsMobile] = useState(false)
     const prefersReducedMotion = usePrefersReducedMotion()

  useEffect(() => {
    const check = () => {
      setIsMobile(window.innerWidth < 1025)
    }

    check()
    window.addEventListener('resize', check)

    return () => window.removeEventListener('resize', check)
  }, [])
  return (
    <>
     {isMobile ? (
        <Content />
      ) : (
        <CharacterTrailComp {...props}>
          <Content />
        </CharacterTrailComp>
      )}
      {!isMobile && prefersReducedMotion && (
        <div
          aria-live="polite"
          className="pointer-events-none fixed top-25 right-8 z-50000 w-fit max-w-65 rounded-md border bg-white/10 border-black/10 backdrop-blur-sm  p-3 text-center max-[1025px]:hidden"
        >
          <h2 className="text-sm leading-none text-[#111111]">
            The characters keep trailing.
          </h2>
          <p className="mt-2 text-xs leading-5 text-black/65">
            Character Trail redraws letters along your cursor&apos;s path in real
            time. The animation can&apos;t be reduced without removing the effect.
          </p>
        </div>
      )}
    </>
  )
}

export default CharacterTrail
