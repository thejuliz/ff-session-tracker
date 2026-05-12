import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "FF Session Tracker",
        short_name: "FF Tracker",
        description: "Track your FitnessFirst coaching sessions",
        theme_color: "#1e40af",
        background_color: "#f8fafc",
        display: "standalone",
        icons: [
          {
            src: "/icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/icon-512.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg}"],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\/api\/.*/i,
            handler: "NetworkOnly", // Skip offline for v1
          },
        ],
      },
    }),
  ],
  server: {
    proxy: {
      "/api": "http://localhost:3001",
    },
  },
  build: {
    outDir: "dist",
  },
});
