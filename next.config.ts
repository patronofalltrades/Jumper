import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // The proxy sends visitors without a session to /login first.
  redirects: async () => [{ source: "/", destination: "/lobby", permanent: false }],
};

export default nextConfig;
