'use client'
import { useEffect, useId, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { prefersReducedMotion } from '@/lib/motion'
gsap.registerPlugin(ScrollTrigger)

const floatingWords = [
  { text: 'MOTION', color: 'bg-sky-300', start: { top: '6%', left: '10%', xPercent: -50, yPercent: -50 } },
  { text: 'UI', color: 'bg-pink-300', start: { top: '6%', left: '52%', xPercent: -50, yPercent: -50 } },
  { text: 'ANIMATE', color: 'bg-purple-300', start: { top: '12%', left: '78%', xPercent: -50, yPercent: -50 } },
  { text: 'COMPONENTS', color: 'bg-pink-200', start: { top: '18%', left: '20%', xPercent: -50, yPercent: -50 } },
  { text: 'EFFECTS', color: 'bg-purple-200', start: { top: '26%', left: '88%', xPercent: -50, yPercent: -50 } },
  { text: 'DESIGN', color: 'bg-purple-200', start: { top: '42%', left: '10%', xPercent: -50, yPercent: -50 } },
  { text: 'INTERACTIVE', color: 'bg-orange-200', start: { top: '40%', left: '82%', xPercent: -50, yPercent: -50 } },
  { text: 'SCROLL', color: 'bg-orange-300', start: { top: '65%', left: '72%', xPercent: -50, yPercent: -50 } },
  { text: 'WEBGL', color: 'bg-sky-200', start: { top: '70%', left: '16%', xPercent: -50, yPercent: -50 } },
  { text: 'CREATE', color: 'bg-sky-200', start: { top: '85%', left: '44%', xPercent: -50, yPercent: -50 } },
  { text: 'BUILD', color: 'bg-pink-200', start: { top: '74%', left: '85%', xPercent: -50, yPercent: -50 } },
 {
  text: 'TRANSITIONS',
  color: 'bg-orange-200',

  start: {
    top: '88%',
    left: '12%',
    xPercent: -50,
    yPercent: -50,
  },

  mobile: {
    top: '82%',
    left: '25%',
    xPercent: -50,
    yPercent: -50,
  },
},
  { text: 'SHADERS', color: 'bg-sky-300', start: { top: '88%', left: '32%', xPercent: -50, yPercent: -50 } },
  { text: 'FUTURISTIC', color: 'bg-purple-300', start: { top: '90%', left: '54%', xPercent: -50, yPercent: -50 } },
  { text: 'EXPERIENCES', color: 'bg-orange-300', start: { top: '88%', left: '76%', xPercent: -50, yPercent: -50 } },
  { text: 'HYPERIUX', color: 'bg-sky-200', start: { top: '92%', left: '90%', xPercent: -50, yPercent: -50 } },
]

export default function GridScale({
  bgColor = "#242424",
  panelColor = "#ffffff",
  convergeStagger = 0.7,
}) {
  const uid = useId().replace(/:/g, "");
  const sectionId = `grid-scale-${uid}`;
  const centeredTextRef = useRef(null);
  const ideaTextRef = useRef(null);

  useEffect(() => {
    const isMobile = window.innerWidth < 640
    const reducedMotion = prefersReducedMotion()
    const ease = reducedMotion ? 'none' : 'power2.out'
    const easeOut4 = reducedMotion ? 'none' : 'power4.out'

    const clipFrom = isMobile
      ? 'inset(25% 18% 25% 18% round 0%)'
      : 'inset(20% 35% 20% 35% round 0%)'

    // Set the initial clip-path via GSAP before the timeline runs
    gsap.set('.clip-path', { clipPath: clipFrom })


    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: `#${sectionId}`,
          start: 'top top',
          end: '40% bottom',
          scrub: true,
        },
      })

      tl.fromTo(ideaTextRef.current, { opacity: 1 }, {
        opacity: 0,
        ease: easeOut4,
        duration: 0.1,
      });

      tl.fromTo(
        '.clip-path',
        { clipPath: clipFrom },
        {
          clipPath: 'inset(0% 0% 0% 0% round 0%)',
          ease,
        },
        0
      )

    const blockTranslate = isMobile ? 90 : 100
const blockSide = isMobile ? '18%' : '35%'
const blockTop = isMobile ? '25%' : '20%'

gsap.set('.tl-box', {
  xPercent: -blockTranslate,
  yPercent: -blockTranslate,
  transformOrigin: 'bottom right',
})

gsap.set('.tr-box', {
  xPercent: blockTranslate,
  yPercent: -blockTranslate,
  transformOrigin: 'bottom left',
})

gsap.set('.bl-box', {
  xPercent: -blockTranslate,
  yPercent: blockTranslate,
  transformOrigin: 'top right',
})

gsap.set('.br-box', {
  xPercent: blockTranslate,
  yPercent: blockTranslate,
  transformOrigin: 'top left',
})

tl.fromTo(
  '.tl-box',
  { top: blockTop, left: blockSide },
  { top: '0%', left: '0%', ease },
  0
)

tl.fromTo(
  '.tr-box',
  { top: blockTop, right: blockSide },
  { top: '0%', right: '0%', ease },
  0
)

tl.fromTo(
  '.bl-box',
  { bottom: blockTop, left: blockSide },
  { bottom: '0%', left: '0%', ease },
  0
)

tl.fromTo(
  '.br-box',
  { bottom: blockTop, right: blockSide },
  { bottom: '0%', right: '0%', ease },
  0
)

      tl.fromTo('.grid-line-t', { top: '20%', scaleX: 1 }, { top: '0%', scaleX: 0, ease }, 0)
      tl.fromTo('.grid-line-b', { top: '80%', scaleX: 1 }, { top: '100%', scaleX: 0, ease }, 0)
      tl.fromTo('.grid-line-l', { left: '35%', scaleY: 1 }, { left: '0%', scaleY: 0, ease }, 0)
      tl.fromTo('.grid-line-r', { right: '35%', scaleY: 1 }, { right: '0%', scaleY: 0, ease }, 0)
    })

    return () => ctx.revert()
  }, [sectionId])

  useEffect(() => {
    const isMobile = window.innerWidth < 640
    const reducedMotion = prefersReducedMotion()
    const converge = reducedMotion ? 'none' : 'power2.inOut'
    const floatingWordSelectors = floatingWords.map((_, i) => `.floating-word-${i}`)

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: `#${sectionId}`,
          start: 'top top',
          end: '100% bottom',
          scrub: true,
          markers: false,
        },
      });

      gsap.set(floatingWordSelectors, { opacity: 0 });

      floatingWords.forEach((word, i) => {
        gsap.set(
          `.floating-word-${i}`,
          isMobile && word.mobile
            ? word.mobile
            : word.start
        );
      });

      gsap.set(floatingWordSelectors, { opacity: 1 });

      tl.fromTo(centeredTextRef.current, { opacity: 0 }, {
        opacity: 1,
        duration: .5,
      },);
      tl.to(
        floatingWords.map((_, i) => `.floating-word-${i}`),
        {
          // Reduced motion: fade out in place - no converging-to-center
          // movement, just an opacity drop at each word's own position.
          ...(reducedMotion ? {} : { top: '50%', left: '50%', xPercent: -50, yPercent: -50 }),
          opacity: 0,
          ease: converge,
          stagger: {
            amount: convergeStagger,
            each: 0.1,
            grid: "auto",
            from: "random"
          }
        },
        "<"
      );
    });

    return () => ctx.revert();
  }, [sectionId, convergeStagger]);

  return (
    <>
      <section id={sectionId} className='h-[400vh] w-full' style={{ backgroundColor: bgColor }}>
        <div className='h-screen w-full sticky top-0 overflow-hidden'>
          <div
            className="clip-path flex items-center justify-center z-200 absolute top-0 left-0 w-full h-screen"
            style={{ backgroundColor: panelColor }}
          >
            <h1 ref={centeredTextRef} className='text-[#242424] opacity-0 w-[60vw] text-center leading-[1.1] text-[3.5vw] max-md:text-[4.5vw]'>
              Building futuristic interfaces
              <br />
              with motion, interaction, and depth.
            </h1>
            <p ref={ideaTextRef} className='text-[#242424] max-[1025px]:w-[20vw] max-md:w-[45vw] absolute top-1/2 left-1/2 text-center -translate-x-1/2 -translate-y-1/2 leading-[1.1] max-[1025px]:text-[5vw] text-[2.2vw]'>Need immersive UI?<br /> Hyperiux makes it <br /> move.</p>
          </div>

          {/* Corner Boxes */}
          <div className='grid-line-t w-full h-0.5 origin-center bg-white/10 absolute top-[20%] z-10 left-0' />
          <div className='grid-line-b w-full h-0.5 origin-center bg-white/10 absolute top-[80%] z-10 left-0' />
          <div className='grid-line-l w-0.5 origin-center h-full bg-white/10 absolute top-[0%] z-10 left-[35%]' />
          <div className='grid-line-r w-0.5 origin-center h-full bg-white/10 absolute top-[0%] z-10 right-[35%]' />
          <div className="tl-box absolute w-8 h-8 bg-[#70D6FF]" />
          <div className="tr-box absolute w-8 h-8 bg-[#FF70A6]" />
          <div className="bl-box absolute w-8 h-8 bg-[#C8B6FF]" />
          <div className="br-box absolute w-8 h-8 bg-[#FF9770]" />

          {/* Floating Words */}
          {floatingWords.map((word, i) => (
            <div
              key={i}
              className={`floating-word-${i} z-300 absolute opacity-0 px-4 py-1 font-bold text-sm max-[1025px]:text-[2vw] max-md:text-[2.5vw] uppercase tracking-wider ${word.color}`}
            >
              <p className='mix-blend-difference text-white'> {word.text}</p>
            </div>
          ))}
        </div>
      </section>
      
    </>
  )
}
