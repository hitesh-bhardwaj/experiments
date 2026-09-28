import DemoContent from "./DemoContent";
import { getDemoPageMetadata } from "@/lib/demo-metadata";
import ditherCanvasRegistry from "../../../../../../../registry/effects/backgrounds/dither-canvas/registry.json";

export default function Page() {
  return <DemoContent registry={ditherCanvasRegistry} />;
}

export async function generateMetadata() {
  return getDemoPageMetadata("dither-canvas");
}
