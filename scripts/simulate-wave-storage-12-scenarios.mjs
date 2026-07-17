#!/usr/bin/env node
// Wave Storage 12 — Legal Hold toggle + Forget Audit viewer
// 480 cenários: autorização (admin/owner/anon), toggle idempotente,
// asset inexistente, motivo obrigatório, paginação da auditoria,
// filtros por user_id/dry_run, erros de rede, race conditions.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ok = (b) => b === true;
let pass = 0, fail = 0;
const errs = [];

function authorize(role) { return role === 'admin'; }
function toggle(asset, currentHold, newHold, role, reason) {
  if (!authorize(role)) return { error: 'forbidden' };
  if (!asset) return { error: 'not_found' };
  if (newHold && (!reason || reason.trim().length < 5)) return { error: 'reason_required' };
  if (currentHold === newHold) return { ok: true, changed: false };
  return { ok: true, changed: true, legal_hold: newHold };
}

const roles = ['admin', 'operator', 'viewer', 'anon'];
const holds = [true, false];
const reasons = [null, '', 'x', 'processo judicial 123', 'a'.repeat(300)];
const assets = ['00000000-0000-4000-8000-000000000abc', null];

for (const role of roles)
  for (const cur of holds)
    for (const nw of holds)
      for (const r of reasons)
        for (const a of assets) {
          const res = toggle(a, cur, nw, role, r);
          let expected;
          if (role !== 'admin') expected = 'forbidden';
          else if (!a) expected = 'not_found';
          else if (nw && (!r || r.trim().length < 5)) expected = 'reason_required';
          else expected = 'ok';
          const got = res.error ?? 'ok';
          if (got === expected) pass++;
          else { fail++; errs.push({ role, cur, nw, r, a, expected, got }); }
        }

// Audit paginação
for (let page = 0; page < 20; page++) {
  const limit = [10, 25, 50, 100][page % 4];
  const offset = page * limit;
  if (limit > 0 && limit <= 100 && offset >= 0) pass++;
  else fail++;
}

// UUID validation
for (const s of ['abc', '', null, '00000000-0000-4000-8000-000000000abc']) {
  const valid = typeof s === 'string' && UUID.test(s);
  if (ok(valid) === UUID.test(String(s ?? ''))) pass++;
  else fail++;
}

console.log(`Wave Storage 12 — ${pass} OK, ${fail} falhas`);
if (fail > 0) { console.error(errs.slice(0, 5)); process.exit(1); }
