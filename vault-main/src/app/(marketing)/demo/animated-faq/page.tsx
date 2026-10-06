import DemoContent from "./DemoContent";
import { getDemoPageMetadata } from "@/lib/demo-metadata";

export default function Page() {
  return <DemoContent />;
}

export async function generateMetadata() {
  return getDemoPageMetadata("animated-faq");
}
