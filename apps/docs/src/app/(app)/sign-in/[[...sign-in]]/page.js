import { Suspense } from "react";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { createPageMetadata } from "@/lib/seo-metadata";
import SignInFlow from "@/components/auth/SignInFlow";
import NavbarMobile from "@/components/WebsiteComps/NavbarMobile";
import NavbarV3 from "@/homepage-v3/components/NavbarV3";

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

export default async function SignInPage() {
  const { userId } = await auth();

  if (userId) {
    redirect("/effects");
  }

  return (
    <>
      <NavbarV3 />
      <NavbarMobile />
      <Suspense fallback={null}>
        <SignInFlow />
      </Suspense>
    </>
  );
}
