import { Suspense } from "react";
import VaultDoorAuth from "@/components/auth/vault-door";
import { getVaultCatalogue } from "@/components/auth/vault-door/catalogue";
import Navbar from "@/homepage/components/Navbar";

// The door lives in the layout so /sign-in <-> /sign-up (and refreshes)
// keep the same scene and form state; the pages only add metadata and the
// signed-in redirect. The header is the homepage's (it also owns the
// site-wide sound toggle the door's sounds follow).
export default function AuthLayout({ children }) {
  return (
    <>
      {/* Homepage header (incl. NavbarMobile below 1025px), minus its Sign In CTA */}
      <Navbar hideSignIn />
      <Suspense fallback={null}>
        <VaultDoorAuth catalogue={getVaultCatalogue()} />
      </Suspense>
      {children}
    </>
  );
}
