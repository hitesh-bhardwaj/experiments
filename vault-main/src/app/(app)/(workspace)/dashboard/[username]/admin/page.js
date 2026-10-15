import { redirect } from "next/navigation";
import { dashboardPath } from "@/components/Dashboard/dashboardRoutes";

// The admin view opens on Activity.
export default async function AdminIndexPage({ params }) {
  const { username } = await params;
  redirect(dashboardPath(username, "admin/activity"));
}
