import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "icon.svg", "robots.txt"],
      workbox: {
        navigateFallbackDenylist: [/^\/~oauth/],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
      },
      manifest: {
        name: "VISÃO - Sistema de Vigilância",
        short_name: "VISÃO",
        theme_color: "#1a1a2e",
        background_color: "#1a1a2e",
        display: "standalone",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" }
        ]
      }
    }), react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    force: true,
    include: ["react", "react-dom", "react-dom/client", "react/jsx-runtime", "react/jsx-dev-runtime"],
    exclude: ["@mediapipe/pose", "@tensorflow/tfjs-backend-webgpu"],
  },
  build: {
    target: "es2020",
    cssMinify: true,
    rollupOptions: {
      external: ["@mediapipe/pose", "@tensorflow/tfjs-backend-webgpu"],
      output: {
        manualChunks: {
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          "vendor-ui": [
            "@radix-ui/react-dialog",
            "@radix-ui/react-dropdown-menu",
            "@radix-ui/react-tabs",
            "@radix-ui/react-tooltip",
            "@radix-ui/react-popover",
            "@radix-ui/react-select",
          ],
          "vendor-charts": ["recharts"],
          "vendor-motion": ["framer-motion"],
          "vendor-query": ["@tanstack/react-query"],
          "vendor-supabase": ["@supabase/supabase-js"],
          "vendor-pdf": ["jspdf", "html2canvas"],
        },
      },
    },
  },
}));
