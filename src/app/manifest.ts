import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "TE",
    short_name: "TE",
    description: "Sistem manajemen klub renang dan finswimming.",
    lang: "id",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    background_color: "#f6f9fb",
    theme_color: "#0b6fa4",
    icons: [
      {
        src: "/icons/te-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/te-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/te-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
