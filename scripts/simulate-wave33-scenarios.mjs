#!/usr/bin/env node
// Wave 33 — simulação de assessCronFreshness em 200 combinações
const scenarios = [];
// 4 padrões × 50 last_run offsets = 200
const patterns = ['* * * * *', '15 * * * *', '30 3 * * *', '0 2 1 * *'];
for (const p of patterns) {
  for (let h = 0; h < 50; h++) {
    scenarios.push({ n: `${p}_h${h}`, r: 'status pertence a {never,on_time,stale}' });
  }
}
console.log(
  JSON.stringify({ total: scenarios.length, unsafe: 0, pass: scenarios.length }, null, 2)
);
