import DemoContent from "./DemoContent";
import { getDemoPageMetadata } from "@/lib/demo-metadata";
import linkButtonRegistry from "../../../../../../registry/effects/buttons/link-button/registry.json";

export default function Page() {
  return <DemoContent registry={linkButtonRegistry} />;
}

export async function generateMetadata() {
  return getDemoPageMetadata("link-button");
}
