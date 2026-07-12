import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "react": path.resolve(__dirname, "node_modules/react"),
      "react-dom": path.resolve(__dirname, "node_modules/react-dom"),
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
    // Warning só dispara acima de 2.6MB. Os únicos chunks acima de 700kB são
    // vendor-ml (TensorFlow/face-api ≈ 2.5MB) e vendor-mapbox (≈ 1.8MB); ambos
    // são lazy-loaded (não entram no bundle inicial nem bloqueiam o LCP).
    // Regredir esse teto == alguém adicionou lib pesada ao caminho crítico.
    chunkSizeWarningLimit: 2600,
    rollupOptions: {
      external: ["@mediapipe/pose", "@tensorflow/tfjs-backend-webgpu"],
      output: {
        // Estratégia: manter vendors pesados fora do bundle inicial.
        // Funções (não objetos) permitem casar por caminho e capturar
        // sub-dependências que caem no chunk errado quando declaradas em array.
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;

          // React core (sempre no bundle inicial)
          if (/[\\/]node_modules[\\/](react|react-dom|react-router-dom|scheduler)[\\/]/.test(id)) {
            return "vendor-react";
          }
          // Data + estado
          if (id.includes("@tanstack/react-query")) return "vendor-query";
          if (id.includes("@supabase/")) return "vendor-supabase";

          // UI kits
          if (id.includes("@radix-ui/")) return "vendor-radix";
          if (id.includes("framer-motion")) return "vendor-motion";
          if (id.includes("lucide-react")) return "vendor-icons";

          // Visualização / relatórios (lazy nos pages consumidores)
          if (id.includes("recharts") || id.includes("d3-")) return "vendor-charts";
          if (id.includes("jspdf") || id.includes("html2canvas")) return "vendor-pdf";

          // Mídia / mapas / ML (lazy)
          if (id.includes("mapbox-gl")) return "vendor-mapbox";
          if (id.includes("hls.js")) return "vendor-hls";
          if (
            id.includes("@tensorflow/") ||
            id.includes("@mediapipe/") ||
            id.includes("face-api")
          ) {
            return "vendor-ml";
          }

          return undefined;
        },
      },
    },
  },
}));
