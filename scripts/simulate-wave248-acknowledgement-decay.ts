/**
 * Onda 248 — Simulação combinatória do decaimento de reconhecimento.
 *
 * Percorre o espaço de estados completo (autor × severidades × persistência ×
 * idade do ack × auto-referência × cadência) e afirma as leis X1–X10 em cada
 * ponto. Além disso, faz uma **prova adversarial** da lei X2: gera carteiras
 * aleatórias de alertas críticos e verifica que reconhecer qualquer
 * subconjunto delas jamais reduz a contagem que sustenta a acusação de mudez.
 *
 * Execução: `npx tsx scripts/simulate-wave248-acknowledgement-decay.ts`
 */

import {
  acknowledgementLabel,
  assessAcknowledgement,
  launderedCriticalCount,
  promiseWindowMinutes,
  undeliveredCriticalCount,
  PROMISE_CEILING_MINUTES,
  PROMISE_FLOOR_MINUTES,
  type AcknowledgementInput,
  type AcknowledgementState,
  type AlertSeverity,
  type CriticalAlertRow,
} from '../src/lib/maintenance/acknowledgementDecay.ts';

let scenarios = 0;
let assertions = 0;
const failures: string[] = [];

function check(condition: boolean, message: string): void {
  assertions += 1;
  if (!condition) failures.push(message);
}

const NOW = Date.UTC(2026, 6, 29, 16, 0, 0);
const MIN = 60_000;

const AUTHORS: (string | null)[] = [null, '', '   ', 'admin-uuid', 'operador@visao'];
const SEV_AT_ACK: (AlertSeverity | null)[] = [null, 'warning', 'critical'];
const SEV_NOW: AlertSeverity[] = ['warning', 'critical'];
const PERSISTS: (boolean | null)[] = [true, false, null];
const AGES_MIN = [-500, 0, 1, 29, 60, 119, 121, 719, 721, 1_439, 1_441, 99_999];
const SELF_REF = [true, false];
const CADENCES = [1, 15, 60, 240, 1_440, 5_000];

const VALID_STATES = new Set<AcknowledgementState>([
  'none',
  'pending',
  'honored',
  'expired',
  'void_aggravated',
  'void_unattributed',
]);

