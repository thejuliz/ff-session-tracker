import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: "/ff/",
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "icon-192.png", "icon-512.png"],
      manifest: {
        name: "FitnessFirst Session Tracker",
        short_name: "FitnessFirst",
        description: "Track your FitnessFirst coaching sessions",
        theme_color: "#1e40af",
        background_color: "#f1f5f9",
        display: "standalone",
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
