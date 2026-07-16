#!/usr/bin/env node
/**
 * Wave 31 — Migration Lint Gate (acumulado)
 *
 * Regras (alinhadas ao Supabase Linter oficial):
 *   R1) Tabela public.X sem RLS habilitado em nenhum ponto da história
 *   R2) Tabela public.X sem GRANT p/ authenticated ou service_role em nenhum ponto
 *   R3) Função SECURITY DEFINER sem SET search_path no bloco em que é criada
 *   R5) GRANT ... TO PUBLIC (uso amplo, pede justificativa)
 *
 * Estado é acumulado ao longo do histórico ordenado por nome do arquivo,
 * refletindo o comportamento real do banco após todas as migrações rodarem.
 *
 * Suprima linhas específicas com "-- lint-ignore: R<n> motivo".
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const MIG_DIR = 'supabase/migrations';
// Baseline: migrações anteriores a este marcador refletem o estado herdado
// do banco (grants default históricos do Supabase). O gate protege regressões
// novas — arquivos ≥ baseline devem seguir as regras à risca.
const BASELINE = '20260716';
const files = readdirSync(MIG_DIR).filter((f) => f.endsWith('.sql')).sort();
const isNew = (f) => f.slice(0, 8) >= BASELINE;

const tables = new Map(); // name -> { createdIn, createdLine, hasRls, roles:Set }
const issues = [];

for (const file of files) {
  const raw = readFileSync(join(MIG_DIR, file), 'utf8');
  const ignores = new Set();
  raw.split('\n').forEach((l, i) => {
    const m = l.match(/--\s*lint-ignore:\s*(R\d+)/i);
    if (m) ignores.add(`${m[1].toUpperCase()}:${file}:${i + 1}`);
  });

  // CREATE TABLE public.X
  const tableRe = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?public\.(\w+)/gi;
  let m;
  while ((m = tableRe.exec(raw))) {
    const name = m[1];
    if (/_(m\d{4}_\d{2}|y\d{4}_y\d{4}_pre)$/.test(name)) continue;
    if (!tables.has(name)) {
      const line = raw.slice(0, m.index).split('\n').length;
      tables.set(name, { createdIn: file, createdLine: line, hasRls: false, roles: new Set() });
    }
  }

  // ENABLE RLS
  const rlsRe = /ALTER\s+TABLE\s+(?:ONLY\s+)?public\.(\w+)[\s\S]{0,200}?ENABLE\s+ROW\s+LEVEL\s+SECURITY/gi;
  while ((m = rlsRe.exec(raw))) {
    const t = tables.get(m[1]);
    if (t) t.hasRls = true;
  }

  // GRANT ... ON public.X ... TO roles
  const grantRe = /GRANT\s+[^;]+\s+ON\s+(?:TABLE\s+)?public\.(\w+)[^;]*TO\s+([^;]+);/gi;
  while ((m = grantRe.exec(raw))) {
    const t = tables.get(m[1]);
    if (!t) continue;
    m[2].split(',').forEach((r) => t.roles.add(r.trim().toLowerCase()));
  }

  // R3: SECURITY DEFINER sem search_path
  const fnRe = /CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+([\w.]+)[\s\S]*?SECURITY\s+DEFINER[\s\S]*?(?:LANGUAGE\s+\w+|AS\s+\$)/gi;
  while ((m = fnRe.exec(raw))) {
    const block = m[0];
    if (/SET\s+search_path/i.test(block)) continue;
    const line = raw.slice(0, m.index).split('\n').length;
    if (ignores.has(`R3:${file}:${line}`)) continue;
    issues.push({ rule: 'R3', file, line, msg: `Função ${m[1]} SECURITY DEFINER sem SET search_path` });
  }

  // R5: GRANT ... TO PUBLIC
  const pubRe = /GRANT\s+[^;]+TO\s+PUBLIC\s*;/gi;
  while ((m = pubRe.exec(raw))) {
    const line = raw.slice(0, m.index).split('\n').length;
    if (ignores.has(`R5:${file}:${line}`)) continue;
    issues.push({ rule: 'R5', file, line, msg: 'GRANT ... TO PUBLIC (uso amplo — justifique com -- lint-ignore: R5)' });
  }
}

// Validar tabelas acumuladas
for (const [name, t] of tables) {
  if (!t.hasRls) {
    issues.push({ rule: 'R1', file: t.createdIn, line: t.createdLine, msg: `Tabela public.${name} nunca teve RLS habilitado em migração alguma` });
  }
  const ok = t.roles.has('authenticated') || t.roles.has('service_role');
  if (!ok) {
    issues.push({ rule: 'R2', file: t.createdIn, line: t.createdLine, msg: `Tabela public.${name} sem GRANT p/ authenticated ou service_role no histórico` });
  }
}

if (issues.length === 0) {
  console.log(`✓ Migration lint OK — ${files.length} arquivos, ${tables.size} tabelas verificadas`);
  process.exit(0);
}

console.log('✗ Migration lint falhou\n');
issues.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);
for (const i of issues) console.log(`  [${i.rule}] ${i.file}:${i.line} — ${i.msg}`);
console.log(`\nTotal: ${issues.length} issue(s) em ${files.length} migração(ões).`);
process.exit(1);
