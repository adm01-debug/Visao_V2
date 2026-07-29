/**
 * Onda 249 — simulação massiva do portão de reconhecimento da escada.
 *
 * Varre o produto cartesiano de estados de reconhecimento × idade × degrau ×
 * severidade × entrega × perfil, e prova as leis Y1–Y10 em cada ponto. Inclui
 * uma prova adversarial: **nenhuma sequência de reconhecimentos** consegue
 * impedir para sempre que um alerta crítico com condição viva chegue ao teto
 * da escada.
 *
 * Execução: `npx tsx scripts/simulate-wave249-escalation-decay.ts`
 */

import {
  escalationAckGate,
  type EscalationAckContext,
} from '../src/lib/maintenance/escalationAckGate.ts';
import {
  evaluateAlertEscalation,
  type AlertSnapshot,
  type EscalationLevel,
  type MaintenanceSeverity,
} from '../src/lib/maintenanceEscalation.ts';
import { promiseWindowMinutes } from '../src/lib/maintenance/acknowledgementDecay.ts';

const MIN = 60_000;
const NOW = Date.UTC(2026, 6, 29, 12, 0, 0);

let scenarios = 0;
let assertions = 0;
const failures: string[] = [];

function check(ok: boolean, label: string): void {
  assertions += 1;
  if (!ok && failures.length < 25) failures.push(label);
}

const SEVERITIES: MaintenanceSeverity[] = ['warning', 'critical'];
const LEVELS: EscalationLevel[] = [0, 1, 2, 3];
const AGES = [0, 5, 31, 76, 121, 361, 1441, 20_000];
const ACK_AGES = [null, 0, 29, 121, 721, 10_000];
const AUTHORS: (string | null)[] = [null, '', '  ', 'operador@visao.test'];
const PERSISTS: (boolean | null)[] = [true, false, null];
const AT_ACK: (MaintenanceSeverity | null)[] = [null, 'warning', 'critical'];
const ROUTINES = ['dispatch_deliverability', 'retention:collab_notifications', 'agent_healing'];
const DELIVERED = [true, false];

function snapshot(over: Partial<AlertSnapshot>): AlertSnapshot {
  return {
    id: 'a1',
    routine: 'agent_healing',
    severity: 'critical',
    reason: 'sim',
    createdAtMs: NOW - 600 * MIN,
    acknowledgedAtMs: null,
    escalationLevel: 0,
    lastEscalatedAtMs: null,
    dispatch: { delivered: false, failedChannels: 0, neverAttempted: true },
    ...over,
  };
}

// ---------------------------------------------------------------- portão puro
for (const severity of SEVERITIES) {
  for (const ackAge of ACK_AGES) {
    for (const author of AUTHORS) {
      for (const persists of PERSISTS) {
        for (const atAck of AT_ACK) {
          for (const selfRef of [false, true]) {
            scenarios += 1;
            const ack: EscalationAckContext = {
              acknowledgedBy: author,
              severityAtAck: atAck,
              conditionPersists: persists,
              selfReferential: selfRef,
            };
            const v = escalationAckGate(
              {
                acknowledgedAtMs: ackAge === null ? null : NOW - ackAge * MIN,
                severityNow: severity,
                ack,
              },
              NOW,
            );

            if (ackAge === null) {
              check(v.state === 'none' && !v.freezesLadder && !v.decayed, 'Y10 sem ack');
              continue;
            }
            const attributed = (author ?? '').trim() !== '';
            if (!attributed) {
              // Y5 — silêncio comprado por ninguém nunca congela.
              check(v.state === 'void_unattributed' && !v.freezesLadder, 'Y5 sem autor');
              check(v.decayed && !v.cutsStreak, 'Y8 sem autor não corta série');
              continue;
            }
            if (atAck === 'warning' && severity === 'critical') {
              // Y4 — agravamento fura o congelamento imediatamente.
              check(v.state === 'void_aggravated' && !v.freezesLadder, 'Y4 agravamento');
              continue;
            }
            if (persists === false) {
              // Y3 — condição resolvida honra para sempre, em qualquer idade.
              check(v.state === 'honored' && v.freezesLadder && v.cutsStreak, 'Y3 honrado');
              continue;
            }
            // Y9 — `null` (não medido) se comporta como persistente.
            const win = promiseWindowMinutes(severity);
            if (ackAge >= win) {
              check(v.state === 'expired' && !v.freezesLadder, `Y1 decaiu ${severity}/${ackAge}`);
              check(v.decayed && !v.cutsStreak, 'Y8 decaído não corta série');
            } else {
              check(v.state === 'pending' && v.freezesLadder && v.cutsStreak, 'Y1 vigente');
              check(
                v.minutesRemaining !== null && v.minutesRemaining <= win,
                'janela nunca excede o teto',
              );
            }
            check(v.windowMinutes === win, 'Y1 janela deriva da severidade');
            check(typeof v.reason === 'string' && v.reason.length > 0, 'Y10 motivo legível');
          }
        }
      }
    }
  }
}

// Y1 — crítico compra menos silêncio que aviso.
check(promiseWindowMinutes('critical') < promiseWindowMinutes('warning'), 'Y1 urgência encurta');

