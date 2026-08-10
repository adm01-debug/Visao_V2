import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

/** No CI queremos saída legível + JUnit para o GitHub Actions publicar. */
const isCI = process.env.CI === 'true' || process.env.CI === '1';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    // O padrão de 5s é medido em teste isolado. Com ~100 arquivos concorrendo,
    // testes de render legítimos estouravam o prazo e — pior — o teste abortado
    // deixava o DOM montado, contaminando o seguinte com "found multiple
    // elements". O sintoma parecia defeito de componente; era só o relógio.
    testTimeout: 30_000,
    hookTimeout: 30_000,

    reporters: isCI ? ['default', 'junit'] : ['default'],
    outputFile: { junit: './test-results/vitest-junit.xml' },
    coverage: {
      provider: 'v8',
      // lcov é consumido por ferramentas externas; json-summary alimenta o gate de regressão.
      reporter: ['text', 'html', 'json', 'json-summary', 'lcov'],

      reportsDirectory: './coverage',
      all: true, // inclui arquivos sem testes (cobertura real do src/)
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        // ---- Testes e infra de teste ----
        '**/*.{test,spec}.{ts,tsx}',
        'src/test/**',
        'src/**/__tests__/**',
        'src/**/__mocks__/**',
        'src/**/*.fixture.{ts,tsx}',
        'src/**/*.fixtures.{ts,tsx}',
        'src/**/test-utils.{ts,tsx}',
        // ---- Tipos puros e declarações ----
        '**/*.d.ts',
        'src/**/types.ts',
        'src/**/types/**',
        'src/types/**',
        // ---- Stories / docs ----
        'src/**/*.stories.{ts,tsx}',
        'src/**/*.mdx',
        // ---- Gerados / não-executáveis ----
        'src/integrations/supabase/types.ts',
        'src/integrations/supabase/client.ts',
        'src/main.tsx',
        'src/vite-env.d.ts',
        // ---- Re-export barrels (apenas re-exports, sem lógica) ----
        'src/**/index.{ts,tsx}',
      ],
    },
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
});
