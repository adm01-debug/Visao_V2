/**
 * Onda 226 — Admissão de evento pelo esquema de alarme.
 *
 * Contexto: até a Onda 225 o sistema sabia responder "este esquema está armado
 * agora?" tanto na tela quanto no banco. Faltava a pergunta que o motor
 * realmente faz: **este evento, vindo desta origem, neste instante, deve virar
 * alarme?**
 *
 * Sem uma régua única, cada chamador improvisaria a sua — e o modo de falha
 * seria o pior possível: disparo fora da janela declarada, ou pior, silêncio
 * quando a vigilância estava valendo. Este módulo é a única porta.
 *
 * Leis (E1–E8):
 *  E1. Nenhum esquema casando com o evento é `no_scheme`: recusa **neutra**
 *      (ninguém pediu para vigiar isso), nunca tratada como falha.
 *  E2. Casamento exige tipo de evento idêntico E origem presente nas origens
 *      **efetivas** do esquema (declaradas menos as ausentes).
 *  E3. Origem marcada como ausente não escuta: `source_missing`. Ela ficou no
 *      cadastro para auditoria (lei S3), não para produzir alarme.
 *  E4. O veredito por esquema é `evaluateArmedNow` — nunca uma segunda
 *      interpretação da agenda. Só `armed`/`armed_degraded` admitem.
 *  E5. Relógio indeterminado **não admite**, mas é registrado como
 *      `indeterminate`, jamais como "fora da janela". Confundir ausência de
 *      informação com ausência de vigilância é mentir para o operador.
 *  E6. Admissão é OR: um único esquema armado basta. Quando ninguém admite, o
 *      motivo global é o mais informativo (precedência declarada abaixo), não
 *      o primeiro da lista.
 *  E7. A lista de vereditos preserva a ordem de entrada — auditoria estável.
 *  E8. Instante e fuso são sempre dados pelo chamador; o relógio do processo
 *      nunca participa da decisão.
 */

import { evaluateArmedNow, type ArmedState } from './armedNow';
import type { AlarmSchedule } from './alarmAggregation';

export type AdmissionReason =
  | 'admitted'
  | 'admitted_degraded'
  | 'indeterminate'
  | 'out_of_window'
  | 'inoperative'
  | 'disabled'
  | 'source_missing'
  | 'no_scheme';

export interface AdmissionScheme {
  readonly id: string;
  readonly eventType: string;
  readonly enabled: boolean;
  readonly health: 'ok' | 'inconsistent' | 'inoperative';
  readonly schedule: AlarmSchedule | null | undefined;
  /** Origens declaradas no cadastro (inclui as ausentes). */
  readonly sourceIds: readonly string[];
  /** Subconjunto das declaradas que sumiu do inventário (lei S3). */
  readonly missingSourceIds: readonly string[];
}

export interface AdmissionEvent {
  readonly sourceId: string;
  readonly eventType: string;
  /** Epoch ms. Inválido/ausente ⇒ E5. */
  readonly at: number | null | undefined;
  readonly tzOffsetMinutes: number;
}

export interface SchemeAdmission {
  readonly schemeId: string;
  readonly state: ArmedState;
  readonly admitted: boolean;
  readonly reason: AdmissionReason;
}

export interface AdmissionVerdict {
  readonly admitted: boolean;
  readonly reason: AdmissionReason;
  /** Esquemas que admitiram, na ordem de entrada (E7). */
  readonly admittingSchemeIds: readonly string[];
  /** Um veredito por esquema **casado** por tipo de evento (E7). */
  readonly perScheme: readonly SchemeAdmission[];
  /** Esquemas do mesmo tipo cuja origem estava marcada como ausente (E3). */
  readonly missingSourceSchemeIds: readonly string[];
}

/**
 * E6 — precedência do motivo global quando ninguém admite.
 *
 * Ordena do mais acionável para o menos: um relógio indeterminado exige
 * intervenção imediata; "fora da janela" é operação normal; "nenhum esquema"
 * é a ausência mais benigna. O maior peso vence.
 */
const REFUSAL_RANK: Record<AdmissionReason, number> = {
  admitted: 100,
  admitted_degraded: 100,
  indeterminate: 60,
  inoperative: 50,
  out_of_window: 40,
  disabled: 30,
  source_missing: 20,
  no_scheme: 10,
};

