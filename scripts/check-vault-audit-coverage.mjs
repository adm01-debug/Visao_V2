#!/usr/bin/env node
// Onda Fortress 6 — Gate CI: garante que toda `action` da Edge Function
// possui uma chamada logVaultAudit(...) no mesmo case block.
import { readFileSync } from 'node:fs';

const path = 'supabase/functions/camera-credentials-vault/index.ts';
const src = readFileSync(path, 'utf8');

// Extrai literais de action do discriminatedUnion
const actionRegex = /z\.literal\(["']([a-z_]+)["']\)/g;
const actions = new Set();
let m;
while ((m = actionRegex.exec(src)) !== null) actions.add(m[1]);

if (actions.size === 0) {
  console.error('FAIL: nenhuma action encontrada em', path);
  process.exit(1);
}

// Para cada action, valida que existe um case + um logVaultAudit próximo
const missing = [];
for (const action of actions) {
  const caseIdx = Math.max(src.indexOf(`case "${action}":`), src.indexOf(`case '${action}':`));
  if (caseIdx === -1) {
    missing.push(`${action} (case ausente)`);
    continue;
  }
  const nextCase = src.indexOf('case "', caseIdx + 10);
  const block = src.slice(caseIdx, nextCase === -1 ? undefined : nextCase);
  if (!block.includes('logVaultAudit(')) missing.push(`${action} (sem logVaultAudit)`);
}

// Bloco catch também precisa auditar
const catchBlock = src.split('} catch').slice(1).join('} catch');
if (!catchBlock.includes('logVaultAudit(')) missing.push('catch (sem logVaultAudit)');

if (missing.length > 0) {
  console.error('FAIL: auditoria do cofre incompleta em', path);
  for (const m of missing) console.error('  -', m);
  process.exit(1);
}

console.log(`OK: ${actions.size} actions + catch todos auditados em ${path}`);
