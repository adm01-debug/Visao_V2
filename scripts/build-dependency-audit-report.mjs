#!/usr/bin/env node
/**
 * VISÃO — Dependency Audit Report
 *
 * Lê `reports/deadcode/raw.json` (gerado por `audit-deadcode.mjs`) e produz um
 * relatório legível em `reports/deadcode/dependency-audit-report.md` com
 * buckets organizados (arquivos órfãos, exports não usados, deps mortas) e
 * classificação de **risco de remoção** (low/medium/high) baseada em heurísticas
 * conservadoras.
 *
 * Heurísticas de risco (conservadoras — em dúvida, sobe o risco):
 *
 * Arquivos órfãos:
 *   high   — entrypoints potenciais: main, App, layouts/, providers/, contexts/,
 *            integrations/, config/, hooks/use* (potencial uso lazy), edge functions
 *   medium — pages/, components/ (podem ser referenciadas por strings/lazy imports)
 *   low    — utils/helpers/constants isolados, tipos puros, mocks/__tests__ órfãos
 *
 * Exports não usados:
 *   high   — exports default em pages/components, exports em .ts barrels (index.ts)
 *   medium — exports nomeados em src/ que não sejam types/constants
 *   low    — re-exports redundantes, types/constants
 *
 * Dependências mortas:
 *   high   — pacotes Radix/React/Sentry/Supabase (ecossistema runtime crítico)
 *   medium — pacotes com peer-deps (podem ser usados via outros)
 *   low    — utilitários puros sem peer-deps (ex.: file-saver, sanitize-html)
 *
 * Uso:
 *   node scripts/build-dependency-audit-report.mjs
 *   node scripts/build-dependency-audit-report.mjs --refresh   # roda audit-deadcode antes
 *
 * Saída:
 *   reports/deadcode/dependency-audit-report.md
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const REPORT_DIR = resolve(ROOT, "reports/deadcode");
const RAW_PATH = resolve(REPORT_DIR, "raw.json");
const OUT_PATH = resolve(REPORT_DIR, "dependency-audit-report.md");

const args = process.argv.slice(2);
const REFRESH = args.includes("--refresh");

mkdirSync(REPORT_DIR, { recursive: true });

if (REFRESH || !existsSync(RAW_PATH)) {
  console.log("→ Executando audit-deadcode para gerar raw.json…");
  const r = spawnSync("node", [resolve(__dirname, "audit-deadcode.mjs"), "--quiet"], {
    cwd: ROOT,
    stdio: "inherit",
  });
  if (r.status !== 0) {
    console.error("✖ audit-deadcode falhou.");
    process.exit(1);
  }
}

if (!existsSync(RAW_PATH)) {
  console.error(`✖ ${RAW_PATH} não encontrado. Rode com --refresh.`);
  process.exit(1);
}

const raw = JSON.parse(readFileSync(RAW_PATH, "utf8"));

// ---------- Coleta normalizada ----------
const files = Array.isArray(raw.files) ? [...raw.files] : [];

/** @type {Array<{file:string, name:string, line?:number}>} */
const exportsAll = [];
/** @type {Array<{file:string, name:string, line?:number}>} */
const typesAll = [];
/** @type {Array<{file:string, name:string}>} */
const duplicates = [];
/** @type {string[]} */
const dependencies = [];
/** @type {string[]} */
const devDependencies = [];
/** @type {string[]} */
const unlisted = [];
/** @type {string[]} */
const unresolved = [];

const pushSym = (arr, file, item) => {
  if (typeof item === "string") {
    arr.push({ file, name: item });
  } else if (item && typeof item === "object") {
    arr.push({ file, name: item.name || item.symbol || JSON.stringify(item), line: item.line });
  }
};

if (Array.isArray(raw.issues)) {
  for (const entry of raw.issues) {
    const file = entry?.file || "";
    for (const it of entry?.exports || []) pushSym(exportsAll, file, it);
    for (const it of entry?.types || []) pushSym(typesAll, file, it);
    for (const it of entry?.duplicates || []) {
      const name = typeof it === "string" ? it : (it?.name || it?.symbols?.join("|") || "");
      duplicates.push({ file, name });
    }
    for (const it of entry?.dependencies || []) {
      const name = typeof it === "string" ? it : it?.name;
      if (name) dependencies.push(name);
    }
    for (const it of entry?.devDependencies || []) {
      const name = typeof it === "string" ? it : it?.name;
      if (name) devDependencies.push(name);
    }
    for (const it of entry?.unlisted || []) {
      const name = typeof it === "string" ? it : it?.name;
      if (name) unlisted.push(name);
    }
    for (const it of entry?.unresolved || []) {
      const name = typeof it === "string" ? it : it?.name;
      if (name) unresolved.push(name);
    }
  }
}

