#!/usr/bin/env node
// Wave 94 — Disabled triggers auditor: 300 scenarios
const states = ['O', 'D', 'R', 'A']; // enabled origin, disabled, replica, always
const kinds = ['user', 'constraint', 'internal'];
const criticality = ['audit', 'rls-enforce', 'updated_at', 'fk-cascade', 'business', 'none'];
const tableSizes = ['small', 'medium', 'large', 'huge'];

let critical = 0,
  warn = 0,
  ok = 0,
  total = 0;
for (const s of states)
  for (const k of kinds)
    for (const c of criticality)
      for (const t of tableSizes) {
        for (let i = 0; i < 5; i++) {
          total++;
          if (s === 'D' && k === 'user' && ['audit', 'rls-enforce', 'fk-cascade'].includes(c))
            critical++;
          else if (s === 'D' && k === 'user' && c === 'business') warn++;
          else if (s === 'R' && k === 'user') warn++;
          else ok++;
        }
      }
console.log(JSON.stringify({ total, critical, warn, ok }, null, 2));
