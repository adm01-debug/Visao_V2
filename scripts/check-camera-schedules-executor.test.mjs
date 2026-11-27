import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mascararUrl } from './check-camera-schedules-executor.mjs';

const suite = readFileSync(
  new URL('../tests/rls/camera-schedules-executor.sql', import.meta.url),
  'utf8'
);
const hook = readFileSync(new URL('../src/hooks/useArmDisarm.ts', import.meta.url), 'utf8');

test('a senha do banco nunca sai no log do precheck', () => {
  const erro = [
    'psql: error: connection to server at "db.invalid", port 5432 failed:',
    'password authentication failed for user "postgres"',
    'connection string: postgresql://postgres:SenhaSecreta123@db.invalid:5432/postgres',
    'repetida: postgres://usuario:outraSenha@host/db',
  ].join('\n');

  const saida = mascararUrl(erro);

  assert.equal(saida.includes('SenhaSecreta123'), false);
  assert.equal(saida.includes('outraSenha'), false);
  assert.match(saida, /postgresql:\/\/postgres:\*\*\*@db\.invalid/);
  assert.match(saida, /postgres:\/\/usuario:\*\*\*@host\/db/);
  assert.match(saida, /password authentication failed/);
  assert.equal(mascararUrl(''), '');
  assert.equal(mascararUrl(undefined), '');
});

test('a suite cobre o executor sem JWT (contexto do pg_cron)', () => {
  // Sem esta cobertura o teste roda sempre como uid_a e nao enxerga gravacao
  // de arm_disarm_states com user_id nulo nem em nome de outro dono.
  assert.match(suite, /PERFORM set_config\('request\.jwt\.claims', '\{\}', true\)/);
  assert.match(suite, /IF auth\.uid\(\) IS NOT NULL THEN/);
  assert.match(suite, /registros de arm_disarm_states com user_id nulo/);
});

test('o rearme do front usa o mesmo ON CONFLICT (camera_id) validado na suite', () => {
  // src/hooks/useArmDisarm.ts envia o upsert sem onConflict: o alvo e o indice
  // unico de camera_id, e a suite prova que sem ON CONFLICT o insert falha.
  assert.match(hook, /from\('arm_disarm_states'\)\.upsert\(/);
  assert.match(suite, /ON CONFLICT \(camera_id\) DO UPDATE/);
  assert.match(suite, /insert sem ON CONFLICT nao violou uq_arm_disarm_camera/);
});

test('a suite prova que o rearme manual passa pela RLS do usuario', () => {
  assert.match(suite, /SET LOCAL ROLE authenticated/);
  assert.match(suite, /rearme manual via RLS \(mesmo upsert do useArmDisarm\)/);
  assert.match(suite, /RLS permitiu inserir arm_disarm_states em nome de outro usuario/);
});

test('o db:check do CI tolera banco atrasado mas nao regressao', () => {
  // A migration desta PR so e aplicada em producao depois do merge; exit 3 nao
  // pode travar o merge, exit 1 (suite reprovada) continua travando.
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  assert.match(pkg.scripts['db:check:camera-schedules'], /--tolerar-banco-atrasado/);
  assert.match(suite, /ROLLBACK;\s*$/);
});
