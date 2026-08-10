/**
 * Onda 237 — Simulação exaustiva da guarda de retenção das fotos de conciliação.
 *
 * Estratégia: em vez de conferir o plano contra si mesmo, cada cenário é
 * reavaliado por uma **referência independente** (implementação ingênua,
 * escrita sem olhar a régua) e por invariantes estruturais que precisam valer
 * para qualquer entrada.
 */
import {
  ANCHOR_KEEP,
  SNAPSHOT_BATCH_CAP_DEFAULT,
  SNAPSHOT_RETENTION_DAYS_DEFAULT,
  SNAPSHOT_RETENTION_DAYS_MAX,
  SNAPSHOT_RETENTION_DAYS_MIN,
  SNAPSHOT_VERDICTS,
  planSnapshotPurge,
  snapshotPlanIsBalanced,
  type SnapshotCandidate,
  type SnapshotPurgePlan,
} from '../src/lib/alarms/reconcileSnapshotRetention';

const MS_PER_DAY = 86_400_000;
const NOW = Date.parse('2026-07-28T12:00:00.000Z');

let assertions = 0;
let failures = 0;
const seenFailures = new Set<string>();

function check(label: string, condition: boolean, detail = ''): void {
  assertions += 1;
  if (!condition) {
    failures += 1;
    const key = `${label}|${detail}`;
    if (!seenFailures.has(key) && seenFailures.size < 20) {
      seenFailures.add(key);
      console.error(`✗ ${label} ${detail}`);
    }
  }
}

/** Referência independente do resultado esperado (N3/N4/N5/N6). */
function reference(
  rows: readonly SnapshotCandidate[],
  cutoff: number,
  batchCap: number,
  anchorKeep: number
): { deleted: string[]; anchored: string[]; quarantined: string[]; deferred: string[] } {
  const quarantined: string[] = [];
  const readable: Array<{ id: string; at: number; expired: boolean }> = [];

  for (const row of rows) {
    const id = String(row.id);
    const v = typeof row.verdict === 'string' ? row.verdict : undefined;
    if (row.verdict !== undefined && !(SNAPSHOT_VERDICTS as readonly string[]).includes(v ?? '')) {
      quarantined.push(id);
      continue;
    }
    const at = typeof row.observedAt === 'number' ? row.observedAt : NaN;
    if (!Number.isFinite(at)) {
      quarantined.push(id);
      continue;
    }
    readable.push({ id, at, expired: at < cutoff });
  }

  const byRecent = [...readable].sort((a, b) => b.at - a.at || Number(b.id) - Number(a.id));
  const anchorSet = new Set(byRecent.slice(0, anchorKeep).map((r) => r.id));

  const anchored = readable.filter((r) => r.expired && anchorSet.has(r.id)).map((r) => r.id);
  const doomed = readable
    .filter((r) => r.expired && !anchorSet.has(r.id))
    .sort((a, b) => a.at - b.at || Number(a.id) - Number(b.id));

  return {
    deleted: doomed.slice(0, batchCap).map((r) => r.id),
    anchored,
    quarantined,
    deferred: doomed.slice(batchCap).map((r) => r.id),
  };
}

function idsWith(plan: SnapshotPurgePlan, outcome: string): string[] {
  return plan.decisions
    .filter((d) => d.outcome === outcome)
    .map((d) => d.id)
    .sort();
}

// ---------------------------------------------------------------------------
// 1. Recusas: parâmetro inválido nunca apaga nada.
// ---------------------------------------------------------------------------
const sample: SnapshotCandidate[] = Array.from({ length: 40 }, (_, i) => ({
  id: i + 1,
  observedAt: NOW - (i + 1) * 30 * MS_PER_DAY,
  verdict: 'reconciled',
}));

