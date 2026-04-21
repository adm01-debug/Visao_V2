#!/usr/bin/env node
/**
 * VISÃO - Mobile Nav Checklist (wrapper-based)
 *
 * Garante que `mb-mobile-nav` é aplicado UMA ÚNICA VEZ no wrapper global
 * (`src/components/layout/MainLayout.tsx`) e que NENHUMA página em
 * `src/pages/*.tsx` redeclara a classe — evitando drift e dupla margem.
 *
 * Exit code 1 em caso de falha (quebra CI).
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const PAGES_DIR = 'src/pages';
const WRAPPER_FILE = 'src/components/layout/MainLayout.tsx';
const REQUIRED_CLASS = 'mb-mobile-nav';

// Páginas isentas (standalone — não passam pelo MainLayout)
const ALLOWLIST = new Set([
  'AuthPage.tsx',
  'Auth.tsx',
  'AuthCallback.tsx',
  'ResetPasswordPage.tsx',
  'NotFound.tsx',
  'Index.tsx',
  'AcessoNegado.tsx',
]);

// Páginas com wrapper customizado que SUBSTITUEM o <main> do MainLayout
// (ex.: declaram seu próprio `min-h-screen` ou Sidebar). Devem reaplicar
// `mb-mobile-nav` explicitamente no container raiz para garantir consistência.
const CUSTOM_WRAPPER_ALLOWLIST = new Set([
  'DashboardV2.tsx',
  'HeatmapPage.tsx',
  'AnalyticsPage.tsx',
  'TelegramSettingsPage.tsx',
]);

function listPages(dir) {
  return readdirSync(dir)
    .filter((entry) => {
      const full = join(dir, entry);
      return statSync(full).isFile() && entry.endsWith('.tsx');
    })
    .map((entry) => join(dir, entry));
}

let failed = false;

console.log(`\n📐 Mobile Nav Checklist (wrapper-based)\n`);

// 1. Wrapper deve conter a classe
const wrapperContent = readFileSync(WRAPPER_FILE, 'utf8');
if (!wrapperContent.includes(REQUIRED_CLASS)) {
  console.error(`❌ ${WRAPPER_FILE} NÃO contém \`${REQUIRED_CLASS}\`.`);
  console.error(`   A classe deve viver no <main> do wrapper para cobrir todas as rotas.\n`);
  failed = true;
} else {
  console.log(`✅ MainLayout aplica \`${REQUIRED_CLASS}\` globalmente`);
}

// 2. Nenhuma página deve redeclarar nem criar scroll duplo
const files = listPages(PAGES_DIR);
const drift = [];
const scrollDrift = [];
let cleanCount = 0;
let skipped = 0;

const SCROLL_ANTIPATTERN = /h-\[calc\(100vh-/;

for (const file of files) {
  const basename = file.split(/[\\/]/).pop();
  if (ALLOWLIST.has(basename)) {
    skipped++;
    continue;
  }
  const content = readFileSync(file, 'utf8');
  let pageOk = true;
  if (content.includes(REQUIRED_CLASS)) {
    drift.push(relative(process.cwd(), file));
    pageOk = false;
  }
  if (SCROLL_ANTIPATTERN.test(content)) {
    scrollDrift.push(relative(process.cwd(), file));
    pageOk = false;
  }
  if (pageOk) cleanCount++;
}

console.log(`✅ ${cleanCount} páginas limpas (sem duplicação nem scroll duplo)`);
console.log(`⊘  ${skipped} páginas isentas (allowlist)`);

if (drift.length > 0) {
  console.error(`\n❌ ${drift.length} página(s) redeclaram \`${REQUIRED_CLASS}\`:`);
  for (const f of drift) console.error(`   - ${f}`);
  console.error(
    `\nA classe é aplicada globalmente em ${WRAPPER_FILE}. ` +
    `Remova \`${REQUIRED_CLASS}\` da página para evitar dupla margem.\n`
  );
  failed = true;
}

if (scrollDrift.length > 0) {
  console.error(`\n❌ ${scrollDrift.length} página(s) usam \`h-[calc(100vh-...)]\` (scroll duplo):`);
  for (const f of scrollDrift) console.error(`   - ${f}`);
  console.error(
    `\nO scroll já é provido pelo SwipeableView no MainLayout. ` +
    `Containers de página com altura fixa + overflow criam scroll aninhado, ` +
    `quebrando o momentum no iOS e escondendo conteúdo atrás do BottomNavigation.\n` +
    `Remova \`h-[calc(100vh-4rem)] overflow-auto\` do container raiz da página.\n`
  );
  failed = true;
}

if (failed) process.exit(1);

console.log(`\n✨ Layout mobile centralizado e consistente!`);
console.log(`   ↳ Defesa em profundidade ativa: classe explícita no <main> + fallback CSS [data-app-scroll].\n`);
