#!/usr/bin/env node
/**
 * Gate de CI — Onda 188: visualizações favoritas (arranjo de mosaico nomeado).
 *
 * Prova, no banco real:
 *  1. Coluna de uso (`last_used_at`) e índice de ordenação existem.
 *  2. Teto de favoritos por usuário existe no banco e bate literalmente com
 *     `MAX_FAVORITE_VIEWS` do TypeScript (regra única, sem divergência).
 *  3. O gatilho de teto de slots cobre INSERT **e** UPDATE — o furo original
 *     deixava um UPDATE de `group_id` estourar as 32 câmeras.
 *  4. Existe gatilho de propriedade: slot só entra em grupo do próprio dono.
 *  5. Exercício dinâmico (transação revertida): o gatilho de propriedade
 *     realmente recusa um grupo alheio/inexistente.
 *  6. A faixa de `slot_index` no CHECK do banco bate com `MAX_SLOT_INDEX`.
 *  7. RLS ativa e nenhum privilégio para `anon` nas duas tabelas.
 */
import { execFileSync } from 'node:child_process';
import {
  MAX_FAVORITE_VIEWS,
  MAX_SLOT_INDEX,
  LAYOUT_SLOTS,
} from '../src/lib/views/favoriteViewRestore.ts';

const failures = [];
const query = (sql) => execFileSync('psql', ['-tA', '-c', sql], { encoding: 'utf8' }).trim();
const check = (label, condition, detail) => {
  if (!condition) failures.push(`${label}: ${detail}`);
};

// 1) Coluna e índice de uso recente
const col = query(`
  SELECT count(*) FROM information_schema.columns
   WHERE table_schema='public' AND table_name='monitor_groups' AND column_name='last_used_at'`);
check('1a last_used_at', col === '1', `esperado 1, obtido ${col}`);

const idx = query(`
  SELECT count(*) FROM pg_indexes
   WHERE schemaname='public' AND tablename='monitor_groups'
     AND indexname='idx_monitor_groups_user_last_used'`);
check('1b índice de uso recente', idx === '1', `esperado 1, obtido ${idx}`);

// 2) Teto de favoritos: SQL ↔ TypeScript
const quotaSrc = query(
  `SELECT pg_get_functiondef('public.enforce_monitor_group_quota()'::regprocedure)`
);
check(
  '2a teto declarado no SQL',
  new RegExp(`>=\\s*${MAX_FAVORITE_VIEWS}\\b`).test(quotaSrc),
  `constante ${MAX_FAVORITE_VIEWS} ausente na função de quota`
);
check(
  '2b quota SECURITY DEFINER com search_path',
  /SECURITY DEFINER/.test(quotaSrc) && /search_path/.test(quotaSrc),
  'contrato de segurança ausente'
);
const quotaTrg = query(`
  SELECT count(*) FROM pg_trigger
   WHERE tgrelid='public.monitor_groups'::regclass AND tgname='trg_mg_quota' AND NOT tgisinternal`);
check('2c gatilho de quota', quotaTrg === '1', `esperado 1, obtido ${quotaTrg}`);

// 3) Teto de slots cobre INSERT e UPDATE
const slotTrg = query(`
  SELECT pg_get_triggerdef(oid) FROM pg_trigger
   WHERE tgrelid='public.monitor_group_cameras'::regclass AND tgname='trg_mgc_slot_limit'`);
check('3a gatilho de slots existe', slotTrg.length > 0, 'trg_mgc_slot_limit ausente');
check(
  '3b cobre INSERT OR UPDATE',
  /BEFORE INSERT OR UPDATE/.test(slotTrg),
  `definição atual: ${slotTrg}`
);

// 4) Gatilho de propriedade
const ownTrg = query(`
  SELECT pg_get_triggerdef(oid) FROM pg_trigger
   WHERE tgrelid='public.monitor_group_cameras'::regclass AND tgname='trg_mgc_ownership'`);
check(
  '4 gatilho de propriedade',
  /BEFORE INSERT OR UPDATE/.test(ownTrg),
  `definição atual: ${ownTrg}`
);

// 5) Exercício dinâmico: grupo alheio é recusado de fato
let rejected = false;
try {
  execFileSync(
    'psql',
    [
      '-v',
      'ON_ERROR_STOP=1',
      '-tA',
      '-c',
      `BEGIN; INSERT INTO public.monitor_group_cameras (group_id,camera_id,user_id,slot_index)
       VALUES (gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), 0); ROLLBACK;`,
    ],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }
  );
} catch (err) {
  rejected = /não pertence ao dono/i.test(String(err.stderr ?? err.message));
}
check('5 recusa dinâmica de grupo alheio', rejected, 'inserção em grupo alheio NÃO foi barrada');

// 6) Faixa de slot_index
const chk = query(`
  SELECT pg_get_constraintdef(oid) FROM pg_constraint
   WHERE conrelid='public.monitor_group_cameras'::regclass
     AND conname='monitor_group_cameras_slot_index_check'`);
check(
  '6 faixa de slot_index',
  chk.includes('>= 0') && chk.includes(String(MAX_SLOT_INDEX)),
  `CHECK atual: ${chk} (MAX_SLOT_INDEX=${MAX_SLOT_INDEX})`
);

// 6b) Todo layout do TypeScript cabe na faixa física do banco
for (const [layout, slots] of Object.entries(LAYOUT_SLOTS)) {
  check(
    `6b layout ${layout} cabe na faixa`,
    slots - 1 <= MAX_SLOT_INDEX,
    `${slots} posições excedem slot_index máximo ${MAX_SLOT_INDEX}`
  );
}

// 7) RLS ativa e anon sem privilégio
for (const table of ['monitor_groups', 'monitor_group_cameras']) {
  const rls = query(`SELECT relrowsecurity FROM pg_class WHERE oid='public.${table}'::regclass`);
  check(`7a RLS em ${table}`, rls === 't', `relrowsecurity=${rls}`);
  const anon = query(`
    SELECT count(*) FROM pg_class c, aclexplode(c.relacl) a
     WHERE c.oid='public.${table}'::regclass
       AND a.grantee = 'anon'::regrole`);
  check(`7b anon sem privilégio em ${table}`, anon === '0', `privilégios para anon: ${anon}`);
}

if (failures.length > 0) {
  console.error('\n❌ Gate Onda 188 — visualizações favoritas:');
  for (const f of failures) console.error(`   • ${f}`);
  process.exit(1);
}
console.log(
  '✅ Gate Onda 188 — visualizações favoritas: contrato, gatilhos e exposição conformes.'
);
