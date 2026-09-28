const SIDEBAR_DOCS_NAVIGATION_KEY = "hyperiux-sidebar-docs-navigation";
const SIDEBAR_DOCS_NAVIGATION_TTL_MS = 2500;

export function markSidebarDocsNavigation() {
  if (typeof window === "undefined") return;

  window.sessionStorage.setItem(
    SIDEBAR_DOCS_NAVIGATION_KEY,
    String(Date.now() + SIDEBAR_DOCS_NAVIGATION_TTL_MS)
  );
}

export function shouldSkipSidebarDocsAnimation() {
  if (typeof window === "undefined") return false;
  if (!window.location.pathname.startsWith("/docs")) return false;

  const expiresAt = Number(
    window.sessionStorage.getItem(SIDEBAR_DOCS_NAVIGATION_KEY)
  );

  if (!expiresAt) return false;

  if (Date.now() > expiresAt) {
    window.sessionStorage.removeItem(SIDEBAR_DOCS_NAVIGATION_KEY);
    return false;
  }

  return true;
}
