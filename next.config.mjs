/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: { unoptimized: true },
  // Cache-busting for static chunks — prevents stale 404 chunks after redeploy.
  generateBuildId: () => {
    // Use a build ID based on timestamp so each deploy has a unique set of chunks.
    // This forces Vercel's CDN to serve the new chunks, not cached old ones.
    return `odg-build-${Date.now()}`;
  },
  // Security headers — applied to all routes.
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
      {
        // Force JS chunks to be served with correct MIME type + no cache issues
        source: "/_next/static/chunks/:path*",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },
};
export default nextConfig;
