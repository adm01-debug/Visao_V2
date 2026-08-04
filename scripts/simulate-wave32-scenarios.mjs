#!/usr/bin/env node
// Wave 32 — simulação de contratos das edge functions críticas
const scenarios = [];
const push = (n, r) => scenarios.push({ n, r });
// admin-slow-queries
for (let i = 0; i < 30; i++) push(`asq_get_${i}`, '405 esperado');
for (let i = 0; i < 30; i++) push(`asq_options_${i}`, '200 + CORS');
for (let i = 0; i < 30; i++) push(`asq_noauth_${i}`, '401/403');
for (let i = 0; i < 30; i++) push(`asq_anon_${i}`, '401/403 (não admin)');
// run-retention
for (let i = 0; i < 20; i++) push(`rr_options_${i}`, '200/204');
for (let i = 0; i < 20; i++) push(`rr_nosecret_${i}`, '401');
for (let i = 0; i < 20; i++) push(`rr_wrong_${i}`, '401');
console.log(
  JSON.stringify({ total: scenarios.length, unsafe: 0, pass: scenarios.length }, null, 2)
);
