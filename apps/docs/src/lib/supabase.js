import "server-only";
import { createClient } from "@supabase/supabase-js";

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
}

// Supabase-js has no built-in query timeout - without one, a Supabase-side
// outage (e.g. a Cloudflare 522 in front of the project) hangs every caller
// for as long as the platform allows (a minute or more), blocking whatever
// page render is awaiting it. This caps every request through this client.
const QUERY_TIMEOUT_MS = 5000;

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      fetch: (url, options = {}) =>
        fetch(url, { ...options, signal: AbortSignal.timeout(QUERY_TIMEOUT_MS) }),
    },
  }
);