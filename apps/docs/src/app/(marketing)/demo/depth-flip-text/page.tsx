import DemoContent from "./DemoContent";
import { getDemoPageMetadata } from "@/lib/demo-metadata";
import depthFlipTextRegistry from "../../../../../../../registry/effects/text/depth-flip-text/registry.json";

export default function Page() {
  return <DemoContent registry={depthFlipTextRegistry} />;
}

export async function generateMetadata() {
  return getDemoPageMetadata("depth-flip-text");
}
