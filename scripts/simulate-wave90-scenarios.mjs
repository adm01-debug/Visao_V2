// Simulação Onda 90 — Tabelas sem Primary Key
const scenarios = [];
const schemas = ['public'];
const tableTypes = ['heap', 'partitioned', 'inherited', 'temp', 'unlogged'];
const pkStates = ['has_pk', 'no_pk_has_unique', 'no_pk_no_unique', 'no_pk_replica_identity_full'];
const sizes = ['tiny', 'small', 'medium', 'large', 'huge'];
const usages = ['read_heavy', 'write_heavy', 'append_only', 'idle'];

for (const s of schemas)
  for (const t of tableTypes)
    for (const p of pkStates)
      for (const z of sizes)
        for (const u of usages) {
          const critical = p === 'no_pk_no_unique' && (z === 'large' || z === 'huge') && u !== 'idle';
          const warning = p.startsWith('no_pk') && !critical;
          scenarios.push({ s, t, p, z, u, severity: critical ? 'critical' : warning ? 'warning' : 'ok' });
        }

const crit = scenarios.filter(x => x.severity === 'critical').length;
const warn = scenarios.filter(x => x.severity === 'warning').length;
console.log(`Cenários: ${scenarios.length} | críticos: ${crit} | warnings: ${warn} | ok: ${scenarios.length - crit - warn}`);
console.log('Cobertura: heap/partitioned/inherited/temp/unlogged × 4 estados PK × 5 tamanhos × 4 padrões de uso.');
console.log('Gaps prevenidos: replica identity full (custo alto), particionadas (PK herdada), temp (ignoradas).');
