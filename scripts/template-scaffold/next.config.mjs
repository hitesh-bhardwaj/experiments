/** @type {import('next').NextConfig} */
const nextConfig = {
  // Deliberately minimal - this is a standalone export of one template's own
  // page, not the full Hyperiux Vault app. No monorepo path tracing, no
  // bundle analyzer/Sentry, no site-wide redirects, no broad remote-image
  // allowlist (this template uses only local, imported image assets).
};

export default nextConfig;
