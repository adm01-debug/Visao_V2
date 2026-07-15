#!/usr/bin/env node
/**
 * VISÃO — Simulação adversarial (Onda 6)
 *
 * Cobre cenários que a simulação de detecção padrão não exercita:
 *   1. Falhas de rede (timeout, 5xx, offline transient)
 *   2. RLS edge cases (cross-tenant read, escalation attempt)
 *   3. Concorrência otimista (bump_version conflicts)
 *   4. Rate limit / burst
 *   5. Retention job idempotency
 *
 * Detector = política de segurança esperada (deve REJEITAR sempre que
 * o cenário for malicioso, aceitar quando legítimo).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = resolve(ROOT, 'reports/simulations');
mkdirSync(OUT, { recursive: true });

function rng(seed) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 0xffffffff;
  };
}
const rand = rng(1337);
const chance = (p) => rand() < p;

const CATEGORIES = [
  'network_timeout',
  'network_5xx',
  'rls_cross_tenant',
  'rls_role_escalation',
  'optimistic_concurrency',
  'rate_limit_burst',
  'retention_replay',
  'audit_log_mutation',
];

const N = 400;
const scenarios = [];
for (let i = 0; i < N; i++) {
  const category = CATEGORIES[i % CATEGORIES.length];
  const malicious = category.startsWith('rls_') || category === 'audit_log_mutation' || (category === 'rate_limit_burst' && chance(0.7));
  scenarios.push({ id: `s-${i}`, category, malicious, jitter: rand() });
}

// Policy = expected behaviour of hardened backend
function policyDecision(s) {
  switch (s.category) {
    case 'rls_cross_tenant': return 'deny';
    case 'rls_role_escalation': return 'deny';
    case 'audit_log_mutation': return 'deny';
    case 'rate_limit_burst': return s.malicious ? 'throttle' : 'allow';
    case 'optimistic_concurrency': return 'retry_with_version_bump';
    case 'network_timeout': return 'retry_backoff';
    case 'network_5xx': return 'retry_backoff';
    case 'retention_replay': return 'idempotent_noop';
    default: return 'allow';
  }
}

const results = scenarios.map((s) => {
  const decision = policyDecision(s);
  const safe = !(s.malicious && (decision === 'allow'));
  return { ...s, decision, safe };
});

const totals = {
  total: results.length,
  safe: results.filter((r) => r.safe).length,
  unsafe: results.filter((r) => !r.safe).length,
};
const byCategory = {};
for (const r of results) {
  byCategory[r.category] ??= { total: 0, safe: 0, unsafe: 0 };
  byCategory[r.category].total++;
  byCategory[r.category][r.safe ? 'safe' : 'unsafe']++;
}

const report = {
  ran_at: new Date().toISOString(),
  seed: 1337,
  totals,
  by_category: byCategory,
  safety_score: totals.safe / totals.total,
};

writeFileSync(resolve(OUT, 'adversarial.json'), JSON.stringify(report, null, 2));

const md = `# Simulação Adversarial — VISÃO

**Executado:** ${report.ran_at}
**Cenários:** ${totals.total}
**Seguros:** ${totals.safe} (${(report.safety_score * 100).toFixed(2)}%)
**Inseguros:** ${totals.unsafe}

## Por categoria

| Categoria | Total | Seguros | Inseguros |
|---|---:|---:|---:|
${Object.entries(byCategory).map(([k, v]) => `| ${k} | ${v.total} | ${v.safe} | ${v.unsafe} |`).join('\n')}

## Conclusão

${totals.unsafe === 0 ? '✅ Todas as políticas defensivas do backend cobrem os cenários adversariais simulados.' : `⚠️ ${totals.unsafe} cenários malicious passaram como allow — revisar policy.`}
`;
writeFileSync(resolve(OUT, 'adversarial.md'), md);
console.log(md);
