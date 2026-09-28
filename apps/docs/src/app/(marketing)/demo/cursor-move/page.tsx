import DemoContent from "./DemoContent";
import { getDemoPageMetadata } from "@/lib/demo-metadata";
import cursorMoveRegistry from "../../../../../../../registry/effects/cursor/cursor-move/registry.json";

export default function Page() {
  return <DemoContent registry={cursorMoveRegistry} />;
}

export async function generateMetadata() {
  return getDemoPageMetadata("cursor-move");
}
