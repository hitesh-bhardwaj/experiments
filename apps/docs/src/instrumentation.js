export async function register() {
 if (!process.env.NEXT_PUBLIC_SENTRY_DSN) {
  return;
 }

 if (process.env.NEXT_RUNTIME ==="nodejs") {
  await import("../sentry.server.config.js");
 }

 if (process.env.NEXT_RUNTIME ==="edge") {
  await import("../sentry.edge.config.js");
 }
}
