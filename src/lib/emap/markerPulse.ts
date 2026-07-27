import type { MapMarkerStatus } from './floorPlanGeometry';
import type { StatusTransition } from './markerStatusStream';

/**
 * Onda 164 — pulso visual do marcador que acabou de piorar.
 *
 * Um mapa de situação com 60 câmeras é grande demais para o olho varrer: se
 * uma câmera cai no canto inferior direito, o operador só descobre quando
 * alguém liga. O pulso resolve isso marcando *o que mudou agora*, sem mentir:
 *
 *   1. **Só agravamento pulsa.** Voltar ao normal é boa notícia; boa notícia
 *      não pisca na cara de ninguém.
 *   2. **Melhora apaga o pulso na hora.** Marcador que normalizou não pode
 *      continuar piscando — seria pedir atenção para um problema resolvido.
 *   3. **Piorar de novo renova e sobe.** Novo agravamento estende o prazo e
 *      assume o estado mais grave; nunca rebaixa o pulso em curso.
 *   4. **O pulso morre pelo relógio, não pelo render.** Expiração é função
 *      pura de `now`; a tela apenas pergunta.
 *   5. **Ciência apaga.** Selecionar/reconhecer o marcador remove o pulso —
 *      já foi visto.
 *
 * Todo o módulo é puro e imutável: nenhuma entrada é modificada, e chamadas
 * que não mudam nada devolvem a mesma referência (barato para o React).
 */

const SEVERITY: readonly MapMarkerStatus[] = ['alert', 'offline', 'warning', 'unknown', 'online'];

const severityRank = (status: MapMarkerStatus): number => {
  const index = SEVERITY.indexOf(status);
  return index === -1 ? SEVERITY.indexOf('unknown') : index;
};

/** Verdadeiro quando `candidate` é estritamente mais grave que `current`. */
const isWorse = (candidate: MapMarkerStatus, current: MapMarkerStatus): boolean =>
  severityRank(candidate) < severityRank(current);

export interface PulseConfig {
  /** Duração do destaque após o agravamento. */
  ttlMs: number;
}

export const DEFAULT_PULSE_CONFIG: PulseConfig = { ttlMs: 12_000 };

export interface Pulse {
  cameraId: string;
  /** Estado que motivou o pulso (o mais grave observado na janela). */
  status: MapMarkerStatus;
  /** Instante do primeiro agravamento desta janela. */
  startedAt: number;
  /** Instante em que o destaque deixa de valer. */
  expiresAt: number;
  /** Quantos agravamentos consecutivos renovaram este pulso. */
  hits: number;
}

export type PulseLedger = Readonly<Record<string, Pulse>>;

export const emptyPulseLedger = (): PulseLedger => ({});

/** Relógio inválido não pode virar pulso eterno nem pulso natimorto. */
const sanitizeNow = (now: number): number => (Number.isFinite(now) ? now : 0);

const sanitizeTtl = (ttlMs: number): number =>
  Number.isFinite(ttlMs) && ttlMs > 0 ? ttlMs : DEFAULT_PULSE_CONFIG.ttlMs;

const normalizeStatus = (status: MapMarkerStatus): MapMarkerStatus =>
  SEVERITY.includes(status) ? status : 'unknown';

/**
 * Registra os agravamentos de uma leva e apaga os pulsos de quem melhorou.
 *
 * Recebe as transições já apuradas por `diffLedgers`, mas não confia no campo
 * `worsened`: recalcula a partir dos estados, para que um chamador distraído
 * (ou um teste malicioso) não consiga acender pulso em melhora.
 */
export function registerPulses(
  ledger: PulseLedger,
  transitions: readonly StatusTransition[],
  now: number,
  config: PulseConfig = DEFAULT_PULSE_CONFIG,
): PulseLedger {
  if (transitions.length === 0) return ledger;

  const clock = sanitizeNow(now);
  const ttl = sanitizeTtl(config.ttlMs);
  let next: Record<string, Pulse> | null = null;
  const mutate = (): Record<string, Pulse> => {
    next ??= { ...ledger };
    return next;
  };

  for (const transition of transitions) {
    if (!transition?.cameraId) continue;
    const to = normalizeStatus(transition.to);
    const from = normalizeStatus(transition.from);
    const current = (next ?? ledger)[transition.cameraId];

    if (!isWorse(to, from)) {
      // Melhorou (ou empatou): silencia o destaque em curso.
      if (current) delete mutate()[transition.cameraId];
      continue;
    }

    mutate()[transition.cameraId] = {
      cameraId: transition.cameraId,
      // Renovar nunca rebaixa: o operador precisa ver o pior desta janela.
      status: current && isWorse(current.status, to) ? current.status : to,
      startedAt: current ? current.startedAt : clock,
      expiresAt: clock + ttl,
      hits: current ? current.hits + 1 : 1,
    };
  }

  return next ?? ledger;
}

/** Remove os pulsos vencidos. Devolve a mesma referência se nada venceu. */
export function expirePulses(ledger: PulseLedger, now: number): PulseLedger {
  const clock = sanitizeNow(now);
  const expired = Object.keys(ledger).filter((id) => {
    const pulse = ledger[id];
    return !pulse || pulse.expiresAt <= clock;
  });
  if (expired.length === 0) return ledger;
  const next = { ...ledger };
  for (const id of expired) delete next[id];
  return next;
}

/** Apaga o pulso de uma câmera (ciência do operador). */
export function clearPulse(ledger: PulseLedger, cameraId: string): PulseLedger {
  if (!(cameraId in ledger)) return ledger;
  const next = { ...ledger };
  delete next[cameraId];
  return next;
}

/** Pulsos ainda válidos, do mais grave para o menos, com desempate estável. */
export function activePulses(ledger: PulseLedger, now: number): readonly Pulse[] {
  const clock = sanitizeNow(now);
  return Object.values(ledger)
    .filter((pulse): pulse is Pulse => Boolean(pulse) && pulse.expiresAt > clock)
    .sort(
      (a, b) =>
        severityRank(a.status) - severityRank(b.status) ||
        a.startedAt - b.startedAt ||
        a.cameraId.localeCompare(b.cameraId),
    );
}

/** Conjunto de câmeras em destaque — formato que a tela consome direto. */
export function pulsingCameraIds(ledger: PulseLedger, now: number): ReadonlySet<string> {
  return new Set(activePulses(ledger, now).map((pulse) => pulse.cameraId));
}

/** Consulta pontual, sem alocar conjunto. */
export function isPulsing(ledger: PulseLedger, cameraId: string, now: number): boolean {
  const pulse = ledger[cameraId];
  return pulse !== undefined && pulse.expiresAt > sanitizeNow(now);
}


/** Próximo vencimento — permite agendar um único timer em vez de N. */
export function nextExpiry(ledger: PulseLedger, now: number): number | null {
  const pulses = activePulses(ledger, now);
  if (pulses.length === 0) return null;
  return pulses.reduce((min, pulse) => Math.min(min, pulse.expiresAt), Number.POSITIVE_INFINITY);
}
