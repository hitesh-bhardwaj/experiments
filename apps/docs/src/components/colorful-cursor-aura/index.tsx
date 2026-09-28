'use client'

import ColorfulCursorAuraComp from './ColorfulCursorAuraComp'
import { usePrefersReducedMotion } from '@/lib/motion'

const ColorfulCursorAura = ({
  auraSize = 325,
  color1 = '#a78bfa',
  color2 = '#fb7185',
  color3 = '#fde68a',
  followSpeed = 0.12,
}) => {
  const prefersReducedMotion = usePrefersReducedMotion()

  return (
     <div className="relative min-h-screen bg-white">
      <ColorfulCursorAuraComp
        text="One hover, and suddenly your UI has personality"
        auraSize={auraSize}
        color1={color1}
        color2={color2}
        color3={color3}
        followSpeed={followSpeed}
        enableEntryAnimation={true}
      />

      <div className="absolute bottom-8 left-1/2 hidden -translate-x-1/2 text-center max-[1025px]:block">
        <p className="text-[3vw] font-medium leading-[1.2] text-zinc-700 max-md:text-[4vw]">
          Open on desktop to experience the mouse effect
        </p>
      </div>

      {prefersReducedMotion && (
        <div
          aria-live="polite"
          className="pointer-events-none fixed bottom-4 right-4 z-40 w-fit max-w-65 rounded-md border border-black/10 bg-white/10 p-3 text-center  max-[1025px]:hidden"
        >
          <h2 className="text-sm leading-none text-[#111111]">
            The aura keeps glowing.
          </h2>
          <p className="mt-2 text-xs leading-5 text-black/65">
            Colorful Cursor Aura renders continuously shifting color driven by
            cursor movement. The motion is the entire effect, so it
            can&apos;t be reduced.
          </p>
        </div>
      )}
    </div>
  )
}

export default ColorfulCursorAura
