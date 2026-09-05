#!/usr/bin/env node
/**
 * Gate CI — paridade entre package-lock.json e bun.lock.
 *
 * Contexto: o repositório mantém dois lockfiles porque 10 workflows instalam
 * com `bun install --frozen-lockfile` enquanto o restante usa `npm ci`. Duas
 * consolidações de dependências (#112, #114) avançaram só o lockfile do npm
 * e deixaram o bun.lock preso em versões antigas — os jobs de bun passaram a
 * falhar com "lockfile had changes, but lockfile is frozen" sem que ninguém
 * notasse até o CI rodar. Este gate falha o PR imediatamente nesse cenário,
 * em vez de deixar a defasagem silenciosa até o próximo `bun install`.
 *
 * Não precisa de node_modules instalado: compara apenas as ranges de versão
 * declaradas (o que cada lockfile registra como "quer") contra package.json,
 * que é a fonte de verdade. bun.lock é JSON5-lite (permite vírgula
 * sobrando) — normalizamos antes do parse.
 */
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const wanted = { ...pkg.dependencies, ...pkg.devDependencies };

const npmLock = JSON.parse(readFileSync('package-lock.json', 'utf8'));
const npmRoot = npmLock.packages?.[''] ?? {};
const npmWanted = { ...npmRoot.dependencies, ...npmRoot.devDependencies };

const bunLockRaw = readFileSync('bun.lock', 'utf8').replace(/,(\s*[}\]])/g, '$1');
const bunLock = JSON.parse(bunLockRaw);
const bunRoot = bunLock.workspaces?.[''] ?? {};
const bunWanted = { ...bunRoot.dependencies, ...bunRoot.devDependencies };

const mismatches = [];
for (const [name, range] of Object.entries(wanted)) {
  const npmRange = npmWanted[name];
  const bunRange = bunWanted[name];
  if (npmRange !== range) {
    mismatches.push(`  ${name}: package.json="${range}" package-lock.json="${npmRange ?? '(ausente)'}"`);
  }
  if (bunRange !== range) {
    mismatches.push(`  ${name}: package.json="${range}" bun.lock="${bunRange ?? '(ausente)'}"`);
  }
}

if (mismatches.length > 0) {
  console.error('❌ Lockfiles fora de paridade com package.json:\n');
  console.error(mismatches.join('\n'));
  console.error(
    '\nRegenere os dois lockfiles: `npm install --package-lock-only && bun install --lockfile-only`'
  );
  process.exit(1);
}

console.log(`✓ Lockfile parity OK — ${Object.keys(wanted).length} dependências verificadas.`);
