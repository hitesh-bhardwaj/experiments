// Built using Hyperiux Vault: https://vault.hyperiux.com

import React from 'react'
import TextStreamComp from './TextStreamComp';

const items = [
  "builds immersive interfaces",
  "creates motion-driven experiences",
  "powers futuristic web design",
  "redefines modern UI",
  "makes interactions feel alive",
  "crafts cinematic transitions",
  "turns motion into storytelling",
  "pushes creative development forward",
  "blends design with animation",
  "elevates frontend experiences",
  "creates seamless interactions",
  "makes scroll feel dynamic",
  "inspires experimental interfaces",
  "transforms static layouts",
  "ships visually stunning components",
  "brings ideas into motion",
  "builds expressive user journeys",
  "drives interactive experiences",
  "explores the future of UI",
  "creates unforgettable web moments",
  "makes the web feel futuristic",
];

const TextStream = ({
  speed = 1,
  stagger = 0.08,
  textColor = "#ffffff",
  backgroundColor = "#000000",
  autoplay = true,
  runOnScroll = true,
}) => {
  return (
    <TextStreamComp
      items={items}
      speed={speed}
      stagger={stagger}
      textColor={textColor}
      backgroundColor={backgroundColor}
      autoplay={autoplay}
      runOnScroll={runOnScroll}
    />
  );
}

export default TextStream
