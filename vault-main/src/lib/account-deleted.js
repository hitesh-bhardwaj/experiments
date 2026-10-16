// Set for 15 minutes by "Delete account" (api/user/delete-account): this browser just
// deleted its account, so a dashboard page it comes back to (the Back button) goes to the
// effects listing instead of asking it to sign in again.
export const ACCOUNT_DELETED_COOKIE = "vault-account-deleted";

export function hasDeletedAccount(cookieHeaderOrDocumentCookie = "") {
  return cookieHeaderOrDocumentCookie.split(/;\s*/).some((pair) => pair === `${ACCOUNT_DELETED_COOKIE}=1`);
}
