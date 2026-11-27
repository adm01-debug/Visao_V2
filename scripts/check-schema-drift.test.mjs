import test from 'node:test';
import assert from 'node:assert/strict';
import { avaliar, SQL_DEFINER_SEM_PATH, SQL_DEFINER_PERDIDO } from './check-schema-drift.mjs';

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
  assert.match(SQL_DEFINER_PERDIDO, /\$1::text\[\]/);
  assert.doesNotMatch(SQL_DEFINER_PERDIDO, /ARRAY\[/);
});

test('a query de search_path so olha funcoes SECURITY DEFINER do public', () => {
  assert.match(SQL_DEFINER_SEM_PATH, /p\.prosecdef/);
  assert.match(SQL_DEFINER_SEM_PATH, /n\.nspname = 'public'/);
});
