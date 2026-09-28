import DemoContent from "./DemoContent";
import { getDemoPageMetadata } from "@/lib/demo-metadata";
import ringCarouselRegistry from "../../../../../../../registry/effects/carousels/ring-carousel/registry.json";


export default function Page() {
  return <DemoContent registry={ringCarouselRegistry} />;
}

export async function generateMetadata() {
  return getDemoPageMetadata("ring-carousel");
}
