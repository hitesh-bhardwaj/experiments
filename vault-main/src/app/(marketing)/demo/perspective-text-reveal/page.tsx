import DemoContent from "./DemoContent";
import { getDemoPageMetadata } from "@/lib/demo-metadata";
import perspectiveTextRevealRegistry from "../../../../../../registry/effects/text/perspective-text-reveal/registry.json";


const page = () => {
  return <DemoContent registry={perspectiveTextRevealRegistry} />;
}

export default page
export async function generateMetadata() {
  return getDemoPageMetadata("perspective-text-reveal");
}
