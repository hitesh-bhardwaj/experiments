import { getTemplatesWithShots } from "@/lib/template-shots";
import { MyTemplates } from "./MyTemplates";

export default async function DashboardTemplatesPage() {
  return <MyTemplates templates={await getTemplatesWithShots()} />;
}
