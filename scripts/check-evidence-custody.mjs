#!/usr/bin/env node
/**
 * Gate de CI — Onda 156: exportação probatória (cadeia de custódia).
 *
 *  1. **Pureza do módulo de regra**: sem relógio próprio, sem aleatoriedade,
 *     sem rede. Um selo que dependa de `Date.now()` ou `Math.random()` não é
 *     reproduzível — e prova não reproduzível não é prova.
 *  2. **Testes e simulação** (Vitest, ~900 cenários gerados).
 *  3. **SHA-256 de verdade no ambiente de teste.** Até esta onda o `setup.ts`
 *     instalava um digest falso (XOR sobre 32 bytes) que colidia à vontade:
 *     uma corrente de custódia adulterada passaria como íntegra. O gate impede
 *     que esse atalho volte.
 *  4. **Vetor conhecido**: o SHA-256 de "abc" precisa bater com o valor
 *     publicado no FIPS 180-4. Se o ambiente trocar de implementação, quebramos
 *     aqui e não numa audiência.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { webcrypto } from 'node:crypto';

const failures = [];
const fail = (m) => failures.push(m);

/* -------- 1. pureza --------------------------------------------------- */

const RULE = 'src/lib/evidence/custodyManifest.ts';
const source = readFileSync(RULE, 'utf8');

for (const [pattern, why] of [
  [/Date\.now\(/, 'usa Date.now() — o instante precisa ser injetado'],
  [/Math\.random\(/, 'usa Math.random() — selo tem de ser determinístico'],
  [/from ['"]@\/integrations/, 'importa cliente de backend — a regra é pura'],
  [/new Date\(\)/, 'cria data do relógio local'],
]) {
  if (pattern.test(source)) fail(`${RULE}: ${why}`);
}

for (const symbol of ['buildManifest', 'verifyManifest', 'assessCustody', 'canonicalize']) {
  if (!source.includes(`export async function ${symbol}`) &&
      !source.includes(`export function ${symbol}`)) {
    fail(`${RULE} não exporta ${symbol}`);
  }
}

/* -------- 3. o stub de digest não pode voltar ------------------------- */

const setup = readFileSync('src/test/setup.ts', 'utf8');
if (/subtle:\s*{/.test(setup) || /digest:\s*async/.test(setup)) {
  fail('src/test/setup.ts voltou a falsificar crypto.subtle — integridade testada contra hash falso');
}
if (!setup.includes('webcrypto')) {
  fail('src/test/setup.ts não usa o Web Crypto real do Node');
}

/* -------- 2. testes e simulação --------------------------------------- */

try {
  execFileSync(
    'npx',
    [
      'vitest',
      'run',
      'src/lib/evidence/__tests__/custodyManifest.test.ts',
      'src/lib/evidence/__tests__/custodyManifest.simulation.test.ts',
    ],
    { encoding: 'utf8', stdio: 'pipe' },
  );
} catch (error) {
  fail(`simulação/testes da Onda 156 falharam:\n${(error.stdout ?? error.message).slice(-2000)}`);
}

/* -------- 4. vetor conhecido do FIPS 180-4 ---------------------------- */

const KNOWN = 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad';
const digest = await webcrypto.subtle.digest('SHA-256', new TextEncoder().encode('abc'));
const hex = Array.from(new Uint8Array(digest))
  .map((b) => b.toString(16).padStart(2, '0'))
  .join('');
if (hex !== KNOWN) fail(`SHA-256 do ambiente diverge do vetor conhecido: ${hex}`);

/* ------------------------------ relatório ----------------------------- */

console.log('Gate Onda 156 — exportação probatória (cadeia de custódia)');
console.log(`  pureza da regra   : ${failures.some((f) => f.startsWith(RULE)) ? 'FALHA' : 'OK'}`);
console.log(`  SHA-256 real      : ${hex === KNOWN ? 'OK (vetor FIPS 180-4)' : 'FALHA'}`);
if (failures.length > 0) {
  console.log(`  resultado         : ${failures.length} falha(s)`);
  for (const f of failures) console.log(`   - ${f}`);
  process.exit(1);
}
console.log('  resultado         : OK');