for (const days of [
  Number.NaN,
  -1,
  0,
  1,
  29,
  89,
  SNAPSHOT_RETENTION_DAYS_MIN - 1,
  SNAPSHOT_RETENTION_DAYS_MAX + 1,
  10_000,
  3650.5,
]) {
  const res = planSnapshotPurge(sample, { now: NOW, retentionDays: days });
  check('recusa_prazo', res.ok === false, `days=${days}`);
  if (!res.ok) check('recusa_prazo_motivo', res.refusal === 'bad_retention_days', String(days));
}
for (const cap of [Number.NaN, -5, 0, 100_001, 1.5]) {
  const res = planSnapshotPurge(sample, { now: NOW, batchCap: cap });
  check('recusa_teto', res.ok === false && res.refusal === 'bad_batch_cap', `cap=${cap}`);
}
for (const anchor of [0, -1, 1001, 2.5, Number.NaN]) {
  const res = planSnapshotPurge(sample, { now: NOW, anchorKeep: anchor });
  check('recusa_ancora', res.ok === false && res.refusal === 'bad_anchor_keep', `a=${anchor}`);
}
for (const clock of [Number.NaN, Number.POSITIVE_INFINITY]) {
  const res = planSnapshotPurge(sample, { now: clock });
  check('recusa_relogio', res.ok === false && res.refusal === 'bad_now', String(clock));
}

// ---------------------------------------------------------------------------
// 2. Varredura combinatória contra a referência independente.
// ---------------------------------------------------------------------------
let rng = 0x9e3779b9;
function rand(): number {
  rng ^= rng << 13;
  rng ^= rng >>> 17;
  rng ^= rng << 5;
  return ((rng >>> 0) % 1_000_000) / 1_000_000;
}

const verdictPool = [...SNAPSHOT_VERDICTS, 'bogus', ''];

for (let scenario = 0; scenario < 60000; scenario += 1) {
  const size = Math.floor(rand() * 25);
  const retentionDays = [90, 180, 365, 730, 3650][Math.floor(rand() * 5)];
  const batchCap = [1, 2, 3, 5, 10, 10_000][Math.floor(rand() * 6)];
  const anchorKeep = [1, 3, 7, 30][Math.floor(rand() * 4)];
  const cutoff = NOW - retentionDays * MS_PER_DAY;

  const rows: SnapshotCandidate[] = [];
  for (let i = 0; i < size; i += 1) {
    const roll = rand();
    const ageDays = Math.floor(rand() * 2000);
    const observedAt = roll < 0.08 ? 'não é data' : roll < 0.12 ? null : NOW - ageDays * MS_PER_DAY;
    const verdict = verdictPool[Math.floor(rand() * verdictPool.length)];
    rows.push({ id: i + 1, observedAt, verdict });
  }
  // exatamente no corte: prova o empate (N3)
  if (size > 0) rows.push({ id: 9001, observedAt: cutoff, verdict: 'reconciled' });

  const res = planSnapshotPurge(rows, { now: NOW, retentionDays, batchCap, anchorKeep });
  check('plano_ok', res.ok === true, `cenario=${scenario}`);
  if (!res.ok) continue;
  const plan = res;

  const ref = reference(
    rows.map((r) => ({
      ...r,
      observedAt: typeof r.observedAt === 'number' ? r.observedAt : r.observedAt,
    })),
    cutoff,
    batchCap,
    anchorKeep
  );

  check(
    'ref_delete',
    idsWith(plan, 'delete').join(',') === [...ref.deleted].sort().join(','),
    `c=${scenario} plano=${idsWith(plan, 'delete')} ref=${[...ref.deleted].sort()}`
  );
  check(
    'ref_ancora',
    idsWith(plan, 'anchor').join(',') === [...ref.anchored].sort().join(','),
    `c=${scenario}`
  );
  check(
    'ref_quarentena',
    idsWith(plan, 'quarantine').join(',') === [...ref.quarantined].sort().join(','),
    `c=${scenario}`
  );
  check(
    'ref_adiada',
    idsWith(plan, 'defer').join(',') === [...ref.deferred].sort().join(','),
    `c=${scenario}`
  );

  // N7 — contabilidade fechada.
  check('contabilidade_fechada', snapshotPlanIsBalanced(plan), `c=${scenario}`);
  // N6 — o lote nunca excede o teto e `capped` é derivado.
  check('teto_respeitado', plan.deleted <= batchCap, `c=${scenario}`);
  check(
    'capped_derivado',
    plan.capped === plan.deferred > 0 || plan.capped === plan.deferred > 0,
    `c=${scenario}`
  );
  // N3 — nada dentro do prazo é apagado.
  for (const d of plan.decisions) {
    if (d.outcome === 'delete') {
      check('so_vencida_sai', d.observedAtMs !== null && d.observedAtMs < cutoff, `c=${scenario}`);
    }
    if (d.outcome === 'keep') {
      check('mantida_valida', d.observedAtMs !== null && d.observedAtMs >= cutoff, `c=${scenario}`);
    }
  }
  // N4 — nunca sobra menos que a âncora quando havia fotos legíveis suficientes.
  const readableCount = plan.decisions.filter((d) => d.outcome !== 'quarantine').length;
  const survivors = plan.decisions.filter(
    (d) => d.outcome !== 'delete' && d.outcome !== 'quarantine'
  ).length;
  check(
    'ancora_preservada',
    survivors >= Math.min(anchorKeep, readableCount),
    `c=${scenario} sobrev=${survivors} legiveis=${readableCount} ancora=${anchorKeep}`
  );

  // N8 — embaralhar a entrada não muda o plano.
  const shuffled = [...rows].reverse();
  const again = planSnapshotPurge(shuffled, { now: NOW, retentionDays, batchCap, anchorKeep });
  check(
    'determinismo',
    again.ok && JSON.stringify(again.decisions) === JSON.stringify(plan.decisions),
    `c=${scenario}`
  );

  // Idempotência: aplicar o plano e reexecutar não deve apagar mais nada além do adiado.
  const survivorsRows = rows.filter((r) => !idsWith(plan, 'delete').includes(String(r.id)));
  const second = planSnapshotPurge(survivorsRows, {
    now: NOW,
    retentionDays,
    batchCap,
    anchorKeep,
  });
  check('segunda_rodada_ok', second.ok === true, `c=${scenario}`);
  if (second.ok) {
    check(
      'segunda_rodada_nao_estoura',
      second.deleted <= Math.min(batchCap, plan.deferred),
      `c=${scenario} d2=${second.deleted} adiado=${plan.deferred}`
    );
  }
}

