#!/usr/bin/env node
/**
 * Onda 110 — Simulação de cenários para os ALERTAS CRÍTICOS DE MANUTENÇÃO.
 *
 * As Ondas 107/108/109 criaram três rotinas noturnas (cobertura de partições,
 * drenagem da DEFAULT e triagem da quarentena). Todas gravam telemetria, mas
 * ninguém é avisado quando elas param de rodar ou falham em silêncio — que é
 * exatamente o modo de falha mais perigoso: o banco degrada por semanas sem
 * nenhum sinal na UI.
 *
 * Esta simulação varre a matriz completa de estados possíveis das três rotinas
 * e valida as regras do avaliador de alertas ANTES de tocar no banco:
 *
 *   dimensões: rotina × frescor × resultado × backlog × trava × cooldown × canal
 *
 * Uso: node scripts/simulate-wave110-scenarios.mjs
 */

/* ------------------------------------------------------------------ *
 * Modelo de referência (espelha a lógica de evaluate_maintenance_alerts)
 * ------------------------------------------------------------------ */

/** Janela máxima aceita entre execuções antes de considerar a rotina parada. */
const STALE_HOURS = 48;
/** Silêncio mínimo entre dois alertas do mesmo (rotina, severidade). */
const COOLDOWN_HOURS = 6;
/** Backlog da DEFAULT que caracteriza incidente de ingestão. */
const BACKLOG_CRITICAL = 10_000;

const ROUTINES = ['partition_maintenance', 'partition_drain', 'partition_quarantine'];
const FRESHNESS = [0, 12, 47, 49, 200, null]; // horas desde a última execução; null = nunca rodou
const RESULTS = ['ok', 'failed'];
const BACKLOGS = [0, 500, 10_001];
const LOCKED = [false, true];
const COOLDOWNS = [null, 1, 7]; // horas desde o último alerta idêntico

/**
 * Decide o que o avaliador deve fazer para um estado.
 * @param {{routine:string, ageHours:number|null, result:string, backlog:number,
 *          lockedOut:boolean, lastAlertHours:number|null}} s
 * @returns {{severity:'none'|'warning'|'critical', reason:string, emit:boolean}}
 */
function evaluate(s) {
  /** @type {'none'|'warning'|'critical'} */
  let severity = 'none';
  let reason = 'saudável';

  // R1 — nunca executou: crítico, o agendamento pode nem existir.
  if (s.ageHours === null) {
    severity = 'critical';
    reason = 'rotina nunca executou';
  }
  // R2 — parada além da janela: crítico.
  else if (s.ageHours > STALE_HOURS) {
    severity = 'critical';
    reason = `sem execução há ${s.ageHours}h`;
  }
  // R3 — última execução falhou: crítico (dado pode estar sendo rejeitado).
  else if (s.result === 'failed') {
    severity = 'critical';
    reason = 'última execução falhou';
  }
  // R4 — backlog acima do limite: crítico mesmo com execuções OK.
  else if (s.backlog > BACKLOG_CRITICAL) {
    severity = 'critical';
    reason = `backlog de ${s.backlog} linhas na DEFAULT`;
  }
  // R5 — adiada por trava é apenas aviso: a rotina existe e voltará amanhã.
  else if (s.lockedOut) {
    severity = 'warning';
    reason = 'execução adiada por trava concorrente';
  }
  // R6 — backlog não nulo, porém sob controle: aviso.
  else if (s.backlog > 0) {
    severity = 'warning';
    reason = `backlog residual de ${s.backlog} linhas`;
  }

  // R7 — cooldown: nunca repetir o mesmo alerta dentro da janela de silêncio.
  const suppressed =
    severity !== 'none' && s.lastAlertHours !== null && s.lastAlertHours < COOLDOWN_HOURS;

  return { severity, reason, emit: severity !== 'none' && !suppressed };
}

/* ------------------------------------------------------------------ *
 * Execução da matriz
 * ------------------------------------------------------------------ */

let total = 0;
let emitted = 0;
let suppressed = 0;
/** @type {Map<string, number>} */
const bySeverity = new Map();
/** @type {string[]} */
const violations = [];

