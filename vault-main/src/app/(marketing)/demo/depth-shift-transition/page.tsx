import { getDemoPageMetadata } from "@/lib/demo-metadata";
import PageContent from "./PageContent";

export default function Page() {
  return <PageContent />;
}

export async function generateMetadata() {
  return getDemoPageMetadata("depth-shift-transition");
}
