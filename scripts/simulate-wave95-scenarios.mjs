#!/usr/bin/env node
// Wave 95 — Permissive RLS auditor: enumerate scenarios
const cmds = ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'ALL'];
const usings = [
  'true',
  'auth.uid() = user_id',
  'has_role(uid,admin)',
  '(auth.role()=authenticated)',
  'NULL',
];
const roles = ['public', 'anon', 'authenticated', 'service_role'];
const sensitive = [
  'profiles',
  'user_roles',
  'audit_logs',
  'cameras',
  'alerts',
  'csp_violation_reports',
];
let critical = 0,
  warn = 0,
  ok = 0,
  total = 0;
for (const c of cmds)
  for (const u of usings)
    for (const r of roles)
      for (const t of sensitive) {
        total++;
        const isReadOrAll = c === 'SELECT' || c === 'ALL';
        if (u === 'true' && (r === 'anon' || r === 'public') && isReadOrAll) critical++;
        else if (
          u === 'true' &&
          r === 'authenticated' &&
          isReadOrAll &&
          ['user_roles', 'audit_logs', 'csp_violation_reports'].includes(t)
        )
          critical++;
        else if (u === 'true' && r === 'authenticated' && isReadOrAll) warn++;
        else if (u === 'NULL' && c !== 'SELECT') warn++;
        else ok++;
      }
console.log(JSON.stringify({ total, critical, warn, ok }, null, 2));
