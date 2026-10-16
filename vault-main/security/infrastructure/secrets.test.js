import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";
import { VAULT_ROOT, REPO_ROOT, walk } from "../helpers/route-harness.js";

// Secret hygiene and server/client boundary, statically. Catches the
// classes of mistake that leak infrastructure credentials: a committed
// .env, a secret behind a NEXT_PUBLIC_ name (inlined into the browser
// bundle), a client component importing a module that reads a server
// secret, and non-constant-time secret comparison. Reports: L4, L8, L9.

const SRC = path.join(VAULT_ROOT, "src");
const sourceFiles = walk(SRC, { include: (f) => /\.(m?jsx?|tsx?)$/.test(f) && !/\.test\./.test(f) });
const read = (f) => fs.readFileSync(f, "utf-8");
const rel = (f) => path.relative(VAULT_ROOT, f);

// Modules that read a server secret or the service-role DB client.
const SERVER_SECRET_MODULES = [
  "lib/supabase",
  "lib/razorpay",
  "lib/admin",
  "lib/subscription",
  "lib/pro-access",
  "lib/plans.server",
  "lib/template-credits",
  "lib/template-purchases",
  "lib/template-scaffolds",
  "lib/upgrade",
  "lib/resend",
  "lib/cli-auth",
  "lib/cli-token",
  "lib/effect-access",
  "lib/install-limit",
  "lib/sanity",
  "lib/recaptcha",
];

const SECRET_NAME = /SECRET|TOKEN|PRIVATE|SERVICE_ROLE|PASSWORD|WEBHOOK|API_KEY|_SALT/i;
// Public-by-design identifiers that happen to match the pattern.
const PUBLIC_NAME_ALLOWLIST = new Set(["NEXT_PUBLIC_RECAPTCHA_SITE_KEY"]);

describe("committed secrets", () => {
  it("no .env file (other than an example) is tracked by git", () => {
    const tracked = execFileSync("git", ["ls-files"], { cwd: REPO_ROOT, encoding: "utf-8" }).split("\n");
    const envFiles = tracked.filter((f) => /(^|\/)\.env(\.|$)/.test(f) && !/\.example$|\.sample$|\.template$/.test(f));
    expect(envFiles).toEqual([]);
  });

  it("no live-looking credentials appear in tracked source", () => {
    const tracked = execFileSync("git", ["ls-files", "vault-main/src", "vault-main/scripts", "vault-main/sql", "registry/effects"], {
      cwd: REPO_ROOT,
      encoding: "utf-8",
    })
      .split("\n")
      .filter((f) => /\.(m?jsx?|tsx?|json|sql|sh|ya?ml|md)$/.test(f));
    const PATTERNS = [
      /rzp_live_[A-Za-z0-9]{8,}/,
      /sk_live_[A-Za-z0-9]{8,}/,
      /whsec_[A-Za-z0-9]{20,}/,
      /re_[A-Za-z0-9]{20,}_[A-Za-z0-9]{8,}/, // Resend
      /eyJhbGciOi[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}/, // JWT (Supabase service role)
      /AKIA[0-9A-Z]{16}/,
      /gh[pousr]_[A-Za-z0-9]{36}/,
      /hpx_[0-9a-f]{64}/, // a real CLI token
      /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/,
    ];
    const hits = [];
    for (const file of tracked) {
      // Tracked but deleted in the working tree (not committed yet): nothing to scan
      if (!fs.existsSync(path.join(REPO_ROOT, file))) continue;
      const text = fs.readFileSync(path.join(REPO_ROOT, file), "utf-8");
      for (const pattern of PATTERNS) {
        const match = pattern.exec(text);
        // Test fixtures with obviously fake repeated characters are fine.
        if (match && !/^hpx_(.)\1{63}$/.test(match[0])) hits.push(`${file}: ${match[0].slice(0, 12)}…`);
      }
    }
    expect(hits).toEqual([]);
  });

  it(".gitignore covers env files and key material", () => {
    const gitignore = read(path.join(VAULT_ROOT, ".gitignore"));
    expect(gitignore).toMatch(/^\.env\*?/m);
  });
});

