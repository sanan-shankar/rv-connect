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
      /* For the Mac dock, which is the only thing that wants more than 512.
         Safari's Add to Dock reads this manifest, and a dock icon at the
         largest setting on a Retina display is 1024 physical pixels -- the
         512 was being stretched to fill it. Android and Chrome's install
         dialog both stop at 512 and will keep choosing that entry; nothing
         downloads this 21KB unless it genuinely wants the size. */
      {
        src: "/images/icons/icon-1024.png",
        sizes: "1024x1024",
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
