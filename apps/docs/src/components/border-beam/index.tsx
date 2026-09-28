import { ShoppingCart } from 'lucide-react'
import BeamBorder, { type BeamBorderProps } from './BorderBeam'
import Image from 'next/image'

type BorderBeamProps = Pick<BeamBorderProps, 'size' | 'colorVariant' | 'theme' | 'active' | 'strength' | 'duration' | 'beamWidth'> & {
  backgroundColor?: string
}

const cardData = {
  label: 'More offers',
  title: 'There is something else for you',
  description:
    'Animated edge light keeps the feature surface alive while the content stays calm and readable.',
  buttonLabel: 'Shop',
  buttonValue: 'All products',
  size: 'md',
  colorVariant: 'colorful',
  strength: 2,
} as const

export default function BorderBeam({
  size = cardData.size,
  colorVariant = cardData.colorVariant,
  theme = "auto",
  active = true,
  strength = cardData.strength,
  duration = 3.3,
  beamWidth = 9,
  backgroundColor = "#212121",
}: BorderBeamProps) {
  return (
    <BeamBorder
      size={size}
      colorVariant={colorVariant}
      theme={theme}
      active={active}
      strength={strength}
      duration={duration}
      beamWidth={beamWidth}
      className="h-full"
    >
      <div
        className="relative flex h-full min-h-0 overflow-hidden rounded-[10px] p-9 text-white shadow-[0_26px_60px_rgba(15,23,42,0.18)] max-sm:p-7"
        style={{ backgroundColor }}
      >
        <div className="relative z-10 flex flex-col">
          <p className="text-[0.9vw] max-md:text-[3vw] font-bold uppercase tracking-[0.12em] text-[#66D933] max-[1025px]:text-[3vw]">
            {cardData.label}
          </p>
          <h2 className="mt-4 text-[4.5vw] max-w-[60%] font-normal leading-[1.14] text-white max-sm:text-[6vw] max-[1025px]:text-[7vw]">
            {cardData.title}
          </h2>
        </div>

        <div className="absolute bottom-0 right-[-20%] h-[30vw] w-[40vw]  max-sm:right-[-44px] max-sm:scale-90 max-md:h-[50vw] max-md:w-[60vw] max-[1025px]:h-[50vw] max-[1025px]:w-[60vw] max-[1025px]:right-[-10%]">
          <Image
            src="/assets/img/earbud.png"
            alt="earbud"
            fill
            sizes="(max-width: 1024px) 280px, 250px"
            className="object-contain object-bottom"
            priority
          />
        </div>

        <button className="absolute bottom-8 left-9 z-10 flex min-w-[158px] items-center justify-between rounded-[12px] bg-white px-4 py-3 text-left text-black shadow-[0_18px_35px_rgba(0,0,0,0.16)] max-sm:left-7">
          <span>
            <span className="block text-[0.75vw] uppercase tracking-[0.04em] text-[#8E8E93] max-md:text-[2.5vw] max-[1025px]:text-[1.5vw]">
              {cardData.buttonLabel}
            </span>
            <span className="block text-[1.5vw] leading-tight text-[#1C1C1E] max-md:text-[3vw] max-[1025px]:text-[2.5vw]">
              {cardData.buttonValue}
            </span>
          </span>
          <span className="ml-5 flex h-10 w-10 items-center justify-center rounded-[10px] border border-black/10">
            <ShoppingCart className="h-5 w-5" strokeWidth={1.8} />
          </span>
        </button>
      </div>
    </BeamBorder>
  )
}
