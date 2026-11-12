/**
 * Onda 238 — simulação exaustiva dos perfis de escalada (leis O1–O10).
 *
 * Estratégia: em vez de conferir a régua contra si mesma, o simulador reproduz
 * o **ciclo de vida real** de uma condição de cadência diária — reemissão a
 * cada cooldown, cron de escalada rodando a cada 15 min, reconhecimento
 * humano em instantes arbitrários — e verifica as invariantes ao longo de toda
 * a linha do tempo. Erros de escada não aparecem numa avaliação isolada; eles
 * aparecem na sequência.
 *
 * Executar: npm run simulate:wave238
 */

import {
  evaluateAlertEscalation,
  type AlertSnapshot,
  type EscalationLevel,
  type MaintenanceSeverity,
} from '../src/lib/maintenanceEscalation.ts';
import {
  buildConditionStreak,
  escalationProfileFor,
  OPERATIONAL_PROFILE,
  SLOW_ACCOUNTING_PROFILE,
  type ConditionStreak,
} from '../src/lib/escalationProfiles.ts';

const MIN = 60_000;
const DAY = 1440 * MIN;

let assertions = 0;
const failures: string[] = [];

function check(label: string, ok: boolean, extra = ''): void {
  assertions += 1;
  if (!ok && failures.length < 40) failures.push(`${label} ${extra}`);
}

/** Gerador determinístico (xorshift32) — cenários reproduzíveis. */
function makeRng(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 0x1_0000_0000;
  };
}

interface Row {
  id: string;
  createdAtMs: number;
  acknowledgedAtMs: number | null;
  escalationLevel: EscalationLevel;
  lastEscalatedAtMs: number | null;
  delivered: boolean;
}

const SLOW_ROUTINES = [
  'admission_trend:ledger_stock',
  'admission_reconcile:ledger_stock',
  'admission_backlog:admission_ledger',
];
const FAST_ROUTINES = ['partition_drain', 'retention:admission_ledger', 'maintenance_watchdog', ''];

function streakFor(rows: readonly Row[]): ConditionStreak | null {
  return buildConditionStreak(
    rows.map((r) => ({
      createdAtMs: r.createdAtMs,
      acknowledgedAtMs: r.acknowledgedAtMs,
      escalationLevel: r.escalationLevel,
    }))
  );
}

/**
 * Roda uma condição por `days` dias e devolve o nível máximo alcançado, além
 * de conferir as invariantes passo a passo.
 */
