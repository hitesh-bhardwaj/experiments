// Built using Hyperiux Vault: https://vault.hyperiux.com

import CircularSliderComp from './CircularSliderComp';

const defaultItems = [
  {
    title: "Arrow Fill Button",
    description: "Primary button with an expanding fill and animated arrow",
    bgColor: "#655A7C",
    textColor: "#2A2433",
  },
  {
    title: "Custom Cursor",
    description: "Interactive cursor that transforms every hover",
    bgColor: "#AB92BF",
    textColor: "#3D2E50",
  },
  {
    title: "Text Scramble",
    description: "Dynamic text reveal with glitch-style transitions",
    bgColor: "#AFC1D6",
    textColor: "#2C3E52",
  },
  {
    title: "Hover Reveal Card",
    description: "Cards that come alive on hover interaction",
    bgColor: "#CEF9F2",
    textColor: "#1A5C53",
  },
  {
    title: "Scroll Animations",
    description: "Smooth GSAP-powered scroll-based animations",
    bgColor: "#D6CA98",
    textColor: "#4A3F1A",
  },
  {
    title: "Circular Slider",
    description: "Rotating card slider with immersive motion",
    bgColor: "#655A7C",
    textColor: "#2A2433",
  },
];

const CircularSlider = ({
  items = defaultItems,
  title = "Interfaces that react.",
  subtitle = "Built for motion, crafted for experience.",
  backgroundColor = "#111111",
  gap = 24,
  cardWidth = 320,
  cardHeight = 360,
  showBottomText = true,
}) => {
  return (
    <CircularSliderComp
      items={items}
      title={title}
      subtitle={subtitle}
      backgroundColor={backgroundColor}
      gap={gap}
      cardWidth={cardWidth}
      cardHeight={cardHeight}
      showBottomText={showBottomText}
    />
  );
};

export default CircularSlider;
