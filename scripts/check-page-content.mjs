#!/usr/bin/env node
/**
 * Verifica que páginas em src/pages/*.tsx usam o componente <PageContent>
 * como wrapper raiz para garantir margem/altura/scroll padronizados.
 *
 * Modo padrão (warn): lista offenders sem falhar — usado em prebuild para
 * dar visibilidade incremental durante a migração.
 *
 * Modo strict (--strict): falha se houver offenders — usado em CI quando
 * todas as páginas estiverem migradas. Promover gradualmente movendo páginas
 * de PENDING_MIGRATION para [] após migração + revisão.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const PAGES_DIR = 'src/pages';
const STRICT = process.argv.includes('--strict');

// Páginas standalone (sem MainLayout/BottomNav). Têm chrome próprio.
const STANDALONE_ALLOWLIST = new Set([
  'AcessoNegado.tsx',
  'Auth.tsx',
  'AuthCallback.tsx',
  'CoveragePage.tsx',
  'Index.tsx',
  'NotFound.tsx',
  'ResetPasswordPage.tsx',
]);

// Páginas autenticadas pendentes de migração para <PageContent>.
// Mover para [] (lista vazia) após migração + revisão visual em mobile.
// Quando vazia, mude o gate para --strict no CI.
const PENDING_MIGRATION = new Set([
  'AnalyticsPage.tsx',
  'BehaviorDetectionPage.tsx',
  'CollaboratorFlowMapPage.tsx',
  'FaceRecognitionPage.tsx',
  'GoalsAlertsPage.tsx',
  'HeatmapPage.tsx',
  'HelpPage.tsx',
  'JourneyReportsPage.tsx',
  'LicensePlatePage.tsx',
  'NotificationSettingsPage.tsx',
  'PPEPage.tsx',
  'PanicEventsPage.tsx',
  'PeoplePage.tsx',
  'ProductivityDashboardPage.tsx',
  'ProfilePage.tsx',
  'RecognitionAnalyticsPage.tsx',
  'RecognitionLogsPage.tsx',
  'RecordingsPage.tsx',
  'StreamSettingsPage.tsx',
  'TelegramSettingsPage.tsx',
  'UserManagementPage.tsx',
  'ZonesPage.tsx',
]);

const offenders = [];
const newOffenders = [];

const files = readdirSync(PAGES_DIR).filter((f) => f.endsWith('.tsx'));

for (const file of files) {
  if (STANDALONE_ALLOWLIST.has(file)) continue;
  const content = readFileSync(join(PAGES_DIR, file), 'utf8');
  const usesPageContent = /<PageContent[\s>]/.test(content);
  if (usesPageContent) {
    if (PENDING_MIGRATION.has(file)) {
      console.log(`✅ Migrada: ${file} — remova de PENDING_MIGRATION em scripts/check-page-content.mjs`);
    }
    continue;
  }
  offenders.push(file);
  if (!PENDING_MIGRATION.has(file)) newOffenders.push(file);
}

const total = files.length - STANDALONE_ALLOWLIST.size;
const migrated = total - offenders.length;

if (newOffenders.length > 0) {
  console.error('\n❌ Nova(s) página(s) sem <PageContent> como wrapper raiz:\n');
  newOffenders.forEach((f) => console.error(`   - src/pages/${f}`));
  console.error(
    `\n   Use o componente padrão para garantir margem/altura consistentes:\n\n` +
    `     import { PageContent } from '@/components/layout/MainLayout';\n\n` +
    `     export default function MyPage() {\n` +
    `       return (\n` +
    `         <PageContent>\n` +
    `           <PageMeta ... />\n` +
    `           {/* seções */}\n` +
    `         </PageContent>\n` +
    `       );\n` +
    `     }\n\n` +
    `   Páginas standalone (sem MainLayout) devem ir para STANDALONE_ALLOWLIST com justificativa.\n`
  );
  process.exit(1);
}

if (STRICT && offenders.length > 0) {
  console.error('\n❌ Modo strict: ainda existem páginas sem <PageContent>:\n');
  offenders.forEach((f) => console.error(`   - src/pages/${f}`));
  process.exit(1);
}

console.log(`✅ ${migrated}/${total} páginas autenticadas usam <PageContent>.`);
if (offenders.length > 0) {
  console.log(`⏳ ${offenders.length} pendentes de migração (warn — não bloqueia build):`);
  offenders.forEach((f) => console.log(`   - ${f}`));
}
