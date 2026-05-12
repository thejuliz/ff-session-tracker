import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: "/ff/",
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      scope: "/ff/",
      base: "/ff/",
      includeAssets: ["favicon.ico", "icon-192.png", "icon-512.png"],
      manifest: {
        name: "FitnessFirst Session Tracker",
        short_name: "FitnessFirst",
        id: "/ff/",
        description: "Track your FitnessFirst coaching sessions",
        theme_color: "#000000",
        background_color: "#f5f5f5",
        display: "standalone",
        scope: "/ff/",
        start_url: "/ff/",
        icons: [
          { src: "/ff/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/ff/icon-512.png", sizes: "512x512", type: "image/png" },
        ],
      },
    }),
  ],
  server: {
    proxy: {
      "/api": "http://localhost:3001",
    },
  },
});
