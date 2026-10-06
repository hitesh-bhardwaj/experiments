import DemoContent from "./DemoContent";
import { getDemoPageMetadata } from "@/lib/demo-metadata";
import ellipseCarouselRegistry from "../../../../../../registry/effects/carousels/ellipse-carousel/registry.json";

export default function Page() {
  return <DemoContent registry={ellipseCarouselRegistry} />;
}

export async function generateMetadata() {
  return getDemoPageMetadata("ellipse-carousel");
}
