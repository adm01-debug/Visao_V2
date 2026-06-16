import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import unusedImports from 'eslint-plugin-unused-imports';
import tseslint from 'typescript-eslint';
import visaoRules from './eslint-rules/index.js';

export default tseslint.config(
  { ignores: ['dist', 'node_modules', '.npm-cache', 'coverage', '.storybook', 'storybook-static'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      'unused-imports': unusedImports,
      'visao': visaoRules,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      'no-console': 'error',
      'no-debugger': 'error',
      'prefer-const': 'error',
      'eqeqeq': ['error', 'always'],
      'no-unused-vars': 'off',
      // Replaced by unused-imports plugin below
      '@typescript-eslint/no-unused-vars': 'off',
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'error',
        {
          vars: 'all',
          varsIgnorePattern: '^_',
          args: 'after-used',
          argsIgnorePattern: '^_',
          caughtErrors: 'all',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
        },
      ],
      // `any` é tolerado pontualmente em integrações de terceiros sem types e em
      // utilitários genéricos; o gate forte é o tsconfig.strict (no CI separado).
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-floating-promises': 'off',
      'react-hooks/rules-of-hooks': 'error',
      // exhaustive-deps gera ruído em hooks com refs/callbacks intencionalmente estáveis;
      // dependências críticas são revisadas em PR. Mantemos rules-of-hooks como erro.
      'react-hooks/exhaustive-deps': 'off',
      // VISÃO Design System — prevent hardcoded colors
      'visao/no-hardcoded-colors': 'error',
    },
  },
  // Error boundaries precisam logar erros via console para diagnóstico em produção.
  {
    files: ['src/**/SectionErrorBoundary.tsx', 'src/**/ErrorBoundary.tsx'],
    rules: {
      'no-console': 'off',
    },
  },
  // Contexts/Providers/UI primitives intentionally co-export hooks/utilities
  // alongside components. React Fast Refresh constraint não se aplica neste padrão.
  {
    files: [
      'src/contexts/**/*.{ts,tsx}',
      'src/providers/**/*.{ts,tsx}',
      'src/components/ui/**/*.{ts,tsx}',
      'src/lib/lazyLoad.tsx',
      'src/components/LazyComponent.tsx',
      'src/components/ErrorBoundary.tsx',
      'src/components/PageSkeletons.tsx',
      'src/components/PaginationControls.tsx',
      'src/components/SearchInput.tsx',
      'src/components/AlertFilters.tsx',
      'src/components/FaceRecognitionOverlay.tsx',
      'src/components/clip-recorder/CompactClipControls.tsx',
      'src/components/heatmap/HeatmapMatrixTab.tsx',
      'src/components/recordings/ClipCard.tsx',
      'src/components/reports/ReportTypeSelector.tsx',
    ],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
  // Test files: hex em assertions e `any` em mocks são esperados.
  {
    files: ['src/test/**/*.{ts,tsx}', 'src/**/*.test.{ts,tsx}', 'src/**/*.spec.{ts,tsx}'],
    rules: {
      'visao/no-hardcoded-colors': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  // Supabase Edge Functions rodam em Deno: `console` é o mecanismo de log oficial.
  {
    files: ['supabase/functions/**/*.{ts,tsx}'],
    rules: {
      'no-console': 'off',
    },
  },
  // Cypress augmenta o namespace global `Cypress.Chainable` — padrão da lib.
  // Asserções Chai (`expect(x).to.exist`) são statements de expressão por design.
  {
    files: ['cypress/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-namespace': 'off',
      '@typescript-eslint/no-unused-expressions': 'off',
    },
  },
  // Config do Tailwind usa `require()` para carregar plugins (padrão do ecossistema).
  {
    files: ['tailwind.config.ts'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  }
);
