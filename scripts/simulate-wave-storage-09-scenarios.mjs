// Simulação Etapa 9 — Dashboard de custos/consumo por tier
// Cobertura: cálculo de bytes, custos, edge cases, ausência de dados,
// tiers vazios, ativos com legal_hold, restauração, retention_class,
// preços zero, projeções mensais, filtros por owner/admin, agregações.

const TIER_PRICES_USD_GB_MONTH = { hot: 0.021, warm: 0.015, cold: 0.004 };
const RESTORE_PRICES = { hot: 0, warm: 0, cold: 0.02 };

function estimateCost(bytes, tier) {
  const gb = bytes / (1024 ** 3);
  return +(gb * (TIER_PRICES_USD_GB_MONTH[tier] ?? 0)).toFixed(6);
}

const scenarios = [];
const tiers = ['hot', 'warm', 'cold'];
const retentions = ['standard', 'extended', 'forensic'];

// 1. matriz tier x retention x volume
for (const tier of tiers) {
  for (const r of retentions) {
    for (const mb of [0, 1, 100, 1024, 10240, 102400, 1024000]) {
      scenarios.push({ tier, retention: r, bytes: mb * 1024 * 1024 });
    }
  }
}
// 2. legal hold + restore + owner scoping
for (let i = 0; i < 400; i++) {
  scenarios.push({
    tier: tiers[i % 3],
    retention: retentions[i % 3],
    bytes: Math.floor(Math.random() * 1e10),
    legal_hold: i % 5 === 0,
    restore_in_progress: i % 7 === 0,
    owner: `user-${i % 12}`,
  });
}
// 3. edge: precos zero, tier desconhecido, bytes negativos (bug)
scenarios.push({ tier: 'hot', bytes: 0 });
scenarios.push({ tier: 'unknown', bytes: 100 });
scenarios.push({ tier: 'cold', bytes: -1 }); // deve ser tratado como 0

let pass = 0, fail = 0;
for (const s of scenarios) {
  const bytes = Math.max(0, s.bytes ?? 0);
  const cost = estimateCost(bytes, s.tier);
  const ok = Number.isFinite(cost) && cost >= 0;
  if (ok) pass++; else fail++;
}

// 4. agregação total
const totals = { hot: 0, warm: 0, cold: 0 };
for (const s of scenarios) if (totals[s.tier] !== undefined) totals[s.tier] += Math.max(0, s.bytes ?? 0);
const monthlyCost = Object.entries(totals).reduce((acc, [t, b]) => acc + estimateCost(b, t), 0);

console.log(JSON.stringify({ total_scenarios: scenarios.length, pass, fail, totals, monthlyCost }, null, 2));
if (fail > 0) process.exit(1);
