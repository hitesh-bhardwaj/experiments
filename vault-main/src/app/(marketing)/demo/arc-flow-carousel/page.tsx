import DemoContent from "./DemoContent";
import { getDemoPageMetadata } from "@/lib/demo-metadata";
import arcFlowCarouselRegistry from "../../../../../../registry/effects/carousels/arc-flow-carousel/registry.json";

export default function Page() {
  return <DemoContent registry={arcFlowCarouselRegistry} />;
}

export async function generateMetadata() {
  return getDemoPageMetadata("arc-flow-carousel");
}
