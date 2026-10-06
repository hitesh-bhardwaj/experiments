import DemoContent from "./DemoContent";
import { getDemoPageMetadata } from "@/lib/demo-metadata";
import dotTransitionRegistry from "../../../../../../registry/effects/backgrounds/dot-transition/registry.json";

export default function Page() {
  return <DemoContent registry={dotTransitionRegistry} />;
}

export async function generateMetadata() {
  return getDemoPageMetadata("dot-transition");
}
