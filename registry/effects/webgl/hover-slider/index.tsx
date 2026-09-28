// Built using Hyperiux Vault: https://vault.hyperiux.com

import React from 'react'
import HoverSliderComp from './HoverSliderComp';

const HoverSlider = ({
  items = defaultItems,
  transitionDuration = 0.45,
  imageScale = 0.95,
  curveFactor = 1,
}) => {
  return (
    <HoverSliderComp
      items={items}
      transitionDuration={transitionDuration}
      imageScale={imageScale}
      curveFactor={curveFactor}
    />
  )
}

export default HoverSlider

const defaultItems = [
  {
    id: "HX_104",
    title: "Aurora Grid",
    focus: "UI Systems – Motion – GSAP",
    year: "2025",
    img: "https://picsum.photos/seed/hover0/800/1000",
  },
  {
    id: "HX_128",
    title: "Flow State",
    focus: "WebGL – Transitions – Interaction",
    year: "2025",
    img: "https://picsum.photos/seed/hover1/800/1000",
  },
  {
    id: "HX_142",
    title: "Neon Layers",
    focus: "Visual Effects – Motion – UI",
    year: "2025",
    img: "https://picsum.photos/seed/hover2/800/1000",
  },
  {
    id: "HX_157",
    title: "Pulse Interface",
    focus: "Interactive UI – Motion – Scroll",
    year: "2025",
    img: "https://picsum.photos/seed/hover3/800/1000",
  },
  {
    id: "HX_163",
    title: "Glass Morph Engine",
    focus: "Glass UI – Effects – Design",
    year: "2025",
    img: "https://picsum.photos/seed/hover4/800/1000",
  },
  {
    id: "HX_174",
    title: "Infinite Canvas",
    focus: "Creative Coding – Motion – Layout",
    year: "2025",
    img: "https://picsum.photos/seed/hover5/800/1000",
  },
  {
    id: "HX_189",
    title: "Velocity Cards",
    focus: "Cards – Hover Effects – Motion",
    year: "2025",
    img: "https://picsum.photos/seed/hover6/800/1000",
  },
  {
    id: "HX_193",
    title: "Quantum Scroll",
    focus: "Scroll Animation – WebGL – UI",
    year: "2025",
    img: "https://picsum.photos/seed/hover7/800/1000",
  },
  {
    id: "HX_205",
    title: "Prism Navigation",
    focus: "Navigation – Interaction – Motion",
    year: "2025",
    img: "https://picsum.photos/seed/hover8/800/1000",
  },
  {
    id: "HX_217",
    title: "Distortion Flow",
    focus: "Shaders – Motion – Web Effects",
    year: "2025",
    img: "https://picsum.photos/seed/hover9/800/1000",
  },
  {
    id: "HX_224",
    title: "Wave Motion Kit",
    focus: "GSAP – Scroll – Interaction",
    year: "2025",
    img: "https://picsum.photos/seed/hover10/800/1000",
  },
  {
    id: "HX_239",
    title: "Layered Depth",
    focus: "3D UI – Motion – Visuals",
    year: "2025",
    img: "https://picsum.photos/seed/hover11/800/1000",
  },

  {
    id: "HX_249",
    title: "Morph Grid",
    focus: "Layout Systems – Animation",
    year: "2024",
    img: "https://picsum.photos/seed/hover12/800/1000",
  },
  {
    id: "HX_256",
    title: "Ribbon Motion",
    focus: "Motion UI – Effects – Scroll",
    year: "2024",
    img: "https://picsum.photos/seed/hover13/800/1000",
  },
  {
    id: "HX_263",
    title: "Orbit Elements",
    focus: "Creative Motion – WebGL",
    year: "2024",
    img: "https://picsum.photos/seed/hover14/800/1000",
  },
  {
    id: "HX_275",
    title: "Fluid Showcase",
    focus: "Interactive Gallery – Motion",
    year: "2024",
    img: "https://picsum.photos/seed/hover15/800/1000",
  },
  {
    id: "HX_284",
    title: "Kinetic Typography",
    focus: "Text Motion – Typography",
    year: "2024",
    img: "https://picsum.photos/seed/hover16/800/1000",
  },
  {
    id: "HX_298",
    title: "Cylinder Motion",
    focus: "3D Motion – WebGL – UI",
    year: "2024",
    img: "https://picsum.photos/seed/hover17/800/1000",
  },
  {
    id: "HX_302",
    title: "Shader Portraits",
    focus: "Shaders – Creative Coding",
    year: "2024",
    img: "https://picsum.photos/seed/hover18/800/1000",
  },
  {
    id: "HX_314",
    title: "Infinite Ribbon",
    focus: "Loop Animation – Interaction",
    year: "2024",
    img: "https://picsum.photos/seed/hover19/800/1000",
  },
  {
    id: "HX_327",
    title: "Twist Dynamics",
    focus: "Motion Systems – Visual FX",
    year: "2024",
    img: "https://picsum.photos/seed/hover20/800/1000",
  },
  {
    id: "HX_339",
    title: "Spiral Interface",
    focus: "Immersive UI – Motion – Scroll",
    year: "2024",
    img: "https://picsum.photos/seed/hover21/800/1000",
  },
];
