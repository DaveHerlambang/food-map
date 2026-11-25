import type { MetadataRoute } from "next"

/**
 * Home screen app (PWA): full screen, asphalt behind the splash and the
 * status bar. No service worker on purpose: nothing works offline (hours must
 * be fresh), and a cached old version is worse than a moment of loading.
 * The icons are static PNGs in public/icons, drawn from public/icons/icon.svg.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Food Map",
    short_name: "Food Map",
    description: "Our curated late-night food map",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#17171a",
    theme_color: "#17171a",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  }
}
