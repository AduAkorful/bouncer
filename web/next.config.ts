import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // The repo-root AGENTS.md is the handoff. Do not let `next dev` write another one here.
  agentRules: false,
  cacheComponents: true,
  partialPrefetching: true,
  async redirects() {
    return [{ source: "/v/:vault/home", destination: "/v/:vault", permanent: true }];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
