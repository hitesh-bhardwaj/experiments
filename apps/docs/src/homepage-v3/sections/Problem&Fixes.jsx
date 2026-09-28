'use client'

import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/dist/ScrollTrigger'
import ScrambleTextV3 from '../components/ScrambleTextV3'
import FadeTextV3 from '../components/FadeTextV3'
import DrawCheckV3 from '../components/DrawCheckV3'
import DrawCrossV3 from '../components/DrawCrossV3'
import LineReveal from '@/components/Animations/LineReveal'
import SplitLine from '@/components/WebsiteComps/SplitLine'

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger)
}

// Timeline seconds between two cards sliding up. Also the duration of each
// card's y tween, so consecutive steps meet without overlapping.
const STEP = 0.8

const cards = [
  {
    title: 'Timing',
    description: 'Precise timing and sequencing tuned against actual hardware.',
    label: 'Dropped Frames',
  },
  {
    title: 'Restraint',
    description: 'Motion that supports content, not distracts from it.',
    label: 'Motion Noise',
  },
  {
    title: 'Reduced-motion',
    description: 'Respects user preferences and accessibility out of the box.',
    label: 'Device Motion Off',
  },
  {
    title: 'Performance budget',
    description: 'No unexplained CLS, no jank, no dropped frames as standard.',
    label: 'Jank & Layout Shift',
  },
  {
    title: 'Dependency clarity',
    description: "Dependency-honest. Every effect pulls in only what's needed.",
    label: 'Hidden Bundle Size',
  },
  {
    title: 'Mobile fallbacks',
    description: 'Responsive behavior built for touch and smaller screens.',
    label: 'Touch Devices ',
  },
  {
    title: 'Cleanup on unmount',
    description: 'No leaks, no ghosts, no lingering listeners.',
    label: 'Memory Leaks',
  },
]

