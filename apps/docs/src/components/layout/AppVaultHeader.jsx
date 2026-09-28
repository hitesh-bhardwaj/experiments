"use client";

import { useUser } from "@clerk/nextjs";
import { VaultHeader } from "./VaultHeader";

// Thin wrapper for (app)-group pages: supplies live Clerk auth state to the
// otherwise Clerk-free VaultHeader. Marketing routes render VaultHeader
// directly and get the anonymous defaults.
export function AppVaultHeader(props) {
  const { isLoaded, isSignedIn, user } = useUser();

  return (
    <VaultHeader
      {...props}
      isLoaded={isLoaded}
      isSignedIn={isSignedIn}
      user={user}
    />
  );
}
