import DemoContent from "./DemoContent";
import { getDemoPageMetadata } from "@/lib/demo-metadata";
import glitchyTextRegistry from "../../../../../../../registry/effects/text/glitchy-text/registry.json";

const page = () => {
  return <DemoContent registry={glitchyTextRegistry} />;
};

export default page;

export async function generateMetadata() {
  return getDemoPageMetadata("glitchy-text");
}
