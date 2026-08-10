/**
 * Onda 243 — simulação combinatória da guarda de retenção da trilha de
 * supressão. Varre a régua `planSuppressionPurge` contra invariantes que não
 * dependem da implementação (contabilidade, âncora, determinismo, monotonia).
 *
 * Rode com: npm run simulate:wave243
 */
import {
  planSuppressionPurge,
  suppressionPlanIsBalanced,
  type SuppressionCandidate,
} from '../src/lib/maintenance/suppressionRetention';

const NOW = Date.parse('2099-06-01T00:00:00.000Z');
const DAY = 86_400_000;

let scenarios = 0;
let assertions = 0;
const failures: string[] = [];

const assert = (label: string, cond: boolean, detail = ''): void => {
  assertions += 1;
  if (!cond && failures.length < 40) failures.push(`${label} ${detail}`);
};

const AGES = [0, 1, 29, 30, 31, 89, 90, 91, 200, 400, 729, 730, 731, 2000];
const CONDITIONS = ['a', 'b', 'c'];
const RETENTIONS = [30, 45, 90, 180, 365, 730];
const CAPS = [1, 2, 5, 50, 100_000];
const ANCHORS = [1, 2, 3, 10];
const CORRUPTIONS = ['none', 'condition', 'channel', 'window', 'instant', 'future'] as const;

function build(
  seed: number,
  size: number,
  corruption: (typeof CORRUPTIONS)[number]
): SuppressionCandidate[] {
  const rows: SuppressionCandidate[] = [];
  for (let i = 0; i < size; i += 1) {
    const age = AGES[(seed * 7 + i * 13) % AGES.length];
    const condition = CONDITIONS[(seed + i) % CONDITIONS.length];
    const base: SuppressionCandidate = {
      id: `r${i}`,
      suppressedAt: NOW - age * DAY,
      conditionKey: `sim:${condition}`,
      channel: i % 2 === 0 ? 'telegram' : 'email',
      windowMinutes: 1440,
    };
    if (corruption !== 'none' && i % 5 === 0) {
      const broken: Record<string, unknown> = { ...base };
      if (corruption === 'condition') broken.conditionKey = '   ';
      if (corruption === 'channel') broken.channel = 'sms';
      if (corruption === 'window') broken.windowMinutes = -1;
      if (corruption === 'instant') broken.suppressedAt = 'nunca';
      if (corruption === 'future') broken.suppressedAt = NOW + DAY;
      rows.push(broken as SuppressionCandidate);
      continue;
    }
    rows.push(base);
  }
  return rows;
}

for (const seed of [1, 2, 3, 5, 8, 13]) {
  for (const size of [0, 1, 3, 7, 20, 60]) {
    for (const corruption of CORRUPTIONS) {
      const rows = build(seed, size, corruption);
      for (const retentionDays of RETENTIONS) {
        for (const batchCap of CAPS) {
          for (const anchorPerCondition of ANCHORS) {
            scenarios += 1;
            const opts = { now: NOW, retentionDays, batchCap, anchorPerCondition };
            const plan = planSuppressionPurge(rows, opts);

            assert('ok', plan.ok, `plano recusado indevidamente: ${plan.refusal}`);
            assert('balance', suppressionPlanIsBalanced(plan), JSON.stringify(opts));
            assert('cap', plan.deleted <= batchCap, `${plan.deleted} > ${batchCap}`);
            assert(
              'capped-coerente',
              plan.capped === plan.deferred > 0 || plan.capped === plan.deferred > 0,
              ''
            );
            assert(
              'decisoes',
              plan.decisions.length === rows.length,
              `${plan.decisions.length}/${rows.length}`
            );

            // Determinismo (T8): ordem invertida produz o mesmo resultado.
            const reversed = planSuppressionPurge([...rows].reverse(), opts);
            assert('determinismo', reversed.deleteIds.join(',') === plan.deleteIds.join(','), '');

            // T4: nenhuma condição legível pode perder todas as suas linhas.
            const survivingByCondition = new Map<string, number>();
            const deleted = new Set(plan.deleteIds);
            for (const r of rows) {
              const key = typeof r.conditionKey === 'string' ? r.conditionKey.trim() : '';
              if (key.length === 0) continue;
              if (deleted.has(String(r.id))) continue;
              survivingByCondition.set(key, (survivingByCondition.get(key) ?? 0) + 1);
            }
            const legibleConditions = new Set(
              rows
                .filter(
                  (r) =>
                    typeof r.conditionKey === 'string' &&
                    r.conditionKey.trim().length > 0 &&
                    (r.channel === 'telegram' || r.channel === 'email') &&
                    typeof r.windowMinutes === 'number' &&
                    r.windowMinutes > 0 &&
                    typeof r.suppressedAt === 'number' &&
                    r.suppressedAt <= NOW
                )
                .map((r) => (r.conditionKey as string).trim())
            );
            for (const key of legibleConditions) {
              assert(
                'ancora-viva',
                (survivingByCondition.get(key) ?? 0) >= 1,
                `condição ${key} zerada`
              );
            }

            // T9/T5: nada ilegível é apagado.
            for (const d of plan.decisions) {
              if (d.outcome === 'delete') {
                assert('delete-legivel', d.reason === 'vencida', d.reason);
              }
            }

            // Monotonia: prazo maior nunca apaga mais.
            const longer = planSuppressionPurge(rows, {
              ...opts,
              retentionDays: Math.min(730, retentionDays * 2),
            });
            assert(
              'monotonia-prazo',
              longer.deleted + longer.deferred <= plan.deleted + plan.deferred,
              ''
            );
          }
        }
      }
    }
  }
}

// Recusas nunca apagam nada.
for (const bad of [
  { now: Number.NaN },
  { now: NOW, retentionDays: 5 },
  { now: NOW, retentionDays: 5000 },
  { now: NOW, batchCap: 0 },
  { now: NOW, batchCap: 1_000_000 },
  { now: NOW, anchorPerCondition: 0 },
  { now: NOW, anchorPerCondition: 5000 },
]) {
  scenarios += 1;
  const plan = planSuppressionPurge(build(1, 20, 'none'), bad as never);
  assert(
    'recusa-nao-apaga',
    !plan.ok && plan.deleted === 0 && plan.deleteIds.length === 0,
    JSON.stringify(bad)
  );
}

if (failures.length > 0) {
  console.error(`Simulação Onda 243: ${failures.length} falha(s) em ${scenarios} cenários.`);
  for (const f of failures) console.error(` - ${f}`);
  process.exit(1);
}
console.log(
  `Simulação Onda 243 OK — ${scenarios.toLocaleString('pt-BR')} cenários, ${assertions.toLocaleString('pt-BR')} asserções.`
);
