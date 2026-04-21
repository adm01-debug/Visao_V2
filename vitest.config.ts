import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    coverage: {
      reporter: ["text", "html", "json", "json-summary"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "**/*.test.*",
        "**/*.spec.*",
        "src/test/**",
        "src/**/__tests__/**",
        "src/**/__mocks__/**",
        "src/integrations/supabase/types.ts",
        "src/main.tsx",
        "src/vite-env.d.ts",
        "**/*.d.ts",
        "**/*.stories.{ts,tsx}",
      ],
    },
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
