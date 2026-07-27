import type { MapMarkerStatus } from '@/lib/emap/floorPlanGeometry';
import type { StatusTransition } from '@/lib/emap/markerStatusStream';

/**
 * Onda 163 — política de aviso do mapa de situação.
 *
 * A Onda 162 garantiu que o mapa mostra o estado certo. Falta decidir *quando
 * incomodar a pessoa de plantão*. Avisar de tudo é o mesmo que não avisar: em
 * uma frota de 60 câmeras, uma queda de link vira 60 toasts, o operador
 * desabilita o som e o alarme seguinte passa despercebido.
 *
 * Esta é a regra única de quem merece aviso. É pura: sem toast, sem áudio, sem
 * React, sem relógio próprio — o `now` sempre entra por parâmetro, para que a
 * simulação exercite rajada, oscilação e escalada de forma determinística.
 *
 * Decisões de projeto (cada uma existe por causa de uma falha prevista):
 *
 *   1. **Só piora avisa.** Recuperação é registrada mas não interrompe ninguém.
 *   2. **A primeira carga nunca avisa.** Abrir a página com 3 câmeras já em
 *      alarme não é uma novidade — é o estado do mundo. Sem isto, todo F5
 *      dispara um coro de alarmes falsos.
 *   3. **Escalada fura silêncio.** `warning → alert` avisa mesmo dentro do
 *      período de silêncio, e mesmo com a câmera marcada como instável. Silêncio
 *      por repetição JAMAIS pode engolir um agravamento.
 *   4. **Oscilação vira um aviso só.** Câmera que pisca entre estados entra em
 *      modo instável e é reportada uma vez como instável, não a cada pulso.
 *   5. **Rajada vira resumo.** Acima do teto de avisos individuais na mesma
 *      leva, emite-se um único aviso agregado — sinal de falha sistêmica, não
 *      de N falhas independentes.
 */

const SEVERITY: readonly MapMarkerStatus[] = ['alert', 'offline', 'warning', 'unknown', 'online'];

const severityRank = (status: MapMarkerStatus): number => {
  const index = SEVERITY.indexOf(status);
  return index === -1 ? SEVERITY.indexOf('unknown') : index;
};

/** Pior estado primeiro. Usado para ordenar o que o operador lê antes. */
export const compareBySeverity = (a: MapMarkerStatus, b: MapMarkerStatus): number =>
  severityRank(a) - severityRank(b);

export interface AlertPolicyConfig {
  /** Silêncio por câmera após um aviso, salvo escalada. */
  cooldownMs: number;
  /** Janela em que as mudanças são contadas para detectar oscilação. */
  flapWindowMs: number;
  /** Mudanças na janela a partir das quais a câmera é considerada instável. */
  flapThreshold: number;
  /** Tempo estável necessário para a câmera deixar o modo instável. */
  flapRecoveryMs: number;
  /** Acima disto, a leva vira um único aviso agregado. */
  maxIndividualPerBatch: number;
}

export const DEFAULT_ALERT_POLICY: AlertPolicyConfig = {
  cooldownMs: 60_000,
  flapWindowMs: 120_000,
  flapThreshold: 4,
  flapRecoveryMs: 300_000,
  maxIndividualPerBatch: 3,
};

export interface CameraNoticeState {
  /** Carimbos das mudanças recentes, para medir oscilação. */
  changes: readonly number[];
  lastNotifiedAt: number | null;
  lastNotifiedStatus: MapMarkerStatus | null;
  /** Instante em que entrou em modo instável, ou `null` se estável. */
  flappingSince: number | null;
  /** Verdadeiro depois que a instabilidade já foi reportada uma vez. */
  flapReported: boolean;
}

export interface NoticeState {
  /** Falso até a primeira carga ser semeada. Protege contra alarme no F5. */
  primed: boolean;
  cameras: Readonly<Record<string, CameraNoticeState>>;
}

export const emptyNoticeState = (): NoticeState => ({ primed: false, cameras: {} });