// ---------------------------------------------------------------------------
// 3. Cenário-chave: cron parado por 3 anos não pode zerar a série (N4).
// ---------------------------------------------------------------------------
{
  const antigas: SnapshotCandidate[] = Array.from({ length: 200 }, (_, i) => ({
    id: i + 1,
    observedAt: NOW - (1200 - i) * MS_PER_DAY, // todas vencidas com prazo de 730d
    verdict: 'unaccounted',
  }));
  const res = planSnapshotPurge(antigas, {
    now: NOW,
    retentionDays: SNAPSHOT_RETENTION_DAYS_DEFAULT,
    batchCap: SNAPSHOT_BATCH_CAP_DEFAULT,
  });
  check('cron_parado_ok', res.ok === true);
  if (res.ok) {
    check('cron_parado_ancora', res.anchored === ANCHOR_KEEP, `ancoradas=${res.anchored}`);
    check('cron_parado_sobrevive', res.deleted === 200 - ANCHOR_KEEP, `apagadas=${res.deleted}`);
    const anchorIds = idsWith(res, 'anchor')
      .map(Number)
      .sort((a, b) => a - b);
    check(
      'cron_parado_mantem_recentes',
      anchorIds.join(',') ===
        Array.from({ length: ANCHOR_KEEP }, (_, k) => 200 - ANCHOR_KEEP + 1 + k).join(','),
      anchorIds.join(',')
    );
  }
}

// ---------------------------------------------------------------------------
// 4. Lista vazia e linhas sem identidade.
// ---------------------------------------------------------------------------
{
  const vazio = planSnapshotPurge([], { now: NOW });
  check('vazio_ok', vazio.ok === true && vazio.examined === 0 && vazio.capped === false);

  const semId = planSnapshotPurge(
    [
      { id: '', observedAt: NOW },
      { id: '  ', observedAt: NOW },
      { id: 5, observedAt: NOW, verdict: 'reconciled' },
    ],
    { now: NOW }
  );
  check('sem_id_ignorada', semId.ok === true && semId.examined === 1, JSON.stringify(semId));

  const duplicada = planSnapshotPurge(
    [
      { id: 7, observedAt: NOW, verdict: 'reconciled' },
      { id: '7', observedAt: NOW, verdict: 'reconciled' },
    ],
    { now: NOW }
  );
  check('id_duplicado_uma_vez', duplicada.ok === true && duplicada.examined === 1);
}

console.log(
  `\nOnda 237 — simulação da guarda de fotos: ${assertions.toLocaleString('pt-BR')} asserções, ${failures} falha(s).`
);
if (failures > 0) process.exit(1);
