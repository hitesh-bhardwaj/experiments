import DemoContent from "./DemoContent";
import { getDemoPageMetadata } from "@/lib/demo-metadata";
import parallaxImageRegistry from "../../../../../../../registry/effects/scroll/parallax-image-animation/registry.json";

export default function Page() {
  return <DemoContent registry={parallaxImageRegistry} />;
}

export async function generateMetadata() {
  return getDemoPageMetadata("parallax-image-animation");
}
