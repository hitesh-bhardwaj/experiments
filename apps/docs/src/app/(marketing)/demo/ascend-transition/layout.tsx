import DemoContent from "./DemoContent";
import ascendTransitionRegistry from "../../../../../../../registry/effects/transitions/ascend-transition/registry.json";

export default function layout({ children }: { children: React.ReactNode }) {
  return (
    <DemoContent registry={ascendTransitionRegistry}>
      {children}
    </DemoContent>
  );
}