for (const acknowledgedBy of AUTHORS) {
  for (const severityAtAck of SEV_AT_ACK) {
    for (const severityNow of SEV_NOW) {
      for (const conditionPersists of PERSISTS) {
        for (const ageMin of AGES_MIN) {
          for (const selfReferential of SELF_REF) {
            for (const cadenceMinutes of CADENCES) {
              for (const everAcked of [true, false]) {
                scenarios += 1;
                const input: AcknowledgementInput = {
                  acknowledgedAtMs: everAcked ? NOW - ageMin * MIN : null,
                  acknowledgedBy,
                  severityAtAck,
                  severityNow,
                  conditionPersists,
                  selfReferential,
                  cadenceMinutes,
                };
                const v = assessAcknowledgement(input, NOW);

                // X10 — todo estado é nomeado e rotulável.
                check(VALID_STATES.has(v.state), `X10 violada: estado ${v.state} desconhecido`);
                check(
                  typeof acknowledgementLabel(v.state) === 'string' &&
                    acknowledgementLabel(v.state).length > 0,
                  `X10 violada: estado ${v.state} sem rótulo`
                );
                check(v.reason.trim().length > 0, 'veredito sem justificativa legível');

                if (!everAcked) {
                  check(v.state === 'none', 'sem ack deveria ser none');
                  check(!v.suppressesEscalation, 'sem ack não pode silenciar escada');
                  check(!v.clearsCondition, 'sem ack não pode limpar condição');
                  continue;
                }

                const hasAuthor =
                  typeof acknowledgedBy === 'string' && acknowledgedBy.trim() !== '';

                // X9 — ack sem autor nunca compra silêncio, em nenhuma combinação.
                if (!hasAuthor) {
                  check(
                    v.state === 'void_unattributed',
                    `X9 violada: ack sem autor virou ${v.state}`
                  );
                  check(!v.suppressesEscalation, 'X9 violada: ack sem autor silenciou escada');
                  check(!v.clearsCondition, 'X9 violada: ack sem autor limpou condição');
                  continue;
                }

                // X5 — agravamento invalida, e vence até a condição resolvida.
                if (severityAtAck === 'warning' && severityNow === 'critical') {
                  check(v.state === 'void_aggravated', `X5 violada: agravamento virou ${v.state}`);
                  check(!v.suppressesEscalation, 'X5 violada: ack agravado silenciou escada');
                  continue;
                }

                // X4 — condição resolvida honra o ack, mesmo com prazo vencido.
                if (conditionPersists === false) {
                  check(v.state === 'honored', `X4 violada: condição limpa virou ${v.state}`);
                  check(v.suppressesEscalation, 'X4 violada: honrado não silenciou');
                  // X7 — auto-referente nunca pinta saúde, nem honrado.
                  check(
                    v.clearsCondition === !selfReferential,
                    'X7 violada: auto-referente limpou condição'
                  );
                  continue;
                }

                // Persistência desconhecida (`null`) nunca honra: fail-safe.
                if (conditionPersists === null) {
                  check(
                    v.state !== 'honored',
                    'fail-safe violado: ignorância sobre a condição honrou o ack'
                  );
                }

                // X3 — condição viva: a janela decide entre pending e expired.
                const window = promiseWindowMinutes(severityNow, cadenceMinutes);
                check(v.windowMinutes === window, 'janela publicada diverge da janela calculada');
                const expected: AcknowledgementState = ageMin >= window ? 'expired' : 'pending';
                check(
                  v.state === expected,
                  `X3 violada: idade ${ageMin} vs janela ${window} virou ${v.state}`
                );

                // X1 — atenção nunca é remediação, em nenhum estado ativo.
                check(
                  !v.clearsCondition,
                  `X1 violada: ${v.state} com condição ativa limpou a condição`
                );

                if (v.state === 'expired') {
                  check(!v.suppressesEscalation, 'X3 violada: ack vencido ainda silenciava');
                  check(v.minutesRemaining === 0, 'ack vencido com saldo de silêncio');
                } else {
                  check(v.suppressesEscalation, 'ack válido não silenciou escada');
                  check(
                    v.minutesRemaining !== null &&
                      v.minutesRemaining >= 0 &&
                      v.minutesRemaining <= window,
                    `saldo de silêncio fora da janela: ${v.minutesRemaining}/${window}`
                  );
                }
              }
            }
          }
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// X8 — janela: faixa, ordenação por urgência e falha alta em cadência inválida.
// ---------------------------------------------------------------------------
for (const cadence of CADENCES) {
  scenarios += 1;
  const crit = promiseWindowMinutes('critical', cadence);
  const warn = promiseWindowMinutes('warning', cadence);
  check(crit <= warn, `X8 violada: crítico compra mais silêncio (${crit}) que aviso (${warn})`);
  check(
    crit >= PROMISE_FLOOR_MINUTES && warn <= PROMISE_CEILING_MINUTES,
    `X8 violada: faixa rompida em cadência ${cadence}`
  );
  check(
    crit >= Math.min(PROMISE_CEILING_MINUTES, cadence),
    'X8 violada: reacusaria antes de a fonte medir de novo'
  );
}

for (const bad of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
  scenarios += 1;
  let threw = false;
  try {
    promiseWindowMinutes('critical', bad);
  } catch {
    threw = true;
  }
  check(threw, `cadência inválida ${bad} não falhou alto`);
}

// ---------------------------------------------------------------------------
// X2 — prova adversarial: nenhum padrão de reconhecimento reduz a acusação.
//
// Este é o defeito real que originou a onda. Geramos carteiras aleatórias e,
// para cada uma, reconhecemos subconjuntos crescentes — a contagem de dano
// tem de permanecer rigorosamente constante.
// ---------------------------------------------------------------------------
let seed = 0x248;
function rnd(): number {
  // xorshift determinístico: a simulação precisa ser reproduzível.
  seed ^= seed << 13;
  seed ^= seed >>> 17;
  seed ^= seed << 5;
  return Math.abs(seed) / 0x7fffffff;
}

for (let trial = 0; trial < 400; trial += 1) {
  const size = 1 + Math.floor(rnd() * 60);
  const base: CriticalAlertRow[] = [];
  for (let i = 0; i < size; i += 1) {
    base.push({ delivered: rnd() < 0.35, acknowledgedAtMs: null });
  }
  const baseline = undeliveredCriticalCount(base);
  check(
    baseline === base.filter((r) => !r.delivered).length,
    'contagem de dano diverge da definição'
  );
  check(launderedCriticalCount(base) === 0, 'lavagem detectada sem nenhum ack');

  // Reconhece progressivamente TODAS as linhas, uma a uma.
  const rows = base.map((r) => ({ ...r }));
  for (let i = 0; i < rows.length; i += 1) {
    scenarios += 1;
    rows[i] = { ...rows[i]!, acknowledgedAtMs: NOW - i * MIN };
    check(
      undeliveredCriticalCount(rows) === baseline,
      `X2 violada: reconhecer ${i + 1} alerta(s) mudou a acusação ` +
        `de ${baseline} para ${undeliveredCriticalCount(rows)}`
    );
    // A lavagem é medida, não escondida.
    const laundered = launderedCriticalCount(rows);
    check(
      laundered === rows.slice(0, i + 1).filter((r) => !r.delivered).length,
      'contagem de lavagem incorreta'
    );
    check(laundered <= baseline, 'lavagem maior que o próprio dano');
  }

  // Estado terminal: todos reconhecidos, acusação intacta.
  check(
    undeliveredCriticalCount(rows) === baseline,
    'X2 violada: reconhecer tudo apagou a acusação'
  );
}

// Carteira totalmente entregue: nada a acusar, nada a lavar.
scenarios += 1;
const allDelivered: CriticalAlertRow[] = Array.from({ length: 50 }, () => ({
  delivered: true,
  acknowledgedAtMs: NOW,
}));
check(undeliveredCriticalCount(allDelivered) === 0, 'entrega completa acusou dano');
check(launderedCriticalCount(allDelivered) === 0, 'entrega completa acusou lavagem');

if (failures.length > 0) {
  console.error(`❌ Onda 248: ${failures.length} violação(ões)`);
  for (const failure of failures.slice(0, 20)) console.error(`   - ${failure}`);
  process.exit(1);
}

console.log(
  `✅ Onda 248: ${scenarios} cenários / ${assertions} asserções — ` +
    'reconhecer nunca conserta, e nenhum ack reduz a acusação.'
);
