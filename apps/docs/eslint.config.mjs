import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import reactHooksPlugin from "eslint-plugin-react-hooks";

const eslintConfig = defineConfig([
  ...nextVitals,
  {
    files: ["**/*.{js,jsx,mjs,ts,tsx,mts,cts}"],
    plugins: { "react-hooks": reactHooksPlugin },
    rules: {
      // React Compiler correctness rules (bundled by eslint-config-next since
      // eslint-plugin-react-hooks v6). We don't run the compiler yet, and a
      // first pass on this codebase surfaced ~70 pre-existing violations
      // across animation/WebGL components where blindly "fixing" effect
      // timing risks real behavior bugs. Kept visible as warnings (not
      // silenced) rather than a blocking gate - tracked in issue #16.
      "react-hooks/refs": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/purity": "warn",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",

  ]),
]);

export default eslintConfig;
