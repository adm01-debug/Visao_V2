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

// Páginas isentas (standalone — NÃO passam pelo MainLayout, logo NÃO renderizam
// BottomNavigation. Adicionar `mb-mobile-nav` aqui geraria 64px de espaço morto).
//
//   AuthPage.tsx, Auth.tsx     → telas de login/signup pré-autenticação
//   AuthCallback.tsx           → handler OAuth pós-redirect (apenas spinner)
//   ResetPasswordPage.tsx      → fluxo de recuperação via link de e-mail
//   NotFound.tsx               → 404 genérico (pode aparecer fora de auth)
//   Index.tsx                  → apenas redireciona; renderiza SplashScreen
//   AcessoNegado.tsx           → tela de bloqueio RBAC/IP whitelist
//
// Documentação completa: docs/LAYOUTS.md §11 (Camada 0 — Páginas standalone).
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
  'LicensePlatePage.tsx',
  'NotificationSettingsPage.tsx',
  'PPEPage.tsx',
  'PeoplePage.tsx',
  'RecognitionAnalyticsPage.tsx',
  'RecognitionLogsPage.tsx',
  'RecordingsPage.tsx',
  'StreamSettingsPage.tsx',
  'ZonesPage.tsx',
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
const missingInCustom = [];
const undeclaredCustomWrappers = [];
let cleanCount = 0;
let customWrapperCount = 0;
let skipped = 0;

const SCROLL_ANTIPATTERN = /h-\[calc\(100vh-/;
// Heurística: detecta wrappers customizados (raiz com altura própria ou Sidebar embutido)
const CUSTOM_WRAPPER_HEURISTIC = /(min-h-screen|h-screen|h-dvh|h-\[100dvh\]|<Sidebar\b)/;
const SNAPSHOT_MODE = process.argv.includes('--snapshot');
const SNAPSHOT_PATH = 'scripts/.mobile-nav-snapshot.json';

for (const file of files) {
  const basename = file.split(/[\\/]/).pop();
  if (ALLOWLIST.has(basename)) {
    skipped++;
    continue;
  }
  const content = readFileSync(file, 'utf8');
  let pageOk = true;
  const isCustomWrapper = CUSTOM_WRAPPER_ALLOWLIST.has(basename);

  if (isCustomWrapper) {
    // Wrapper customizado: a classe DEVE estar presente
    if (!content.includes(REQUIRED_CLASS)) {
      missingInCustom.push(relative(process.cwd(), file));
      pageOk = false;
    }
  } else {
    // Página padrão: a classe NÃO deve ser redeclarada (vem do MainLayout)
    if (content.includes(REQUIRED_CLASS)) {
      drift.push(relative(process.cwd(), file));
      pageOk = false;
    }
    // Heurística: página NÃO-customizada que parece declarar wrapper raiz próprio
    // deve ser explicitamente cadastrada na CUSTOM_WRAPPER_ALLOWLIST.
    if (CUSTOM_WRAPPER_HEURISTIC.test(content) && !content.includes(REQUIRED_CLASS)) {
      const lines = content.split('\n');
      const lineIdx = lines.findIndex((l) => CUSTOM_WRAPPER_HEURISTIC.test(l));
      undeclaredCustomWrappers.push({
        file: relative(process.cwd(), file),
        line: lineIdx + 1,
        snippet: lines[lineIdx]?.trim().slice(0, 120),
      });
      pageOk = false;
    }
  }

  if (SCROLL_ANTIPATTERN.test(content)) {
    scrollDrift.push(relative(process.cwd(), file));
    pageOk = false;
  }
  if (pageOk) {
    if (isCustomWrapper) customWrapperCount++;
    else cleanCount++;
  }
}

console.log(`✅ ${cleanCount} páginas limpas (delegam ao MainLayout)`);
console.log(`✅ ${customWrapperCount} páginas com wrapper customizado (reaplicam \`${REQUIRED_CLASS}\`)`);
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

if (missingInCustom.length > 0) {
  console.error(`\n❌ ${missingInCustom.length} página(s) com wrapper customizado SEM \`${REQUIRED_CLASS}\`:`);
  for (const f of missingInCustom) console.error(`   - ${f}`);
  console.error(
    `\nEssas páginas substituem o <main> do MainLayout (wrapper próprio) ` +
    `e estão na CUSTOM_WRAPPER_ALLOWLIST do script. ` +
    `Reaplique \`${REQUIRED_CLASS}\` no container raiz para garantir o padding inferior.\n`
  );
  failed = true;
}

if (undeclaredCustomWrappers.length > 0) {
  console.error(`\n❌ ${undeclaredCustomWrappers.length} página(s) parecem usar wrapper customizado SEM cadastro:`);
  for (const w of undeclaredCustomWrappers) {
    console.error(`   - ${w.file}:${w.line}`);
    if (w.snippet) console.error(`       ↳ ${w.snippet}`);
  }
  console.error(
    `\nDetectamos padrões de wrapper raiz próprio (\`min-h-screen\`, \`h-screen\`, \`h-dvh\`, \`<Sidebar\`).\n` +
    `Escolha UMA correção:\n` +
    `  1. Remover o wrapper customizado (delegar ao <main> do MainLayout) — preferível.\n` +
    `  2. Adicionar \`${REQUIRED_CLASS}\` ao container raiz E adicionar o arquivo à\n` +
    `     CUSTOM_WRAPPER_ALLOWLIST em scripts/check-mobile-nav.mjs.\n`
  );
  failed = true;
}

// Snapshot de regressão (Camada 4)
if (SNAPSHOT_MODE) {
  const { writeFileSync } = await import('node:fs');
  const snapshot = {
    generatedAt: new Date().toISOString(),
    pages: files
      .map((f) => f.split(/[\\/]/).pop())
      .sort()
      .map((basename) => ({
        file: basename,
        mode: ALLOWLIST.has(basename)
          ? 'standalone'
          : CUSTOM_WRAPPER_ALLOWLIST.has(basename)
          ? 'customWrapper'
          : 'standard',
      })),
  };
  writeFileSync(SNAPSHOT_PATH, JSON.stringify(snapshot, null, 2) + '\n');
  console.log(`\n📸 Snapshot salvo em ${SNAPSHOT_PATH} (${snapshot.pages.length} páginas)`);
} else {
  // Comparar com snapshot existente, se houver
  try {
    const existing = JSON.parse(readFileSync(SNAPSHOT_PATH, 'utf8'));
    const existingNames = new Set(existing.pages.map((p) => p.file));
    const currentNames = new Set(files.map((f) => f.split(/[\\/]/).pop()));
    const newPages = [...currentNames].filter((n) => !existingNames.has(n));
    if (newPages.length > 0) {
      console.error(`\n❌ ${newPages.length} nova(s) página(s) sem classificação no snapshot:`);
      for (const n of newPages) console.error(`   - src/pages/${n}`);
      console.error(
        `\nClassifique cada página (standard / customWrapper / standalone) ajustando as allowlists\n` +
        `e regenere o snapshot com: \`npm run check:mobile-nav -- --snapshot\`.\n`
      );
      failed = true;
    }
  } catch {
    // snapshot ainda não existe — ok, gere com --snapshot na primeira vez
  }
}

if (failed) process.exit(1);

console.log(`\n✨ Layout mobile centralizado e consistente!`);
console.log(`   ↳ Defesa em profundidade ativa: classe explícita + fallback CSS + heurística + snapshot + runtime E2E.\n`);
