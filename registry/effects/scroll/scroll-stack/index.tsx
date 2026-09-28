// Built using Hyperiux Vault: https://vault.hyperiux.com

import React from 'react'
import ScrollStackComp, { type ScrollStackCard } from './ScrollStackComp';

const ScrollStack = ({
  sectionBgColor = "#ffffff",
  cardRadius = 45,
}) => {
  return (
   <>
    <ScrollStackComp
      cards={defaultContent}
      sectionBgColor={sectionBgColor}
      cardRadius={cardRadius}
    />
   </>
  )
}

export default ScrollStack

export const defaultContent: ScrollStackCard[] = [
 {
 id: 1,
 title:"Design-Driven Foundations",
 description:
"Crafted with a strong focus on modern design principles, this component reflects clarity, structure, and visual balance. It demonstrates how thoughtful layouts and scalable patterns come together to create interfaces that feel both intuitive and impactful.",
 bgColor:"#87B6BC",
 textColor:"#456D72",
 className:""
 },
 {
 id: 2,
 title:"Scalable Component Systems",
 description:
"Built for flexibility, this module showcases reusable patterns that adapt across different layouts. From structured spacing to responsive behavior, every element is designed to maintain consistency while scaling effortlessly across projects.",
 bgColor:"#BED4CB",
 textColor:"#5F7B71",
 className:"flex-row-reverse"
 },
 {
 id: 3,
 title:"Precision & Consistency",
 description:
"Attention to detail is at the core of this build. Typography, spacing, and alignment are carefully tuned to create a cohesive experience. This ensures every component not only looks refined but also integrates seamlessly within a larger design system.",
 bgColor:"#F6F09F",
 textColor:"#8E8530",
 className:""
 },
 {
 id: 4,
 title:"Performance Focused Layouts",
 description:
"Optimized for real-world usage, this section highlights efficient rendering and smooth responsiveness. It balances visual richness with performance, ensuring fast load times and a seamless user experience across devices.",
 bgColor:"#B35656",
 textColor:"#6E2626",
 className:"flex-row-reverse"
 },
 {
 id: 5,
 title:"Future-Ready UI Patterns",
 description:
"Designed with scalability in mind, this component aligns with evolving UI trends. It embraces modularity, clean architecture, and adaptability-making it easy to extend, customize, and reuse across different applications.",
 bgColor:"#FFD786",
 textColor:"#9D7422",
 className:""
 }
];