export type NoticeKind =
  /** Uma câmera piorou e merece aviso individual. */
  | 'worsened'
  /** Câmera oscilando: um aviso único de instabilidade. */
  | 'flapping'
  /** Muitas câmeras piorando na mesma leva: aviso agregado. */
  | 'burst';

export type SuppressionReason =
  | 'not_primed'
  | 'improved'
  | 'cooldown'
  | 'flapping'
  | 'folded_into_burst';

export interface Notice {
  kind: NoticeKind;
  /** Vazio apenas em `burst`, que fala da frota inteira. */
  cameraIds: readonly string[];
  /** Pior estado envolvido no aviso. */
  status: MapMarkerStatus;
  from: MapMarkerStatus | null;
  /** Verdadeiro quando o aviso furou um silêncio por ser agravamento. */
  escalated: boolean;
}

export interface Suppression {
  cameraId: string;
  reason: SuppressionReason;
}

export interface EvaluateResult {
  state: NoticeState;
  notices: readonly Notice[];
  suppressed: readonly Suppression[];
}

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const blankCamera = (): CameraNoticeState => ({
  changes: [],
  lastNotifiedAt: null,
  lastNotifiedStatus: null,
  flappingSince: null,
  flapReported: false,
});

/**
 * Semeia o estado inicial sem emitir nenhum aviso.
 *
 * Chamado uma vez, na primeira carga. Depois disso o estado é `primed` e as
 * mudanças passam a valer como novidade.
 */
export function primeNoticeState(state: NoticeState, cameraIds: readonly string[]): NoticeState {
  const cameras: Record<string, CameraNoticeState> = { ...state.cameras };
  for (const cameraId of cameraIds) {
    if (typeof cameraId === 'string' && cameraId.length > 0 && !cameras[cameraId]) {
      cameras[cameraId] = blankCamera();
    }
  }
  return { primed: true, cameras };
}

/**
 * Decide o que avisar a partir de uma leva de transições.
 *
 * A função é total e determinística: mesma entrada, mesma saída. Ela nunca
 * consulta relógio nem dispara efeito — quem chama é que exibe.
 */
