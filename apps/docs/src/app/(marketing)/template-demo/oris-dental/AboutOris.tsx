import React from 'react'
import SplitTextLines from './effects/split-text-lines/SplitTextLines'
import SlotCounter from './effects/slot-counter/SlotCounter'

const STATS = [
  {
    number: "15+",
    label: "Years of Trusted Dental Practice"
  },
  {
    number: "30+",
    label: "Available Treatment Options Offered"
  },
  {
    number: "98%",
    label: "Patient Satisfaction Rating Overall"
  },
  {
    number: "8",
    label: "Experienced Dental Professionals"
  }
]

export default function AboutOris() {
  return (
    <section id='about-oris' className='h-fit w-full relative z-10 bg-white oris-paddx flex flex-col gap-[12vw] justify-between py-[10vw] max-[1025px]:min-h-0 max-[1025px]:py-[12vw] max-[1025px]:gap-12'>
      {/* Top Section: Subtitle Tag on Left, Main Heading on Right */}
      <div className="flex justify-between items-start w-full max-[1025px]:flex-col max-[1025px]:gap-6">
        {/* Left Subtitle Tag */}
        <div className="flex items-center gap-[0.5vw] max-[1025px]:gap-2 text-oris-secondary oris-text22 font-normal">
          <span className="inline-block w-[0.45vw] h-[0.45vw] max-[1025px]:w-2 max-[1025px]:h-2 rounded-full bg-oris-secondary"></span>
          <span>Who are we?</span>
        </div>

        {/* Right Main Heading */}
        <div className="w-[60vw] max-[1025px]:w-full">
          <SplitTextLines as="h2" className="oris-text64 text-oris-secondary leading-[1.2] font-normal!" start="top 85%">
            At Oris Dental, we believe everyone deserves a confident smile. Our skilled team offers personalized care using modern techniques and a gentle approach.
          </SplitTextLines>
        </div>
      </div>

      {/* Bottom Section: 4 Stat Columns */}
      <div className="grid grid-cols-4 max-[1025px]:grid-cols-2 gap-[7vw] max-[1025px]:gap-8 w-full  max-[1025px]:pt-6">
        {STATS.map((stat, idx) => (
          <div key={idx} className="flex flex-col shrink-0">
            <SlotCounter
              value={stat.number}
              className="oris-text64 font-normal! text-oris-secondary leading-none"
              baseDelay={idx * 0.12}
              duration={1.6}
            />
            <SplitTextLines as="p" className="oris-text22 text-oris-secondary mt-[1.2vw] max-[1025px]:mt-2 max-w-[22vw] max-[1025px]:max-w-full leading-snug" delay={idx * 0.05}>
              {stat.label}
            </SplitTextLines>
          </div>
        ))}
      </div>
    </section>
  )
}
