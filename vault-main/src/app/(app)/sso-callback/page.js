import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";

export const metadata = {
  title: "Signing in | Hyperiux Vault",
  robots: { index: false, follow: false },
};

// Where GitHub/Google OAuth lands from the vault door. Clerk finishes the
// sign-in (or transfers it to a sign-up) and redirects to redirectUrlComplete.
export default function SsoCallbackPage() {
  return (
    <div className="fixed inset-0 grid place-items-center bg-background font-avenir text-white/40">
      <p className="flex items-center gap-2.5 text-[11px] font-medium uppercase tracking-[.2em]">
        <i className="size-2 animate-pulse bg-primary" aria-hidden="true" />
        Opening the vault
      </p>
      <AuthenticateWithRedirectCallback
        signInUrl="/sign-in"
        signUpUrl="/sign-up"
        continueSignUpUrl="/signup/continue/continue"
      />
      {/* Clerk's bot protection needs this when an OAuth sign-in becomes a sign-up */}
      <div id="clerk-captcha" />
    </div>
  );
}
