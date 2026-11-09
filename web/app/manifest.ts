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
    icons: [{ src: "/apple-icon", sizes: "180x180", type: "image/png" }],
  };
}
