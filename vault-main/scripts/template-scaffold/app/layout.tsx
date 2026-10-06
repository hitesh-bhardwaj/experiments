import type { Metadata } from "next";
import "./globals.css";

// Deliberately minimal - the real Hyperiux Vault root layout also wraps
// every page in ClerkProvider, Vercel Analytics/Speed Insights, GTM,
// next-recaptcha-v3, JSON-LD, and a page-transition router, none of which
// this template's own page (see app/page.tsx) uses or needs. Smooth scroll
// is self-contained inside the page itself (it wraps its own tree in
// ReactLenis), not provided here.
export const metadata: Metadata = {
  title: "__TITLE__",
  description: "__DESCRIPTION__",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
