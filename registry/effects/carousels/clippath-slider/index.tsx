// Built using Hyperiux Vault: https://vault.hyperiux.com

import React from 'react'
import ClippathSliderComp from './ClippathSliderComp'

const slides = [
  {
    name: "Motion Systems",
    description:
      "Crafting immersive motion-driven interfaces with smooth transitions, interactive timelines, and modern animation systems.",
    image: "https://picsum.photos/seed/1/800/600",
  },
  {
    name: "Creative Components",
    description:
      "A curated collection of expressive UI components designed for futuristic web experiences and rapid development.",
    image: "https://picsum.photos/seed/2/800/600",
  },
  {
    name: "Visual Interactions",
    description:
      "Building visually rich interactions with hover effects, layered depth, dynamic layouts, and fluid user feedback.",
    image: "https://picsum.photos/seed/3/800/600",
  },
  {
    name: "Future Interfaces",
    description:
      "Exploring next-generation interface patterns that blend cinematic motion with minimal and functional design.",
    image: "https://picsum.photos/seed/4/800/600",
  },
  {
    name: "Design Engine",
    description:
      "Creating scalable design systems and reusable interface architectures optimized for modern frontend workflows.",
    image: "https://picsum.photos/seed/5/800/600",
  },
  {
    name: "Scroll Experiences",
    description:
      "Designing immersive scroll-based storytelling experiences powered by fluid motion and seamless transitions.",
    image: "https://picsum.photos/seed/6/800/600",
  },
  {
    name: "Interactive Layers",
    description:
      "Combining lighting, gradients, and layered compositions to create premium interactive web experiences.",
    image: "https://picsum.photos/seed/7/800/600",
  },
];

const ClipPathSlider = ({
  slides: slidesProp = slides,
  clueText = "Click either side and watch the next scene cut through.",
  showClue = true,
  cursorBg = "#ff5f00",
  cursorLineColor = "#ffffff",
  duration = 0.75,
}) => {
  return (
    <>
      <ClippathSliderComp
        slides={slidesProp}
        clueText={clueText}
        showClue={showClue}
        cursorBg={cursorBg}
        cursorLineColor={cursorLineColor}
        duration={duration}
      />
    </>
  )
}

export default ClipPathSlider
