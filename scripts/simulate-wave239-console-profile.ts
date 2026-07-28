/**
 * Onda 239 — simulação exaustiva do console alinhado ao perfil de urgência.
 *
 * Defeito corrigido: após a Onda 238 o cron passou a escalar fontes de
 * contabilidade pela escada diária ancorada na condição, mas o console
 * continuou prevendo o próximo degrau pela escada operacional (30 min). Painel
 * e rotina discordando é pior que painel ausente — a discordância se disfarça
 * de informação e leva o operador a esperar um plantão que não virá.
 *
 * Leis varridas aqui:
 *   P1 previsão nunca contradiz a escada do perfil resolvido pela chave
 *   P2 âncora é por chave: chaves distintas nunca compartilham sequência
 *   P3 reconhecido nunca tem previsão nem âncora
 *   P4 idade da escada nunca é menor que a idade da própria linha
 *   P5 previsão nunca é negativa e nunca excede o degrau do perfil
 *   P6 envelhecer a condição nunca aumenta a previsão
 *   P7 perfil operacional é bit-a-bit idêntico ao comportamento pré-238
 *   P8 resumo é consistente com as linhas classificadas
 */

import {
  buildMaintenanceConsole,
  minutesToNextLevel,
  type MaintenanceAlertRow,
} from '../src/lib/maintenance/maintenanceConsoleView';
import { escalationProfileFor, OPERATIONAL_PROFILE } from '../src/lib/escalationProfiles';

const NOW = Date.parse('2026-07-28T12:00:00.000Z');
const MINUTE = 60_000;
const DAY = 1440;

let assertions = 0;
let failures = 0;

function check(condition: boolean, message: string): void {
  assertions += 1;
  if (!condition) {
    failures += 1;
    if (failures <= 20) console.error(`✗ ${message}`);
  }
}

const ROUTINES = [
  'retention:collab_entry_purge_runs',
  'agent_healing:fleet',
  'admission_trend:ledger_stock',
  'admission_reconcile:ledger_stock',
  'admission_backlog:ledger',
] as const;

const SEVERITIES = ['critical', 'warning'] as const;
const LEVELS = [0, 1, 2, 3] as const;
const AGES = [0, 1, 30, 120, 360, DAY - 1, DAY, 3 * DAY, 7 * DAY, 20 * DAY] as const;
const LAST_STEPS = [null, 0, 30, 400, 2 * DAY] as const;
const STREAK_SHAPES = [0, 1, 3, 9] as const;

function mk(
  id: string,
  routine: string,
  severity: string,
  level: number,
  ageMin: number,
  lastStep: number | null,
  ackedAgeMin: number | null,
): MaintenanceAlertRow {
  return {
    id,
    routine,
    severity,
    reason: 'cenário sintético',
    detail: {},
    created_at: new Date(NOW - ageMin * MINUTE).toISOString(),
    observed_at: null,
    acknowledged_at: ackedAgeMin === null ? null : new Date(NOW - ackedAgeMin * MINUTE).toISOString(),
    acknowledged_by: ackedAgeMin === null ? null : 'admin',
    escalation_level: level,
    last_escalated_at: lastStep === null ? null : new Date(NOW - lastStep * MINUTE).toISOString(),
  };
}

