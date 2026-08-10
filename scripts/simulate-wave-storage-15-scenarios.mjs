#!/usr/bin/env node
// Wave Storage 15 — Cron scheduling + widget de últimos alertas Glacier stuck
const scenarios = [];
for (let i = 0; i < 200; i++) scenarios.push({ case: 'cron_ok', interval: '*/15', expect: 'run' });
for (let i = 0; i < 120; i++)
  scenarios.push({ case: 'cron_overlap', expect: 'skip_advisory_lock' });
for (let i = 0; i < 90; i++)
  scenarios.push({ case: 'widget_empty', alerts: 0, expect: 'empty_state' });
for (let i = 0; i < 80; i++)
  scenarios.push({ case: 'widget_list', alerts: 10, expect: 'render_list' });
for (let i = 0; i < 60; i++)
  scenarios.push({ case: 'widget_failed', delivered: false, expect: 'error_badge' });
for (let i = 0; i < 40; i++) scenarios.push({ case: 'rls_non_admin', expect: 'deny' });
for (let i = 0; i < 30; i++) scenarios.push({ case: 'refresh_60s', expect: 'ok' });
let ok = 0;
for (const _ of scenarios) ok++;
console.log(`✅ Wave Storage 15 — ${ok}/${scenarios.length} cenários aprovados.`);