export default function ProblemFixes() {
  const sectionRef = useRef(null)
  const cardsRef = useRef(null)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [armed, setArmed] = useState(false)

  useEffect(() => {
    const section = sectionRef.current
    if (!section) return

    let ctx

    const mount = () => {
      setArmed(true)

      ctx = gsap.context(() => {
        const cardEls = gsap.utils.toArray('.tension-card')
        const total = cardEls.length

        const rowHeight =
          total > 1
            ? cardEls[1].getBoundingClientRect().top -
            cardEls[0].getBoundingClientRect().top
            : 60

        cardEls.forEach((card, i) => {
          gsap.set(card, {
            position: 'relative',
            zIndex: total - i,
            y: -i * rowHeight,
            opacity: i === 0 ? 1 : 0,
          })
        })

        const revealCard = (index) => ({
          onStart: () => setActiveIndex((current) => Math.max(current, index)),
          onReverseComplete: () =>
            setActiveIndex((current) => Math.min(current, index - 1)),
        })

        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: cardsRef.current,
            start: 'top 70%',
            end: 'bottom 50%',
            scrub: true,
            markers: false,
          },
        })

        // Reveal card 0 on start
        tl.to(
          cardEls[0],
          {
            duration: 0.1,
            ...revealCard(0),
          },
          0,
        )

        for (let i = 1; i < total; i++) {
          const t = i * STEP

          for (let j = i; j < total; j++) {
            // Each card gets one y tween per step, so the tweens must abut
            // rather than overlap: a timeline renders children in reverse order
            // when scrubbed backwards, which would hand the overlap to the
            // previous tween and snap the card by a fraction of a row.
            tl.to(
              cardEls[j],
              { y: -(j - i) * rowHeight, duration: STEP, ease: 'power1.out' },
              t,
            )
          }

          tl.to(
            cardEls[i],
            {
              opacity: 1,
              duration: 0.6,
              ease: 'linear',
              ...revealCard(i),
            },
            t + 0.1,
          )
        }
      }, sectionRef)
    }

    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          io.disconnect()
          mount()
        }
      },
      { rootMargin: '500px 0px' },
    )
    io.observe(section)

    return () => {
      io.disconnect()
      ctx?.revert()
    }
  }, [])

  return (
    <section
      ref={sectionRef}
      className="relative z-200 mt-[12vw] max-md:mt-[-8vw] w-full overflow-hidden px-[3vw] pb-[10%] text-white max-[1025px]:px-[5vw] max-md:px-[6vw] max-md:py-24 max-sm:px-5 max-sm:py-20"
    >
      <div className="mx-auto relative z-200 flex w-full flex-col items-center">
        <div className="w-full text-center">
          <LineReveal as='h2' className="t96 w-full">
            Good Motion is{' '}
            <span className="gradient-text-animate">Harder</span> Than It Looks
          </LineReveal>
          <SplitLine delay={.25} as='p' className="text24 mx-auto mt-[3.5vw] max-w-[60vw] leading-[1.55] text-white max-[1025px]:mt-[4vw] max-[1025px]:max-w-[85vw] max-md:mt-[5vw] max-md:max-w-[85vw] max-md:text-sm max-sm:mt-[10vw] max-sm:max-w-full max-sm:leading-[1.3]">
          Anyone can add a fade. What&apos;s hard is everything around it. Get timing, restraint, or performance wrong, and the moment meant to impress becomes the reason the site feels worse. Most teams see that risk and drop their ambitions to play it safe. And your interface ends up looking like everyone else&apos;s.  Vault is engineered around that discipline by default, not as an afterthought.
          </SplitLine>
        </div>

        <div
          ref={cardsRef}
          className="mt-[8vw] h-fit w-[85vw] space-y-[1vw] max-[1025px]:mt-[10vw] max-[1025px]:w-full max-[1025px]:space-y-[2vw] max-md:mt-20 max-md:w-full max-md:space-y-5 max-sm:mt-20 max-sm:space-y-5"
        >
          <div className="text24 flex w-full items-center justify-between px-[.5vw] max-sm:text-sm">
            <p>The Risks</p>
            <p>What Vault Fixes</p>
          </div>

          {cards.map((item, index) => (
            <div
              key={item.title}
              className="tension-card bg-grey/30 flex items-center justify-between p-[.7vw] pr-[1.5vw] max-[1025px]:p-[2vw] max-md:p-3 max-sm:p-2 max-sm:pr-2"
            >
              <div className="flex min-w-0 flex-1 items-center max-[1025px]:flex-col max-[1025px]:items-start max-[1025px]:gap-[2vw] max-md:flex-col max-md:items-start max-md:gap-3 max-sm:gap-2.5">

                <div className="flex w-[25vw] pl-[1vw] shrink-0 items-center gap-[1vw] max-[1025px]:w-auto max-[1025px]:gap-[2vw] max-md:gap-4 max-sm:w-auto max-sm:gap-2.5">

                  <FadeTextV3
                    as="p"
                    lang="en"
                    className="text24 capitalize max-sm:min-w-0 max-sm:flex-1 max-sm:text-base! max-sm:leading-tight max-sm:wrap-break-word max-sm:hyphens-auto"
                    active={index <= activeIndex}
                    armed={armed}
                  >
                    {item.label}
                  </FadeTextV3>
                  <div className="flex size-[3vw] shrink-0 items-center justify-center bg-background p-1 max-[1025px]:size-[5vw] max-md:size-8 max-sm:size-9">
                    <DrawCrossV3
                      active={index <= activeIndex}
                      armed={armed}
                      className="h-[60%] w-[60%]"
                    />
                  </div>
                </div>
                <p className="text-light-grey font-mono text18 max-[1025px]:w-[90%] max-[1025px]:flex-none max-[1025px]:px-0 max-md:text-[3vw]! max-md:pr-0! min-w-0 flex-1 px-[2vw] text-left [--scramble-flash:var(--primary)] [--scramble-pre:var(--primary)] max-sm:w-[75%] max-sm:flex-none max-sm:px-0">
                  <ScrambleTextV3
                    text={item.description}
                    active={index <= activeIndex}
                    armed={armed}
                  />
                </p>
              </div>

              <div className="flex w-[13vw] shrink-0 items-center gap-[1vw] max-[1025px]:w-auto max-[1025px]:max-w-[40%] justify-end max-[1025px]:gap-[2vw] max-md:w-[38%] max-md:max-w-[40%] max-sm:w-[42%] max-sm:max-w-[48%] max-sm:gap-2">

                <FadeTextV3
                  as="p"
                  className="text24 whitespace-nowrap capitalize max-[1025px]:whitespace-normal max-[1025px]:max-w-[10ch] max-[1025px]:text-right max-[1025px]:leading-[1.15] max-sm:text-base!"
                  active={index <= activeIndex}
                  armed={armed}
                >
                  {item.title}
                </FadeTextV3>
                <div className="flex size-[3vw] shrink-0 items-center justify-center bg-background p-2.5 max-[1025px]:size-[5vw] max-md:size-8 max-sm:size-9">
                  <DrawCheckV3
                    active={index <= activeIndex}
                    armed={armed}
                    className="h-full w-full"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
