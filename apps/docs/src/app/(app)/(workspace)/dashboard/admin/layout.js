import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";

export default async function AdminLayout({ children }) {
  if (!(await requireAdmin())) {
    redirect("/dashboard");
  }

  return <>{children}</>;
}
