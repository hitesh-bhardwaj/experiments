import DemoContent from "./DemoContent";
import { getDemoPageMetadata } from "@/lib/demo-metadata";
import scrambleLinkButtonRegistry from "../../../../../../../registry/effects/buttons/scramble-link-button/registry.json";


export default function Page() {
  return <DemoContent registry={scrambleLinkButtonRegistry} />;
}

export async function generateMetadata() {
  return getDemoPageMetadata("scramble-link-button");
}
