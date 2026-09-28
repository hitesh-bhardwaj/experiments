import { withSentryConfig } from "@sentry/nextjs";
import createBundleAnalyzer from "@next/bundle-analyzer";
import path from "path";
import { fileURLToPath } from "url";

const withBundleAnalyzer = createBundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Monorepo root, shared by outputFileTracingRoot and turbopack.root (Next requires them to match).
const monorepoRoot = path.join(__dirname, "../../");

const shouldUploadSentrySourceMaps = Boolean(
  process.env.CI === "true" || process.env.SENTRY_UPLOAD_SOURCE_MAPS === "true"
);

const hasSentryBuildConfig = Boolean(
  shouldUploadSentrySourceMaps &&
    process.env.NEXT_PUBLIC_SENTRY_DSN &&
    process.env.SENTRY_ORG &&
    process.env.SENTRY_PROJECT &&
    process.env.SENTRY_AUTH_TOKEN
);

const allowedIframeSources = [
  "'self'",
  "https://*.csb.app",
  "https://codesandbox.io",
  "https://codepen.io",
  "https://*.codepen.io",
  "https://*.codepen.dev",
  "https://challenges.cloudflare.com",
  "https://www.google.com",
  "https://recaptcha.google.com",
  "https://api.razorpay.com",
  "https://checkout.razorpay.com",
].join(" ");

/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ["local.vault.hyperiux.com"],

  outputFileTracingRoot: monorepoRoot,

  turbopack: {
    root: monorepoRoot,
  },

  experimental: {
    optimizePackageImports: ["lucide-react", "motion", "gsap"],
    optimizeCss: true,
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: `frame-src ${allowedIframeSources};`,
          },
        ],
      },
    ];
  },

  async redirects() {
    return [
      {
        source: "/effects/components/book-flip",
        destination: "/effects/webgl-effects/book-flip",
        permanent: false,
      },
      {
        source: "/effects/components/book-flip/preview",
        destination: "/effects/webgl-effects/book-flip/preview",
        permanent: false,
      },
      {
        source: "/effects/components/colliding-models",
        destination: "/effects/webgl-effects/colliding-models",
        permanent: false,
      },
      {
        source: "/effects/components/colliding-models/preview",
        destination: "/effects/webgl-effects/colliding-models/preview",
        permanent: false,
      },
      {
        source: "/effects/components/file-encryption",
        destination: "/effects/webgl-effects/file-encryption",
        permanent: false,
      },
      {
        source: "/effects/components/file-encryption/preview",
        destination: "/effects/webgl-effects/file-encryption/preview",
        permanent: false,
      },
      {
        source: "/effects/components/hyperiux-glitter-concept",
        destination: "/effects/webgl-effects/hyperiux-glitter-concept",
        permanent: false,
      },
      {
        source: "/effects/components/hyperiux-glitter-concept/preview",
        destination: "/effects/webgl-effects/hyperiux-glitter-concept/preview",
        permanent: false,
      },
      {
        source: "/effects/webgl-effects/infinite-grid-gallery",
        destination: "/effects/components/infinite-grid-gallery",
        permanent: false,
      },
      {
        source: "/effects/webgl-effects/infinite-grid-gallery/preview",
        destination: "/effects/components/infinite-grid-gallery/preview",
        permanent: false,
      },
      {
        source: "/effects/components/hover-slider",
        destination: "/effects/webgl-effects/hover-slider",
        permanent: false,
      },
      {
        source: "/effects/components/hover-slider/preview",
        destination: "/effects/webgl-effects/hover-slider/preview",
        permanent: false,
      },
    ];
  },

  images: {
    qualities: [60, 65, 75, 90, 95, 100],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 280, 320, 384, 560, 640],
    // Next's default is 4h - these /_next/image URLs are content-addressed
    // (src+width+quality baked into the query string), so a stale cached
    // response is never actually stale. A year removes the "uncached asset"
    // SEO/perf flag with no correctness downside.
    minimumCacheTTL: 31536000,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },

  webpack(config) {
    config.module.rules.push({
      test: /\.(glb|gltf)$/,
      type: "asset/resource",
    });
    return config;
  },
};

const analyzedConfig = withBundleAnalyzer(nextConfig);

const sentryConfig = hasSentryBuildConfig
  ? withSentryConfig(analyzedConfig, {
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,

      silent: true,
      widenClientFileUpload: true,
      hideSourceMaps: true,

      webpack: {
        treeshake: {
          removeDebugLogging: true,
        },
      },
    })
  : analyzedConfig;

export default process.env.NODE_ENV === "development"
  ? analyzedConfig
  : sentryConfig;