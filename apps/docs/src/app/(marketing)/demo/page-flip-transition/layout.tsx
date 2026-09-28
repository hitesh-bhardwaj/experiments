import DemoContent from "./DemoContent";
import pageFlipTransitionRegistry from "../../../../../../../registry/effects/transitions/page-flip-transition/registry.json";

export default function layout({ children }: { children: React.ReactNode }) {
  return (
    <DemoContent registry={pageFlipTransitionRegistry}>
      {children}
    </DemoContent>
  );
}
