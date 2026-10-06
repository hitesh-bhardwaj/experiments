"use client";

import { useState } from "react";
import { buttonV3ClassName, ButtonV3Chrome } from "@/homepage-v3/components/ButtonV3";
import RazorpayCheckoutButton from "./RazorpayCheckoutButton";

// RazorpayCheckoutButton renders a real <button> with its own payment/
// loading logic (Razorpay script load, order/subscription creation, the
// checkout modal itself) - it isn't a navigation <Link> like ButtonV3, so
// it can't just be swapped for one. This wraps it in ButtonV3's exact
// visual chrome (buttonV3ClassName + ButtonV3Chrome, the same pieces the
// real ButtonV3 is built from) while leaving RazorpayCheckoutButton's own
// click handling, disabled/loading state, and props completely untouched.
// The wrapping div only exists to catch pointer enter/leave for the
// scramble-text hover (RazorpayCheckoutButton doesn't forward those props)
// - `contents` keeps it out of layout entirely.
export default function RazorpayButtonV3({
  variant = "orange",
  label,
  className = "",
  ...razorpayProps
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="contents"
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
    >
      <RazorpayCheckoutButton
        {...razorpayProps}
        className={buttonV3ClassName({
          variant,
          className: `disabled:pointer-events-none disabled:opacity-60 ${className}`,
        })}
      >
        <ButtonV3Chrome label={label} hovered={hovered} />
      </RazorpayCheckoutButton>
    </div>
  );
}
