// Rewrites npm-style shell commands for pnpm / yarn / bun. Used by CodeBlock
// to show package-manager tabs on install/run commands.
export const PACKAGE_MANAGERS = ["npm", "pnpm", "yarn", "bun"];

const STORAGE_KEY = "hx-package-manager";
const listeners = new Set();
let current = null;

export function getPackageManager() {
  if (current) return current;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    current = PACKAGE_MANAGERS.includes(saved) ? saved : "npm";
  } catch {
    current = "npm";
  }
  return current;
}

export function setPackageManager(pm) {
  current = pm;
  try { localStorage.setItem(STORAGE_KEY, pm); } catch { /* storage is optional */ }
  listeners.forEach((fn) => fn());
}

export function subscribePackageManager(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// One line → { kind, rest } in a manager-neutral form, or null.
function parseLine(line) {
  const t = line.trim();
  let m;
  if ((m = t.match(/^npx\s+(.+)$/)) || (m = t.match(/^(?:pnpm|yarn)\s+dlx\s+(.+)$/)) || (m = t.match(/^bunx\s+(.+)$/))) return { kind: "exec", rest: m[1] };
  if ((m = t.match(/^npm\s+(?:install|i)\s+(.+)$/)) || (m = t.match(/^(?:pnpm|yarn|bun)\s+add\s+(.+)$/))) return { kind: "add", rest: m[1] };
  if ((m = t.match(/^npm\s+(?:install|i)$/)) || (m = t.match(/^(?:pnpm|yarn|bun)\s+install$/))) return { kind: "install", rest: "" };
  if ((m = t.match(/^(?:npm|pnpm|bun)\s+run\s+(.+)$/)) || (m = t.match(/^yarn\s+(?!add\b|dlx\b|install\b)(.+)$/))) return { kind: "run", rest: m[1] };
  return null;
}

const FORMAT = {
  npm: { exec: (r) => `npx ${r}`, add: (r) => `npm install ${r}`, install: () => "npm install", run: (r) => `npm run ${r}` },
  pnpm: { exec: (r) => `pnpm dlx ${r}`, add: (r) => `pnpm add ${r}`, install: () => "pnpm install", run: (r) => `pnpm run ${r}` },
  yarn: { exec: (r) => `yarn dlx ${r}`, add: (r) => `yarn add ${r}`, install: () => "yarn install", run: (r) => `yarn ${r}` },
  bun: { exec: (r) => `bunx ${r}`, add: (r) => `bun add ${r}`, install: () => "bun install", run: (r) => `bun run ${r}` },
};

// Map of manager → command, or null when the snippet isn't purely PM commands.
export function getPackageManagerVariants(code) {
  const lines = String(code || "").split("\n").filter((l) => l.trim() && !l.trim().startsWith("#"));
  if (!lines.length) return null;
  const parsed = lines.map(parseLine);
  if (parsed.some((p) => !p)) return null;
  return Object.fromEntries(
    PACKAGE_MANAGERS.map((pm) => [pm, parsed.map((p) => FORMAT[pm][p.kind](p.rest)).join("\n")]),
  );
}
