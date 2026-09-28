// Built using Hyperiux Vault: https://vault.hyperiux.com

'use client'

import { useEffect, useState } from 'react';
import InertiaImageComp from './InertiaImgComp';

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

const images = [
   "https://picsum.photos/seed/1/800/600",
    "https://picsum.photos/seed/2/800/600",
    "https://picsum.photos/seed/3/800/600",
    "https://picsum.photos/seed/4/800/600",
    "https://picsum.photos/seed/5/800/600",
    "https://picsum.photos/seed/6/800/600",
    "https://picsum.photos/seed/7/800/600",
    "https://picsum.photos/seed/8/800/600",
    "https://picsum.photos/seed/9/800/600",
    "https://picsum.photos/seed/10/800/600",
    "https://picsum.photos/seed/11/800/600",
    "https://picsum.photos/seed/12/800/600",
];

const InertiaImage = ({
  strength = 1,
  rotation = 0,
  scale = 1,
  duration = 0.4,
}) => {
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <>
      <InertiaImageComp
        images={images}
        strength={strength}
        rotation={rotation}
        scale={scale}
        duration={duration}
      />
      {prefersReducedMotion && (
        <div
          aria-live="polite"
          className="pointer-events-none fixed bottom-5 right-4 z-40 w-fit max-w-65 rounded-md border border-white/15 bg-white/5 p-3 text-center  backdrop-blur-sm max-[1025px]:hidden"
        >
          <h2 className="text-sm leading-none text-white">
            The image keeps drifting.
          </h2>
          <p className="mt-2 text-xs leading-5 text-white/65">
            Inertia Image moves with simulated momentum from your cursor or touch.
            Because the physics is the effect, reduced motion can&apos;t be
            honored here.
          </p>
        </div>
      )}
    </>
  )
}

export default InertiaImage
