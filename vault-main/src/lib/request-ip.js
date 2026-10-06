import "server-only";

// Vercel sets x-forwarded-for to a comma-separated chain (client, then any
// intermediate proxies) - the first entry is the original client. Never
// trust this for security purposes, only as an install-limit bucket key
// (already hashed with a salt before storage, see lib/install-limit.js).
export function getRequestIp(request) {
  const forwardedFor = request.headers.get("x-forwarded-for");

  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) return first;
  }

  return request.headers.get("x-real-ip") || null;
}
