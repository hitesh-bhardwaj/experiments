import DemoContent from "./DemoContent";
import depthShiftTransitionRegistry from "../../../../../../registry/effects/transitions/depth-shift-transition/registry.json";

export default function layout({ children }: { children: React.ReactNode }) {
  return (
    <DemoContent registry={depthShiftTransitionRegistry}>
      {children}
    </DemoContent>
  );
}
