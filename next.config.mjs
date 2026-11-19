/** @type {import('next').NextConfig} */
const nextConfig = {
  // Playwright's base URL is localhost. 127.0.0.1 is the same dev server,
  // and Next blocks its assets unless the host is allowed.
  allowedDevOrigins: ["127.0.0.1"],
  images: {
    unoptimized: true,
  },
  headers: async () => [
    {
      source: "/(.*)",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "origin-when-cross-origin" },
      ],
    },
    {
      source: "/icon-:size(\\d+).png",
      headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
    },
  ],
}

export default nextConfig
