import type { MetadataRoute } from "next";

// The web app manifest. "portrait" locks the rotation when Jumper is installed on a phone (home screen).
// In a browser tab, components/turn-upright.tsx covers the page when the phone turns sideways.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Jumper",
    short_name: "Jumper",
    description: "Learn hardware engineering on a 3D breadboard.",
    start_url: "/lobby",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0d1418",
    theme_color: "#0d1418",
    icons: [{ src: "/favicon.ico", sizes: "any", type: "image/x-icon" }],
  };
}