const STATE_TO_REASON: Record<ArmedState, AdmissionReason> = {
  armed: 'admitted',
  armed_degraded: 'admitted_degraded',
  idle: 'out_of_window',
  off: 'disabled',
  inoperative: 'inoperative',
  unknown: 'indeterminate',
};

const REASON_LABEL: Record<AdmissionReason, string> = {
  admitted: 'Admitido — vigilância valendo',
  admitted_degraded: 'Admitido com ressalva — esquema inconsistente',
  indeterminate: 'Indeterminado — relógio inválido, disparo não autorizado',
  out_of_window: 'Fora da janela declarada',
  inoperative: 'Esquema inoperante — corrija antes de contar com ele',
  disabled: 'Esquema desabilitado',
  source_missing: 'Origem marcada como ausente no cadastro',
  no_scheme: 'Nenhum esquema vigia este evento',
};

export const admissionReasonLabel = (reason: AdmissionReason): string =>
  REASON_LABEL[reason] ?? reason;

const norm = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');

/**
 * Porta única de admissão. Determinística: mesmas entradas, mesmo veredito.
 */
export function admitEvent(
  schemes: readonly AdmissionScheme[],
  event: AdmissionEvent
): AdmissionVerdict {
  const sourceId = norm(event?.sourceId);
  const eventType = norm(event?.eventType);
  const at = typeof event?.at === 'number' && Number.isFinite(event.at) ? event.at : null;
  const tz =
    typeof event?.tzOffsetMinutes === 'number' && Number.isFinite(event.tzOffsetMinutes)
      ? event.tzOffsetMinutes
      : 0;

  const perScheme: SchemeAdmission[] = [];
  const admittingSchemeIds: string[] = [];
  const missingSourceSchemeIds: string[] = [];

  for (const scheme of Array.isArray(schemes) ? schemes : []) {
    if (!scheme || norm(scheme.eventType) !== eventType || eventType === '') continue;

    const declared: string[] = [...(scheme.sourceIds ?? [])].map(norm).filter((s) => s !== '');
    const missing = new Set<string>(
      [...(scheme.missingSourceIds ?? [])].map(norm).filter((s) => s !== '')
    );

    if (!declared.includes(sourceId) || sourceId === '') continue;

    // E3 — origem ausente ficou no cadastro por auditoria; ela não escuta.
    if (missing.has(sourceId)) {
      missingSourceSchemeIds.push(scheme.id);
      perScheme.push({
        schemeId: scheme.id,
        state: 'inoperative',
        admitted: false,
        reason: 'source_missing',
      });
      continue;
    }

    // E4 — nunca reinterpretar a agenda aqui. `NaN` aciona a lei N6 (relógio
    // indeterminado) dentro da própria régua, sem duplicar a decisão.
    const verdict = evaluateArmedNow(
      { enabled: scheme.enabled === true, health: scheme.health, schedule: scheme.schedule },
      at ?? Number.NaN,
      tz
    );
    const reason = STATE_TO_REASON[verdict.state] ?? 'indeterminate';
    const admitted = verdict.effective === true;
    if (admitted) admittingSchemeIds.push(scheme.id);
    perScheme.push({ schemeId: scheme.id, state: verdict.state, admitted, reason });
  }

  if (admittingSchemeIds.length > 0) {
    // Ressalva só quando **todos** os que admitiram estão degradados: se algum
    // esquema íntegro admitiu, o alarme não carrega ressalva alheia.
    const anyClean = perScheme.some((p) => p.admitted && p.reason === 'admitted');
    return {
      admitted: true,
      reason: anyClean ? 'admitted' : 'admitted_degraded',
      admittingSchemeIds,
      perScheme,
      missingSourceSchemeIds,
    };
  }

  // E1/E6 — recusa: escolhe o motivo mais informativo entre os casados.
  let reason: AdmissionReason = 'no_scheme';
  for (const p of perScheme) {
    if (REFUSAL_RANK[p.reason] > REFUSAL_RANK[reason]) reason = p.reason;
  }

  return { admitted: false, reason, admittingSchemeIds, perScheme, missingSourceSchemeIds };
}
