#!/usr/bin/env node
// Wave 31 — simulação de cenários do migration lint
import { writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const scenarios = [];
const push = (n, sql, expectFail) => scenarios.push({ n, sql, expectFail });

// R1: tabela sem RLS
push('R1_missing_rls', `
CREATE TABLE public.foo (id uuid PRIMARY KEY);
GRANT SELECT ON public.foo TO authenticated;
`, true);

// R2: sem GRANT
push('R2_missing_grant', `
CREATE TABLE public.foo (id uuid PRIMARY KEY);
ALTER TABLE public.foo ENABLE ROW LEVEL SECURITY;
`, true);

// R3: SECURITY DEFINER sem search_path
push('R3_definer_no_path', `
CREATE FUNCTION public.f() RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$ BEGIN NULL; END; $$;
`, true);

// R5: GRANT TO PUBLIC
push('R5_grant_public', `
CREATE TABLE public.foo (id uuid PRIMARY KEY);
ALTER TABLE public.foo ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.foo TO authenticated;
GRANT SELECT ON public.foo TO PUBLIC;
`, true);

// OK: tabela com tudo
push('OK_full', `
CREATE TABLE public.foo (id uuid PRIMARY KEY);
GRANT SELECT ON public.foo TO authenticated;
ALTER TABLE public.foo ENABLE ROW LEVEL SECURITY;
CREATE POLICY p ON public.foo FOR SELECT TO authenticated USING (true);
`, false);

// OK: função SECURITY DEFINER com search_path
push('OK_definer', `
CREATE FUNCTION public.f() RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$ BEGIN NULL; END; $$;
`, false);

// 100 fuzz OK
for (let i = 0; i < 100; i++) {
  push(`fuzz_ok_${i}`, `
CREATE TABLE public.t_${i} (id uuid PRIMARY KEY);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.t_${i} TO authenticated;
GRANT ALL ON public.t_${i} TO service_role;
ALTER TABLE public.t_${i} ENABLE ROW LEVEL SECURITY;
`, false);
}

const root = mkdtempSync(join(tmpdir(), 'w31-'));
const migDir = join(root, 'supabase', 'migrations');
execSync(`mkdir -p ${migDir}`);
execSync(`cp scripts/lint-migrations.mjs ${root}/lint.mjs`);

let pass = 0, unsafe = 0;
for (const s of scenarios) {
  execSync(`rm -f ${migDir}/*.sql`);
  const fname = `20260716_${s.n}.sql`;
  writeFileSync(join(migDir, fname), s.sql);
  let failed = false;
  try {
    execSync(`node ${root}/lint.mjs`, { cwd: root, stdio: 'pipe' });
  } catch { failed = true; }
  if (failed === s.expectFail) pass++;
  else unsafe++;
}

rmSync(root, { recursive: true, force: true });
console.log(JSON.stringify({ total: scenarios.length, pass, unsafe }, null, 2));
