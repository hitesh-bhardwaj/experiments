import DemoContent from "./DemoContent";
import svgBrushTransitionRegistry from "../../../../../../../registry/effects/transitions/svg-brush-transition/registry.json";

export default function layout({ children }: { children: React.ReactNode }) {
  return (
    <DemoContent registry={svgBrushTransitionRegistry}>
      {children}
    </DemoContent>
  );
}
