import DemoContent from "./DemoContent";
import { getDemoPageMetadata } from "@/lib/demo-metadata";
import charStaggerPrimaryButtonRegistry from "../../../../../../../registry/effects/buttons/char-stagger-primary-button/registry.json";



export default function Page() {
  return <DemoContent registry={charStaggerPrimaryButtonRegistry} />;
}

export async function generateMetadata() {
  return getDemoPageMetadata("char-stagger-primary-button");
}
