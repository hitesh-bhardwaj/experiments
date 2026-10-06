// Built using Hyperiux Vault: https://vault.hyperiux.com

import CardDriftComp from './CardDriftComp'
import type { ComponentProps } from 'react'

type CardDriftProps = Omit<ComponentProps<typeof CardDriftComp>, 'data'>

const CardDrift = ({
  backgroundColor,
  backgroundTextColor,
  cardColor,
  cardTextColor,
  barColor,
  driftAmount,
  smoothness,
}: CardDriftProps) => {
  return (
   <CardDriftComp
 data={testimonials}
 backgroundColor={backgroundColor}
 backgroundTextColor={backgroundTextColor}
 cardColor={cardColor}
 cardTextColor={cardTextColor}
 barColor={barColor}
 driftAmount={driftAmount}
 smoothness={smoothness}
 />
  )
}

export default CardDrift

const testimonials = [
 {
 year:"2024",
 tag:"PRODUCT",
 text:"Hyperiux drops interface experiences that feel faster than thought.",
 },
 {
 year:"2024",
 tag:"DESIGN",
 text:"Hyperiux blends motion, interaction, and storytelling into next-gen UI systems.",
 },
 {
 year:"2025",
 tag:"TECH",
 text:"Hyperiux is redefining how users feel digital products, not just use them.",
 },
 {
 year:"2025",
 tag:"COMPONENTS",
 text:"Hyperiux pushes the boundaries of immersive web experiences.",
 },
 {
 year:"2025",
 tag:"BLOG",
 text:"From micro-interactions to full-scale motion systems, Hyperiux builds interfaces that hit different.",
 },
];
