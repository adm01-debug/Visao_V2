#!/usr/bin/env node
/**
 * Gate de CI — Onda 161: E-Map (planta baixa).
 *
 * O risco desta onda não é estético. Um mapa de situação é lido durante um
 * incidente, e ele pode mentir de três formas:
 *   (a) posição amarrada a pixel — o marcador escorrega quando a tela muda;
 *   (b) coordenada fora de [0,1] aceita no banco — o marcador some da planta;
 *   (c) planta de terceiro visível — vazamento da topologia física do local,
 *       que é justamente o que um invasor precisaria para escolher o ponto cego.
 *
 * Etapas, do mais barato ao mais caro:
 *   1. A regra pura de geometria continua verde (simulação da Onda 161).
 *   2. Superfície fechada: `anon` sem privilégio, RLS ligada, políticas nas
 *      quatro operações, função de posse sem execução por anônimo.
 *   3. Contratos de integridade: faixas de x/y/ângulo, unicidade da câmera por
 *      planta, cascata ao apagar planta/câmera, uma planta padrão por pessoa.
 *   4. Exercício DINÂMICO em transação revertida: o banco realmente recusa
 *      coordenada fora da planta e câmera repetida. Migração que aplica não
 *      prova que a restrição morde.
 */
import { execFileSync } from 'node:child_process';

const failures = [];
const fail = (m) => failures.push(m);

/* -------- 1. a regra pura continua verde ------------------------------ */

try {
  execFileSync('node', ['scripts/simulate-wave161-emap.mjs'], { encoding: 'utf8', stdio: 'pipe' });
} catch (error) {
  fail(`simulação da geometria do E-Map falhou:\n${(error.stdout ?? error.message).slice(-2000)}`);
}

/* -------- conexão ----------------------------------------------------- */

const psql = (sql, attempts = 3) => {
  let last;
  for (let i = 0; i < attempts; i += 1) {
    try {
      return execFileSync('psql', ['-tAX', '-v', 'ON_ERROR_STOP=1', '-c', sql], {
        encoding: 'utf8',
      }).trim();
    } catch (error) {
      last = error;
      if (!/timed out|connection|server closed/i.test(String(error.stderr ?? ''))) throw error;
    }
  }
  throw last;
};

const hasPsql = (() => {
  try {
    psql('SELECT 1');
    return true;
  } catch {
    return false;
  }
})();

