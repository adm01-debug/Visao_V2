#!/usr/bin/env tsx
/**
 * Onda 234 — Simulação exaustiva do fan-in de conciliação (leis K1–K8).
 *
 * Varre o produto cartesiano de vereditos × motivos × contadores × cadências,
 * conferindo invariantes que nenhuma amostra pontual pegaria:
 *  - severidade JAMAIS depende de números, só do veredito (K1);
 *  - `unaccounted` SEMPRE emite crítico, com qualquer contador (K2);
 *  - corrida benigna NUNCA emite (K4);
 *  - saudável NUNCA emite (K5);
 *  - cooldown sempre dentro de [60, 1440], crítico ≤ aviso (K6);
 *  - chave estável e distinta do fan-in de passivo (K7);
 *  - toda frase de acusação carrega os números do detalhe (K8);
 *  - determinismo: mesma entrada → mesma saída, sempre.
 */
import {
  buildOrphanAlert,
  orphanAlertSeverity,
  orphanCooldownMinutes,
  admissionReconcileRoutineKey,
  BENIGN_RACE_REASON,
  RECONCILE_CADENCE_MINUTES,
  COOLDOWN_FLOOR_MINUTES,
  COOLDOWN_CEILING_MINUTES,
} from '../src/lib/alarms/admissionOrphanAlert.ts';
import {
  reconcileSeverity,
  reconcileVerdictLabel,
  type ReconcileSnapshot,
  type ReconcileVerdict,
} from '../src/lib/alarms/admissionReconciliation.ts';

let assertions = 0;
const failures: string[] = [];

function check(cond: boolean, msg: string): void {
  assertions += 1;
  if (!cond && failures.length < 25) failures.push(msg);
}

const VERDICTS: ReconcileVerdict[] = [
  'indeterminate',
  'no_run',
  'reconciled',
  'settling',
  'unaccounted',
];

const REASONS: (string | null)[] = [
  null,
  BENIGN_RACE_REASON,
  'inventario_ausente',
  'inventario_sem_relogio',
  'corte_ilegivel',
  'prazo_ilegivel',
  'contador_ilegivel',
  'contabilidade_impossivel',
  'sem_execucao_legivel',
];

const COUNTS = [0, 1, 7, 42, 999, 1_000_000];
const CADENCES = [1, 15, 60, 61, 119, 120, 1439, 1440, 2880, 100_000];

function snap(
  verdict: ReconcileVerdict,
  reason: string | null,
  expired: number,
  drift: number,
  deferred: number,
  orphan: number
): ReconcileSnapshot {
  return {
    verdict,
    label: reconcileVerdictLabel(verdict),
    severity: reconcileSeverity(verdict),
    reason,
    expiredStock: expired,
    driftStock: drift,
    declaredDeferred: deferred,
    accountedFor: deferred + drift,
    orphanCount: orphan,
    quarantinedStock: 3,
    totalStock: expired + 10,
    observedAt: 1_800_000_000_000,
    lastRunAt: 1_799_000_000_000,
  };
}

