import DemoContent from "./DemoContent";
import { getDemoPageMetadata } from "@/lib/demo-metadata";
import charStaggerButtonRegistry from "../../../../../../../registry/effects/buttons/char-stagger-button/registry.json";


export default function Page() {
  return <DemoContent registry={charStaggerButtonRegistry} />;
}

export async function generateMetadata() {
  return getDemoPageMetadata("char-stagger-button");
}
