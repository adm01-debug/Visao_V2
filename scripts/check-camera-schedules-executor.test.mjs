import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { delimiter } from 'node:path';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
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

test('o db:check manual e estrito e o do CI tolera banco atrasado', () => {
  // A migration desta PR so e aplicada em producao depois do merge: exit 3 nao
  // pode travar o merge, mas tambem nao pode virar exit 0 no comando manual —
  // quem opera usa db:check:camera-schedules para saber se a migration chegou.
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  assert.doesNotMatch(
    pkg.scripts['db:check:camera-schedules'],
    /--tolerar-banco-atrasado/,
    'o comando manual precisa ser estrito'
  );
  assert.match(pkg.scripts['db:check:camera-schedules:ci'], /--tolerar-banco-atrasado/);
  assert.match(pkg.scripts['db:check:all'], /npm run db:check:camera-schedules:ci/);
});

const SCRIPT = fileURLToPath(new URL('./check-camera-schedules-executor.mjs', import.meta.url));

/**
 * Roda o guardrail com um `psql` falso que simula o estado do banco.
 *
 * spawnSync, e nao execFileSync: com o stdio em pipe o execFileSync nao entrega o
 * stderr do filho e a matriz de exit codes passaria testando o caminho errado.
 */
function rodarGuardrail(cenario, flags = []) {
  const dir = mkdtempSync(join(tmpdir(), 'psql-falso-'));
  const arquivo = join(dir, 'psql');
  // O guardrail chama o psql duas vezes: precheck (-c ...) e suite (-f ...).
  // atrasado: banco sem a migration; reprova: banco em dia mas a suite levanta
  // erro; ok: tudo certo. Sem separar as duas chamadas o `reprova` pararia no
  // precheck e a matriz passaria sem exercitar a falha da suite.
  const falso =
    '#!/bin/sh\n' +
    'if [ "$1" != "" ]; then url=$1; shift; fi\n' +
    'case "$*" in\n' +
    '  *" -c "*) case "CENARIO" in atrasado) echo f ;; *) echo t ;; esac ;;\n' +
    '  *) case "CENARIO" in\n' +
    '       reprova) echo "Suite reprovada"; echo "ERROR: suite reprovada" >&2; exit 1 ;;\n' +
    '       *) echo "suite ok" ;;\n' +
    '     esac ;;\n' +
    'esac\n';
  const roteiro = falso.replaceAll('CENARIO', cenario);
  writeFileSync(arquivo, roteiro, { mode: 0o755 });
  try {
    const { status } = spawnSync(process.execPath, [SCRIPT, ...flags], {
      encoding: 'utf8',
      env: {
        ...process.env,
        PATH: `${dir}${delimiter}${process.env.PATH ?? ''}`,
        SUPABASE_DB_URL: '',
      },
    });
    return status ?? 1;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test('exit codes do guardrail: banco atrasado, regressao e sucesso', () => {
  assert.equal(rodarGuardrail('atrasado'), 3, 'banco atrasado sem tolerancia = 3');
  assert.equal(rodarGuardrail('atrasado', ['--tolerar-banco-atrasado']), 0, 'tolerado = 0');
  assert.equal(rodarGuardrail('reprova'), 1, 'suite reprovada = 1');
  assert.equal(
    rodarGuardrail('reprova', ['--tolerar-banco-atrasado']),
    1,
    'tolerancia nao esconde regressao'
  );
  assert.equal(rodarGuardrail('ok'), 0, 'banco em dia = 0');
});
