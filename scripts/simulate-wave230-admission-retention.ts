/**
 * Onda 230 — Simulação exaustiva da guarda de retenção do livro de admissão.
 *
 * Roda com: npm run simulate:wave230
 */

import {
  BATCH_CAP_DEFAULT,
  RETENTION_DAYS_DEFAULT,
  RETENTION_DAYS_MAX,
  RETENTION_DAYS_MIN,
  planAdmissionPurge,
  planIsBalanced,
  type RetentionCandidate,
  type RetentionPlan,
} from '../src/lib/alarms/admissionRetention';

let asserts = 0;
let failures = 0;
const ok = (cond: boolean, msg: string) => {
  asserts += 1;
  if (!cond) {
    failures += 1;
    if (failures <= 20) console.error(`FALHA: ${msg}`);
  }
};

// PRNG determinístico (mulberry32) — a simulação precisa ser reproduzível.
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const MS_DAY = 86_400_000;
const NOW = Date.parse('2026-07-28T12:00:00.000Z');

/* ---------- 1. Recusas: parâmetro fora da faixa nunca apaga nada ---------- */
{
  const rows: RetentionCandidate[] = [
    { id: 'a', sourceId: 'cam-1', windowStart: NOW - 1000 * MS_DAY, windowEnd: NOW - 999 * MS_DAY },
  ];
  const bad = [
    { retentionDays: RETENTION_DAYS_MIN - 1 },
    { retentionDays: RETENTION_DAYS_MAX + 1 },
    { retentionDays: 0 },
    { retentionDays: -365 },
    { retentionDays: 90.5 },
    { retentionDays: Number.NaN },
    { batchCap: 0 },
    { batchCap: -1 },
    { batchCap: 500_001 },
    { batchCap: 1.5 },
  ];
  for (const opt of bad) {
    const r = planAdmissionPurge(rows, { now: NOW, ...opt });
    ok(r.ok === false, `parâmetro inválido deveria recusar: ${JSON.stringify(opt)}`);
  }
  for (const badNow of [Number.NaN, Number.POSITIVE_INFINITY, 'ontem', null, undefined]) {
    const r = planAdmissionPurge(rows, { now: badNow as unknown as number });
    ok(r.ok === false, `relógio ilegível deveria recusar: ${String(badNow)}`);
  }
  const good = planAdmissionPurge(rows, { now: NOW });
  ok(good.ok === true, 'parâmetros válidos deveriam planejar');
}

/* ---------- 2. Fronteira exata do corte (G3) ---------- */
for (const days of [30, 90, 365, 3650]) {
  const cutoff = NOW - days * MS_DAY;
  const rows: RetentionCandidate[] = [
    { id: 'exato', sourceId: 'c', windowStart: cutoff - 3600_000, windowEnd: cutoff },
    { id: 'um-ms-antes', sourceId: 'c', windowStart: cutoff - 3600_000, windowEnd: cutoff - 1 },
    { id: 'um-ms-depois', sourceId: 'c', windowStart: cutoff - 3600_000, windowEnd: cutoff + 1 },
  ];
  const p = planAdmissionPurge(rows, { now: NOW, retentionDays: days }) as RetentionPlan;
  ok(p.ok === true, `plano deveria existir para ${days}d`);
  const by = new Map(p.decisions.map((d) => [d.id, d.outcome]));
  ok(by.get('exato') === 'keep', `empate no corte (${days}d) deveria preservar`);
  ok(by.get('um-ms-antes') === 'delete', `1ms vencido (${days}d) deveria sair`);
  ok(by.get('um-ms-depois') === 'keep', `1ms dentro (${days}d) deveria ficar`);
}

/* ---------- 3. Ilegíveis nunca são apagados (G4) ---------- */
{
  const rows: RetentionCandidate[] = [
    { id: 'q1', sourceId: '   ', windowStart: 0, windowEnd: 1000 },
    { id: 'q2', sourceId: 'c', windowStart: NOW - 900 * MS_DAY, windowEnd: 'não-é-data' },
    { id: 'q3', sourceId: 'c', windowStart: NOW - 900 * MS_DAY, windowEnd: null },
    { id: 'q4', sourceId: 'c', windowStart: NOW - 900 * MS_DAY, windowEnd: NOW - 901 * MS_DAY },
    { id: 'q5', sourceId: 'c', windowStart: NOW - 900 * MS_DAY, windowEnd: NOW - 900 * MS_DAY },
  ];
  const p = planAdmissionPurge(rows, { now: NOW, retentionDays: 30 }) as RetentionPlan;
  ok(p.deleted === 0, 'nenhuma linha ilegível pode ser apagada');
  ok(p.quarantined === 5, `esperava 5 quarentenadas, veio ${p.quarantined}`);
  ok(planIsBalanced(p), 'contabilidade das ilegíveis não fecha');
}

