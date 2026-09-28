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
    img: "/api/media-proxy?url=https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/h-01.jpg",
  },
  {
    id: "HX_128",
    title: "Flow State",
    focus: "WebGL – Transitions – Interaction",
    year: "2025",
    img: "/api/media-proxy?url=https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/h-02.jpg",
  },
  {
    id: "HX_142",
    title: "Neon Layers",
    focus: "Visual Effects – Motion – UI",
    year: "2025",
    img: "/api/media-proxy?url=https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/h-03.jpg",
  },
  {
    id: "HX_157",
    title: "Pulse Interface",
    focus: "Interactive UI – Motion – Scroll",
    year: "2025",
    img: "/api/media-proxy?url=https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/h-08.jpg",
  },
  {
    id: "HX_163",
    title: "Glass Morph Engine",
    focus: "Glass UI – Effects – Design",
    year: "2025",
    img: "/api/media-proxy?url=https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/h-05.jpg",
  },
  {
    id: "HX_174",
    title: "Infinite Canvas",
    focus: "Creative Coding – Motion – Layout",
    year: "2025",
    img: "/api/media-proxy?url=https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/h-06.jpg",
  },
  {
    id: "HX_189",
    title: "Velocity Cards",
    focus: "Cards – Hover Effects – Motion",
    year: "2025",
    img: "/api/media-proxy?url=https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/h-07.jpg",
  },
  {
    id: "HX_193",
    title: "Quantum Scroll",
    focus: "Scroll Animation – WebGL – UI",
    year: "2025",
    img: "/api/media-proxy?url=https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/v-09.jpg",
  },
  {
    id: "HX_205",
    title: "Prism Navigation",
    focus: "Navigation – Interaction – Motion",
    year: "2025",
    img: "/api/media-proxy?url=https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/h-10.jpg",
  },
  {
    id: "HX_217",
    title: "Distortion Flow",
    focus: "Shaders – Motion – Web Effects",
    year: "2025",
    img: "/api/media-proxy?url=https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/h-11.jpg",
  },
  {
    id: "HX_224",
    title: "Wave Motion Kit",
    focus: "GSAP – Scroll – Interaction",
    year: "2025",
    img: "/api/media-proxy?url=https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/h-12.jpg",
  },
  {
    id: "HX_239",
    title: "Layered Depth",
    focus: "3D UI – Motion – Visuals",
    year: "2025",
    img: "/api/media-proxy?url=https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/h-13.jpg",
  },

  {
    id: "HX_249",
    title: "Morph Grid",
    focus: "Layout Systems – Animation",
    year: "2024",
    img: "/api/media-proxy?url=https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/h-14.jpg",
  },
  {
    id: "HX_256",
    title: "Ribbon Motion",
    focus: "Motion UI – Effects – Scroll",
    year: "2024",
    img: "/api/media-proxy?url=https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/h-15.jpg",
  },
  {
    id: "HX_263",
    title: "Orbit Elements",
    focus: "Creative Motion – WebGL",
    year: "2024",
    img: "/api/media-proxy?url=https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/v-01.jpg",
  },
  {
    id: "HX_275",
    title: "Fluid Showcase",
    focus: "Interactive Gallery – Motion",
    year: "2024",
    img: "/api/media-proxy?url=https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/v-02.jpg",
  },
  {
    id: "HX_284",
    title: "Kinetic Typography",
    focus: "Text Motion – Typography",
    year: "2024",
    img: "/api/media-proxy?url=https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/v-03.jpg",
  },
  {
    id: "HX_298",
    title: "Cylinder Motion",
    focus: "3D Motion – WebGL – UI",
    year: "2024",
    img: "/api/media-proxy?url=https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/v-04.jpg",
  },
  {
    id: "HX_302",
    title: "Shader Portraits",
    focus: "Shaders – Creative Coding",
    year: "2024",
    img: "/api/media-proxy?url=https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/v-05.jpg",
  },
  {
    id: "HX_314",
    title: "Infinite Ribbon",
    focus: "Loop Animation – Interaction",
    year: "2024",
    img: "/api/media-proxy?url=https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/v-06.jpg",
  },
  {
    id: "HX_327",
    title: "Twist Dynamics",
    focus: "Motion Systems – Visual FX",
    year: "2024",
    img: "/api/media-proxy?url=https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/v-07.jpg",
  },
  {
    id: "HX_339",
    title: "Spiral Interface",
    focus: "Immersive UI – Motion – Scroll",
    year: "2024",
    img: "/api/media-proxy?url=https://pub-8abee449136941f5b0a1cd2c014534e9.r2.dev/vault-listing-images/assets-images/v-08.jpg",
  },
];
