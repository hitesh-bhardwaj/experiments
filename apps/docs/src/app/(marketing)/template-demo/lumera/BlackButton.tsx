// Built using Hyperiux Vault: https://vault.hyperiux.com

"use client";

import AnimatedFillButton, { type AnimatedFillButtonProps } from "./AnimatedFillButton";

export type BlackButtonOwnProps = Omit<AnimatedFillButtonProps, "showBorder" | "arrowIconSizeVw">;
export type BlackButtonProps = BlackButtonOwnProps;

function BlackButton({
  bgColor = "transparent",
  textColor = "#ffffff",
  fillBgColor = "#ffffff",
  fillTextColor = "#1c1b1a",
  hoverFillBgColor = "#ffffff",
  hoverFillTextColor = "#1c1b1a",
  ...props
}: BlackButtonProps) {
  return (
    <AnimatedFillButton
      {...props}
      bgColor={bgColor}
      textColor={textColor}
      fillBgColor={fillBgColor}
      fillTextColor={fillTextColor}
      hoverFillBgColor={hoverFillBgColor}
      hoverFillTextColor={hoverFillTextColor}
      showBorder
      arrowIconSizeVw={1.5}
    />
  );
}

export default BlackButton;
