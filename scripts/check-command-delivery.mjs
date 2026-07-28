#!/usr/bin/env node
/**
 * Gate Onda 194 — coleta e prestação de contas dos comandos remotos.
 *
 * Três coisas precisam continuar verdadeiras para que a entrega seja segura, e
 * nenhuma delas é provada pela migração ter aplicado:
 *
 *   1. A regra de decisão do app e a do servidor são **a mesma regra**. Se
 *      divergirem, a UI mostra um estado e o equipamento recebe outro.
 *   2. O catálogo de atos com efeito físico não se descola entre os dois
 *      arquivos nem do catálogo de admissão da Onda 193.
 *   3. A máquina de estados no banco recusa mesmo os movimentos ilegais — e
 *      isso só se prova executando (Onda 141 pegou rotina abortando em
 *      silêncio porque o gate era estático).
 *
 * Rodar: node scripts/check-command-delivery.mjs
 */

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const failures = [];
let proofs = 0;

const sql = (query) => {
  const out = execFileSync('psql', ['-X', '-A', '-t', '-v', 'ON_ERROR_STOP=1', '-c', query], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return out
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith('psql:'));
};

const expect = (condition, label) => {
  proofs += 1;
  if (!condition) failures.push(label);
};

// --- 1. Paridade da regra entre app e servidor ------------------------------
const appSrc = readFileSync('src/lib/devices/remoteCommandDelivery.ts', 'utf8');
const mirrorSrc = readFileSync('supabase/functions/_shared/remoteCommandDelivery.ts', 'utf8');

/** Extrai o corpo de uma função nomeada, normalizando espaços e comentários. */
const bodyOf = (source, name) => {
  const start = source.indexOf(`export function ${name}`);
  if (start < 0) return null;
  let depth = 0;
  let i = source.indexOf('{', start);
  const from = i;
  for (; i < source.length; i += 1) {
    if (source[i] === '{') depth += 1;
    else if (source[i] === '}') {
      depth -= 1;
      if (depth === 0) break;
    }
  }
  return source
    .slice(from, i + 1)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
};

for (const fn of ['planPoll', 'judgeReport', 'toDeliveryEnvelope']) {
  const a = bodyOf(appSrc, fn);
  const b = bodyOf(mirrorSrc, fn);
  expect(a !== null && b !== null, `função ${fn} sumiu de um dos lados`);
  expect(a === b, `regra de ${fn} divergiu entre app e servidor`);
}

const constOf = (source, name) => {
  const m = source.match(new RegExp(`export const ${name} = ([^;]+);`));
  return m ? m[1].trim() : null;
};
for (const c of ['DELIVERY_LEASE_MS', 'MAX_DELIVERY_ATTEMPTS']) {
  expect(constOf(appSrc, c) === constOf(mirrorSrc, c), `constante ${c} divergiu`);
}

// --- 2. Catálogo de atos com efeito físico ----------------------------------
const effectfulOf = (source) => {
  const m = source.match(/EFFECTFUL[^=]*=\s*new Set(?:<RemoteCommandKind>)?\(\[([^\]]+)\]\)/);
  return m
    ? m[1]
      .split(',')
      .map((s) => s.trim().replace(/['"]/g, ''))
      .filter(Boolean)
      .sort()
      .join(',')
    : null;
};
const admissionSrc = readFileSync('src/lib/devices/remoteCommandAdmission.ts', 'utf8');
const catalogs = [effectfulOf(appSrc), effectfulOf(mirrorSrc), effectfulOf(admissionSrc)];
expect(catalogs.every((c) => c !== null), 'catálogo de atos com efeito não encontrado');
expect(new Set(catalogs).size === 1, `catálogo de atos com efeito divergiu: ${catalogs.join(' | ')}`);

// --- 3. Colunas e travas da memória de entrega ------------------------------
const cols = sql(`
  SELECT column_name || ':' || is_nullable
    FROM information_schema.columns
   WHERE table_schema='public' AND table_name='device_remote_commands'
     AND column_name IN ('delivery_attempts','reported_at')
`);
expect(cols.includes('delivery_attempts:NO'), 'contagem de entregas precisa ser obrigatória');
expect(cols.includes('reported_at:YES'), 'carimbo de laudo precisa existir e ser opcional');

const checks = sql(`
  SELECT conname FROM pg_constraint
   WHERE conrelid='public.device_remote_commands'::regclass AND contype='c'
`);
expect(
  checks.includes('device_remote_commands_attempts_check'),
  'teto de tentativas não está no banco',
);

// --- 4. Exercício dinâmico: a máquina de estados recusa de verdade ----------
const selftest = JSON.parse(
  sql(`SELECT public.device_remote_command_delivery_selftest()::text`).join(''),
);
for (const key of [
  'birth_guard',
  'stamp_guard',
  'delivered',
  'monotonic_guard',
  'transition_guard',
  'attempt_ceiling',
  'report_stamp_guard',
  'reported',
]) {
  expect(selftest[key] === true, `autoteste de entrega falhou em "${key}": ${JSON.stringify(selftest)}`);
}

// O autoteste não pode deixar rastro: se deixou, ele está mentindo sobre o
// rollback e passaria a poluir a fila real a cada execução do gate.
const leftovers = sql(
  `SELECT count(*) FROM public.device_registrations WHERE device_code='CIWAVE194SLF'`,
)[0];
expect(leftovers === '0', 'autoteste de entrega deixou rastro no banco');

// A rotina de autoteste é do servidor, não do app.
const canExec = sql(`
  SELECT has_function_privilege('authenticated',
    'public.device_remote_command_delivery_selftest()', 'EXECUTE')::text
`)[0];
expect(canExec === 'false', 'authenticated pode executar o autoteste de entrega');

// --- Resultado ---------------------------------------------------------------
if (failures.length > 0) {
  console.error(`Gate Onda 194 falhou (${failures.length} de ${proofs} provas):`);
  for (const f of failures) console.error(' -', f);
  process.exit(1);
}
console.log(`Gate Onda 194 — ${proofs} provas de entrega e laudo sustentadas.`);