function runLifecycle(opts: {
  routine: string;
  severity: MaintenanceSeverity;
  days: number;
  ackAtDay: number | null;
  delivered: boolean;
  reemitEveryMin: number;
  tickMin: number;
  label: string;
}): { maxLevel: EscalationLevel; ackBrokeStreak: boolean } {
  const t0 = Date.UTC(2026, 0, 1, 3, 55);
  const rows: Row[] = [];
  let seq = 0;
  let nextEmit = t0;
  const ackAt = opts.ackAtDay === null ? null : t0 + opts.ackAtDay * DAY;
  let maxLevel = 0 as EscalationLevel;
  let ackBrokeStreak = false;
  const prevLevelById = new Map<string, EscalationLevel>();

  const horizon = t0 + opts.days * DAY;
  for (let now = t0; now <= horizon; now += opts.tickMin * MIN) {
    // reemissão da fonte
    if (now >= nextEmit) {
      seq += 1;
      rows.push({
        id: `${opts.label}#${seq}`,
        createdAtMs: now,
        acknowledgedAtMs: null,
        escalationLevel: 0,
        lastEscalatedAtMs: null,
        delivered: opts.delivered,
      });
      nextEmit = now + opts.reemitEveryMin * MIN;
    }

    // reconhecimento humano: reconhece TODAS as linhas abertas até aqui
    if (ackAt !== null && now >= ackAt) {
      for (const r of rows)
        if (r.acknowledgedAtMs === null && r.createdAtMs <= ackAt) r.acknowledgedAtMs = ackAt;
    }

    const streak = streakFor(rows);
    for (const row of rows) {
      if (row.acknowledgedAtMs !== null) continue;
      const snap: AlertSnapshot = {
        id: row.id,
        routine: opts.routine,
        severity: opts.severity,
        reason: '',
        createdAtMs: row.createdAtMs,
        acknowledgedAtMs: null,
        escalationLevel: row.escalationLevel,
        lastEscalatedAtMs: row.lastEscalatedAtMs,
        dispatch: {
          delivered: row.delivered,
          failedChannels: row.delivered ? 0 : 1,
          neverAttempted: false,
        },
        streak,
      };
      const d = evaluateAlertEscalation(snap, now);

      // O7 — nunca decresce, no máximo +1.
      check(
        `${opts.label}/monotonic`,
        d.toLevel >= d.fromLevel && d.toLevel - d.fromLevel <= 1,
        `${d.fromLevel}→${d.toLevel}`
      );
      // O6 — warning jamais chega ao plantão.
      check(`${opts.label}/warning-ceiling`, !(opts.severity === 'warning' && d.toLevel >= 3));
      // O1 — perfil resolvido bate com a tabela de prefixos.
      check(`${opts.label}/profile`, d.profileId === escalationProfileFor(opts.routine).id);
      // O10 — degrau declara o perfil.
      check(`${opts.label}/provenance`, !d.shouldEscalate || d.reason.includes('[perfil:'));

      const before = prevLevelById.get(row.id) ?? 0;
      check(`${opts.label}/no-regression`, d.toLevel >= before, `${before}→${d.toLevel}`);

      if (d.shouldEscalate) {
        row.escalationLevel = d.toLevel;
        row.lastEscalatedAtMs = now;
        if (d.toLevel > maxLevel) maxLevel = d.toLevel;
        prevLevelById.set(row.id, d.toLevel);
        // O2 — em perfil lento, nenhum degrau antes de uma cadência da fonte.
        if (escalationProfileFor(opts.routine).anchorMode === 'streak' && streak) {
          const ageDays = (now - streak.anchorAtMs) / DAY;
          check(`${opts.label}/O2-min-cadence`, ageDays >= 1 - 1e-9, `${ageDays.toFixed(3)}d`);
        }
      }
    }

    if (ackAt !== null && now > ackAt + DAY) {
      const s = streakFor(rows);
      // O5 — depois do reconhecimento, a âncora nunca é anterior ao ack.
      if (s) {
        check(`${opts.label}/O5-streak-break`, s.anchorAtMs > ackAt, `${s.anchorAtMs} <= ${ackAt}`);
        ackBrokeStreak = true;
      }
    }
  }

  return { maxLevel, ackBrokeStreak };
}

// ---------------------------------------------------------------------------
// 1. Defeito B: o crônico DEVE chegar ao plantão; e não antes de 7 dias.
// ---------------------------------------------------------------------------
for (const routine of SLOW_ROUTINES) {
  for (const delivered of [true, false]) {
    const short = runLifecycle({
      routine,
      severity: 'critical',
      days: 6,
      ackAtDay: null,
      delivered,
      reemitEveryMin: 720,
      tickMin: 15,
      label: `chronic6/${routine}/${delivered}`,
    });
    check('crônico<7d não pagina', short.maxLevel < 3, `nível ${short.maxLevel}`);
    check('crônico 6d já escalonou', short.maxLevel >= 2, `nível ${short.maxLevel}`);

    const long = runLifecycle({
      routine,
      severity: 'critical',
      days: 12,
      ackAtDay: null,
      delivered,
      reemitEveryMin: 720,
      tickMin: 15,
      label: `chronic12/${routine}/${delivered}`,
    });
    check(
      'crônico ≥7d pagina (defeito B corrigido)',
      long.maxLevel === 3,
      `nível ${long.maxLevel}`
    );
  }
}

// ---------------------------------------------------------------------------
// 2. Defeito A: fonte lenta não pagina no mesmo dia, em nenhuma combinação.
// ---------------------------------------------------------------------------
{
  const rng = makeRng(0x238a);
  for (let i = 0; i < 4000; i += 1) {
    const routine = SLOW_ROUTINES[i % SLOW_ROUTINES.length];
    const sameDay = runLifecycle({
      routine,
      severity: rng() < 0.5 ? 'critical' : 'warning',
      days: 1,
      ackAtDay: null,
      delivered: rng() < 0.5,
      reemitEveryMin: 60 + Math.floor(rng() * 1380),
      tickMin: 5 + Math.floor(rng() * 55),
      label: `sameday/${i}`,
    });
    check('fonte lenta não escalona no 1º dia', sameDay.maxLevel <= 1, `nível ${sameDay.maxLevel}`);
  }
}

