import DemoContent from "./DemoContent";
import radialSliceTransitionRegistry from "../../../../../../../registry/effects/transitions/radial-slice-transition/registry.json";

export default function layout({ children }: { children: React.ReactNode }) {
  return (
    <DemoContent registry={radialSliceTransitionRegistry}>
      {children}
    </DemoContent>
  );
}
