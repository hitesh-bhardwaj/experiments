import DemoContent from "./DemoContent";
import chessGridTransitionRegistry from "../../../../../../registry/effects/transitions/chess-grid-transition/registry.json";

export default function layout({ children }: { children: React.ReactNode }) {
  return (
    <DemoContent registry={chessGridTransitionRegistry}>
      {children}
    </DemoContent>
  );
}