export function evaluateNotices(
  state: NoticeState,
  transitions: readonly StatusTransition[],
  now: number,
  config: AlertPolicyConfig = DEFAULT_ALERT_POLICY,
): EvaluateResult {
  if (!isFiniteNumber(now)) return { state, notices: [], suppressed: [] };

  const cameras: Record<string, CameraNoticeState> = { ...state.cameras };
  const suppressed: Suppression[] = [];
  const candidates: { transition: StatusTransition; escalated: boolean }[] = [];
  const flapping: Notice[] = [];

  for (const transition of transitions) {
    const cameraId = transition?.cameraId;
    if (typeof cameraId !== 'string' || cameraId.length === 0) continue;

    const previous = cameras[cameraId] ?? blankCamera();

    // Toda mudança conta para a medida de oscilação, inclusive melhora: piscar
    // entre `offline` e `online` é instabilidade tanto quanto o contrário.
    const changes = [...previous.changes, now].filter(
      (stamp) => now - stamp <= config.flapWindowMs,
    );

    let flappingSince = previous.flappingSince;
    let flapReported = previous.flapReported;

    if (changes.length >= config.flapThreshold) {
      if (flappingSince === null) {
        flappingSince = now;
        flapReported = false;
      }
    } else if (flappingSince !== null && now - flappingSince >= config.flapRecoveryMs) {
      flappingSince = null;
      flapReported = false;
    }

    const current: CameraNoticeState = {
      ...previous,
      changes,
      flappingSince,
      flapReported,
    };
    cameras[cameraId] = current;

    if (!state.primed) {
      suppressed.push({ cameraId, reason: 'not_primed' });
      continue;
    }

    if (!transition.worsened) {
      suppressed.push({ cameraId, reason: 'improved' });
      continue;
    }

    // Agravamento: piorou de novo em relação ao que já foi avisado. Isto fura
    // silêncio por repetição E modo instável, sempre.
    const escalated =
      current.lastNotifiedStatus !== null &&
      severityRank(transition.to) < severityRank(current.lastNotifiedStatus);

    if (!escalated && flappingSince !== null) {
      if (!flapReported) {
        cameras[cameraId] = { ...current, flapReported: true };
        flapping.push({
          kind: 'flapping',
          cameraIds: [cameraId],
          status: transition.to,
          from: transition.from,
          escalated: false,
        });
      } else {
        suppressed.push({ cameraId, reason: 'flapping' });
      }
      continue;
    }

    if (
      !escalated &&
      current.lastNotifiedAt !== null &&
      now - current.lastNotifiedAt < config.cooldownMs
    ) {
      suppressed.push({ cameraId, reason: 'cooldown' });
      continue;
    }

    candidates.push({ transition, escalated });
  }

  // Marca como avisadas as câmeras que efetivamente vão gerar aviso, inclusive
  // as dobradas no resumo: o resumo já cumpriu o papel de avisar.
  for (const { transition } of candidates) {
    const entry = cameras[transition.cameraId] ?? blankCamera();
    cameras[transition.cameraId] = {
      ...entry,
      lastNotifiedAt: now,
      lastNotifiedStatus: transition.to,
    };
  }
  for (const notice of flapping) {
    const cameraId = notice.cameraIds[0];
    if (!cameraId) continue;
    const entry = cameras[cameraId] ?? blankCamera();
    cameras[cameraId] = { ...entry, lastNotifiedAt: now, lastNotifiedStatus: notice.status };
  }

  const nextState: NoticeState = { primed: state.primed, cameras };

  if (candidates.length === 0) {
    return { state: nextState, notices: flapping, suppressed };
  }

  // Pior primeiro, e empate resolvido pelo identificador para que a ordem seja
  // estável entre execuções (um mapa que reordena sozinho confunde).
  const ordered = [...candidates].sort((a, b) => {
    const bySeverity = compareBySeverity(a.transition.to, b.transition.to);
    if (bySeverity !== 0) return bySeverity;
    return a.transition.cameraId.localeCompare(b.transition.cameraId);
  });

  if (ordered.length > config.maxIndividualPerBatch) {
    const worst = ordered[0];
    if (!worst) return { state: nextState, notices: flapping, suppressed };
    for (const { transition } of ordered) {
      suppressed.push({ cameraId: transition.cameraId, reason: 'folded_into_burst' });
    }
    return {
      state: nextState,
      notices: [
        ...flapping,
        {
          kind: 'burst',
          cameraIds: ordered.map((item) => item.transition.cameraId),
          status: worst.transition.to,
          from: null,
          escalated: ordered.some((item) => item.escalated),
        },
      ],
      suppressed,
    };
  }

  return {
    state: nextState,
    notices: [
      ...flapping,
      ...ordered.map(
        ({ transition, escalated }): Notice => ({
          kind: 'worsened',
          cameraIds: [transition.cameraId],
          status: transition.to,
          from: transition.from,
          escalated,
        }),
      ),
    ],
    suppressed,
  };
}

const STATUS_LABEL: Record<MapMarkerStatus, string> = {
  alert: 'em alarme',
  offline: 'sem comunicação',
  warning: 'com atenção',
  unknown: 'em estado desconhecido',
  online: 'operando',
};

/** Texto do aviso, em português, sem jargão técnico. */
export function describeNotice(notice: Notice, nameOf: (cameraId: string) => string): string {
  if (notice.kind === 'burst') {
    return `${notice.cameraIds.length} câmeras mudaram para pior ao mesmo tempo — a pior está ${STATUS_LABEL[notice.status]}.`;
  }
  const cameraId = notice.cameraIds[0] ?? '';
  const name = nameOf(cameraId);
  if (notice.kind === 'flapping') {
    return `${name} está oscilando entre estados. Avisos adicionais foram silenciados até estabilizar.`;
  }
  const prefix = notice.escalated ? 'Agravou: ' : '';
  return `${prefix}${name} está ${STATUS_LABEL[notice.status]}.`;
}
