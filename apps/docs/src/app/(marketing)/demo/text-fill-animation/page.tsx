import DemoContent from "./DemoContent";
import { getDemoPageMetadata } from "@/lib/demo-metadata";
import textFillAnimationRegistry from "../../../../../../../registry/effects/text/text-fill-animation/registry.json";

const page = () => {
  return <DemoContent registry={textFillAnimationRegistry} />;
};

export default page;

export async function generateMetadata() {
  return getDemoPageMetadata("text-fill-animation");
}
