import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
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

  test('funcao ausente no banco e reportada — caso mcp_exec/mcp_exec_many', () => {
    const p = avaliar({ definersSemPath: [], definersPerdidos: [], ausentes: ['mcp_exec'] });
    assert.equal(p.length, 1);
    assert.match(p[0], /funcao declarada no historico e ausente no banco: mcp_exec/);
  });

  test('a query de funcao ausente parte da lista esperada, nao do catalogo', () => {
    assert.match(SQL_FUNCAO_AUSENTE, /unnest\(string_to_array\(:'nomes'/);
    assert.doesNotMatch(SQL_FUNCAO_AUSENTE, /\$1/);
  });
});

test('o metacomando do psql mantem a barra: o prettier nao pode consumir', async () => {
  const src = readFileSync(new URL('./check-schema-drift.mjs', import.meta.url), 'utf8');
  // A barra escrita dentro do template literal e removida pelo formatador; por
  // isso ela vem de String.fromCharCode(92). Sem isso o psql recebe SQL invalido.
  assert.match(src, /String\.fromCharCode\(92\)/);
  assert.doesNotMatch(src, /`\\set /);
});
