import DemoContent from "./DemoContent";
import { getDemoPageMetadata } from "@/lib/demo-metadata";
import scrollDistortionRegistry from "../../../../../../../registry/effects/scroll/scroll-distortion/registry.json";

export default function Page() {
  return <DemoContent registry={scrollDistortionRegistry} />;
}

export async function generateMetadata() {
  return getDemoPageMetadata("scroll-distortion");
}
