import "server-only";

// The daily install-limit quota resets at UTC midnight (usage_date is a
// plain UTC date string throughout install-limit.js) - this tells a rate
// limited caller exactly how long until that happens, for a `Retry-After`
// header and a "try again in Nh" message.
export function secondsUntilNextUtcMidnight() {
  const now = new Date();
  const nextMidnight = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);

  return Math.max(1, Math.round((nextMidnight - now.getTime()) / 1000));
}
