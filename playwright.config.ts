import { defineConfig, devices } from '@playwright/test';
import { existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const isCI = !!process.env.CI;

/** StorageState gerado pelo global-setup. Aplicado apenas se já existir
 *  (Playwright falha em runtime se apontarmos para arquivo inexistente). */
const STORAGE_STATE_PATH = join(process.cwd(), 'tests', 'e2e', '.auth', 'user.json');
const sharedStorageState = existsSync(STORAGE_STATE_PATH) ? STORAGE_STATE_PATH : undefined;

/**
 * Playwright E2E Test Configuration with Coverage Reports
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests/e2e',

  /* Global setup: seed E2E user + persist auth storageState */
  globalSetup: resolve(__dirname, 'tests/e2e/global-setup.ts'),

  /* Run tests in files in parallel */
  fullyParallel: true,

  /* Fail the build on CI if you accidentally left test.only in the source code */
  forbidOnly: isCI,

  /* Retry on CI only */
  retries: isCI ? 2 : 0,

  /* Opt out of parallel tests on CI */
  workers: isCI ? 1 : undefined,

  /* Global timeout for each test */
  timeout: 60000,

  /* Expect timeout */
  expect: {
    timeout: 10000,
  },

  /**
   * Convenção padronizada de baselines:
   *   tests/e2e/__screenshots__/<spec>/<project>/<route>/<snapshot>.png
   *
   * - `{testFileDir}` resolve para `tests/e2e`.
   * - `{testFileName}` é o nome do spec (sem extensão).
   * - `{projectName}` identifica o viewport/browser (mobile-safari, chromium, ...).
   * - `{arg}` é o nome lógico passado em `toHaveScreenshot('rota/snapshot.png')`,
   *   permitindo organizar baselines por rota dentro do diretório do project.
   *
   * Vantagens vs default (`<spec>-snapshots/<arg>-<project>-<platform>.png`):
   *   1. Hierarquia visual: `mobile-safari/dashboard/fullpage.png` é auditável.
   *   2. Diff fácil entre projects: comparação direta entre `mobile-safari/...` e
   *      `mobile-chrome/...`.
   *   3. Atualização cirúrgica: `git checkout __screenshots__/.../mobile-safari/dashboard`.
   *   4. Suffix de plataforma removido — testes visuais devem rodar em CI Linux
   *      para ter baseline estável; rodar localmente exige `--update-snapshots`
   *      consciente.
   */
  snapshotPathTemplate: '{testFileDir}/__screenshots__/{testFileName}/{projectName}/{arg}{ext}',

  /* Reporter configuration with multiple outputs for coverage */
  reporter: isCI
    ? [
        ['html', { outputFolder: 'playwright-report', open: 'never' }],
        ['json', { outputFile: 'test-results/results.json' }],
        ['junit', { outputFile: 'test-results/junit.xml' }],
        ['github'],
        ['list'],
      ]
    : [
        ['html', { outputFolder: 'playwright-report', open: 'on-failure' }],
        ['json', { outputFile: 'test-results/results.json' }],
        ['list'],
      ],

  /* Shared settings for all the projects below */
  use: {
    /* Base URL to use in actions like `await page.goto('/')` */
    baseURL: isCI ? 'http://localhost:4173' : 'http://localhost:5173',

    /**
     * Reusa storageState gerado pelo global-setup (`tests/e2e/.auth/user.json`).
     * Aplicado condicionalmente via `existsSync` no topo do arquivo — se o
     * arquivo não existir (primeira run sem credenciais), o context inicia
     * anônimo e o helper `gotoAuthenticated` faz fallback (login REST ou
     * skip controlado).
     *
     * Specs que precisam de contexto anônimo podem sobrescrever via
     * `test.use({ storageState: { cookies: [], origins: [] } })`.
     */
    storageState: sharedStorageState,

    /* Collect trace on first retry AND keep on failure for full debug context.
     * Combina com a fixture `testFixtures.ts` que anexa console+network+screenshot
     * automaticamente em cada falha. */
    trace: 'retain-on-failure',

    /* Capture screenshot on failure - full page */
    screenshot: {
      mode: 'only-on-failure',
      fullPage: true,
    },

    /* Record video on failure */
    video: {
      mode: 'retain-on-failure',
      size: { width: 1280, height: 720 },
    },

    /* Maximum time each action such as `click()` can take */
    actionTimeout: 10000,

    /* Maximum time for navigation */
    navigationTimeout: 30000,
  },

  /* Output folder for test artifacts */
  outputDir: 'test-results/',

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
      },
    },
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        viewport: { width: 1280, height: 720 },
      },
    },
    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
        viewport: { width: 1280, height: 720 },
      },
    },
    /* Test against mobile viewports */
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 12'] },
    },
    /* Test against tablet viewports */
    {
      name: 'tablet',
      use: { ...devices['iPad Pro 11'] },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: isCI ? 'npm run preview' : 'npm run dev',
    url: isCI ? 'http://localhost:4173' : 'http://localhost:5173',
    reuseExistingServer: !isCI,
    timeout: 120000,
  },
});