// ---------------------------------------------------------------------------
// 3. O5 — reconhecer quebra a sequência e devolve o alívio.
// ---------------------------------------------------------------------------
for (const routine of SLOW_ROUTINES) {
  // Sem reconhecimento, 8 dias bastam para o plantão. Com reconhecimento no
  // 2º dia a contagem recomeça dali: no 8º dia a condição nova tem 6 dias e
  // ainda NÃO pagina — é exatamente o alívio que O5 promete. O mesmo cenário
  // levado a 14 dias volta a paginar (dia 9), e isso também é correto: o
  // alívio é por condição, não perdão perpétuo.
  const untouched = runLifecycle({
    routine,
    severity: 'critical',
    days: 8,
    ackAtDay: null,
    delivered: true,
    reemitEveryMin: 1440,
    tickMin: 30,
    label: `noack8/${routine}`,
  });
  check(
    '8 dias sem reconhecer chegam ao plantão',
    untouched.maxLevel === 3,
    `nível ${untouched.maxLevel}`
  );

  const acked = runLifecycle({
    routine,
    severity: 'critical',
    days: 8,
    ackAtDay: 2,
    delivered: true,
    reemitEveryMin: 1440,
    tickMin: 30,
    label: `ack8/${routine}`,
  });
  check(
    'reconhecer no 2º dia adia o plantão para além do 8º',
    acked.maxLevel < 3,
    `nível ${acked.maxLevel}`
  );
  check('reconhecimento reancorou a sequência', acked.ackBrokeStreak);

  const ackedLong = runLifecycle({
    routine,
    severity: 'critical',
    days: 14,
    ackAtDay: 2,
    delivered: true,
    reemitEveryMin: 1440,
    tickMin: 30,
    label: `ack14/${routine}`,
  });
  check(
    'condição nova pós-reconhecimento volta a escalar',
    ackedLong.maxLevel === 3,
    `nível ${ackedLong.maxLevel}`
  );
}

// ---------------------------------------------------------------------------
// 4. O1 — fontes não declaradas mantêm EXATAMENTE a régua da Onda 117.
// ---------------------------------------------------------------------------
{
  const rng = makeRng(0x117b);
  for (let i = 0; i < 20000; i += 1) {
    const routine = FAST_ROUTINES[i % FAST_ROUTINES.length];
    const severity: MaintenanceSeverity = rng() < 0.5 ? 'critical' : 'warning';
    const ageMin = Math.floor(rng() * 3000);
    // nível semeado respeita o teto da severidade: `warning` em nível 3 é
    // estado impossível (nenhum perfil o produz), e semeá-lo testaria a régua
    // contra uma linha que o banco nunca conterá.
    const level = Math.floor(rng() * (severity === 'warning' ? 3 : 4)) as EscalationLevel;
    const delivered = rng() < 0.5;
    const now = 1_800_000_000_000;
    const snap: AlertSnapshot = {
      id: `fast${i}`,
      routine,
      severity,
      reason: '',
      createdAtMs: now - ageMin * MIN,
      acknowledgedAtMs: null,
      escalationLevel: level,
      lastEscalatedAtMs: rng() < 0.5 ? null : now - Math.floor(rng() * 400) * MIN,
      dispatch: { delivered, failedChannels: 1, neverAttempted: !delivered && rng() < 0.5 },
      // âncora ofertada de má-fé: perfil `row` deve ignorá-la (O3).
      streak: { anchorAtMs: now - 90 * DAY, maxLevel: 3, rows: 99 },
    };
    const d = evaluateAlertEscalation(snap, now);
    check('perfil operacional para fonte não declarada', d.profileId === OPERATIONAL_PROFILE.id);
    check('âncora ignorada em perfil row', !d.anchoredOnStreak);
    check(
      'idade = idade da linha',
      Math.abs(d.ageMinutes - ageMin) < 0.05,
      `${d.ageMinutes} vs ${ageMin}`
    );
    check('teto por severidade', severity === 'warning' ? d.toLevel <= 2 : d.toLevel <= 3);
    check('nunca decresce', d.toLevel >= Math.min(3, level));
  }
}

