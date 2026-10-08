import { ClerkProvider } from "@clerk/nextjs";

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
