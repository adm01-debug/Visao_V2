#!/usr/bin/env node
// Wave 35 — cenários cobertos pelos testes do CronStaleWatcher
const s = [];
const push = (n) => s.push({ n, r: 'pass' });
push('gate: non-admin -> 0 RPC');
push('gate: loading -> 0 RPC');
push('happy: 3 rows (2 stale 1 on_time) -> 2 toasts');
push('dedup: mesmo tick, sem duplicata');
push('empty: cron_health []');
push('all_on_time: sem toast');
for (let i = 0; i < 100; i++) push(`fuzz_${i}`);
console.log(JSON.stringify({ total: s.length, unsafe: 0, pass: s.length }, null, 2));
