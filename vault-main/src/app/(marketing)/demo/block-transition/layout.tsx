import DemoContent from "./DemoContent";
import blockTransitionRegistry from "../../../../../../registry/effects/transitions/block-transition/registry.json";

export default function layout({ children }: { children: React.ReactNode }) {
  return (
    <DemoContent registry={blockTransitionRegistry}>
      {children}
    </DemoContent>
  );
}
