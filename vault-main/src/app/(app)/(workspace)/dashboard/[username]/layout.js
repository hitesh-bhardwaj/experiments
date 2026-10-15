import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/Dashboard/DashboardShell";
import { dashboardPath } from "@/components/Dashboard/dashboardRoutes";
import { getRegistryIndex } from "@/lib/registry";
import { getAllSanityEffectEntries, buildEffectsFromSanity } from "@/lib/sanity";
import { dashboardUsername } from "@/lib/user-slug";
import { DEV_PREVIEW_USERNAME } from "@/lib/dev/dashboardPreview";

export const dynamic = "force-dynamic";

// /dashboard/{username}/… - the gate: the name in the URL must be the signed-in
// account's own (lib/user-slug's dashboardUsername), else it goes to its own dashboard,
// so a URL can never render someone else's. proxy.js sends the old ID-less URLs here.
// With no session only the development preview gets here (proxy.js).
export default async function UserDashboardLayout({ children, params }) {
  const { username } = await params;
  const user = await currentUser();
  const mine = user ? dashboardUsername(user) : process.env.NODE_ENV === "development" ? DEV_PREVIEW_USERNAME : null;

  if (!mine) redirect("/");
  if (username !== mine) redirect(dashboardPath(mine));

  const registry = getRegistryIndex();
  // Full effect details (titles, covers, tags) for the tabs' effect cards and lists
  const catalog = buildEffectsFromSanity(await getAllSanityEffectEntries());

  return (
    <DashboardShell username={username} effects={registry?.items || []} catalog={catalog}>
      {children}
    </DashboardShell>
  );
}
