import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Travel Calendar",
    short_name: "Together",
    description:
      "One shared trip for two people — flights, stays, and the days between, always in sync.",
    start_url: "/?source=pwa",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "browser"],
    orientation: "portrait-primary",
    background_color: "#1c1f27",
    theme_color: "#1c1f27",
    lang: "en",
    dir: "ltr",
    categories: ["travel", "lifestyle", "productivity"],
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Open trip",
        short_name: "Trip",
        description: "Open your active trip",
        url: "/?source=pwa",
        icons: [{ src: "/icon-192.png", sizes: "192x192" }],
      },
    ],
  }
}
