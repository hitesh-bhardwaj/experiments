// Shared between the admin activity list (building the link) and the
// [userSlug] route (matching it back to a user), so the two stay in sync
// on one slug format. Not server-only - the list page is a client
// component and needs to build the same slug to link to.

function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Purely a readable slug - the user's name, or the part of their email
// before "@" when they have no name set. No id embedded by design, so two
// users sharing a name (or the same email local-part on different domains)
// can produce the same slug - the [userSlug] route resolves that by
// matching against the full user list and taking the first hit, which
// degrades a rare collision to "shows one of the matching users" rather
// than breaking.
export function buildUserActivitySlug({ name, email }) {
  const base = name || email?.split("@")[0];

  return base ? slugify(base) : "user";
}

// The tab names under /dashboard; a username equal to one would be read as the old
// ID-less tab URL (proxy.js), so it gets "-user" on the end.
const RESERVED = new Set(["saved", "templates", "usage", "invoicing", "settings", "admin"]);

/**
 * The name in a dashboard URL, /dashboard/{username}: the account's Clerk username, or
 * its full name, or its email before "@" (slugified). Takes a Clerk user from the
 * browser (useUser) or the server (currentUser). Only ever compared with the signed-in
 * account's own, so two accounts sharing one is harmless.
 */
export function dashboardUsername(user) {
  if (!user) return "";
  const email =
    user.primaryEmailAddress?.emailAddress ||
    user.emailAddresses?.find((address) => address.id === user.primaryEmailAddressId)?.emailAddress ||
    user.emailAddresses?.[0]?.emailAddress;
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ");
  const slug = slugify(user.username || name || email?.split("@")[0] || "") || "me";
  return RESERVED.has(slug) ? `${slug}-user` : slug;
}
