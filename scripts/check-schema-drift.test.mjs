import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  avaliar,
  SQL_DEFINER_SEM_PATH,
  SQL_DEFINER_PERDIDO,
  SQL_FUNCAO_AUSENTE,
} from './check-schema-drift.mjs';

test('sem achados nao reporta problema', () => {
  assert.deepEqual(avaliar({ definersSemPath: [], definersPerdidos: [] }), []);
});

test('SECURITY DEFINER sem search_path e reportado', () => {
  const r = avaliar({ definersSemPath: ['public.foo'], definersPerdidos: [] });
  assert.equal(r.length, 1);
  assert.match(r[0], /search_path/);
  assert.match(r[0], /public\.foo/);
});

test('definer perdido em producao e reportado — regressao do incidente evaluate_and_restart_streams', () => {
  const r = avaliar({
    definersSemPath: [],
    definersPerdidos: ['public.evaluate_and_restart_streams'],
  });
  assert.equal(r.length, 1);
  assert.match(r[0], /perdido/);
});

test('as duas checagens somam', () => {
  const r = avaliar({ definersSemPath: ['public.a'], definersPerdidos: ['public.b'] });
  assert.equal(r.length, 2);
});

test('a query de definer perdido recebe a lista por parametro, sem concatenar SQL', () => {
  // Lista vem como literal do psql (\set), nunca como parametro posicional: `-c` nao interpola.
  assert.match(SQL_DEFINER_PERDIDO, /ANY\(string_to_array\(:'nomes', ','\)\)/);
  assert.doesNotMatch(SQL_DEFINER_PERDIDO, /\$1/);
  assert.doesNotMatch(SQL_DEFINER_PERDIDO, /ARRAY\[/);
});

test('a query de search_path so olha funcoes SECURITY DEFINER do public', () => {
  assert.match(SQL_DEFINER_SEM_PATH, /p\.prosecdef/);
  assert.match(SQL_DEFINER_SEM_PATH, /n\.nspname = 'public'/);
});

test('funcao ausente no banco e reportada — caso mcp_exec/mcp_exec_many', () => {
  const p = avaliar({ definersSemPath: [], definersPerdidos: [], ausentes: ['mcp_exec'] });
  assert.equal(p.length, 1);
  assert.match(p[0], /funcao declarada no historico e ausente no banco: mcp_exec/);
});

test('a query de funcao ausente parte da lista esperada, nao do catalogo', () => {
  assert.match(SQL_FUNCAO_AUSENTE, /unnest\(string_to_array\(:'nomes'/);
  assert.doesNotMatch(SQL_FUNCAO_AUSENTE, /\$1/);
});

test('o metacomando do psql mantem a barra: o prettier nao pode consumir', async () => {
  const src = readFileSync(new URL('./check-schema-drift.mjs', import.meta.url), 'utf8');
  // A barra escrita dentro do template literal e removida pelo formatador; por
  // isso ela vem de String.fromCharCode(92). Sem isso o psql recebe SQL invalido.
  assert.match(src, /String\.fromCharCode\(92\)/);
  assert.doesNotMatch(src, /`\\set /);
});

test('o psql recebe o metacomando com barra e as duas checagens na mesma chamada', (t) => {
  // Comportamento observavel: psql falso no PATH grava o stdin recebido. A lista
  // real (scripts/definer-esperados.json) e usada de proposito — e o arquivo que
  // o script le de verdade, entao o teste nao depende de fixture no cwd.
  const dir = mkdtempSync(join(tmpdir(), 'drift-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const bin = join(dir, 'psql');
  const captura = join(dir, 'stdin.txt');
  writeFileSync(bin, `#!/bin/sh\ncat > "${captura}"\necho ""\n`, { mode: 0o755 });

  const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
  const { status, stdout } = spawnSync(process.execPath, ['scripts/check-schema-drift.mjs'], {
    cwd: raiz,
    env: { ...process.env, PATH: `${dir}${delimiter}${process.env.PATH}`, DATABASE_URL: '' },
    encoding: 'utf8',
  });

  assert.equal(status, 0, stdout);
  const stdin = readFileSync(captura, 'utf8');
  assert.match(stdin, /^\\set nomes '\S+'/, 'a barra precisa chegar ao psql');
  assert.doesNotMatch(stdin, /^set nomes/, 'sem a barra o psql recusa com erro de sintaxe');
  // As duas checagens que dependem da lista vao na mesma ida ao banco; se uma
  // delas ficar de fora, o nome do prefixo correspondente nao aparece.
  assert.match(stdin, /'p:' \|\| p FROM/, 'falta a checagem de definer perdido');
  assert.match(stdin, /'a:' \|\| a FROM/, 'falta a checagem de funcao ausente');
});

test('o gate separa os achados pelos prefixos p: e a:', (t) => {
  // psql falso que devolve uma linha de cada braco: o gate precisa repassar as
  // duas mensagens e sair 1, senao um braco mudo esconderia o outro.
  const dir = mkdtempSync(join(tmpdir(), 'drift-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const bin = join(dir, 'psql');
  // So a chamada que leva a lista responde; as demais saem vazias, como o
  // catalogo limpo faria — senao as linhas vazariam para a checagem de
  // search_path, que nao usa prefixo.
  const corpo =
    '#!/bin/sh\nin=$(cat); case "$in" in *"set n"*) printf "p:public.arb\\na:mcp_exec\\n";; esac\n';
  writeFileSync(bin, corpo, { mode: 0o755 });

  const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
  const { status, stderr } = spawnSync(process.execPath, ['scripts/check-schema-drift.mjs'], {
    cwd: raiz,
    env: { ...process.env, PATH: `${dir}${delimiter}${process.env.PATH}`, DATABASE_URL: '' },
    encoding: 'utf8',
  });

  assert.equal(status, 1);
  assert.match(stderr, /SECURITY DEFINER perdido em producao: public\.arb/);
  assert.match(stderr, /funcao declarada no historico e ausente no banco: mcp_exec/);
});

// Um unico achado de cada tipo reprova sozinho: se o gate voltasse a exigir os
// dois bracos juntos, o gate ficaria cego para o caso real de um so problema.
for (const [rotulo, linha, esperado, ausente] of [
  [
    'definer perdido',
    'p:public.arb',
    /SECURITY DEFINER perdido em producao: public\.arb/,
    /funcao declarada no historico/,
  ],
  [
    'funcao ausente',
    'a:mcp_exec',
    /funcao declarada no historico e ausente no banco: mcp_exec/,
    /SECURITY DEFINER perdido em producao/,
  ],
]) {
  test(`o gate reprova so com ${rotulo}`, (t) => {
    const dir = mkdtempSync(join(tmpdir(), 'drift-'));
    t.after(() => rmSync(dir, { recursive: true, force: true }));
    const bin = join(dir, 'psql');
    writeFileSync(
      bin,
      '#!/bin/sh\nin=$(cat); case "$in" in *"set n"*) printf "' + linha + '\\n";; esac\n',
      { mode: 0o755 }
    );

    const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
    const { status, stderr } = spawnSync(process.execPath, ['scripts/check-schema-drift.mjs'], {
      cwd: raiz,
      env: { ...process.env, PATH: `${dir}${delimiter}${process.env.PATH}`, DATABASE_URL: '' },
      encoding: 'utf8',
    });

    assert.equal(status, 1);
    assert.match(stderr, esperado);
    assert.doesNotMatch(stderr, ausente);
  });
}
