import "server-only";
import crypto from "crypto";

export function createCliToken() {
  const rawToken = crypto.randomBytes(32).toString("hex");
  return `hpx_${rawToken}`;
}

export function hashCliToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}