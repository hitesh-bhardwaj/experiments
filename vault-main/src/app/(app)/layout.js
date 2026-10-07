import { ClerkProvider } from "@clerk/nextjs";

// ClerkProvider lives here - NOT in the root layout - so marketing routes
// ((marketing) group: /, /docs, /legal, /tech, /demo, ...) ship zero Clerk
// scripts. Every route that needs auth context (dashboard, effects, sign-in,
// sign-up, pricing's plan-aware UI, cli-auth) lives under this group.
// Route groups don't change URLs.
// Clerk only reads `localization` off <ClerkProvider> - passing it directly
// to <SignUp> is silently ignored (it's not in the component's prop list, so
// React forwards it but Clerk never looks at it). No `signIn.*` key here
// anymore - /sign-in is a fully custom Clerk flow (components/auth/vault-door)
// that renders its own literal copy per step and never reads this object at
// all, unlike the still-prebuilt <SignUp>. formButtonPrimary and the
// password placeholder are deliberately NOT set here - both are single
// global keys shared by every Clerk form in the app, so a value that's
// right for one page's button/field would be wrong on the other's.
const clerkLocalization = {
  signUp: {
    start: {
      title: "Open the Vault.",
      subtitle:
        "Create an account and start with the Free Core. Install what you need. Own what you ship.",
      actionText: "Already have an account?",
      actionLink: "Sign in →",
    },
  },
  formFieldLabel__emailAddress: "Email",
  formFieldInputPlaceholder__emailAddress: "you@example.com",
  formFieldLabel__password: "Password",
};

export default function AppLayout({ children }) {
  return (
    <ClerkProvider
      localization={clerkLocalization}
      // Only the fallback variant, not force: the vault-door auth flow
      // are fully custom (no <SignIn>/<SignUp> components rendered at all),
      // and now pass their own redirectUrl straight into setActive() when a
      // gated action (e.g. buying a template while signed out) needs to
      // land back on a specific page after auth - forceRedirectUrl is
      // documented to have precedence "over other redirect props... Use
      // this prop to override the redirect URL when needed", which would
      // silently defeat that per-call redirectUrl. Fallback still applies
      // whenever no more specific redirect is given, so this is a no-op for
      // every other sign-in path (default destination is still /effects).
      signInFallbackRedirectUrl="/effects"
      appearance={{
        cssLayerName: "clerk",
        theme: "simple",
        variables: {
          colorPrimary: "#ff5f00",
          colorPrimaryForeground: "#ffffff",
          colorBackground: "transparent",
          colorInputBackground: "rgba(255,255,255,0.08)",
          colorInputText: "#ffffff",
          colorText: "#ffffff",
          colorTextSecondary: "rgba(255,255,255,0.55)",
          colorDanger: "#fecaca",
          borderRadius: "0",
          fontFamily: "inherit",
        },
      }}
    >
      {children}
    </ClerkProvider>
  );
}
