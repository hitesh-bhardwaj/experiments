import DemoContent from "./DemoContent";
import { getDemoPageMetadata } from "@/lib/demo-metadata";
import typingTextRegistry from "../../../../../../registry/effects/text/typing-text/registry.json";

export default function Page() {
  return <DemoContent registry={typingTextRegistry} />;
}

export async function generateMetadata() {
  return getDemoPageMetadata("typing-text");
}
