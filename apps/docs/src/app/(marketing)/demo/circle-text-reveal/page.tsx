import DemoContent from "./DemoContent";
import { getDemoPageMetadata } from "@/lib/demo-metadata";
import circleTextRevealRegistry from "../../../../../../../registry/effects/text/circle-text-reveal/registry.json";

const page = () => {
 return <DemoContent registry={circleTextRevealRegistry} />;
}


export default page

export async function generateMetadata() {
  return getDemoPageMetadata("circle-text-reveal");
}