describe("NEXT_PUBLIC_ never carries a secret", () => {
  it("no NEXT_PUBLIC_* variable referenced in src looks like a secret", () => {
    const names = new Set();
    for (const file of sourceFiles) {
      for (const [, name] of read(file).matchAll(/process\.env\.(NEXT_PUBLIC_[A-Z0-9_]+)/g)) names.add(name);
    }
    expect([...names].filter((n) => SECRET_NAME.test(n) && !PUBLIC_NAME_ALLOWLIST.has(n))).toEqual([]);
  });

  // .env.local is untracked, but Next inlines any NEXT_PUBLIC_ value the
  // moment code references it - a secret parked under that prefix is one
  // `process.env.` away from the browser bundle. Skips on machines without
  // a local env file (CI).
  const localEnv = path.join(VAULT_ROOT, ".env.local");
  it.skipIf(!fs.existsSync(localEnv)).fails("[L8] no local env var with a NEXT_PUBLIC_ prefix holds a secret", () => {
    const names = read(localEnv)
      .split("\n")
      .map((line) => /^\s*(NEXT_PUBLIC_[A-Z0-9_]+)\s*=/.exec(line)?.[1])
      .filter(Boolean);
    expect(names.filter((n) => SECRET_NAME.test(n) && !PUBLIC_NAME_ALLOWLIST.has(n))).toEqual([]);
  });
});

describe("server/client boundary", () => {
  const clientFiles = sourceFiles.filter((f) => /^\s*["']use client["']/m.test(read(f).slice(0, 200)));

  it("found client components to check", () => {
    expect(clientFiles.length).toBeGreaterThan(50);
  });

  it("no 'use client' file imports a module that holds server secrets", () => {
    const offenders = [];
    for (const file of clientFiles) {
      for (const [, spec] of read(file).matchAll(/from\s+["']([^"']+)["']/g)) {
        const normalised = spec.replace(/^@\//, "").replace(/\.(m?jsx?|tsx?)$/, "");
        if (SERVER_SECRET_MODULES.some((m) => normalised === m || normalised.endsWith(`/${m}`))) {
          offenders.push(`${rel(file)} -> ${spec}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("the Supabase client uses the service-role key and is server-only", () => {
    const source = read(path.join(SRC, "lib/supabase.js"));
    expect(source).toMatch(/^import ["']server-only["']/m);
    expect(source).toMatch(/SUPABASE_SERVICE_ROLE_KEY/);
    expect(source).not.toMatch(/NEXT_PUBLIC_SUPABASE_ANON_KEY|NEXT_PUBLIC_SUPABASE_SERVICE/);
  });

  // sanity.js reads SANITY_API_TOKEN and recaptcha.js reads
  // RECAPTCHA_SECRET_KEY, but neither has the build-time guard - nothing
  // stops a future client import from pulling them into the bundle.
  it.fails("[L9] every module that reads a server secret starts with import 'server-only'", () => {
    const missing = [];
    for (const file of sourceFiles.filter((f) => /[\\/]lib[\\/]/.test(f))) {
      const text = read(file);
      const readsSecret = [...text.matchAll(/process\.env\.([A-Z0-9_]+)/g)].some(
        ([, name]) => !name.startsWith("NEXT_PUBLIC_") && SECRET_NAME.test(name)
      );
      if (readsSecret && !/^import ["']server-only["']/m.test(text)) missing.push(rel(file));
    }
    expect(missing).toEqual([]);
  });
});

describe("secret comparison", () => {
  // Shared-secret checks should use crypto.timingSafeEqual. The HMAC
  // routes (Razorpay webhook, verify-payment) already do.
  it.fails("[L4] no route compares a header/body secret with === / !==", () => {
    const offenders = [];
    for (const file of sourceFiles.filter((f) => /[\\/]app[\\/]api[\\/]/.test(f))) {
      const text = read(file);
      if (/(secret|signature|otp|hash)\w*\s*!==?\s*\w*(secret|stored|expected)|!==?\s*secret\b|headers\.get\([^)]*secret[^)]*\)\s*!==?/i.test(text)) {
        offenders.push(rel(file));
      }
    }
    expect(offenders).toEqual([]);
  });

  it("HMAC verification uses timingSafeEqual (control)", () => {
    for (const file of ["src/app/api/razorpay/webhooks/route.js", "src/app/api/razorpay/verify-payment/route.js"]) {
      expect(read(path.join(VAULT_ROOT, file)), file).toMatch(/timingSafeEqual/);
    }
  });
});

describe("deploy configuration", () => {
  // `npm install` can resolve different transitive versions than the
  // lockfile on a deploy; `npm ci` fails instead.
  it.fails("[L12] deploys install strictly from the lockfile", () => {
    const vercel = JSON.parse(read(path.join(VAULT_ROOT, "vercel.json")));
    expect(vercel.installCommand).toMatch(/^npm ci\b/);
  });

  it("a lockfile is committed", () => {
    expect(fs.existsSync(path.join(VAULT_ROOT, "package-lock.json"))).toBe(true);
  });
});
