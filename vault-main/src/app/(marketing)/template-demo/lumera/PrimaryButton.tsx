// Built using Hyperiux Vault: https://vault.hyperiux.com

"use client";

import AnimatedFillButton, { type AnimatedFillButtonProps } from "./AnimatedFillButton";

export type ArrowFillButtonOwnProps = Omit<AnimatedFillButtonProps, "showBorder" | "arrowIconSizeVw" | "borderColor">;
export type ArrowFillButtonProps = ArrowFillButtonOwnProps;

function ArrowFillButton({
  bgColor = "#ffffff",
  textColor = "#1c1b1a",
  fillBgColor = "#1c1b1a",
  fillTextColor = "#ffffff",
  hoverFillBgColor = "#1c1b1a",
  hoverFillTextColor = "#ffffff",
  ...props
}: ArrowFillButtonProps) {
  return (
    <AnimatedFillButton
      {...props}
      bgColor={bgColor}
      textColor={textColor}
      fillBgColor={fillBgColor}
      fillTextColor={fillTextColor}
      hoverFillBgColor={hoverFillBgColor}
      hoverFillTextColor={hoverFillTextColor}
      showBorder={false}
      arrowIconSizeVw={1.3}
    />
  );
}

export default ArrowFillButton;