/* 1) Matriz veredito × motivo × contadores ---------------------------------- */
for (const verdict of VERDICTS) {
  for (const reason of REASONS) {
    const expectSeverity = orphanAlertSeverity(verdict, reason);

    // K1 — severidade só depende de veredito (+ motivo no indeterminado).
    for (const expired of COUNTS) {
      for (const drift of COUNTS) {
        for (const deferred of COUNTS) {
          const s = snap(
            verdict,
            reason,
            expired,
            drift,
            deferred,
            Math.max(0, expired - drift - deferred)
          );
          const alert = buildOrphanAlert(s);
          check(
            (alert?.severity ?? null) === expectSeverity,
            `severidade instável: ${verdict}/${reason} exp=${expired} d=${drift} def=${deferred}`
          );

          if (verdict === 'unaccounted') {
            // K2 — sempre crítico, sempre emite.
            check(
              alert !== null && alert.severity === 'critical',
              `K2 falhou: ${expired}/${drift}`
            );
          }
          if (verdict === 'reconciled' || verdict === 'settling') {
            check(alert === null, `K5 falhou: ${verdict} emitiu`); // K5
          }
          if (verdict === 'indeterminate' && reason === BENIGN_RACE_REASON) {
            check(alert === null, 'K4 falhou: corrida benigna emitiu');
          }

          if (alert) {
            // K7 — chave estável, prefixo próprio.
            check(
              alert.routine === 'admission_reconcile:ledger_stock' &&
                alert.routine === admissionReconcileRoutineKey() &&
                !alert.routine.startsWith('admission_backlog:'),
              `K7 falhou: ${alert.routine}`
            );
            // K6 — cooldown na faixa.
            check(
              alert.cooldownMinutes >= COOLDOWN_FLOOR_MINUTES &&
                alert.cooldownMinutes <= COOLDOWN_CEILING_MINUTES,
              `K6 falhou: cooldown ${alert.cooldownMinutes}`
            );
            // K8 — detalhe fecha a conta e a frase carrega número.
            check(
              alert.detail.accounted_for ===
                alert.detail.declared_deferred + alert.detail.drift_stock,
              'K8 falhou: dívida assumida não fecha'
            );
            check(/\d/.test(alert.reason), 'K8 falhou: frase sem número');
            if (verdict === 'unaccounted') {
              check(
                alert.reason.includes(String(alert.detail.orphan_count)) &&
                  alert.reason.includes(String(alert.detail.expired_stock)),
                'K8 falhou: acusação sem órfão/estoque na frase'
              );
            }
            // Determinismo.
            const again = buildOrphanAlert(s);
            check(JSON.stringify(again) === JSON.stringify(alert), 'determinismo quebrado');
          }
        }
      }
    }
  }
}

/* 2) Cooldown por cadência --------------------------------------------------- */
for (const cadence of CADENCES) {
  const crit = orphanCooldownMinutes(cadence, 'critical');
  const warn = orphanCooldownMinutes(cadence, 'warning');
  check(
    crit >= COOLDOWN_FLOOR_MINUTES && crit <= COOLDOWN_CEILING_MINUTES,
    `crit fora da faixa: ${crit}`
  );
  check(
    warn >= COOLDOWN_FLOOR_MINUTES && warn <= COOLDOWN_CEILING_MINUTES,
    `warn fora da faixa: ${warn}`
  );
  // K6 — crítico nunca espera mais que o aviso.
  check(crit <= warn, `crítico esperou mais que aviso: ${crit} > ${warn}`);

  const s = snap('unaccounted', null, 10, 1, 2, 7);
  const alert = buildOrphanAlert(s, { cadenceMinutes: cadence });
  check(alert !== null && alert.cooldownMinutes === crit, 'cooldown do alerta divergiu da régua');
  check(
    alert !== null && alert.reason.includes(`cadência ${Math.round(cadence)} min`),
    'cadência ausente na frase'
  );
}

/* 3) Cadências inválidas falham alto ---------------------------------------- */
for (const bad of [0, -1, -1440, Number.NaN, Number.POSITIVE_INFINITY]) {
  let threw = false;
  try {
    orphanCooldownMinutes(bad, 'critical');
  } catch {
    threw = true;
  }
  check(threw, `cadência inválida aceita: ${bad}`);
}

/* 4) Entradas hostis --------------------------------------------------------- */
check(buildOrphanAlert(null) === null, 'snapshot nulo deveria não emitir');
check(buildOrphanAlert(undefined) === null, 'snapshot indefinido deveria não emitir');
check(
  buildOrphanAlert(snap('unaccounted', null, 5, 0, 0, 5), { job: 'outro' })!.routine ===
    'admission_reconcile:outro',
  'job customizado ignorado'
);
check(
  orphanAlertSeverity('unaccounted', BENIGN_RACE_REASON) === 'critical',
  'motivo jamais rebaixa órfão'
);

/* Relatório ------------------------------------------------------------------ */
console.log(`Onda 234 — asserções: ${assertions.toLocaleString('pt-BR')}`);
if (failures.length > 0) {
  console.error(`FALHAS (${failures.length}):`);
  for (const f of failures) console.error(` - ${f}`);
  process.exit(1);
}
console.log('OK — leis K1–K8 sustentadas em todos os cenários.');
