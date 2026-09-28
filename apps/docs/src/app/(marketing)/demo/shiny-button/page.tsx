import DemoContent from "./DemoContent";
import { getDemoPageMetadata } from "@/lib/demo-metadata";
import shinyButtonRegistry from "../../../../../../../registry/effects/buttons/shiny-button/registry.json";

export default function Page() {
  return <DemoContent registry={shinyButtonRegistry} />;
}

export async function generateMetadata() {
  return getDemoPageMetadata("shiny-button");
}
