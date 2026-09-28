import { Suspense } from "react";
import { createPageMetadata } from "@/lib/seo-metadata";
import SignUpFlow from "@/components/auth/SignUpFlow";
import NavbarMobile from "@/components/WebsiteComps/NavbarMobile";
import NavbarV3 from "@/homepage-v3/components/NavbarV3";

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

export default function SignUpPage() {
  return (
    <>
      <NavbarV3 />
      <NavbarMobile />
      <Suspense fallback={null}>
        <SignUpFlow />
      </Suspense>
    </>
  );
}