const uniq = (arr) => Array.from(new Set(arr)).sort();
const depsUnique = uniq(dependencies);
const devDepsUnique = uniq(devDependencies);
const unlistedUnique = uniq(unlisted);
const unresolvedUnique = uniq(unresolved);

// ---------- Heurísticas de risco ----------
function fileRisk(path) {
  const p = path.toLowerCase();
  if (
    /(^|\/)(src\/main|src\/app)\./.test(p) ||
    /\/layouts?\//.test(p) ||
    /\/providers?\//.test(p) ||
    /\/contexts?\//.test(p) ||
    /\/integrations?\//.test(p) ||
    /\/config\//.test(p) ||
    /\/hooks\/use[a-z]/.test(p) ||
    /supabase\/functions\//.test(p)
  ) return "high";
  if (/\/pages\//.test(p) || /\/components\//.test(p) || /\/routes?\//.test(p)) return "medium";
  return "low";
}

function exportRisk(item) {
  const f = (item.file || "").toLowerCase();
  const n = (item.name || "").toLowerCase();
  if (n === "default" && (/\/pages\//.test(f) || /\/components\//.test(f))) return "high";
  if (/\/index\.tsx?$/.test(f)) return "high"; // barrels
  if (/\/types?\.tsx?$/.test(f) || /\/constants?\.tsx?$/.test(f)) return "low";
  return "medium";
}

const HIGH_DEP_PATTERNS = [
  /^@radix-ui\//, /^react($|-)/, /^@sentry\//, /^@supabase\//, /^@tanstack\//,
  /^@tensorflow/, /^@dnd-kit\//, /^framer-motion$/, /^recharts$/, /^zod$/,
  /^zustand$/, /^date-fns$/, /^hls\.js$/, /^face-api/, /^mapbox-gl$/,
];
const PEER_DEP_PATTERNS = [
  /^@hookform\//, /^react-/, /^i18next/, /^embla-/, /^cmdk$/, /^vaul$/,
  /^sonner$/, /^input-otp$/, /^class-variance-authority$/, /^clsx$/,
  /^tailwind-merge$/, /^immer$/, /^jotai$/,
];

function depRisk(name) {
  if (HIGH_DEP_PATTERNS.some((re) => re.test(name))) return "high";
  if (PEER_DEP_PATTERNS.some((re) => re.test(name))) return "medium";
  return "low";
}

const RISK_BADGE = {
  high: "🔴 alto",
  medium: "🟡 médio",
  low: "🟢 baixo",
};
const RISK_GUIDE = {
  high: "Revisar manualmente; pode estar em uso por lazy import, string dinâmica ou build externo.",
  medium: "Verificar referências antes de remover; provável seguro após inspeção.",
  low: "Remoção segura na maioria dos casos.",
};

// ---------- Agregações ----------
function classify(items, riskFn) {
  const groups = { high: [], medium: [], low: [] };
  for (const it of items) groups[riskFn(it)].push(it);
  return groups;
}

const fileGroups = classify(files.map((f) => ({ path: f })), (it) => fileRisk(it.path));
const exportGroups = classify(exportsAll, exportRisk);
const typeGroups = classify(typesAll, exportRisk);
const depGroups = classify(depsUnique.map((n) => ({ name: n })), (it) => depRisk(it.name));
const devDepGroups = classify(devDepsUnique.map((n) => ({ name: n })), () => "low");

// ---------- Markdown ----------
const md = [];
const now = new Date().toISOString();
const totalAll =
  files.length + exportsAll.length + typesAll.length + duplicates.length +
  depsUnique.length + devDepsUnique.length + unlistedUnique.length + unresolvedUnique.length;

md.push("# Dependency Audit Report");
md.push("");
md.push(`**Projeto:** VISÃO  `);
md.push(`**Gerado em:** ${now}  `);
md.push(`**Fonte:** \`reports/deadcode/raw.json\` (knip)  `);
md.push(`**Total de achados:** ${totalAll}`);
md.push("");
md.push("> ⚠️ **Importante:** este relatório é uma heurística. Antes de remover qualquer item marcado como `🔴 alto` ou `🟡 médio`, verifique manualmente se há referências por:");
md.push("> - lazy imports (`React.lazy`, `import()` dinâmico)");
md.push("> - strings dinâmicas (rotas em `App.tsx`, registros de plugins)");
md.push("> - consumo externo (Storybook, Edge Functions, scripts de build)");
md.push("> - re-exports via barrels (`index.ts`)");
md.push("");

md.push("## Resumo executivo", "");
md.push("| Categoria | Total | 🔴 alto | 🟡 médio | 🟢 baixo |");
md.push("|-----------|------:|--------:|---------:|---------:|");
const summaryRow = (label, groups, total = null) =>
  md.push(
    `| ${label} | ${total ?? groups.high.length + groups.medium.length + groups.low.length} | ${groups.high.length} | ${groups.medium.length} | ${groups.low.length} |`,
  );
summaryRow("Arquivos órfãos", fileGroups);
summaryRow("Exports não usados", exportGroups);
summaryRow("Tipos não usados", typeGroups);
summaryRow("Dependências mortas", depGroups);
summaryRow("DevDependencies mortas", devDepGroups);
md.push(`| Exports duplicados | ${duplicates.length} | — | — | — |`);
md.push(`| Imports não declarados | ${unlistedUnique.length} | — | — | — |`);
md.push(`| Imports não resolvidos | ${unresolvedUnique.length} | — | — | — |`);
md.push("");

md.push("## Legenda de risco", "");
for (const [k, v] of Object.entries(RISK_GUIDE)) md.push(`- ${RISK_BADGE[k]} — ${v}`);
md.push("");

function renderRiskBuckets(title, groups, formatter, opts = {}) {
  const { limit = 80 } = opts;
  md.push(`## ${title}`, "");
  for (const risk of ["high", "medium", "low"]) {
    const items = groups[risk];
    if (!items.length) continue;
    md.push(`### ${RISK_BADGE[risk]} — ${items.length} item(ns)`, "");
    md.push(`> ${RISK_GUIDE[risk]}`, "");
    const shown = items.slice(0, limit);
    for (const it of shown) md.push(`- ${formatter(it)}`);
    if (items.length > limit) md.push(`- _…e mais ${items.length - limit} (ver \`summary.md\`/\`raw.json\`)._`);
    md.push("");
  }
}

renderRiskBuckets(
  "Arquivos órfãos",
  fileGroups,
  (it) => `\`${it.path}\``,
);

renderRiskBuckets(
  "Exports não utilizados",
  exportGroups,
  (it) => `\`${it.file}${it.line ? `:${it.line}` : ""}\` — \`${it.name}\``,
);

if (typesAll.length) {
  renderRiskBuckets(
    "Tipos não utilizados",
    typeGroups,
    (it) => `\`${it.file}${it.line ? `:${it.line}` : ""}\` — \`${it.name}\``,
  );
}

renderRiskBuckets(
  "Dependências mortas (`dependencies`)",
  depGroups,
  (it) => `\`${it.name}\``,
);

if (devDepsUnique.length) {
  renderRiskBuckets(
    "DevDependencies mortas",
    devDepGroups,
    (it) => `\`${it.name}\``,
  );
}

if (duplicates.length) {
  md.push("## Exports duplicados", "");
  for (const d of duplicates.slice(0, 50)) md.push(`- \`${d.file}\` — \`${d.name}\``);
  if (duplicates.length > 50) md.push(`- _…e mais ${duplicates.length - 50}._`);
  md.push("");
}

if (unlistedUnique.length) {
  md.push("## Imports não declarados em `package.json`", "");
  md.push("> Pacotes importados no código mas ausentes em `dependencies`. **Risco alto** — deve ser corrigido (instalar ou remover o import).", "");
  for (const n of unlistedUnique) md.push(`- \`${n}\``);
  md.push("");
}

if (unresolvedUnique.length) {
  md.push("## Imports não resolvidos", "");
  md.push("> Caminhos que o knip não conseguiu resolver. Pode indicar paths quebrados ou aliases incorretos.", "");
  for (const n of unresolvedUnique) md.push(`- \`${n}\``);
  md.push("");
}

md.push("## Próximos passos sugeridos", "");
md.push("1. **Quick wins (🟢 baixo):** remova arquivos/exports/deps marcados como baixo risco em PR único.");
md.push("2. **Verificação (🟡 médio):** para cada item, busque referências por string (`grep` no nome do arquivo ou rota) antes de remover.");
md.push("3. **Auditoria manual (🔴 alto):** abrir issues separadas; muitos itens aqui são entrypoints reais de fluxos lazy/externos.");
md.push("4. **Imports não declarados:** instalar a dep faltante OU remover o import — falha de CI pendente.");
md.push("5. Rodar `npm run audit:deadcode` periodicamente; comparar `summary.json` em PRs.");
md.push("");
md.push(`---`, ``, `_Gerado por \`scripts/build-dependency-audit-report.mjs\`._`);

writeFileSync(OUT_PATH, md.join("\n"));
console.log(`✅ Relatório salvo em: ${OUT_PATH.replace(ROOT + "/", "")}`);
console.log(`   Total: ${totalAll} achados`);
console.log(
  `   Arquivos: ${files.length} (🔴 ${fileGroups.high.length} · 🟡 ${fileGroups.medium.length} · 🟢 ${fileGroups.low.length})`,
);
console.log(
  `   Exports:  ${exportsAll.length} (🔴 ${exportGroups.high.length} · 🟡 ${exportGroups.medium.length} · 🟢 ${exportGroups.low.length})`,
);
console.log(
  `   Deps:     ${depsUnique.length} (🔴 ${depGroups.high.length} · 🟡 ${depGroups.medium.length} · 🟢 ${depGroups.low.length})`,
);
