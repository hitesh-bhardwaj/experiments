import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { createPageMetadata } from "@/lib/seo-metadata";
import { getSafeRedirectPath } from "@/lib/safe-redirect";

export const metadata = createPageMetadata({
  title: "Sign Up | Hyperiux Vault",
  description: "Create your Hyperiux Vault account to access pro effects and resources.",
  path: "/sign-up",
  image: "/seo/homepage.png",
  robots: {
    index: false,
    follow: false,
  },
});

// The form itself is rendered by (auth)/layout.js
export default async function SignUpPage({ searchParams }) {
  const { userId } = await auth();

  // Already signed in: go where the link asked (e.g. the homepage plan cards
  // send /pricing?checkout=<plan>, which opens checkout), or to the effects.
  // Same-app paths only, so a crafted link can't send the session elsewhere.
  if (userId) {
    redirect(getSafeRedirectPath((await searchParams)?.redirect_url, "/effects"));
  }

  return null;
}
