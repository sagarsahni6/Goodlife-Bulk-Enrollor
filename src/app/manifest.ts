import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Goodlife Bulk Enrollor v4.0",
    short_name: "GoodLife Automate",
    description:
      "Automate your Hero GoodLife login and Joyride bulk enrollments 10x faster. Official verified Chrome Extension for Hero MotoCorp authorized dealerships.",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0d14",
    theme_color: "#e11d48",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  };
}
