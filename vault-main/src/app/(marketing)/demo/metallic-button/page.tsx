import DemoContent from "./DemoContent";
import { getDemoPageMetadata } from "@/lib/demo-metadata";
import metallicButtonRegistry from "../../../../../../registry/effects/buttons/metallic-button/registry.json";

export default function Page() {
  return <DemoContent registry={metallicButtonRegistry} />;
}

export async function generateMetadata() {
  return getDemoPageMetadata("metallic-button");
}
