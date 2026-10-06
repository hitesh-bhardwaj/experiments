import DemoContent from "./DemoContent";
import { getDemoPageMetadata } from "@/lib/demo-metadata";
import noiseRippleCursorRegistry from "../../../../../../registry/effects/cursor/noise-ripple-cursor/registry.json";

export default function Page() {
  return <DemoContent registry={noiseRippleCursorRegistry} />;
}

export async function generateMetadata() {
  return getDemoPageMetadata("noise-ripple-cursor");
}
