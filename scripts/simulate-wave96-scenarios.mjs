#!/usr/bin/env node
// Wave 96 — SECURITY DEFINER search_path auditor
const secTypes = ['definer', 'invoker'];
const paths = ['public', 'public,pg_catalog', '', '$user,public', 'pg_temp'];
const langs = ['plpgsql', 'sql', 'plpython3u', 'c'];
const schemas = ['public', 'extensions', 'auth', 'storage'];
let critical = 0,
  warn = 0,
  ok = 0,
  total = 0;
for (const s of secTypes)
  for (const p of paths)
    for (const l of langs)
      for (const sc of schemas) {
        total++;
        if (s === 'invoker') {
          ok++;
          continue;
        }
        if (sc !== 'public') {
          ok++;
          continue;
        }
        if (p === '' || p === '$user,public' || p === 'pg_temp') critical++;
        else if (!p.includes('pg_catalog')) warn++;
        else ok++;
      }
console.log(JSON.stringify({ total, critical, warn, ok }, null, 2));
