import DemoContent from "./DemoContent";
import { getDemoPageMetadata } from "@/lib/demo-metadata";
import squareTranslateRegistry from "../../../../../../registry/effects/scroll/square-translate/registry.json";

export default function Page() {
  return <DemoContent registry={squareTranslateRegistry} />;
}

export async function generateMetadata() {
  return getDemoPageMetadata("square-translate");
}
