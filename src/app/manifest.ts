import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Overmastery",
    short_name: "Overmastery",
    description: "Your workouts and progress, one step at a time.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#0d121c",
    theme_color: "#0d121c",
    categories: ["fitness", "health", "sports"],
    icons: [
      {
        src: "/icons/overmastery-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/overmastery-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/overmastery-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
