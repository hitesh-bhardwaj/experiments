import DemoContent from "./DemoContent";
import { getDemoPageMetadata } from "@/lib/demo-metadata";
import maskTextRevealRegistry from "../../../../../../registry/effects/text/mask-text-reveal/registry.json";


const page = () => {
  return <DemoContent registry={maskTextRevealRegistry} />;
}

export default page
export async function generateMetadata() {
  return getDemoPageMetadata("mask-text-reveal");
}
