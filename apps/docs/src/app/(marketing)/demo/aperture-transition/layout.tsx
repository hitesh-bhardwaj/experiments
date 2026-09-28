import DemoContent from "./DemoContent";
import apertureTransitionRegistry from "../../../../../../../registry/effects/transitions/aperture-transition/registry.json";

export default function layout({ children }: { children: React.ReactNode }) {
  return (
    <DemoContent registry={apertureTransitionRegistry}>
      {children}
    </DemoContent>
  );
}
