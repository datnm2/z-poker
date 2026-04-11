import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Z-Poker",
    short_name: "Z-Poker",
    description: "Office Poker Elo Tracker",
    start_url: "/",
    display: "standalone",
    background_color: "#0f172a",
    theme_color: "#f59e0b",
    icons: [
      { src: "/icon", sizes: "64x64", type: "image/png" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