for (const routine of ROUTINES) {
  for (const ageHours of FRESHNESS) {
    for (const result of RESULTS) {
      for (const backlog of BACKLOGS) {
        for (const lockedOut of LOCKED) {
          for (const lastAlertHours of COOLDOWNS) {
            total += 1;
            const s = { routine, ageHours, result, backlog, lockedOut, lastAlertHours };
            const out = evaluate(s);

            bySeverity.set(out.severity, (bySeverity.get(out.severity) ?? 0) + 1);
            if (out.emit) emitted += 1;
            else if (out.severity !== 'none') suppressed += 1;

            /* Invariantes que a migração DEVE preservar ------------------ */

            // I1 — silêncio jamais é aceitável quando a rotina parou.
            if ((ageHours === null || ageHours > STALE_HOURS) && out.severity !== 'critical') {
              violations.push(`I1 ${routine}: rotina parada não gerou crítico (age=${ageHours})`);
            }

            // I2 — falha registrada nunca pode virar apenas aviso.
            if (result === 'failed' && ageHours !== null && ageHours <= STALE_HOURS) {
              if (out.severity !== 'critical') {
                violations.push(`I2 ${routine}: falha não escalou para crítico`);
              }
            }

            // I3 — trava concorrente sozinha nunca é crítica (é operação normal).
            if (
              lockedOut &&
              result === 'ok' &&
              backlog === 0 &&
              ageHours !== null &&
              ageHours <= STALE_HOURS &&
              out.severity === 'critical'
            ) {
              violations.push(`I3 ${routine}: trava concorrente escalou indevidamente`);
            }

            // I4 — cooldown só pode suprimir, nunca rebaixar a severidade.
            if (out.severity !== 'none' && !out.emit && lastAlertHours === null) {
              violations.push(`I4 ${routine}: suprimiu sem alerta anterior`);
            }

            // I5 — estado plenamente saudável não pode gerar ruído.
            if (
              ageHours !== null &&
              ageHours <= STALE_HOURS &&
              result === 'ok' &&
              backlog === 0 &&
              !lockedOut &&
              out.severity !== 'none'
            ) {
              violations.push(`I5 ${routine}: alerta falso-positivo em estado saudável`);
            }
          }
        }
      }
    }
  }
}

/* ------------------------------------------------------------------ *
 * Gaps mapeados (viram requisitos da migração)
 * ------------------------------------------------------------------ */
const GAPS = [
  'G1 — "nunca executou" precisa ser detectado por ausência de linha, não por idade.',
  'G2 — cooldown por (rotina, severidade) evita inundar o operador a cada hora.',
  'G3 — o avaliador é READ-ONLY sobre as telemetrias; só escreve na própria tabela de alertas.',
  'G4 — locked_out repetido por >48h deixa de ser aviso e vira rotina parada (coberto por R2).',
  'G5 — a tabela de alertas precisa de RLS + GRANT explícito (leitura só para admin).',
  'G6 — statement_timeout curto: o avaliador roda de hora em hora e não pode travar o pool.',
  'G7 — despacho externo (Telegram/e-mail) é assíncrono; a persistência não pode depender dele.',
  'G8 — retenção: alertas antigos são podados para a tabela não virar um log infinito.',
];

console.log('\n=== Onda 110 — Simulação de alertas críticos de manutenção ===\n');
console.log(`Cenários avaliados : ${total}`);
console.log(`Alertas emitidos   : ${emitted}`);
console.log(`Suprimidos (cooldown): ${suppressed}`);
for (const [sev, count] of [...bySeverity.entries()].sort()) {
  console.log(`  severidade ${sev.padEnd(9)}: ${count}`);
}
console.log('\nGaps mapeados:');
for (const g of GAPS) console.log(`  ${g}`);

if (violations.length > 0) {
  console.error('\n❌ Invariantes violadas:');
  for (const v of violations.slice(0, 20)) console.error(`  - ${v}`);
  process.exit(1);
}

console.log('\n✅ Todas as invariantes (I1..I5) mantidas em todos os cenários.\n');
