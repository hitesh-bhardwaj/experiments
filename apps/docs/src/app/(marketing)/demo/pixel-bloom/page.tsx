import DemoContent from "./DemoContent";
import { getDemoPageMetadata } from "@/lib/demo-metadata";
import pixelBloomRegistry from "../../../../../../../registry/effects/cursor/pixel-bloom/registry.json";

export default function Page() {
  return <DemoContent registry={pixelBloomRegistry} />;
}

export async function generateMetadata() {
  return getDemoPageMetadata("pixel-bloom");
}
