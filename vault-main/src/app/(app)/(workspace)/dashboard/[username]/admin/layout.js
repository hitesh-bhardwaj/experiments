import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { dashboardPath } from "@/components/Dashboard/dashboardRoutes";
import { isDevAdminPreview } from "@/lib/dev/dashboardPreview";

export default async function AdminLayout({ children, params }) {
  const { username } = await params;
  if (!(await requireAdmin()) && !isDevAdminPreview(await cookies())) {
    redirect(dashboardPath(username));
  }

  return <>{children}</>;
}