// ---------------------------------------------------------------------------
// 5. O8/O9 — monotonicidade na idade e relógio recuado.
// ---------------------------------------------------------------------------
{
  const now = 1_800_000_000_000;
  for (const routine of [...SLOW_ROUTINES, ...FAST_ROUTINES]) {
    for (const severity of ['critical', 'warning'] as const) {
      let prev = -1;
      for (let ageDays = 0; ageDays <= 30; ageDays += 0.25) {
        const anchor = now - ageDays * DAY;
        const snap: AlertSnapshot = {
          id: 'mono',
          routine,
          severity,
          reason: '',
          createdAtMs: anchor,
          acknowledgedAtMs: null,
          escalationLevel: 0,
          lastEscalatedAtMs: null,
          dispatch: { delivered: true, failedChannels: 0, neverAttempted: false },
          streak: { anchorAtMs: anchor, maxLevel: 0, rows: 1 },
        };
        const d = evaluateAlertEscalation(snap, now);
        // com fromLevel fixo em 0 e degrau único, o alvo é 0 ou 1 e nunca cai.
        check('O8 monotônico na idade', d.toLevel >= prev, `${routine} ${ageDays}d`);
        prev = Math.min(d.toLevel, 1);
      }
      // O9 — âncora no futuro.
      const future: AlertSnapshot = {
        id: 'future',
        routine,
        severity,
        reason: '',
        createdAtMs: now + 10 * DAY,
        acknowledgedAtMs: null,
        escalationLevel: 0,
        lastEscalatedAtMs: null,
        dispatch: { delivered: false, failedChannels: 2, neverAttempted: false },
        streak: { anchorAtMs: now + 10 * DAY, maxLevel: 0, rows: 1 },
      };
      check('O9 relógio recuado não escala', !evaluateAlertEscalation(future, now).shouldEscalate);
    }
  }
}

// ---------------------------------------------------------------------------
// 6. buildConditionStreak — força bruta contra referência independente.
// ---------------------------------------------------------------------------
{
  const rng = makeRng(0xc0ffee);
  for (let i = 0; i < 30000; i += 1) {
    const n = 1 + Math.floor(rng() * 6);
    const rows = Array.from({ length: n }, () => {
      const createdAtMs = Math.floor(rng() * 10) * DAY;
      const ack = rng() < 0.35;
      return {
        createdAtMs,
        acknowledgedAtMs: ack ? createdAtMs + Math.floor(rng() * 3) * DAY : null,
        escalationLevel: Math.floor(rng() * 4) as EscalationLevel,
      };
    });
    const got = buildConditionStreak(rows);

    // referência: filtro literal das leis, sem otimização.
    const ackCreated = rows.filter((r) => r.acknowledgedAtMs !== null).map((r) => r.createdAtMs);
    const cut = ackCreated.length ? Math.max(...ackCreated) : Number.NEGATIVE_INFINITY;
    const alive = rows.filter((r) => r.acknowledgedAtMs === null && r.createdAtMs > cut);
    if (alive.length === 0) {
      check('streak vazio', got === null);
    } else {
      check('streak não nulo', got !== null);
      check(
        'âncora = mais antiga viva',
        got!.anchorAtMs === Math.min(...alive.map((r) => r.createdAtMs))
      );
      check(
        'nível = máximo vivo',
        got!.maxLevel === Math.max(...alive.map((r) => r.escalationLevel))
      );
      check('contagem', got!.rows === alive.length);
    }
  }
}

// ---------------------------------------------------------------------------
// 7. Coerência declarada dos perfis (O2/O6).
// ---------------------------------------------------------------------------
for (const p of [OPERATIONAL_PROFILE, SLOW_ACCOUNTING_PROFILE]) {
  for (const sev of ['critical', 'warning'] as const) {
    const ladder = p.ladderMinutes[sev];
    for (let i = 1; i < ladder.length; i += 1) {
      const prev = ladder[i - 1];
      const cur = ladder[i];
      if (i > 1 && prev !== null && cur !== null) {
        check('escada crescente', cur > prev, `${p.id}/${sev} ${prev}→${cur}`);
      }
      if (cur !== null && p.cadenceMinutes !== null) {
        check('O2 degrau ≥ cadência', cur >= p.cadenceMinutes, `${p.id}/${sev}[${i}]=${cur}`);
      }
    }
    check('nível 3 fechado para warning', sev !== 'warning' || p.maxLevel.warning <= 2);
  }
  if (p.cadenceMinutes !== null) {
    check('O2 intervalo mínimo ≥ cadência', p.minStepMinutes >= p.cadenceMinutes, p.id);
  }
}

console.log(`Onda 238 — ${assertions.toLocaleString('pt-BR')} asserções.`);
if (failures.length) {
  console.error(`FALHAS (${failures.length} primeiras):`);
  for (const f of failures) console.error(' -', f);
  process.exit(1);
}
console.log('Todas as leis O1–O10 sustentadas.');
