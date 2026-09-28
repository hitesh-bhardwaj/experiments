import { defineConfig } from "vitest/config";
import path from "path";

const registryEffectsPathSegment = `${path.sep}registry${path.sep}effects${path.sep}`;

// registry/effects lives outside apps/docs and has no node_modules of its
// own - it's meant to be copied into a consumer project by the CLI, which
// installs deps like gsap/three there. For running these files in place
// (render tests), bare imports from a registry effect file need to fall
// back to apps/docs's own node_modules instead of walking up from the
// effect's real location and finding nothing.
function resolveRegistryEffectDeps() {
  return {
    name: "resolve-registry-effect-deps",
    async resolveId(source, importer) {
      if (!importer || !source || source.startsWith(".") || path.isAbsolute(source)) {
        return null;
      }
      if (!importer.includes(registryEffectsPathSegment)) return null;
      const resolved = await this.resolve(source, path.join(__dirname, "package.json"), {
        skipSelf: true,
      });
      return resolved ?? null;
    },
  };
}

export default defineConfig({
  plugins: [resolveRegistryEffectDeps()],
  server: {
    // registry/effects lives outside apps/docs (this project's Vite root) -
    // the jsdom test environment loads modules through Vite's dev-server-like
    // fs allowlist, which otherwise refuses anything outside the root.
    fs: {
      allow: [path.resolve(__dirname, "../..")],
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.js", "src/**/*.test.jsx"],
    environmentMatchGlobs: [["src/**/*.test.jsx", "jsdom"]],
    setupFiles: ["./test/setup/effects-dom-mocks.js"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // server-only throws unconditionally outside Next.js's own build
      // pipeline - it has no meaning to a Node-based test runner, so it's
      // stubbed to a no-op rather than actually installing a fake module.
      "server-only": path.resolve(__dirname, "./test/stubs/server-only.js"),
      // Pin react/react-dom to one exact resolved path. Without this, registry
      // effect files (resolved via the plugin above) and the test file itself
      // (resolved normally) can each get react from a different-but-equivalent
      // path, which Vite's module graph treats as two separate copies -
      // "Invalid hook call" follows since hooks need a single React instance.
      react: path.resolve(__dirname, "./node_modules/react"),
      "react-dom": path.resolve(__dirname, "./node_modules/react-dom"),
      // Coordinates transitions with Next's app router, which doesn't exist
      // outside a real Next.js request tree - stubbed to render children
      // directly so the effects wrapping it can still be mount-tested.
      "next-transition-router": path.resolve(
        __dirname,
        "./test/stubs/next-transition-router.js"
      ),
      // next/font's build-time font loading (downloading/subsetting/hashing
      // real font files) has no meaning to a Node-based test runner - see
      // the stub for what it actually returns.
      "next/font/google": path.resolve(__dirname, "./test/stubs/next-font-google.js"),
    },
  },
});
