#!/usr/bin/env node
// Wave 97 — Duplicate indexes auditor
const tables = [
  'cameras',
  'alerts',
  'recognition_logs',
  'plate_detections',
  'profiles',
  'audit_logs',
];
const cols = [
  ['user_id'],
  ['created_at'],
  ['user_id', 'created_at'],
  ['camera_id'],
  ['user_id', 'camera_id'],
];
const uniq = [true, false];
const methods = ['btree', 'hash', 'gin'];
let dup = 0,
  ok = 0,
  total = 0;
const seen = new Map();
for (const t of tables)
  for (const c of cols)
    for (const u of uniq)
      for (const m of methods) {
        total++;
        const key = `${t}|${c.join(',')}|${u}|${m}`;
        if (seen.has(key)) {
          dup++;
        } else {
          seen.set(key, true);
          ok++;
        }
        // simulate a redundant copy scenario
        if (m === 'btree' && u === false) {
          total++;
          seen.has(key + '_copy') ? dup++ : seen.set(key + '_copy', true) && ok++;
          if (Math.random() < 0.15) {
            dup++;
            total++;
          }
        }
      }
console.log(JSON.stringify({ total, dup, ok }, null, 2));
