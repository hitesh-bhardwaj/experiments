"use client";

import { memo } from "react";
import DrawSvgV3 from "./DrawSvgV3";

function DrawCrossV3({
  active,
  armed = false,
  className = "h-[60%] w-[60%]",
  stroke = "#FF0B0B",
  strokeWidth = 2.5,
  delay = 0,
  duration = 350,
  stagger = 80,
  ...props
}) {
  return (
    <DrawSvgV3
      active={active}
      armed={armed}
      className={className}
      viewBox="0 0 24 24"
      stroke={stroke}
      strokeWidth={strokeWidth}
      delay={delay}
      duration={duration}
      stagger={stagger}
      {...props}
    >
      <line x1="6" y1="6" x2="18" y2="18" />
      <line x1="18" y1="6" x2="6" y2="18" />
    </DrawSvgV3>
  );
}

export default memo(DrawCrossV3);
