import DemoContent from "./DemoContent";
import { getDemoPageMetadata } from "@/lib/demo-metadata";
import interactiveBlurRevealRegistry from "../../../../../../registry/effects/webgl/interactive-blur-reveal/registry.json";

const Page = () => {
  return <DemoContent registry={interactiveBlurRevealRegistry} />;
}

export default Page

export async function generateMetadata() {
  return getDemoPageMetadata("interactive-blur-reveal");
}
