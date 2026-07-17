#!/usr/bin/env node
/**
 * Onda 99 — Simulação: índices INVÁLIDOS (indisvalid=false) e órfãos de CREATE INDEX CONCURRENTLY.
 * Índices inválidos são ignorados pelo planner mas consomem espaço e bloqueiam re-criação.
 */
const scenarios = [];
const kinds = ['invalid', 'not_ready', 'invalid_unique', 'valid'];
const contexts = ['normal_table', 'partitioned_parent', 'partition_child', 'system_table'];
for (const k of kinds) {
  for (const c of contexts) {
    for (const size of ['small', 'medium', 'large', 'huge']) {
      for (const age of ['minutes', 'hours', 'days', 'weeks']) {
        scenarios.push({ kind: k, context: c, size, age });
      }
    }
  }
}
const critical = scenarios.filter(s =>
  (s.kind === 'invalid' || s.kind === 'invalid_unique') &&
  s.context !== 'system_table' &&
  (s.age === 'days' || s.age === 'weeks')
).length;
console.log(`Cenários simulados: ${scenarios.length}`);
console.log(`Críticos (invalid + antigos + user table): ${critical}`);
console.log('Regras: ignorar system_table; unique inválido = crítico imediato; sugerir REINDEX CONCURRENTLY ou DROP.');
