import DemoContent from "./DemoContent";
import { getDemoPageMetadata } from "@/lib/demo-metadata";
import registry from "../../../../../../registry/effects/components/border-beam/registry.json";

export default function Page() {
  return <DemoContent registry={registry} />;
}

export async function generateMetadata() {
  return getDemoPageMetadata("border-beam");
}
