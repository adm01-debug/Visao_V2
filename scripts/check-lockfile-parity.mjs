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
 * Não precisa de node_modules instalado: compara as ranges de versão
 * declaradas (o que cada lockfile registra como "quer") contra package.json,
 * que é a fonte de verdade — nos dois sentidos (falta E sobra). bun.lock é
 * JSON5-lite (permite vírgula sobrando) — normalizamos antes do parse.
 *
 * Limitação conhecida: só compara a RANGE declarada, não a versão
 * efetivamente resolvida dentro dela — se as duas ferramentas resolverem
 * versões diferentes para a mesma range (ex.: "^3.10.1" -> 3.10.1 no npm e
 * 3.10.0 no bun), este gate não pega. Cobrir isso exigiria rodar `npm ls`/
 * `bun pm ls` com node_modules instalado, o que abriria mão do "roda em
 * milissegundos, sem instalar nada" que é o ponto deste gate — o
 * `bun install --frozen-lockfile` do CI já é a rede de segurança para esse
 * caso mais raro.
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

// Também detecta o sentido inverso: uma dependência que os lockfiles ainda
// declaram, mas que já saiu de package.json (ex.: removida numa consolidação
// e um dos dois lockfiles não foi regenerado) — sem isto, uma raiz removida
// só apareceria quebrada em runtime, não neste gate.
for (const [name, npmRange] of Object.entries(npmWanted)) {
  if (!(name in wanted)) {
    mismatches.push(`  ${name}: ausente de package.json, mas package-lock.json ainda declara "${npmRange}"`);
  }
}
for (const [name, bunRange] of Object.entries(bunWanted)) {
  if (!(name in wanted)) {
    mismatches.push(`  ${name}: ausente de package.json, mas bun.lock ainda declara "${bunRange}"`);
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