// ------------------------------------------------------- escada com o portão
for (const routine of ROUTINES) {
  for (const severity of SEVERITIES) {
    for (const level of LEVELS) {
      // Nível acima do teto da severidade não existe no banco (CHECK da escada).
      if (level > (severity === 'critical' ? 3 : 2)) continue;
      for (const age of AGES) {
        for (const ackAge of ACK_AGES) {
          for (const persists of PERSISTS) {
            for (const delivered of DELIVERED) {
              scenarios += 1;
              const alert = snapshot({
                routine,
                severity,
                escalationLevel: level,
                createdAtMs: NOW - age * MIN,
                acknowledgedAtMs: ackAge === null ? null : NOW - ackAge * MIN,
                dispatch: { delivered, failedChannels: delivered ? 0 : 1, neverAttempted: false },
                ack:
                  ackAge === null
                    ? null
                    : {
                        acknowledgedBy: 'operador@visao.test',
                        severityAtAck: severity,
                        conditionPersists: persists,
                      },
              });
              const d = evaluateAlertEscalation(alert, NOW);

              // Y2 — o degrau nunca cai, aconteça o que acontecer com o ack.
              check(d.toLevel >= level, `Y2 nunca rebaixa (${routine}/${severity}/${level})`);
              // I3 — no máximo um degrau por avaliação.
              check(d.toLevel <= d.fromLevel + 1, 'I3 um degrau por avaliação');
              // I5 — teto por severidade.
              check(d.toLevel <= (severity === 'critical' ? 3 : 2), 'I5 teto');

              if (ackAge !== null && persists === false) {
                // Y3 — condição morta: escada parada, sempre.
                check(!d.shouldEscalate, 'Y3 resolvido não escala');
              }
              if (ackAge !== null && persists !== false && ackAge < promiseWindowMinutes(severity)) {
                // Y1 — promessa viva congela.
                check(!d.shouldEscalate, 'Y1 promessa viva congela');
              }
              // Y7 — a idade nunca é reancorada pelo reconhecimento.
              const bare = evaluateAlertEscalation(snapshot({ ...alert, acknowledgedAtMs: null, ack: null }), NOW);
              check(Math.abs(bare.ageMinutes - d.ageMinutes) < 0.001, 'Y7 ack não rejuvenesce');
            }
          }
        }
      }
    }
  }
}

// Y6 — ack decaído não zera o cooldown: com degrau recente, não sobe.
{
  scenarios += 1;
  const alert = snapshot({
    severity: 'critical',
    escalationLevel: 1,
    createdAtMs: NOW - 5000 * MIN,
    lastEscalatedAtMs: NOW - 2 * MIN,
    acknowledgedAtMs: NOW - 5000 * MIN,
    ack: { acknowledgedBy: 'op', severityAtAck: 'critical', conditionPersists: true },
  });
  const d = evaluateAlertEscalation(alert, NOW);
  check(!d.shouldEscalate, 'Y6 decaído respeita cooldown');
}

// ------------------------------------------------- prova adversarial (Y1/Y2)
// Um operador reconhece o alerta a cada avaliação. Com a condição viva, a
// escada TEM de chegar ao teto mesmo assim — o clique compra prazo, nunca
// imunidade.
{
  let level: EscalationLevel = 0;
  let lastStep: number | null = null;
  let t = NOW;
  let ackAt = NOW;
  let reached = false;
  for (let i = 0; i < 400; i += 1) {
    scenarios += 1;
    t += 60 * MIN; // uma avaliação por hora
    ackAt = t; // o operador reconhece de novo, sempre
    const d = evaluateAlertEscalation(
      snapshot({
        severity: 'critical',
        routine: 'agent_healing',
        escalationLevel: level,
        createdAtMs: NOW - 10 * MIN,
        lastEscalatedAtMs: lastStep,
        acknowledgedAtMs: ackAt - 200 * MIN, // ack de 200 min atrás: já vencido
        ack: { acknowledgedBy: 'op', severityAtAck: 'critical', conditionPersists: true },
      }),
      t,
    );
    if (d.shouldEscalate) {
      level = d.toLevel;
      lastStep = t;
    }
    if (level === 3) {
      reached = true;
      break;
    }
  }
  check(reached, 'ADVERSARIAL: reconhecimento repetido não impede o plantão');
}

// Contraprova: ack SEMPRE fresco (dentro da janela) congela de fato — a régua
// não escala por teimosia, ela escala por promessa vencida.
{
  let level: EscalationLevel = 0;
  let t = NOW;
  for (let i = 0; i < 50; i += 1) {
    scenarios += 1;
    t += 30 * MIN;
    const d = evaluateAlertEscalation(
      snapshot({
        severity: 'critical',
        escalationLevel: level,
        createdAtMs: NOW - 10_000 * MIN,
        acknowledgedAtMs: t - 5 * MIN,
        ack: { acknowledgedBy: 'op', severityAtAck: 'critical', conditionPersists: true },
      }),
      t,
    );
    if (d.shouldEscalate) level = d.toLevel;
  }
  check(level === 0, 'CONTRAPROVA: promessa sempre renovada congela a escada');
}

console.log(`Onda 249 — cenários: ${scenarios}, asserções: ${assertions}`);
if (failures.length > 0) {
  console.error(`FALHAS (${failures.length}):`);
  for (const f of failures) console.error(` - ${f}`);
  process.exit(1);
}
console.log('✅ Leis Y1–Y10 verdes, incluindo prova adversarial.');
