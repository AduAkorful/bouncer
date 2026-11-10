import type { NextConfig } from "next";

/** Hosts the browser may talk to: this site, the server, and the testnet nodes. Nothing else can be called from a page. */
function connectSources(): string {
  const hosts = new Set(["'self'"]);
  for (const value of [process.env.NEXT_PUBLIC_API_URL, process.env.NEXT_PUBLIC_RPC_URL, process.env.NEXT_PUBLIC_RPC_FALLBACK_URL]) {
    try {
      if (value) hosts.add(new URL(value).origin);
    } catch {
      // A value that is not a URL adds nothing.
    }
  }
  return [...hosts].join(" ");
}

// Scripts the framework writes inline need 'unsafe-inline' until the app moves to nonces, so this policy limits
// where the page may connect, frame, embed and submit to, and forbids being framed, but is not a script allowlist.
const POLICY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "media-src 'self' data: blob:",
  `connect-src ${connectSources()}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const nextConfig: NextConfig = {
  /* config options here */
  // The repo-root AGENTS.md is the handoff. Do not let `next dev` write another one here.
  agentRules: false,
  cacheComponents: true,
  partialPrefetching: true,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: POLICY },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Passkeys are this site's own. Nothing else on the page asks for a device.
          { key: "Permissions-Policy", value: "publickey-credentials-get=(self), publickey-credentials-create=(self), camera=(), microphone=(), geolocation=(), payment=()" },
        ],
      },
    ];
  },
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
