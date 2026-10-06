import DemoContent from "./DemoContent";
import { getDemoPageMetadata } from "@/lib/demo-metadata";
import scrambleTextRegistry from "../../../../../../registry/effects/text/scramble-text/registry.json";


const page = () => {
  return <DemoContent registry={scrambleTextRegistry} />;
}

export default page
export async function generateMetadata() {
  return getDemoPageMetadata("scramble-text");
}