/* ---------- 4. Cenários aleatórios em massa ---------- */
const random = rng(230_2026);
for (let s = 0; s < 4000; s += 1) {
  const n = 1 + Math.floor(random() * 60);
  const days = RETENTION_DAYS_MIN + Math.floor(random() * 400);
  const cap = 1 + Math.floor(random() * 30);
  const cutoff = NOW - days * MS_DAY;

  const rows: RetentionCandidate[] = [];
  let expectedExpired = 0;
  let expectedBad = 0;
  for (let i = 0; i < n; i += 1) {
    const id = `r${s}-${i}`;
    const kind = random();
    if (kind < 0.12) {
      // ilegível
      expectedBad += 1;
      const flavor = random();
      rows.push(
        flavor < 0.34
          ? { id, sourceId: '  ', windowStart: NOW, windowEnd: NOW + 1000 }
          : flavor < 0.67
            ? { id, sourceId: 'c', windowStart: NOW - 10 * MS_DAY, windowEnd: 'xx' }
            : { id, sourceId: 'c', windowStart: NOW, windowEnd: NOW - MS_DAY },
      );
      continue;
    }
    const offsetDays = random() * (days * 2 + 10);
    const end = NOW - offsetDays * MS_DAY;
    if (end < cutoff) expectedExpired += 1;
    rows.push({
      id,
      sourceId: `cam-${i % 7}`,
      windowStart: new Date(end - 3600_000).toISOString(),
      windowEnd: new Date(end).toISOString(),
    });
  }

  const p = planAdmissionPurge(rows, { now: NOW, retentionDays: days, batchCap: cap });
  ok(p.ok === true, `cenário ${s}: plano recusado indevidamente`);
  if (!p.ok) continue;

  ok(planIsBalanced(p), `cenário ${s}: contabilidade não fecha`);
  ok(p.examined === rows.length, `cenário ${s}: linhas examinadas divergem`);
  ok(p.quarantined === expectedBad, `cenário ${s}: quarentena divergente`);
  ok(
    p.deleted + p.deferred === expectedExpired,
    `cenário ${s}: vencidas ${expectedExpired} != ${p.deleted}+${p.deferred}`,
  );
  ok(p.deleted <= cap, `cenário ${s}: teto de lote violado (${p.deleted} > ${cap})`);
  ok(p.capped === (p.deferred > 0), `cenário ${s}: flag capped incoerente`);

  // Nenhuma linha dentro do prazo pode estar em `delete`.
  for (const d of p.decisions) {
    if (d.outcome === 'delete') {
      ok(d.windowEndAt !== null && d.windowEndAt < p.cutoffAt, `cenário ${s}: apagou dentro do prazo`);
    }
    if (d.outcome === 'keep') {
      ok(d.windowEndAt !== null && d.windowEndAt >= p.cutoffAt, `cenário ${s}: preservou vencida como keep`);
    }
  }

  // Prioridade: o que ficou adiado é sempre mais novo que o que saiu.
  const maxDeleted = Math.max(
    ...p.decisions.filter((d) => d.outcome === 'delete').map((d) => d.windowEndAt ?? -Infinity),
    -Infinity,
  );
  const minDeferred = Math.min(
    ...p.decisions.filter((d) => d.outcome === 'defer').map((d) => d.windowEndAt ?? Infinity),
    Infinity,
  );
  ok(maxDeleted <= minDeferred, `cenário ${s}: adiou linha mais antiga que uma apagada`);

  // G8: permutar a entrada não altera o plano.
  const shuffled = [...rows].sort(() => random() - 0.5);
  const q = planAdmissionPurge(shuffled, { now: NOW, retentionDays: days, batchCap: cap });
  ok(q.ok === true && JSON.stringify(q) === JSON.stringify(p), `cenário ${s}: plano não é determinístico`);

  // Idempotência: aplicar o plano e replanejar não apaga mais nada além do adiado.
  const survivors = rows.filter(
    (r) => !p.decisions.some((d) => d.id === r.id && d.outcome === 'delete'),
  );
  const again = planAdmissionPurge(survivors, { now: NOW, retentionDays: days, batchCap: cap });
  ok(again.ok === true, `cenário ${s}: replanejamento recusado`);
  if (again.ok) {
    ok(again.quarantined === p.quarantined, `cenário ${s}: quarentena mudou no replanejamento`);
    ok(again.deleted + again.deferred === p.deferred, `cenário ${s}: replanejamento perdeu adiadas`);
  }
}

/* ---------- 5. Casos-limite ---------- */
{
  const vazio = planAdmissionPurge([], { now: NOW }) as RetentionPlan;
  ok(vazio.ok === true && vazio.examined === 0 && vazio.capped === false, 'vazio deveria ser inerte');

  const semId = planAdmissionPurge(
    [{ id: '' } as RetentionCandidate, undefined as unknown as RetentionCandidate],
    { now: NOW },
  );
  ok(semId.ok === true && semId.examined === 0, 'linha sem identidade deveria ser ignorada');

  const capExato = planAdmissionPurge(
    Array.from({ length: 10 }, (_, i) => ({
      id: `x${i}`,
      sourceId: 'c',
      windowStart: NOW - (500 + i) * MS_DAY,
      windowEnd: NOW - (499 + i) * MS_DAY,
    })),
    { now: NOW, retentionDays: 30, batchCap: 10 },
  ) as RetentionPlan;
  ok(capExato.deleted === 10 && capExato.capped === false, 'lote exato não deveria marcar capped');

  const padrao = planAdmissionPurge([], { now: NOW }) as RetentionPlan;
  ok(
    padrao.retentionDays === RETENTION_DAYS_DEFAULT && padrao.batchCap === BATCH_CAP_DEFAULT,
    'padrões declarados divergiram',
  );
}

console.log(`Onda 230 — ${asserts.toLocaleString('pt-BR')} asserções, ${failures} falha(s).`);
if (failures > 0) process.exit(1);
