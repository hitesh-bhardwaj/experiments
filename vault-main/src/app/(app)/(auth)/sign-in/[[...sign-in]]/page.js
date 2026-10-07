import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { createPageMetadata } from "@/lib/seo-metadata";

export const metadata = createPageMetadata({
  title: "Sign In | Hyperiux Vault",
  description:
    "Sign in to Hyperiux Vault to access saved effects, dashboards, and pro resources.",
  path: "/sign-in",
  image: "/seo/homepage.png",
  robots: {
    index: false,
    follow: false,
  },
});

// The form itself is rendered by (auth)/layout.js
export default async function SignInPage() {
  const { userId } = await auth();

  if (userId) {
    redirect("/effects");
  }

  return null;
}
