import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { visualizer } from "rollup-plugin-visualizer";

// Build ID — injected at compile time for version mismatch detection
import { createHash } from 'node:crypto';
const BUILD_ID = createHash('sha256')
  .update(`${Date.now()}-${process.env.CI_JOB_ID || Math.random().toString(36)}`)
  .digest('hex')
  .slice(0, 12);
const BUILD_ID_TIMESTAMP = Date.now().toString();

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  define: {
    __APP_BUILD_ID__: JSON.stringify(BUILD_ID),
    __BUILD_TIME__: BUILD_ID_TIMESTAMP,
  },
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    // Bundle report: só ativa quando ANALYZE=1 (ex.: `ANALYZE=1 bun run build`)
    // ou automaticamente no `bun run build:analyze`. Gera 3 artefatos em dist/stats/:
    //   - report.html (treemap interativo)
    //   - report.json (consumível por CI / scripts)
    //   - report-network.html (visão de dependências brutas)
    process.env.ANALYZE === "1" &&
      visualizer({
        filename: "dist/stats/report.html",
        template: "treemap",
        gzipSize: true,
        brotliSize: true,
        sourcemap: true,
        emitFile: false,
        open: false,
      }),
    process.env.ANALYZE === "1" &&
      visualizer({
        filename: "dist/stats/report.json",
        template: "raw-data",
        gzipSize: true,
        brotliSize: true,
        sourcemap: true,
        emitFile: false,
        open: false,
      }),
    process.env.ANALYZE === "1" &&
      visualizer({
        filename: "dist/stats/report-network.html",
        template: "network",
        gzipSize: true,
        brotliSize: true,
        sourcemap: true,
        emitFile: false,
        open: false,
      }),
  ].filter(Boolean),
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
    // Manifest do Vite habilitado para permitir que scripts (ex.: check-critical-path.mjs)
    // caminhem o grafo eager x lazy sem depender do modo ANALYZE.
    manifest: true,
    // Sourcemaps ligados quando ANALYZE=1 para o visualizer atribuir bytes por dep/módulo.
    sourcemap: process.env.ANALYZE === "1" ? "hidden" : false,
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
          // Vite preload helper — force into eager vendor-react para não
          // "arrastar" um vendor lazy (jspdf/mapbox/ml) para o caminho crítico.
          if (id.includes("vite/preload-helper") || id.includes("vite/dist/client/preload-helper")) {
            return "vendor-react";
          }
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

          // Utilitários de data — consolidados em 1 chunk para evitar
          // que cada page-chunk carregue seu próprio subset de date-fns.
          if (/[\\/]node_modules[\\/]date-fns[\\/]/.test(id)) return "vendor-date-fns";

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
