/**
 * Onda 249 — gate de CI do decaimento do reconhecimento na escada.
 *
 * Prova três coisas que teste unitário não alcança:
 *  1. **Paridade TS↔SQL** do portão (`escalationAckGate` ↔
 *     `public.escalation_ack_gate`), varrida em todas as combinações de
 *     severidade × idade do ack × autoria × persistência × agravamento.
 *  2. **Ausência do defeito** — a definição de
 *     `escalate_stale_maintenance_alerts` não pode voltar a filtrar
 *     `acknowledged_at IS NULL` no laço principal. Foi exatamente essa
 *     cláusula que desligava a escada para sempre.
 *  3. **Exercício dinâmico** — o autoteste `escalation_decay_selftest()` roda
 *     de verdade, incluindo a prova adversarial em dados reais.
 */

import { execFileSync } from 'node:child_process';
import {
  escalationAckGate,
  type EscalationAckContext,
} from '../src/lib/maintenance/escalationAckGate.ts';
import type { AlertSeverity } from '../src/lib/maintenance/acknowledgementDecay.ts';

const failures: string[] = [];
let probes = 0;

function check(label: string, ok: boolean, extra = ''): void {
  probes += 1;
  if (!ok) failures.push(`${label}${extra ? `: ${extra}` : ''}`);
}

function sql(query: string): string {
  return execFileSync('psql', ['-At', '-c', query], { encoding: 'utf8' }).trim();
}

// --------------------------------------------------------------- 1. paridade
const NOW_SQL = "TIMESTAMPTZ '2026-07-29 12:00:00+00'";
const NOW_MS = Date.parse('2026-07-29T12:00:00Z');
const MIN = 60_000;

const severities: AlertSeverity[] = ['warning', 'critical'];
const ackAges = [0, 29, 121, 719, 721, 5000];
const authors: (string | null)[] = [null, 'operador'];
const persists: (boolean | null)[] = [true, false, null];
const atAck: (AlertSeverity | null)[] = [null, 'warning', 'critical'];

for (const severity of severities) {
  for (const age of ackAges) {
    for (const author of authors) {
      for (const p of persists) {
        for (const sAck of atAck) {
          const ack: EscalationAckContext = {
            acknowledgedBy: author,
            severityAtAck: sAck,
            conditionPersists: p,
          };
          const ts = escalationAckGate(
            { acknowledgedAtMs: NOW_MS - age * MIN, severityNow: severity, ack },
            NOW_MS,
          );
          const lit = (v: unknown) => (v === null ? 'NULL' : typeof v === 'string' ? `'${v}'` : String(v));
          const row = sql(
            `SELECT (g->>'state') || '|' || (g->>'freezes_ladder') || '|' || (g->>'cuts_streak')
               FROM public.escalation_ack_gate(
                 ${NOW_SQL} - INTERVAL '${age} min',
                 ${lit(author)}, ${lit(sAck)}, ${lit(severity)}, ${lit(p)}, false, 60, ${NOW_SQL}) g`,
          );
          check(
            `paridade ${severity}/${age}min/autor=${author}/persiste=${p}/ack=${sAck}`,
            row === `${ts.state}|${ts.freezesLadder}|${ts.cutsStreak}`,
            `SQL=${row} TS=${ts.state}|${ts.freezesLadder}|${ts.cutsStreak}`,
          );
        }
      }
    }
  }
}

// ------------------------------------------------- 2. o defeito não pode voltar
const def = sql(
  "SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname = 'escalate_stale_maintenance_alerts'",
);
check('escada não filtra por acknowledged_at no laço principal', !/WHERE[\s\S]*?e\.acknowledged_at IS NULL/.test(def));
check('escada consulta o portão de reconhecimento', def.includes('escalation_ack_frozen'));

// ---------------------------------------------------- 3. exercício dinâmico
const selftest = sql(
  "SELECT string_agg(guard || '=' || ok, ' | ' ORDER BY guard) FROM public.escalation_decay_selftest()",
);
check('autoteste sem guarda vermelha', !selftest.includes('=false'), selftest);
check('autoteste inclui prova adversarial', selftest.includes('ADVERSARIAL'), selftest);

// ---------------------------------------------------------------------------
console.log(`Onda 249 — gate: ${probes} verificações`);
if (failures.length > 0) {
  console.error(`FALHAS (${failures.length}):`);
  for (const f of failures.slice(0, 20)) console.error(` - ${f}`);
  process.exit(1);
}
console.log('✅ decaimento do reconhecimento na escada verificado em produção.');
