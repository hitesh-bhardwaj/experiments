'use client'
import React, { useEffect, useState } from 'react'
import InertiaScrollEffectComp from './InertiaScrollEffectComp'

const Content = () => (
  <main className="relative min-h-screen bg-[#f4f4f1] text-black overflow-hidden">

    <div className="absolute top-[32%]  left-1/2 hidden max-md:flex -translate-x-1/2 -translate-y-1/2 w-[75%] text-center">
      <p className="rounded-xl bg-black/10 px-5 py-3 text-base leading-[1.2] text-black backdrop-blur-sm">
        This experience is built around scrolling. <br />
        Open on desktop for the full effect
      </p>
    </div>

    {/* nav */}
    <nav className="absolute top-0 left-0 z-20 flex w-full items-center justify-between px-8 py-6 font-mono text-[12px]  uppercase max-md:text-[3.5vw]">
      <p>Smooth</p>
      <p>Animation</p>
      <p>Scroll</p>
      <p>Motion</p>
    </nav>

    {/* content */}
    <section className="flex min-h-screen items-end px-8 pb-8">
      <div>
        <h1 className="font-mono text-[12vh] max-md:text-[15vw] leading-none w-[40vw] font-black uppercase">
          Smooth
          <br />
          Animation
          <br />
          Scroll
        </h1>

        <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.25em] text-black/40">
          Scroll · Motion · Narrative
        </p>
      </div>
    </section>

  </main>
)

const InertiaScrollEffect = () => {
     const [isMobile, setIsMobile] = useState(null)

  useEffect(() => {
    const check = () => {
      setIsMobile(window.innerWidth < 640)
    }

    check()
    window.addEventListener('resize', check)

    return () => window.removeEventListener('resize', check)
  }, [])

  if (isMobile === null) return null

  if (isMobile) {
    return <Content />
  }
  return (
     <div className="bg-white text-black/90">
        <InertiaScrollEffectComp images={images} />
      </div>
  )
}

export default InertiaScrollEffect

const images = {
  section1Img: 'https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/h-05.jpg',
  heroImg: 'https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/h-09.jpg',
  overlayImg: 'https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/h-05.jpg',

  gridImgs: [
    'https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/h-01.jpg',
    'https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/h-09.jpg',
    'https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/h-02.jpg',
    'https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/h-03.jpg',
    'https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/h-06.jpg',
    'https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/h-05.jpg',
    'https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/h-07.jpg',
    'https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/h-08.jpg',
    'https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/h-10.jpg',
    'https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/h-11.jpg',
    'https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/h-12.jpg',
    'https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/h-13.jpg',
    'https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/h-14.jpg',
    'https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/h-15.jpg',
    'https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/v-03.jpg',
    'https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/v-06.jpg',
    'https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/v-09.jpg',
    'https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/v-01.jpg',
    'https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/v-02.jpg',
    'https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/v-04.jpg',
    'https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/v-05.jpg',
    'https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/v-06.jpg',
    'https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/v-07.jpg',
    'https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/v-08.jpg',
    'https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/h-05.jpg',
  ],
}