"use client";

import { useState } from "react";
import { buttonClassName, ButtonChrome } from "@/homepage/components/Button";
import RazorpayCheckoutButton from "./RazorpayCheckoutButton";

// RazorpayCheckoutButton renders a real <button> with its own payment/
// loading logic (Razorpay script load, order/subscription creation, the
// checkout modal itself) - it isn't a navigation <Link> like Button, so
// it can't just be swapped for one. This wraps it in Button's exact
// visual chrome (buttonClassName + ButtonChrome, the same pieces the
// real Button is built from) while leaving RazorpayCheckoutButton's own
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
        className={buttonClassName({
          variant,
          className: `disabled:pointer-events-none disabled:opacity-60 ${className}`,
        })}
      >
        <ButtonChrome label={label} hovered={hovered} />
      </RazorpayCheckoutButton>
    </div>
  );
}
