import { redirect } from "next/navigation";

// /legal has no page of its own: send it to the first legal page (same order as the
// sidebar and the footer's legal links)
export default function Page() {
  redirect("/legal/license-agreement");
}
