"use client";

import { memo } from "react";
import DrawSvgV3 from "./DrawSvgV3";

function DrawCheckV3({
  active,
  armed = false,
  className = "h-full w-full",
  stroke = "#03E07C",
  strokeWidth = 2.5,
  delay = 0,
  duration = 400,
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
      {...props}
    >
      <polyline points="4 12 9 17 20 6" />
    </DrawSvgV3>
  );
}

export default memo(DrawCheckV3);
