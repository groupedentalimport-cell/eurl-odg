/** @type {import('next').NextConfig} */
// ============================================================
// REFACTOR (refactor/total — audit §5.8, §5.9, §2.12)
// ============================================================
// Removed:
//   - `images: { unoptimized: true }` — re-enabled Next.js image
//     optimizer for proper responsive images + WebP/AVIF.
//   - `generateBuildId: () => 'odg-build-${Date.now()}'` — Next.js
//     already content-hashes chunk filenames; the custom build ID
//     was invalidating ALL static chunks on every deploy, defeating
//     the CDN cache and breaking Vercel ISR.
//   - `X-XSS-Protection: 1; mode=block` — deprecated and unsafe in
//     old browsers (can introduce XSS bypasses).
// Added:
//   - `Strict-Transport-Security` with preload.
//   - `Content-Security-Policy` — strict, no `unsafe-eval`.
//     Note: `'unsafe-inline'` for `script-src` is required by
//     Next.js's inline runtime; tighten further only after migrating
//     to nonces (next 15+ supports per-route nonces).
//   - `serverExternalPackages` so `nodemailer` and `z-ai-web-dev-sdk`
//     are not bundled into the server chunk (smaller deploy, faster
//     cold start).
// ============================================================
const nextConfig = {
  reactStrictMode: true,
  // nodemailer and z-ai-web-dev-sdk should not be bundled — they
  // have native/optional deps that don't survive the bundler.
  serverExternalPackages: ["nodemailer", "z-ai-web-dev-sdk"],
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://va.vercel-scripts.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "img-src 'self' data: blob: https:",
              "font-src 'self' data: https://fonts.gstatic.com",
              "connect-src 'self' https:",
              "frame-ancestors 'self'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
          },
        ],
      },
      {
        // Force JS chunks to be served with correct MIME type + immutable cache.
        source: "/_next/static/chunks/:path*",
        headers: [
          {
            key: "Content-Type",
            value: "application/javascript; charset=utf-8",
          },
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};
export default nextConfig;
