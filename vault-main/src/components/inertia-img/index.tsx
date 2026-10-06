'use client'

import InertiaImageComp from './InertiaImgComp';
import { usePrefersReducedMotion } from '@/lib/motion';

const images = [
    "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/inertia-img/inertia-1.png",
    "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/inertia-img/inertia-2.png",
    "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/inertia-img/inertia-3.png",
    "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/inertia-img/inertia-4.png",
    "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/inertia-img/inertia-5.png",
    "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/inertia-img/inertia-6.png",
    "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/inertia-img/inertia-7.png",
    "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/inertia-img/inertia-8.png",
    "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/inertia-img/inertia-9.png",
    "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/inertia-img/inertia-1.png",
    "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/inertia-img/inertia-2.png",
    "https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/inertia-img/inertia-3.png",
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
