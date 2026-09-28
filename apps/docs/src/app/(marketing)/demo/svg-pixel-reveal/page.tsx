import DemoContent from "./DemoContent";
import { getDemoPageMetadata } from "@/lib/demo-metadata";
import svgPixelRevealRegistry from "../../../../../../../registry/effects/scroll/svg-pixel-reveal/registry.json";

export default function Page() {
  return <DemoContent registry={svgPixelRevealRegistry} />;
}

export async function generateMetadata() {
  return getDemoPageMetadata("svg-pixel-reveal");
}
