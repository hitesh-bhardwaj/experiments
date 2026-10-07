import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { createPageMetadata } from "@/lib/seo-metadata";

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
export default async function SignUpPage() {
  const { userId } = await auth();

  if (userId) {
    redirect("/effects");
  }

  return null;
}