let seq = 0;
for (const routine of ROUTINES) {
  const profile = escalationProfileFor(routine);
  for (const severity of SEVERITIES) {
    for (const level of LEVELS) {
      for (const age of AGES) {
        for (const lastStep of LAST_STEPS) {
          for (const streakShape of STREAK_SHAPES) {
            for (const acked of [false, true]) {
              seq += 1;
              const head = mk(
                `a-${seq}`,
                routine,
                severity,
                level,
                age,
                lastStep,
                acked ? 1 : null,
              );
              // Reemissões mais VELHAS que a linha principal, formando a
              // sequência que a âncora deve capturar.
              const tail: MaintenanceAlertRow[] = [];
              for (let i = 1; i <= streakShape; i += 1) {
                tail.push(
                  mk(
                    `a-${seq}-r${i}`,
                    routine,
                    severity,
                    Math.max(0, level - 1),
                    age + i * DAY,
                    null,
                    null,
                  ),
                );
              }

              const model = buildMaintenanceConsole([head, ...tail], NOW);
              const view = model.rows.find((r) => r.id === head.id);
              check(view !== undefined, `linha ${head.id} presente no modelo`);
              if (!view) continue;

              // P1 — perfil resolvido bate com a régua central.
              check(view.profileId === profile.id, `perfil de ${routine} = ${profile.id}`);

              if (acked) {
                // P3
                check(view.minutesToNextLevel === null, 'reconhecido sem previsão');
                check(view.conditionAgeMinutes === null, 'reconhecido sem âncora');
                check(view.canAcknowledge === false, 'reconhecido sem ação');
              } else {
                // P5
                if (view.minutesToNextLevel !== null) {
                  check(view.minutesToNextLevel >= 0, 'previsão não-negativa');
                  const target = profile.ladderMinutes[view.severity][view.effectiveLevel + 1];
                  check(
                    target !== null && target !== undefined,
                    'previsão só existe com degrau declarado',
                  );
                  if (typeof target === 'number') {
                    check(
                      view.minutesToNextLevel <= Math.max(target, profile.minStepMinutes) + 0.2,
                      `previsão ${view.minutesToNextLevel} dentro do degrau ${target}`,
                    );
                  }
                } else {
                  const ceiling = profile.maxLevel[view.severity];
                  const target = profile.ladderMinutes[view.severity][view.effectiveLevel + 1];
                  check(
                    view.effectiveLevel >= ceiling || target === null || target === undefined,
                    'ausência de previsão só no teto ou degrau inalcançável',
                  );
                }

                // P4 — a idade da escada nunca encolhe a linha.
                if (view.conditionAgeMinutes !== null) {
                  check(
                    view.conditionAgeMinutes >= view.ageMinutes - 0.2,
                    'âncora nunca é mais nova que a linha',
                  );
                  check(
                    profile.anchorMode === 'streak',
                    'âncora só aparece em perfil de sequência',
                  );
                  check(view.conditionRows === streakShape + 1, 'contagem da sequência');
                } else {
                  check(
                    profile.anchorMode === 'row',
                    'perfil de sequência aberto sempre tem âncora',
                  );
                }
              }

              // P7 — perfil operacional idêntico à régua histórica.
              if (profile === OPERATIONAL_PROFILE && !acked) {
                const legacy = minutesToNextLevel(
                  view.severity,
                  view.level,
                  view.ageMinutes,
                  lastStep === null ? null : lastStep,
                );
                check(
                  (legacy === null && view.minutesToNextLevel === null) ||
                    (legacy !== null &&
                      view.minutesToNextLevel !== null &&
                      Math.abs(legacy - view.minutesToNextLevel) < 0.2),
                  `não-regressão operacional: ${legacy} vs ${view.minutesToNextLevel}`,
                );
              }

              // P8 — resumo coerente.
              const open = model.rows.filter((r) => r.status === 'open');
              check(model.summary.open === open.length, 'resumo conta abertos');
              check(
                model.summary.openCritical + model.summary.openWarning === model.summary.open,
                'resumo particiona por severidade',
              );
            }
          }
        }
      }
    }
  }
}

// P2 — chaves distintas nunca compartilham âncora.
{
  const velha = mk('velha', 'admission_trend:ledger_stock', 'critical', 0, 30 * DAY, null, null);
  const nova = mk('nova', 'admission_reconcile:ledger_stock', 'critical', 0, 10, null, null);
  const model = buildMaintenanceConsole([velha, nova], NOW);
  const novaView = model.rows.find((r) => r.id === 'nova')!;
  check(novaView.conditionAgeMinutes! < 60, 'chave nova não herda âncora de outra chave');
}

// P6 — envelhecer a condição nunca aumenta a previsão.
{
  const routine = 'admission_trend:ledger_stock';
  let previous = Number.POSITIVE_INFINITY;
  for (const age of [0, 60, DAY, 2 * DAY, 3 * DAY, 6 * DAY, 7 * DAY, 30 * DAY]) {
    const model = buildMaintenanceConsole(
      [mk('x', routine, 'critical', 0, age, null, null)],
      NOW,
    );
    const forecast = model.rows[0].minutesToNextLevel;
    const value = forecast === null ? 0 : forecast;
    check(value <= previous + 0.001, `monotonicidade da previsão em ${age} min`);
    previous = value;
  }
}

// Reconhecimento reancora (O5 espelhado no painel).
{
  const routine = 'admission_trend:ledger_stock';
  const model = buildMaintenanceConsole(
    [
      mk('antiga', routine, 'critical', 3, 40 * DAY, null, 20 * DAY),
      mk('recente', routine, 'critical', 0, 60, null, null),
    ],
    NOW,
  );
  const recente = model.rows.find((r) => r.id === 'recente')!;
  check(recente.conditionAgeMinutes! < DAY, 'reconhecimento reancora a sequência no painel');
  check(recente.effectiveLevel === 0, 'nível não é herdado através do reconhecimento');
}

// Entrada hostil não derruba o modelo.
{
  const model = buildMaintenanceConsole(
    [
      mk('lixo', 'admission_trend:ledger_stock', 'bogus', Number.NaN, 0, null, null),
      { ...mk('futuro', 'admission_trend:ledger_stock', 'critical', 1, -500, null, null) },
      { ...mk('semdata', 'admission_trend:ledger_stock', 'critical', 1, 0, null, null), created_at: 'nao-e-data' },
    ],
    NOW,
  );
  check(model.rows.length === 3, 'entrada hostil preserva todas as linhas');
  for (const r of model.rows) {
    check(r.ageMinutes >= 0, 'idade nunca negativa');
    check(r.conditionRows >= 1, 'sequência nunca vazia para linha aberta');
  }
}

console.log(
  `\nOnda 239 — ${assertions.toLocaleString('pt-BR')} asserções, ${failures} falha(s).`,
);
if (failures > 0) process.exit(1);
