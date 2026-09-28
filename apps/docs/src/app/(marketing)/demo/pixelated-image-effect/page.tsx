import DemoContent from "./DemoContent";
import { getDemoPageMetadata } from "@/lib/demo-metadata";
import pixelatedImageEffectRegistry from "../../../../../../../registry/effects/cursor/pixelated-image-effect/registry.json";

export default function Page() {
  return <DemoContent registry={pixelatedImageEffectRegistry} />;
}

export async function generateMetadata() {
  return getDemoPageMetadata("pixelated-image-effect");
}
