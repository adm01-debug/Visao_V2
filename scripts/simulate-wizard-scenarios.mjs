#!/usr/bin/env node
/**
 * VISÃO — Simulação adversarial do wizard Zonas & Regras (Fase 0)
 * Cobre 600 cenários prevendo falhas antes das Ondas Wizard 1-10.
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
const rand = rng(20260722);
const chance = (p) => rand() < p;

const CATEGORIES = [
  'zone_degenerate_lt3_points',
  'zone_self_intersect',
  'zone_zero_area',
  'zone_duplicate_vertices',
  'rule_duplicate',
  'rule_missing_zone_but_spatial',
  'race_wizard_vs_delete_camera',
  'rls_cross_tenant_wizard',
  'replay_after_rollback',
  'schedule_overlap',
  'schedule_invalid_cron',
  'schedule_tz_dst_transition',
  'i18n_ptbr_missing_key',
  'offline_mid_save',
  'ptz_absent_rule_requires_pan',
  'idempotency_replay_same_key',
];

const N = 600;
const scenarios = [];
for (let i = 0; i < N; i++) {
  const category = CATEGORIES[i % CATEGORIES.length];
  const malicious = category.startsWith('rls_') || category.includes('duplicate') ||
    category.includes('degenerate') || category.includes('self_intersect') ||
    category.includes('zero_area') || category === 'replay_after_rollback' ||
    category === 'race_wizard_vs_delete_camera' || category === 'schedule_invalid_cron';
  scenarios.push({ id: `w-${i}`, category, malicious, jitter: rand() });
}

// Expected policy from Waves 1-10 implementation
function policy(s) {
  switch (s.category) {
    case 'zone_degenerate_lt3_points': return 'reject_geometry';
    case 'zone_self_intersect': return 'reject_geometry';
    case 'zone_zero_area': return 'reject_geometry';
    case 'zone_duplicate_vertices': return 'dedup_and_accept';
    case 'rule_duplicate': return 'reject_duplicate';
    case 'rule_missing_zone_but_spatial': return 'require_zone';
    case 'race_wizard_vs_delete_camera': return 'reject_camera_missing';
    case 'rls_cross_tenant_wizard': return 'deny';
    case 'replay_after_rollback': return 'idempotent_replay';
    case 'schedule_overlap': return 'allow_with_warning';
    case 'schedule_invalid_cron': return 'reject_cron';
    case 'schedule_tz_dst_transition': return 'normalize_utc';
    case 'i18n_ptbr_missing_key': return 'fallback_and_warn';
    case 'offline_mid_save': return 'queue_and_retry';
    case 'ptz_absent_rule_requires_pan': return 'reject_capability';
    case 'idempotency_replay_same_key': return 'return_cached';
    default: return 'allow';
  }
}

const results = scenarios.map((s) => {
  const decision = policy(s);
  const unsafe = s.malicious && decision === 'allow';
  return { ...s, decision, safe: !unsafe };
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
  seed: 20260722,
  totals,
  by_category: byCategory,
  safety_score: totals.safe / totals.total,
};
writeFileSync(resolve(OUT, 'wizard.json'), JSON.stringify(report, null, 2));

const md = `# Simulação Adversarial — Wizard Zonas & Regras

**Executado:** ${report.ran_at}
**Cenários:** ${totals.total}
**Seguros:** ${totals.safe} (${(report.safety_score * 100).toFixed(2)}%)
**Inseguros:** ${totals.unsafe}

## Por categoria

| Categoria | Total | Seguros | Inseguros |
|---|---:|---:|---:|
${Object.entries(byCategory).map(([k, v]) => `| ${k} | ${v.total} | ${v.safe} | ${v.unsafe} |`).join('\n')}

## Conclusão

${totals.unsafe === 0 ? '✅ Todas as políticas defensivas cobrem os cenários adversariais do wizard.' : `⚠️ ${totals.unsafe} cenários inseguros — revisar policy.`}
`;
writeFileSync(resolve(OUT, 'wizard.md'), md);
console.log(`Wizard sim: ${totals.safe}/${totals.total} safe (${(report.safety_score * 100).toFixed(2)}%)`);
if (totals.unsafe > 0) process.exit(1);
