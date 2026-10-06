import DemoContent from "./DemoContent";
import { getDemoPageMetadata } from "@/lib/demo-metadata";
import mousePixelationRegistry from "../../../../../../registry/effects/webgl/mouse-pixelation/registry.json";

const page = () => {
  return <DemoContent registry={mousePixelationRegistry} />;
}

export default page

export async function generateMetadata() {
  return getDemoPageMetadata("mouse-pixelation");
}
