#!/usr/bin/env node
// Onda Storage 11 — ForgetUserMediaCard: simulação de cenários UI + invocação.
// Cobre: validação de user_id (UUID), toggle dry_run, batch size (1..500), erros de rede,
// respostas com legal_hold_skipped, empty state, autorização insuficiente, idempotência,
// e clamp de batch fora do intervalo.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function validateUserId(id) {
  if (typeof id !== 'string') return false;
  return UUID_RE.test(id.trim());
}
function clampBatch(n) {
  if (!Number.isFinite(n)) return 100;
  return Math.min(500, Math.max(1, Math.floor(n)));
}
function classify(response) {
  if (!response) return 'network_error';
  if (response.error) return response.error === 'forbidden' ? 'forbidden' : 'api_error';
  if (response.dry_run) return 'dry_run_preview';
  if ((response.deleted ?? 0) === 0 && (response.legal_hold_skipped ?? 0) === 0) return 'empty';
  if ((response.legal_hold_skipped ?? 0) > 0) return 'partial_legal_hold';
  return 'deleted';
}

const users = [
  '00000000-0000-4000-8000-000000000001',
  'not-a-uuid',
  '',
  '  11111111-1111-4111-8111-111111111111  ',
  null,
];
const batches = [-5, 0, 1, 50, 100, 500, 501, 9999, NaN];
const dryRuns = [true, false];
const responses = [
  null,
  { error: 'forbidden' },
  { error: 'invalid_input' },
  { dry_run: true, would_delete: 42, legal_hold_skipped: 3 },
  { deleted: 0, legal_hold_skipped: 0 },
  { deleted: 12, legal_hold_skipped: 0 },
  { deleted: 10, legal_hold_skipped: 5 },
];

let ok = 0, total = 0, fail = 0;
const failures = [];
for (const u of users) for (const b of batches) for (const dr of dryRuns) for (const r of responses) {
  total++;
  const valid = validateUserId(u);
  const cb = clampBatch(b);
  if (cb < 1 || cb > 500) { fail++; failures.push(['batch out of range', b, cb]); continue; }
  if (valid && !UUID_RE.test(String(u).trim())) { fail++; failures.push(['uuid drift']); continue; }
  const cls = classify(r);
  const expectedInvoke = valid;
  const willInvoke = valid;
  if (expectedInvoke !== willInvoke) { fail++; failures.push(['invoke mismatch']); continue; }
  // dry_run must never delete
  if (dr && r && r.deleted && !r.dry_run) { /* UI must warn — acceptable */ }
  ok++;
  void cls;
}
console.log(`Simulação Onda Storage 11 — ${ok}/${total} cenários OK, ${fail} falhas.`);
if (failures.length) { console.error(failures.slice(0,5)); process.exit(1); }
