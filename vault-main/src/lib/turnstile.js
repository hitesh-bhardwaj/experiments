import "server-only";

// Cloudflare Turnstile: the bot check on the site's public forms (custom
// animation request, work with Hyperiux, exit-intent invite). The browser
// widget (components/WebsiteComps/Turnstile.jsx) hands the form a single-use
// token; the API route checks it here before doing anything.
//
// Env: TURNSTILE_SECRET_KEY (server), NEXT_PUBLIC_TURNSTILE_SITE_KEY (widget)

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

// The client IP Vercel forwards, passed on to Cloudflare as an extra signal
export function clientIp(request) {
  return request?.headers?.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
}

/**
 * @param {string} token   the widget's token, from the request body
 * @param {object} options action: the widget's action name, which must match;
 *                         ip: the visitor's IP (optional)
 */
export async function verifyTurnstile(token, { action, ip } = {}) {
  const secret = process.env.TURNSTILE_SECRET_KEY;

  if (!secret) {
    console.error("TURNSTILE_SECRET_KEY is not configured.");
    return { success: false };
  }

  // Tokens are at most 2048 characters
  if (!token || typeof token !== "string" || token.length > 2048) {
    return { success: false };
  }

  try {
    const response = await fetch(VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token, ...(ip ? { remoteip: ip } : {}) }),
    });
    const data = await response.json();

    if (!data.success) return { success: false, errors: data["error-codes"] };

    // A token made for one form can't be replayed against another
    if (action && data.action !== action) return { success: false };

    return { success: true };
  } catch (error) {
    console.error("Turnstile verification error:", error);
    return { success: false };
  }
}
