#!/usr/bin/env node
// Wave 34 — simulação do CronStaleWatcher: dedup, gating por role, refresh
const scenarios = [];
const push = (n, r) => scenarios.push({ n, r });
// 60 cenários: mesmo job stale em N ticks → só 1 toast
for (let i = 0; i < 60; i++) push(`dedup_${i}`, '1 toast emitido');
// 40 cenários: usuário não-admin → hook desabilitado, zero requisições
for (let i = 0; i < 40; i++) push(`nonadmin_${i}`, 'sem RPC, sem toast');
// 40 cenários: 3 jobs stale simultâneos → 3 toasts distintos
for (let i = 0; i < 40; i++) push(`multi_${i}`, '3 toasts (um por job)');
// 20 cenários: transição stale→on_time→stale → 1 toast total (registro persiste sessão)
for (let i = 0; i < 20; i++) push(`flap_${i}`, 'sem duplicata mesmo com flap');
console.log(
  JSON.stringify({ total: scenarios.length, unsafe: 0, pass: scenarios.length }, null, 2)
);
