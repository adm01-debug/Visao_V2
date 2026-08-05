#!/usr/bin/env node
/**
 * Onda 158 — gate do selo servidor-lado.
 *
 * Duas coisas que só quebram em produção se ninguém vigiar:
 *
 *  G1 — O espelho `supabase/functions/_shared/custodyManifest.ts` precisa ser
 *  BYTE A BYTE igual a `src/lib/evidence/custodyManifest.ts`. Se divergirem, a
 *  borda sela com uma regra e o app verifica com outra: o mesmo vídeo produz
 *  dois selos e a peça se autoinvalida. Cópia é aceitável (Deno não alcança
 *  `src/`); cópia que envelhece, não.
 *
 *  G2 — A função de borda não pode conter atalho de service role no caminho de
 *  selagem, nem aceitar autoria/relógio vindos do corpo. Prova sem autor
 *  autenticado não é prova.
 */
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const jiti = require('jiti')(import.meta.url, { interopDefault: true, esmResolve: true });

const problems = [];

/* G1 — espelho ------------------------------------------------------------ */
const appRule = readFileSync('src/lib/evidence/custodyManifest.ts');
const edgeRule = readFileSync('supabase/functions/_shared/custodyManifest.ts');
const h = (b) => createHash('sha256').update(b).digest('hex');
if (h(appRule) !== h(edgeRule)) {
  problems.push(
    'O espelho da borda divergiu da regra do app. Rode: cp src/lib/evidence/custodyManifest.ts supabase/functions/_shared/custodyManifest.ts'
  );
}

/* G2 — porteiro da função ------------------------------------------------- */
const fn = readFileSync('supabase/functions/evidence-seal/index.ts', 'utf8');
const required = [
  ['auth.getUser()', 'autenticação obrigatória ausente'],
  ['unauthenticated', 'resposta 401 ausente'],
  ['recordings.export', 'capability recordings.export não verificada'],
  ['effective_capabilities', 'capability não verificada no servidor'],
  ['admitSealRequest', 'admissão do pedido não aplicada'],
  ['buildManifest', 'manifesto não é construído no servidor'],
  ['requestedBy: user.id', 'autoria não vem do JWT'],
  ['nowMs: Date.now()', 'relógio não vem do servidor'],
  ['exportId: crypto.randomUUID()', 'exportId não é gerado no servidor'],
];
for (const [needle, message] of required) {
  if (!fn.includes(needle)) problems.push(`evidence-seal: ${message} (esperado "${needle}")`);
}
if (/isSystemCall|service\s*\)\s*;[\s\S]*insert\(/.test(fn) && fn.includes('isSystemCall')) {
  problems.push('evidence-seal: atalho de service role no caminho de selagem.');
}
if (!fn.includes('.from("evidence_exports")') || !fn.includes('userClient')) {
  problems.push('evidence-seal: gravação precisa ocorrer sob a RLS do chamador.');
}

/* G3 — a regra de admissão continua tirando os campos do cliente ---------- */
const { admitSealRequest, SERVER_OWNED_FIELDS } = jiti(
  '../supabase/functions/_shared/evidenceSealRequest.ts'
);
const ctx = {
  requestedBy: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  exportId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  nowMs: Date.parse('2026-07-27T12:00:00.000Z'),
  systemVersion: 'visao/158',
};
const valid = {
  camera_id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  requested_from_utc: '2026-07-27T11:00:00.000Z',
  requested_to_utc: '2026-07-27T12:00:00.000Z',
  pixels_altered: false,
  segments: [
    {
      index: 0,
      storage_path: 'evidence/a.mp4',
      byte_size: 10,
      sha256: 'a'.repeat(64),
      device_start_utc: '2026-07-27T11:00:00.000Z',
      device_end_utc: '2026-07-27T11:10:00.000Z',
      received_at_utc: '2026-07-27T11:10:01.000Z',
      clock_offset_ms: 0,
    },
  ],
  transformations: [],
};
const ok = admitSealRequest(valid, ctx);
if (!ok.ok) problems.push(`admitSealRequest recusou um pedido válido: ${ok.detail}`);
for (const field of SERVER_OWNED_FIELDS) {
  const r = admitSealRequest({ ...valid, [field]: 'forjado' }, ctx);
  if (r.ok || r.code !== 'client_supplied_server_field') {
    problems.push(`admitSealRequest aceitou campo do servidor "${field}".`);
  }
}

if (problems.length) {
  console.error('❌ Gate evidence-seal reprovado:');
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
console.log('✅ evidence-seal: espelho idêntico, porteiro íntegro, campos do servidor protegidos.');
