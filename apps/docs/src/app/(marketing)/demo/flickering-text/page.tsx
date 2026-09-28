import DemoContent from "./DemoContent";
import { getDemoPageMetadata } from "@/lib/demo-metadata";
import flickeringTextRegistry from "../../../../../../../registry/effects/text/flickering-text/registry.json";

export default function Page() {
  return <DemoContent registry={flickeringTextRegistry} />;
}

export async function generateMetadata() {
  return getDemoPageMetadata("flickering-text");
}


