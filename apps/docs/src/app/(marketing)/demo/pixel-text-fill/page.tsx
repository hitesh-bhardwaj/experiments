import DemoContent from "./DemoContent";
import { getDemoPageMetadata } from "@/lib/demo-metadata";
import pixelTextFillRegistry from "../../../../../../../registry/effects/text/pixel-text-fill/registry.json";

export default function Page() {
  return <DemoContent registry={pixelTextFillRegistry} />;
}

export async function generateMetadata() {
  return getDemoPageMetadata("pixel-text-fill");
}
