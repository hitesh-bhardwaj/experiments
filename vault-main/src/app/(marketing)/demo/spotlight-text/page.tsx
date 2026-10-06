
import DemoContent from "./DemoContent";
import { getDemoPageMetadata } from "@/lib/demo-metadata";
import spotlightTextRegistry from "../../../../../../registry/effects/text/spotlight-text/registry.json";

const page = () => {
  return <DemoContent registry={spotlightTextRegistry} />;
};

export default page;

export async function generateMetadata() {
  return getDemoPageMetadata("spotlight-text");
}