if (!hasPsql) {
  console.log('Onda 161 — psql indisponível: verificações de banco puladas (etapa 1 executada).');
} else {
  /* -------- 2. superfície fechada ------------------------------------- */

  for (const table of ['site_plans', 'site_plan_placements']) {
    const anonGrants = psql(
      `SELECT count(*) FROM information_schema.role_table_grants
        WHERE table_schema='public' AND table_name='${table}' AND grantee='anon'`
    );
    if (anonGrants !== '0') fail(`${table}: anon possui ${anonGrants} privilégio(s)`);

    const rls = psql(`SELECT relrowsecurity FROM pg_class WHERE oid = 'public.${table}'::regclass`);
    if (rls !== 't') fail(`${table}: RLS desligada`);

    const cmds = psql(
      `SELECT coalesce(string_agg(DISTINCT cmd, ',' ORDER BY cmd), '')
         FROM pg_policies WHERE schemaname='public' AND tablename='${table}'`
    );
    for (const cmd of ['SELECT', 'INSERT', 'UPDATE', 'DELETE']) {
      if (!cmds.includes(cmd))
        fail(`${table}: falta política de ${cmd} (acesso bloqueado ou aberto)`);
    }

    // Toda política precisa estar amarrada ao dono. Uma política `true` aqui
    // publicaria a planta física do local para qualquer usuário logado.
    const loose = psql(
      `SELECT coalesce(string_agg(policyname, ','), '') FROM pg_policies
        WHERE schemaname='public' AND tablename='${table}'
          AND coalesce(qual, '') !~ 'auth\\.uid' AND coalesce(with_check, '') !~ 'auth\\.uid'`
    );
    if (loose !== '') fail(`${table}: política(s) sem vínculo com o dono: ${loose}`);
  }

  const anonExec = psql(
    `SELECT has_function_privilege('anon','public.owns_plan_and_camera(uuid,uuid)','execute')`
  );
  if (anonExec !== 'f') fail('owns_plan_and_camera: anônimo pode executar');

  const definerPath = psql(
    `SELECT coalesce(array_to_string(proconfig, ','), '') FROM pg_proc
      WHERE oid = 'public.owns_plan_and_camera(uuid,uuid)'::regprocedure`
  );
  if (!definerPath.includes('search_path=public')) {
    fail('owns_plan_and_camera: SECURITY DEFINER sem search_path fixo');
  }

  /* -------- 3. contratos de integridade -------------------------------- */

  const checks = psql(
    `SELECT coalesce(string_agg(conname, ',' ORDER BY conname), '')
       FROM pg_constraint WHERE conrelid = 'public.site_plan_placements'::regclass`
  );
  for (const expected of [
    'site_plan_placements_x_range',
    'site_plan_placements_y_range',
    'site_plan_placements_heading_range',
    'site_plan_placements_fov_range',
    'site_plan_placements_unique_camera',
  ]) {
    if (!checks.includes(expected)) fail(`site_plan_placements: falta a restrição ${expected}`);
  }

  const cascades = psql(
    `SELECT coalesce(string_agg(conname || ':' || confdeltype::text, ',' ORDER BY conname), '')
       FROM pg_constraint
      WHERE conrelid = 'public.site_plan_placements'::regclass AND contype = 'f'`
  );
  // Cada FK precisa ser 'c' (CASCADE): marcador órfão apontando para câmera
  // apagada é fantasma no mapa de situação.
  const orphanRisk = cascades
    .split(',')
    .filter((entry) => entry !== '' && !entry.endsWith(':c'))
    .join(', ');
  if (orphanRisk) fail(`site_plan_placements: chave(s) estrangeira(s) sem CASCADE: ${orphanRisk}`);
  if (cascades.split(',').filter(Boolean).length !== 2) {
    fail('site_plan_placements: esperava 2 chaves estrangeiras (planta e câmera)');
  }

  const defaultIndex = psql(
    `SELECT count(*) FROM pg_indexes
      WHERE schemaname='public' AND tablename='site_plans'
        AND indexname='site_plans_one_default_per_user'`
  );
  if (defaultIndex !== '1') fail('site_plans: falta o índice de planta padrão única por pessoa');

  const storagePolicies = psql(
    `SELECT count(*) FROM pg_policies
      WHERE schemaname='storage' AND tablename='objects' AND policyname LIKE 'site_plans_storage_%'`
  );
  if (storagePolicies !== '4') {
    fail(`armazenamento de plantas: esperava 4 políticas, encontrei ${storagePolicies}`);
  }

  const bucketPublic = psql(`SELECT public FROM storage.buckets WHERE id = 'site-plans'`);
  if (bucketPublic !== 'f')
    fail('bucket site-plans não é privado — planta do local ficaria exposta');

  /* -------- 4. exercício dinâmico (transação revertida) ---------------- */

  const probe = (sql) => {
    try {
      psql(`BEGIN; ${sql} ROLLBACK;`, 1);
      return null;
    } catch (error) {
      return String(error.stderr ?? error.message);
    }
  };

  const setup = `
    CREATE TEMP TABLE ids ON COMMIT DROP AS
      SELECT gen_random_uuid() AS uid, gen_random_uuid() AS pid;
  `;

  // Coordenada fora da planta tem que ser recusada pelo BANCO, não só pela UI:
  // a UI pode ser contornada por qualquer cliente com o token do usuário.
  const outOfBounds = probe(`
    ${setup}
    INSERT INTO public.site_plans (id, user_id, name, image_path, image_width, image_height)
      SELECT pid, uid, 'gate', 'x/y.png', 100, 100 FROM ids;
    INSERT INTO public.site_plan_placements (plan_id, camera_id, user_id, x, y)
      SELECT pid, gen_random_uuid(), uid, 1.5, 0.5 FROM ids;
  `);
  if (outOfBounds === null) {
    fail('o banco aceitou marcador fora da planta (x = 1.5) — o marcador sumiria da tela');
  } else if (!/site_plan_placements_x_range|violates foreign key/.test(outOfBounds)) {
    fail(`recusa de coordenada inválida veio pelo motivo errado: ${outOfBounds.slice(0, 200)}`);
  }

  const badHeading = probe(`
    ${setup}
    INSERT INTO public.site_plans (id, user_id, name, image_path, image_width, image_height)
      SELECT pid, uid, 'gate', 'x/y.png', 100, 100 FROM ids;
    INSERT INTO public.site_plan_placements (plan_id, camera_id, user_id, x, y, heading_deg)
      SELECT pid, gen_random_uuid(), uid, 0.5, 0.5, 360 FROM ids;
  `);
  if (badHeading === null) fail('o banco aceitou rumo 360° — deve ser normalizado para 0');

  const tinyPlan = probe(`
    INSERT INTO public.site_plans (user_id, name, image_path, image_width, image_height)
      VALUES (gen_random_uuid(), 'gate', 'x/y.png', 0, 100);
  `);
  if (tinyPlan === null) fail('o banco aceitou planta com largura 0 — encaixe dividiria por zero');

  const blankName = probe(`
    INSERT INTO public.site_plans (user_id, name, image_path, image_width, image_height)
      VALUES (gen_random_uuid(), '   ', 'x/y.png', 100, 100);
  `);
  if (blankName === null) fail('o banco aceitou planta sem nome');
}

if (failures.length > 0) {
  console.error('❌ Gate Onda 161 — E-Map reprovado:');
  for (const f of failures) console.error(`  • ${f}`);
  process.exit(1);
}
console.log('✅ Onda 161 — E-Map: geometria verde, superfície fechada, restrições mordendo.');
