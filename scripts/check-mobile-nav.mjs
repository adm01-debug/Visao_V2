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

// 1b. Wrapper deve declarar EXATAMENTE UM scroll container `data-app-scroll`
const scrollMarkerMatches = wrapperContent.match(/data-app-scroll/g) || [];
if (scrollMarkerMatches.length === 0) {
  console.error(`❌ ${WRAPPER_FILE} NÃO declara \`data-app-scroll\`.`);
  console.error(`   O scroll container único da app deve estar marcado com \`data-app-scroll\` no SwipeableView.\n`);
  failed = true;
} else if (scrollMarkerMatches.length > 1) {
  console.error(`❌ ${WRAPPER_FILE} declara \`data-app-scroll\` ${scrollMarkerMatches.length}x — deve ser ÚNICO.\n`);
  failed = true;
} else {
  console.log(`✅ MainLayout declara \`data-app-scroll\` (scroll container único)`);
}

// 1c. O <main mb-mobile-nav> deve ser descendente do `data-app-scroll`
//     (heurística: aparece DEPOIS no arquivo, garantindo que o último filho do
//     scroll container recebe o padding inferior).
const scrollIdx = wrapperContent.indexOf('data-app-scroll');
const mainMbIdx = wrapperContent.search(/<main[^>]*mb-mobile-nav/);
if (scrollIdx >= 0 && mainMbIdx >= 0 && mainMbIdx < scrollIdx) {
  console.error(`❌ Em ${WRAPPER_FILE}, o <main mb-mobile-nav> aparece ANTES do \`data-app-scroll\`.`);
  console.error(`   O <main> deve ser filho do scroll container — o último filho recebe o padding inferior via mb-mobile-nav.\n`);
  failed = true;
} else if (scrollIdx >= 0 && mainMbIdx > scrollIdx) {
  console.log(`✅ <main mb-mobile-nav> é descendente do \`data-app-scroll\` (último filho recebe padding)`);
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

// ─────────────────────────────────────────────────────────────────────────────
// Relatório (HTML + JSON) — gerado sempre, com --report ou flag CI
// ─────────────────────────────────────────────────────────────────────────────
const REPORT_MODE = process.argv.includes('--report') || process.env.CI === 'true' || !SNAPSHOT_MODE;
if (REPORT_MODE) {
  const { writeFileSync, mkdirSync } = await import('node:fs');
  const REPORT_DIR = 'reports/mobile-nav';
  mkdirSync(REPORT_DIR, { recursive: true });

  const repoBase = process.env.GITHUB_REPOSITORY
    ? `https://github.com/${process.env.GITHUB_REPOSITORY}/blob/${process.env.GITHUB_SHA || 'main'}`
    : null;

  const driftSet = new Set(drift);
  const scrollDriftSet = new Set(scrollDrift);
  const missingInCustomSet = new Set(missingInCustom);
  const undeclaredMap = new Map(undeclaredCustomWrappers.map((u) => [u.file, u]));

  const rows = files
    .map((file) => {
      const basename = file.split(/[\\/]/).pop();
      const rel = relative(process.cwd(), file).replace(/\\/g, '/');
      let category;
      let status;
      const issues = [];

      if (ALLOWLIST.has(basename)) {
        category = 'standalone';
        status = 'isenta';
      } else if (CUSTOM_WRAPPER_ALLOWLIST.has(basename)) {
        category = 'customWrapper';
        if (missingInCustomSet.has(rel)) {
          status = 'pendente';
          issues.push(`Falta \`${REQUIRED_CLASS}\` no container raiz`);
        } else {
          status = 'ok';
        }
      } else {
        category = 'standard';
        status = 'ok';
        if (driftSet.has(rel)) {
          status = 'pendente';
          issues.push(`Redeclara \`${REQUIRED_CLASS}\` (remover)`);
        }
        if (undeclaredMap.has(rel)) {
          status = 'pendente';
          const u = undeclaredMap.get(rel);
          issues.push(`Wrapper customizado não cadastrado (linha ${u.line})`);
        }
      }
      if (scrollDriftSet.has(rel)) {
        status = 'pendente';
        issues.push('Usa `h-[calc(100vh-...)]` (scroll duplo)');
      }

      return { file: basename, path: rel, category, status, issues };
    })
    .sort((a, b) => {
      const order = { pendente: 0, ok: 1, isenta: 2 };
      return order[a.status] - order[b.status] || a.file.localeCompare(b.file);
    });

  const summary = {
    generatedAt: new Date().toISOString(),
    wrapperFile: WRAPPER_FILE,
    requiredClass: REQUIRED_CLASS,
    totals: {
      total: rows.length,
      ok: rows.filter((r) => r.status === 'ok').length,
      pendente: rows.filter((r) => r.status === 'pendente').length,
      isenta: rows.filter((r) => r.status === 'isenta').length,
      standard: rows.filter((r) => r.category === 'standard').length,
      customWrapper: rows.filter((r) => r.category === 'customWrapper').length,
      standalone: rows.filter((r) => r.category === 'standalone').length,
    },
    failed,
    rows,
  };

  // JSON
  writeFileSync(`${REPORT_DIR}/report.json`, JSON.stringify(summary, null, 2) + '\n');

  // HTML
  const statusBadge = (s) => {
    const map = {
      ok: ['hsl(142 71% 45%)', '✓ OK'],
      pendente: ['hsl(0 84% 60%)', '⚠ Pendente'],
      isenta: ['hsl(220 9% 46%)', '⊘ Isenta'],
    };
    const [color, label] = map[s];
    return `<span class="badge" style="background:${color}">${label}</span>`;
  };
  const categoryLabel = (c) =>
    ({ standard: 'Padrão', customWrapper: 'Wrapper customizado', standalone: 'Standalone' }[c]);
  const fileLink = (path) =>
    repoBase ? `<a href="${repoBase}/${path}" target="_blank" rel="noopener">${path}</a>` : path;

  const html = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8">
<title>Mobile Nav Report — VISÃO</title>
<style>
  :root { color-scheme: light dark; }
  body { font: 14px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 0; padding: 24px; max-width: 1200px; margin-inline: auto; background: hsl(0 0% 98%); color: hsl(220 13% 18%); }
  @media (prefers-color-scheme: dark) { body { background: hsl(220 13% 10%); color: hsl(0 0% 95%); } th { background: hsl(220 13% 18%) !important; } tr:hover { background: hsl(220 13% 14%) !important; } }
  h1 { margin: 0 0 4px; font-size: 22px; }
  .meta { color: hsl(220 9% 46%); font-size: 12px; margin-bottom: 20px; }
  .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; margin-bottom: 24px; }
  .card { padding: 14px 16px; border-radius: 8px; background: hsl(0 0% 100%); border: 1px solid hsl(220 13% 90%); }
  @media (prefers-color-scheme: dark) { .card { background: hsl(220 13% 14%); border-color: hsl(220 13% 22%); } }
  .card .label { font-size: 11px; text-transform: uppercase; letter-spacing: .04em; color: hsl(220 9% 46%); }
  .card .value { font-size: 24px; font-weight: 600; margin-top: 4px; }
  table { width: 100%; border-collapse: collapse; background: hsl(0 0% 100%); border-radius: 8px; overflow: hidden; box-shadow: 0 1px 2px hsl(0 0% 0% / .05); }
  @media (prefers-color-scheme: dark) { table { background: hsl(220 13% 14%); } }
  th, td { padding: 10px 14px; text-align: left; border-bottom: 1px solid hsl(220 13% 92%); }
  @media (prefers-color-scheme: dark) { th, td { border-color: hsl(220 13% 22%); } }
  th { background: hsl(220 13% 96%); font-size: 12px; text-transform: uppercase; letter-spacing: .04em; color: hsl(220 9% 46%); }
  tr:hover { background: hsl(220 13% 97%); }
  td.file a { color: hsl(217 91% 50%); text-decoration: none; font-family: ui-monospace, "SF Mono", monospace; font-size: 13px; }
  td.file a:hover { text-decoration: underline; }
  .badge { display: inline-block; padding: 2px 10px; border-radius: 999px; color: white; font-size: 11px; font-weight: 600; }
  .issues { color: hsl(0 84% 50%); font-size: 12px; }
  .issues ul { margin: 0; padding-left: 18px; }
  .legend { margin-top: 24px; padding: 14px 16px; background: hsl(220 13% 96%); border-radius: 8px; font-size: 12px; color: hsl(220 9% 30%); }
  @media (prefers-color-scheme: dark) { .legend { background: hsl(220 13% 16%); color: hsl(0 0% 80%); } }
  .failed-banner { background: hsl(0 84% 95%); color: hsl(0 84% 30%); padding: 12px 16px; border-radius: 8px; margin-bottom: 16px; font-weight: 500; }
  @media (prefers-color-scheme: dark) { .failed-banner { background: hsl(0 50% 20%); color: hsl(0 80% 80%); } }
</style></head>
<body>
  <h1>📐 Mobile Nav Report — VISÃO</h1>
  <div class="meta">Gerado em ${summary.generatedAt} · wrapper: <code>${WRAPPER_FILE}</code> · classe: <code>${REQUIRED_CLASS}</code></div>
  ${failed ? `<div class="failed-banner">⚠ Verificação falhou — ${summary.totals.pendente} página(s) pendente(s). Veja detalhes na tabela abaixo.</div>` : ''}
  <div class="summary">
    <div class="card"><div class="label">Total</div><div class="value">${summary.totals.total}</div></div>
    <div class="card"><div class="label">OK</div><div class="value" style="color:hsl(142 71% 40%)">${summary.totals.ok}</div></div>
    <div class="card"><div class="label">Pendente</div><div class="value" style="color:hsl(0 84% 55%)">${summary.totals.pendente}</div></div>
    <div class="card"><div class="label">Isentas</div><div class="value" style="color:hsl(220 9% 46%)">${summary.totals.isenta}</div></div>
    <div class="card"><div class="label">Padrão</div><div class="value">${summary.totals.standard}</div></div>
    <div class="card"><div class="label">Wrapper custom</div><div class="value">${summary.totals.customWrapper}</div></div>
  </div>
  <table>
    <thead><tr><th>Arquivo</th><th>Categoria</th><th>Status</th><th>Problemas</th></tr></thead>
    <tbody>
      ${rows
        .map(
          (r) => `<tr>
        <td class="file">${fileLink(r.path)}</td>
        <td>${categoryLabel(r.category)}</td>
        <td>${statusBadge(r.status)}</td>
        <td class="issues">${
          r.issues.length ? `<ul>${r.issues.map((i) => `<li>${i}</li>`).join('')}</ul>` : '—'
        }</td>
      </tr>`
        )
        .join('\n      ')}
    </tbody>
  </table>
  <div class="legend">
    <strong>Categorias:</strong>
    <b>Padrão</b> = delega ao <code>&lt;main&gt;</code> do MainLayout (sem redeclarar classe) ·
    <b>Wrapper customizado</b> = substitui o <code>&lt;main&gt;</code> e reaplica <code>${REQUIRED_CLASS}</code> ·
    <b>Standalone</b> = fora do MainLayout (auth/erro/redirect).
    Documentação: <code>docs/LAYOUTS.md §11–§14</code>.
  </div>
</body></html>`;
  writeFileSync(`${REPORT_DIR}/report.html`, html);
  console.log(`\n📊 Relatório gerado em ${REPORT_DIR}/report.html (e report.json)`);
}

if (failed) process.exit(1);

console.log(`\n✨ Layout mobile centralizado e consistente!`);
console.log(`   ↳ Defesa em profundidade ativa: classe explícita + fallback CSS + heurística + snapshot + runtime E2E + relatório.\n`);
