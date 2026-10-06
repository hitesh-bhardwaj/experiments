import DemoContent from "./DemoContent";
import sweepLiftTransitionRegistry from "../../../../../../registry/effects/transitions/sweep-lift-transition/registry.json";
import React from "react";

export default function layout({ children }) {
  return (
    <DemoContent registry={sweepLiftTransitionRegistry}>
      {children}
    </DemoContent>
  );
}
