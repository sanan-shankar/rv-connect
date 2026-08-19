import type { MetadataRoute } from "next";

/**
 * The web app manifest, which is what a home-screen or dock install actually
 * reads. Before this existed, the only raster icon on the site was a 32px
 * favicon.ico, so macOS "Add to Dock" had nothing better to scale up and iOS
 * fell back to drawing a letter tile.
 *
 * Two icon purposes, because they are cropped differently: "any" keeps our own
 * rounded square, "maskable" is full bleed with the ridge inside the safe zone
 * so an adaptive launcher can clip it to whatever shape it likes. Both come
 * out of scripts/dev/generate-icons.mjs; regenerate rather than hand-editing.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Rishi Valley",
    short_name: "Rishi Valley",
    description: "A space for the Rishi Valley community to stay connected.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    // Both match the viewport themeColor in layout.tsx and --background in
    // globals.css, so the splash screen is the same warm paper the app opens
    // on rather than a white flash before the first paint.
    background_color: "#E4E1D5",
    theme_color: "#E4E1D5",
    icons: [
      {
        src: "/images/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/images/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/images/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
