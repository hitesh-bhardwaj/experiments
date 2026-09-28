import DemoContent from "./DemoContent";
import { getDemoPageMetadata } from "@/lib/demo-metadata";
import slideTextRevealRegistry from "../../../../../../../registry/effects/text/slide-text-reveal/registry.json";


const page = () => {
  return <DemoContent registry={slideTextRevealRegistry} />;
}

export default page
export async function generateMetadata() {
  return getDemoPageMetadata("slide-text-reveal");
}
