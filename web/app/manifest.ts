import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Bouncer",
    short_name: "Bouncer",
    description: "Get a bill past the door. An AI door-guard game on NEAR testnet.",
    start_url: "/home",
    display: "standalone",
    background_color: "#0d0a12",
    theme_color: "#0d0a12",
    icons: [
      { src: "/icons/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
