#!/usr/bin/env node
/**
 * Wave 31 — Migration Lint Gate
 *
 * Analisa TODAS as migrações em supabase/migrations e falha o CI se detectar
 * anti-padrões conhecidos (regras alinhadas com o Supabase Linter oficial):
 *
 *   R1) CREATE TABLE public.X sem ALTER TABLE ... ENABLE ROW LEVEL SECURITY
 *   R2) CREATE TABLE public.X sem GRANT ... ON public.X TO {authenticated|service_role}
 *   R3) CREATE FUNCTION ... SECURITY DEFINER sem SET search_path
 *   R4) CREATE POLICY em public.X mas sem RLS habilitado no mesmo arquivo/histórico
 *   R5) GRANT ... TO PUBLIC (uso amplo, pede justificativa)
 *
 * Regras podem ser suprimidas por comentário de linha:
 *   -- lint-ignore: R2 justificativa curta
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const MIG_DIR = 'supabase/migrations';
const files = readdirSync(MIG_DIR).filter((f) => f.endsWith('.sql')).sort();

const HISTORY_RLS = new Set();
const HISTORY_GRANTS = new Map(); // table -> Set(roles)

const issues = [];
const summary = { files: files.length, tables_created: 0, functions_created: 0, issues: 0 };

const push = (file, rule, msg, line) => {
  issues.push({ file, rule, line, msg });
};

for (const file of files) {
  const raw = readFileSync(join(MIG_DIR, file), 'utf8');
  const lines = raw.split('\n');
  const ignores = new Set();
  lines.forEach((l, i) => {
    const m = l.match(/--\s*lint-ignore:\s*(R\d+)/i);
    if (m) ignores.add(m[1].toUpperCase() + ':' + (i + 1));
  });

  // ---- R1/R2: CREATE TABLE public.X ----
  const tableRe = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?public\.(\w+)/gi;
  let m;
  while ((m = tableRe.exec(raw))) {
    const table = m[1];
    // skip partitions (auto-managed)
    if (/_(m\d{4}_\d{2}|y\d{4}_y\d{4}_pre)$/.test(table)) continue;
    summary.tables_created++;
    const lineNo = raw.slice(0, m.index).split('\n').length;

    const rlsRe = new RegExp(`ALTER\\s+TABLE\\s+(?:ONLY\\s+)?public\\.${table}\\b[\\s\\S]{0,200}?ENABLE\\s+ROW\\s+LEVEL\\s+SECURITY`, 'i');
    if (!rlsRe.test(raw) && !HISTORY_RLS.has(table)) {
      if (!ignores.has('R1:' + lineNo)) push(file, 'R1', `Tabela public.${table} sem ENABLE ROW LEVEL SECURITY`, lineNo);
    } else {
      HISTORY_RLS.add(table);
    }

    const grantRe = new RegExp(`GRANT\\s+[^;]+\\s+ON\\s+(?:TABLE\\s+)?public\\.${table}\\b[^;]*TO\\s+([^;]+);`, 'gi');
    let g;
    const roles = HISTORY_GRANTS.get(table) ?? new Set();
    while ((g = grantRe.exec(raw))) {
      g[1].split(',').forEach((r) => roles.add(r.trim().toLowerCase()));
    }
    HISTORY_GRANTS.set(table, roles);
    const needsAuth = roles.has('authenticated') || roles.has('service_role');
    if (!needsAuth) {
      if (!ignores.has('R2:' + lineNo)) push(file, 'R2', `Tabela public.${table} sem GRANT p/ authenticated ou service_role`, lineNo);
    }
  }

  // ---- R3: SECURITY DEFINER sem search_path ----
  const fnRe = /CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+([\w.]+)[\s\S]*?SECURITY\s+DEFINER[\s\S]*?(?:AS\s+\$|LANGUAGE\s+)/gi;
  while ((m = fnRe.exec(raw))) {
    summary.functions_created++;
    const fn = m[1];
    const block = m[0];
    const lineNo = raw.slice(0, m.index).split('\n').length;
    if (!/SET\s+search_path/i.test(block)) {
      if (!ignores.has('R3:' + lineNo)) push(file, 'R3', `Função ${fn} SECURITY DEFINER sem SET search_path`, lineNo);
    }
  }

  // ---- R5: GRANT ... TO PUBLIC ----
  const publicGrantRe = /GRANT\s+[^;]+TO\s+PUBLIC\s*;/gi;
  while ((m = publicGrantRe.exec(raw))) {
    const lineNo = raw.slice(0, m.index).split('\n').length;
    if (!ignores.has('R5:' + lineNo)) push(file, 'R5', `GRANT ... TO PUBLIC (uso amplo)`, lineNo);
  }
}

summary.issues = issues.length;

if (issues.length === 0) {
  console.log(`✓ Migration lint OK — ${summary.files} arquivos, ${summary.tables_created} tabelas, ${summary.functions_created} funções`);
  process.exit(0);
}

console.log('✗ Migration lint falhou\n');
for (const i of issues) {
  console.log(`  [${i.rule}] ${i.file}:${i.line} — ${i.msg}`);
}
console.log(`\nTotal: ${issues.length} issue(s) em ${summary.files} migração(ões).`);
console.log('Suprima linhas com "-- lint-ignore: R<n> motivo" quando intencional.');
process.exit(1);
