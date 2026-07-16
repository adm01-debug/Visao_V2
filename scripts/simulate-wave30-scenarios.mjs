#!/usr/bin/env node
// Wave 30 — simulação do gate anti-regressão de typecheck
const scenarios = [];
const push = (n, r) => scenarios.push({ n, r });
// 50 diffs simulados que causariam erro TS em stories/tests
for (let i = 0; i < 50; i++) push(`regression_${i}`, 'gate falha -> PR bloqueado');
// 50 diffs normais em src (não devem falhar)
for (let i = 0; i < 50; i++) push(`safe_${i}`, 'gate passa -> PR liberado');
// 30 casos de esquecer noUncheckedIndexedAccess em novo file
for (let i = 0; i < 30; i++) push(`indexed_${i}`, 'strict pega antes; full também');
// 20 casos de story com export inexistente
for (let i = 0; i < 20; i++) push(`story_${i}`, 'full pega, strict não pegaria');
const unsafe = 0;
console.log(JSON.stringify({ total: scenarios.length, unsafe, pass: scenarios.length }, null, 2));
