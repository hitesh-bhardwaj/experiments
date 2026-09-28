import DemoContent from "./DemoContent";
import { getDemoPageMetadata } from "@/lib/demo-metadata";
import parallaxSliderRegistry from "../../../../../../../registry/effects/scroll/parallax-slider/registry.json";

export default function Page() {
  return <DemoContent registry={parallaxSliderRegistry} />;
}

export async function generateMetadata() {
  return getDemoPageMetadata("parallax-slider");
}
