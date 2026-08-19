import type { MetadataRoute } from "next";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: SITE_NAME,
    description: SITE_DESCRIPTION,
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#faf8f5",
    theme_color: "#5f7a6b",
    icons: [
      {
        src: "/angel-island-mark-light.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/angel-island-mark-light.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/angel-island-mark-light.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
