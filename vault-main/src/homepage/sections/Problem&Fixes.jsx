'use client'

import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/dist/ScrollTrigger'
import ScrambleText from '../components/ScrambleText'
import FadeText from '../components/FadeText'
import DrawCheck from '../components/DrawCheck'
import DrawCross from '../components/DrawCross'
import LineReveal from '@/components/Animations/LineReveal'
import { useFadeUp } from '@/components/Animations/gsapAnimations'

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
  useFadeUp(sectionRef)
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
      className="relative z-200  max-md:mt-[calc(var(--cvw)*-8)] w-full overflow-hidden px-[calc(var(--cvw)*4.5)] py-[7%] max-md:py-[12%] text-foreground max-md:px-[calc(var(--cvw)*7)] "
    >
      <div className="mx-auto relative z-200 flex w-full max-w-[1536px] flex-col items-center">
        <div className=" text-center w-[70%] max-md:w-full">
          <LineReveal as='h2' className="type-h1 w-full">
            Good Motion is{' '}
            <span className="gradient-text-animate">Harder</span> Than it Looks
          </LineReveal>
          <p data-fadeup-delay="0.2" className="type-body-lg fadeup mx-auto mt-[calc(var(--cvw)*3.5)] max-w-[calc(var(--cvw)*55)] text-foreground max-md:mt-[calc(var(--cvw)*5)] max-md:w-full max-md:max-w-full max-sm:mt-[calc(var(--cvw)*10)]">
          Anyone can add a fade. What&apos;s hard is everything around it. Get timing, restraint, or performance wrong, and the moment meant to impress becomes the reason the site feels worse. Most teams see that risk and drop their ambitions to play it safe. And your interface ends up looking like everyone else&apos;s.  Vault is engineered around that discipline by default, not as an afterthought.
          </p>
        </div>

        <div
          ref={cardsRef}
          className="mt-[calc(var(--cvw)*8)] px-10 max-md:px-0 h-fit w-full space-y-[calc(var(--cvw)*1)] max-md:mt-20 max-md:w-full max-md:space-y-5 max-sm:mt-20 max-sm:space-y-5"
        >
          <div className="type-body-lg flex w-full items-center justify-between px-[calc(var(--cvw)*.5)]">
            <p>The Risks</p>
            <p>What Vault Fixes</p>
          </div>

          {cards.map((item, index) => (
            <div
              key={item.title}
              className="tension-card bg-grey/30 backdrop-blur-lg flex items-center justify-between p-[calc(var(--cvw)*.7)] pr-[calc(var(--cvw)*1.5)] max-md:p-3 max-sm:p-2 max-sm:pr-2"
            >
              <div className="flex min-w-0 flex-1 items-center max-md:flex-col max-md:items-start max-md:gap-3 max-sm:gap-2.5">

                <div className="flex w-[calc(var(--cvw)*25)] pl-[calc(var(--cvw)*1)] shrink-0 items-center gap-[calc(var(--cvw)*1)] max-md:w-auto max-md:gap-4 max-sm:gap-2.5">

                  <FadeText
                    as="p"
                    lang="en"
                    className="type-body-lg capitalize max-sm:min-w-0 max-sm:flex-1 max-sm:wrap-break-word max-sm:hyphens-auto"
                    active={index <= activeIndex}
                    armed={armed}
                  >
                    {item.label}
                  </FadeText>
                  <div className="flex size-[calc(var(--cvw)*3)] shrink-0 items-center justify-center bg-background p-1 max-md:size-8 max-sm:size-9">
                    <DrawCross
                      active={index <= activeIndex}
                      armed={armed}
                      className="h-[60%] w-[60%]"
                    />
                  </div>
                </div>
                <p className="text-light-grey font-mono text18 max-md:w-[90%] max-md:flex-none max-md:px-0 max-md:text-[clamp(0.8rem,calc(var(--cvw)*2.6),1rem)]! max-md:pr-0! min-w-0 flex-1 px-[calc(var(--cvw)*2)] text-left [--scramble-flash:var(--primary)] [--scramble-pre:var(--primary)] max-sm:w-[75%]">
                  <ScrambleText
                    text={item.description}
                    active={index <= activeIndex}
                    armed={armed}
                  />
                </p>
              </div>

              <div className="flex w-[calc(var(--cvw)*13)] shrink-0 items-center gap-[calc(var(--cvw)*1)] justify-end max-md:gap-3 max-md:w-[38%] max-md:max-w-[40%] max-sm:w-[42%] max-sm:max-w-[48%] max-sm:gap-2">

                <FadeText
                  as="p"
                  className="type-body-lg whitespace-nowrap capitalize max-lg:whitespace-normal max-md:max-w-[10ch] max-md:text-right"
                  active={index <= activeIndex}
                  armed={armed}
                >
                  {item.title}
                </FadeText>
                <div className="flex size-[calc(var(--cvw)*3)] shrink-0 items-center justify-center bg-background p-2.5 max-md:size-8 max-sm:size-9">
                  <DrawCheck
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
