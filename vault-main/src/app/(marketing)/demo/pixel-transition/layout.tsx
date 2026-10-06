import DemoContent from "./DemoContent";
import pixelTransitionRegistry from "../../../../../../registry/effects/transitions/pixel-transition/registry.json";

export default function layout({ children }: { children: React.ReactNode }) {
  return (
    <DemoContent registry={pixelTransitionRegistry}>
      {children}
    </DemoContent>
  );
}
