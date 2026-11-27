import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { delimiter, join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const SCRIPT = fileURLToPath(new URL('./check-cron-jobs-commands.mjs', import.meta.url));
const SUITE = fileURLToPath(new URL('../tests/rls/cron-jobs-commands.sql', import.meta.url));

// psql falso: responde ao precheck (-c) e a suite (-f) conforme o cenario e
// registra cada invocacao, para o teste saber se o banco foi consultado.
function psqlFalso(dir, cenario) {
  const arquivo = join(dir, 'psql');
  const roteiro =
    '#!/bin/sh\n' +
    `echo "$@" >> "${join(dir, 'chamadas.log')}"\n` +
    'case "$*" in\n' +
    `  *" -c "*) ${cenario === 'atrasado' ? 'echo f' : 'echo t'} ;;\n` +
    `  *) ${cenario === 'reprova' ? 'echo "ERROR: suite reprovada" >&2; exit 1' : 'echo "suite ok"'} ;;\n` +
    'esac\n';
  writeFileSync(arquivo, roteiro, { mode: 0o755 });
  return arquivo;
}

function rodar(cenario, flags = []) {
  const dir = mkdtempSync(join(tmpdir(), 'psql-falso-'));
  try {
    psqlFalso(dir, cenario);
    const resultado = spawnSync(process.execPath, [SCRIPT, ...flags], {
      encoding: 'utf8',
      env: {
        ...process.env,
        PATH: `${dir}${delimiter}${process.env.PATH ?? ''}`,
        SUPABASE_DB_URL: '',
        DATABASE_URL: '',
      },
    });
    let chamadas = '';
    try {
      chamadas = readFileSync(join(dir, 'chamadas.log'), 'utf8');
    } catch {
      // nenhuma chamada: o psql nunca foi executado
    }
    return { status: resultado.status ?? 1, stdout: resultado.stdout ?? '', chamadas };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test('o guardrail do cron tolera banco atrasado so com a flag do CI', () => {
  assert.equal(rodar('ok').status, 0, 'banco em dia = 0');
  assert.equal(rodar('atrasado').status, 3, 'banco atrasado sem tolerancia = 3');
  assert.equal(rodar('atrasado', ['--tolerar-banco-atrasado']).status, 0, 'tolerado = 0');
  assert.equal(rodar('reprova').status, 1, 'suite reprovada = 1');
  assert.equal(
    rodar('reprova', ['--tolerar-banco-atrasado']).status,
    1,
    'tolerancia nao esconde regressao'
  );
});

test('suite ausente para em exit 2, sem consultar o banco', () => {
  const reserva = `${SUITE}.guarda`;
  const dir = mkdtempSync(join(tmpdir(), 'psql-falso-'));
  try {
    psqlFalso(dir, 'ok');
    renameSync(SUITE, reserva);
    for (const flags of [[], ['--tolerar-banco-atrasado']]) {
      const resultado = spawnSync(process.execPath, [SCRIPT, ...flags], {
        encoding: 'utf8',
        env: {
          ...process.env,
          PATH: `${dir}${delimiter}${process.env.PATH ?? ''}`,
          SUPABASE_DB_URL: '',
          DATABASE_URL: '',
        },
      });
      assert.equal(resultado.status, 2, `suite ausente com ${flags.join(' ') || 'sem flags'} = 2`);
    }
    let chamadas = '';
    try {
      chamadas = readFileSync(join(dir, 'chamadas.log'), 'utf8');
    } catch {
      chamadas = '';
    }
    assert.equal(chamadas, '', 'sem a suite o psql nao pode ser chamado, nem no modo tolerante');
  } finally {
    renameSync(reserva, SUITE);
    rmSync(dir, { recursive: true, force: true });
  }
});

test('tolerar banco atrasado nao esconde psql ausente (exit 2)', () => {
  // Sem a checagem de `process.exitCode === 3` a tolerancia zerava tambem o
  // exit 2 do psql ausente, e um job sem cliente PostgreSQL passava por verde.
  const dir = mkdtempSync(join(tmpdir(), 'sem-psql-'));
  try {
    const resultado = spawnSync(process.execPath, [SCRIPT, '--tolerar-banco-atrasado'], {
      encoding: 'utf8',
      env: { ...process.env, PATH: dir, SUPABASE_DB_URL: '', DATABASE_URL: '' },
    });
    assert.equal(resultado.status, 2);
    assert.match(resultado.stderr, /psql nao encontrado/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
