# Vulnerable Packages: `vault-main`

Source: `npm audit` after upgrading Next.js to 16.3.8 and running `npm audit fix` (2026-10-15). Nothing below has been changed yet.

| # | Package | Current version | Patched version | Why it is not secure | Where it comes from | Production risk |
|---|---|---|---|---|---|---|
| 1 | **brace-expansion** (5.x, 3 copies) | 5.0.9 (pinned by `overrides`) | **5.0.12** | Crafted brace patterns (`{a},b}`, deeply nested braces) cause quadratic CPU use or stack overflow, which is a denial of service | `minimatch` via Sentry bundler plugin, `archiver`, `@typescript-eslint` | Low (build tooling) |
| 2 | **brace-expansion** (1.x, 1 copy) | 1.1.18 (pinned by `overrides`) | **1.1.21** | Same denial of service as above | `minimatch@3` via `eslint` | Low (dev tooling) |
| 3 | **minimatch** | 10.2.6 (3 copies), 3.1.5 (6 copies) | No new release; fixed once brace-expansion is patched | Inherits the brace-expansion denial of service | Sentry plugin, `archiver`, ESLint | Low |
| 4 | **braces** | 3.0.3 | **None available** (3.0.3 is the latest and is still flagged) | Stack exhaustion (denial of service) on deeply nested patterns | `micromatch` ← `fast-glob` ← `eslint-config-next` | None (lint only) |
| 5 | **micromatch** | 4.0.8 | None (inherits from braces) | Pulls in the vulnerable `braces` | `fast-glob` | None (lint only) |
| 6 | **fast-glob** | 3.3.1 | None (inherits from micromatch) | Pulls in the vulnerable `micromatch` | `@next/eslint-plugin-next` | None (lint only) |
| 7 | **@next/eslint-plugin-next** | 16.2.0 | Latest is 16.4.1, but it inherits the issue | Pulls in the vulnerable `fast-glob` | `eslint-config-next` | None (lint only) |
| 8 | **eslint-config-next** (direct) | 16.2.0 | Latest is 16.4.1, but it inherits the issue. npm suggests a downgrade to 14.2.35, which should not be done | Pulls in the vulnerable chain above | `package.json` devDependency | None (lint only) |
| 9 | **eslint** (direct) | 9.39.4 | No fix in 9.x (9.39.5 is still flagged). Likely needs ESLint 10 (latest 10.12.0), a major upgrade | Inherits the `minimatch` issue | `package.json` devDependency | None (lint only) |
| 10 | **@eslint/config-array** | 0.21.2 | 0.23.5 | Inherits the `minimatch` issue | `eslint` | None (lint only) |
| 11 | **@eslint/eslintrc** | 3.3.7 (latest) | Fixed only through `minimatch` | Inherits the `minimatch` issue | `eslint` | None (lint only) |

## Summary

- **Total:** 10 high-severity advisories in the full audit (2 in the runtime audit with `--omit=dev`).
- **Real runtime exposure:** only rows 1–3, and only through build tooling, not user requests.
- **Single change that clears rows 1–3:** raise the `brace-expansion` entries in `package.json` `overrides` to 5.0.12 and 1.1.21.
- **Rows 4–11:** dev/lint tooling that never ships to users. Not a launch blocker.
