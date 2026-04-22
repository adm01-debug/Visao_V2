#!/usr/bin/env node
/**
 * Verifica que cada página em src/pages/*.tsx (exceto allowlist de páginas
 * standalone como Auth, NotFound) usa o componente <PageContent> como wrapper
 * raiz do conteúdo. Garante padronização de margem/altura/scroll.
 *
 * Roda no prebuild + CI (gate hard).
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const PAGES_DIR = 'src/pages';

// Páginas que NÃO usam MainLayout (standalone, sem BottomNav/Sidebar).
// Justificativa: têm próprio chrome (Auth, erro, callback OAuth, dashboard de cobertura interno).
const STANDALONE_ALLOWLIST = new Set([
  'AcessoNegado.tsx',
  'Auth.tsx',
  'AuthCallback.tsx',
  'CoveragePage.tsx',
  'Index.tsx',
  'NotFound.tsx',
  'ResetPasswordPage.tsx',
]);

const offenders = [];

const files = readdirSync(PAGES_DIR).filter((f) => f.endsWith('.tsx'));

for (const file of files) {
  if (STANDALONE_ALLOWLIST.has(file)) continue;
  const content = readFileSync(join(PAGES_DIR, file), 'utf8');
  const usesPageContent = /<PageContent[\s>]/.test(content);
  if (!usesPageContent) {
    offenders.push(file);
  }
}

if (offenders.length > 0) {
  console.error('\n❌ Páginas sem <PageContent> como wrapper raiz:\n');
  offenders.forEach((f) => console.error(`   - src/pages/${f}`));
  console.error(
    `\n   Use o componente padrão para garantir margem/altura consistentes:\n` +
    `\n   import { PageContent } from '@/components/layout/MainLayout';\n` +
    `\n   export default function MyPage() {\n` +
    `     return (\n` +
    `       <PageContent>\n` +
    `         <PageMeta ... />\n` +
    `         {/* seções */}\n` +
    `       </PageContent>\n` +
    `     );\n` +
    `   }\n\n` +
    `   Páginas standalone (sem MainLayout) devem ser adicionadas a STANDALONE_ALLOWLIST\n` +
    `   em scripts/check-page-content.mjs com justificativa.\n`
  );
  process.exit(1);
}

console.log(`✅ ${files.length - STANDALONE_ALLOWLIST.size} páginas autenticadas usam <PageContent>.`);
