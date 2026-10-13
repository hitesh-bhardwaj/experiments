/**
 * The `prefetch` value for a <Link> by where it points.
 *
 * Cached pages (ISR / static - effects listings, templates, pricing, blog posts,
 * docs, legal, the homepage) keep Next's default: prefetching them is a cheap
 * CDN hit that makes the click instant. Pages rendered per request cost a full
 * server render per prefetch, so they - and anything that isn't an in-app page -
 * are not prefetched.
 */
const SSR_ROUTES = [
  /^\/dashboard(\/|$)/,
  /^\/blog(\?|$)/, // the listing (?category / ?page); posts are cached
  /^\/effects\/[^/?#]+\/[^/?#]+/, // an effect's own page (per-user access check)
  /^\/(sign-in|sign-up|signup|cli-auth|sso-callback)(\/|$)/,
];

export function prefetchFor(href) {
  if (typeof href !== "string" || !href.startsWith("/") || href.startsWith("//")) return false;
  return SSR_ROUTES.some((re) => re.test(href)) ? false : undefined;
}
