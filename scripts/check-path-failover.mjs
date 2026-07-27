#!/usr/bin/env node
/**
 * Gate da Onda 152 — failover de caminho de conectividade.
 *
 * 1) Espelho: a política do simulador precisa ser idêntica à do TypeScript.
 *    Cópia que sai de sincronia transforma o simulador em teatro — ele passa
 *    a provar invariantes de um sistema que não é o que roda.
 * 2) Simulação: executa `simulate-wave152-path-failover.mjs`.
 *
 * Uso: node scripts/check-path-failover.mjs
 */

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');

const failures = [];

function readPolicy(source, marker) {
  const block = source.slice(source.indexOf(marker));
  const fields = ['quarantineThreshold', 'backoffBaseMs', 'backoffCeilingMs', 'promotionMinSamples', 'promotionMargin'];
  const policy = {};
  for (const field of fields) {
    const match = new RegExp(`${field}\\s*:\\s*([0-9_.]+)`).exec(block);
    if (!match) {
      failures.push(`campo ausente em ${marker}: ${field}`);
      continue;
    }
    policy[field] = Number(match[1].replaceAll('_', ''));
  }
  return policy;
}

const ts = readFileSync(resolve(root, 'src/lib/devices/pathFailover.ts'), 'utf8');
const js = readFileSync(resolve(root, 'scripts/simulate-wave152-path-failover.mjs'), 'utf8');

const tsPolicy = readPolicy(ts, 'DEFAULT_FAILOVER_POLICY');
const jsPolicy = readPolicy(js, 'const POLICY');

for (const key of Object.keys(tsPolicy)) {
  if (tsPolicy[key] !== jsPolicy[key]) {
    failures.push(`política divergente em "${key}": TS=${tsPolicy[key]} vs simulador=${jsPolicy[key]}`);
  }
}

// A ordem canônica de desempate também precisa bater — ela decide o resultado
// em todo empate, que é o caso mais comum numa frota nova sem telemetria.
const tsPaths = /CONNECTIVITY_PATHS\s*=\s*\[([^\]]+)\]/.exec(ts)?.[1] ?? '';
const jsPaths = /const PATHS\s*=\s*\[([^\]]+)\]/.exec(js)?.[1] ?? '';
const normalize = (s) => s.replaceAll(/['"\s]/g, '');
if (!tsPaths || normalize(tsPaths) !== normalize(jsPaths)) {
  failures.push(`ordem canônica divergente: TS=[${normalize(tsPaths)}] vs simulador=[${normalize(jsPaths)}]`);
}

if (failures.length > 0) {
  console.error('Gate da Onda 152 falhou:');
  for (const f of failures) console.error(` - ${f}`);
  process.exit(1);
}
console.log('Espelho TS ↔ simulador consistente.');

execFileSync(process.execPath, [resolve(root, 'scripts/simulate-wave152-path-failover.mjs')], {
  stdio: 'inherit',
});
