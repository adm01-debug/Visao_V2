/**
 * Onda 189 — Multimonitor destacado (janela em segunda tela).
 *
 * Paridade com o "multimonitor por saída de vídeo" do SIM Next: o operador
 * destaca uma câmera numa janela própria e arrasta para o segundo monitor.
 *
 * Esta é a **regra única** do livro de janelas destacadas. É pura: não abre
 * janela, não fecha janela, não fala com o navegador. Ela apenas decide.
 *
 * Invariantes (as que não podem ser violadas):
 *  1. **Uma câmera, uma janela.** Pedir de novo FOCA a janela existente; jamais
 *     abre a segunda, porque isso duplicaria o consumo de stream do gravador.
 *  2. **Silêncio não é morte imediata.** Uma janela só é considerada perdida
 *     após `HEARTBEAT_TIMEOUT_MS` sem batida; batida renova e nunca rebaixa.
 *  3. **Relógio para trás nunca mata janela.** Idade negativa é tratada como 0.
 *  4. **Teto é recusa declarada**, nunca fila silenciosa nem despejo de outra
 *     janela viva: o operador é avisado e decide o que fechar.
 *  5. **Fechar é idempotente.** Fechar janela desconhecida/já fechada é inerte.
 *  6. **Reabrir é abrir.** Uma janela perdida não "revive": ela é reaberta com
 *     nova identidade de janela e novo `openedAt`.
 */

/** Máximo de janelas destacadas simultâneas por sessão do operador. */
export const MAX_DETACHED_WINDOWS = 6;

/** Silêncio tolerado antes de considerar a janela destacada perdida. */
export const HEARTBEAT_TIMEOUT_MS = 15_000;

/** Cadência com que a janela destacada deve bater ponto. */
export const HEARTBEAT_INTERVAL_MS = 4_000;

/** Canal de mensagens entre o console e as janelas destacadas. */
export const DETACHED_CHANNEL = 'visao:detached-monitors';

export interface DetachedWindow {
  cameraId: string;
  /** Nome único da janela (`window.open` target) — identidade estável. */
  windowName: string;
  openedAt: number;
  /** Última batida de ponto observada. */
  lastHeartbeatAt: number;
}

/** Livro de janelas destacadas, indexado por câmera (invariante 1). */
export type DetachedRegistry = Readonly<Record<string, DetachedWindow>>;

export type DetachDecision =
  /** Abrir uma janela nova. */
  | 'open'
  /** Já existe janela viva para esta câmera: focar, nunca duplicar. */
  | 'focus_existing'
  /** A janela anterior foi perdida (sem batida): abrir de novo com nova identidade. */
  | 'reopen_stale'
  /** Teto de janelas atingido — recusa declarada. */
  | 'refused_quota'
  /** Identificador de câmera inválido. */
  | 'refused_invalid';

export interface DetachPlan {
  decision: DetachDecision;
  /** Nome da janela a abrir/focar; `null` quando a decisão é uma recusa. */
  windowName: string | null;
  /** Livro resultante depois de aplicar a decisão. */
  registry: DetachedRegistry;
  /** Explicação curta, pronta para a interface. */
  message: string;
}

/** Idade de uma batida de ponto, nunca negativa (invariante 3). */
export function heartbeatAge(entry: DetachedWindow, now: number): number {
  return Math.max(0, now - entry.lastHeartbeatAt);
}

/** Uma janela está viva enquanto a batida for recente. */
export function isAlive(entry: DetachedWindow, now: number): boolean {
  return heartbeatAge(entry, now) <= HEARTBEAT_TIMEOUT_MS;
}

/** Identidade de janela derivada da câmera + instante — estável e única. */
export function makeWindowName(cameraId: string, now: number): string {
  return `visao-monitor-${cameraId}-${now}`;
}

/**
 * Remove do livro as janelas que pararam de bater ponto (invariante 2).
 * Devolve o livro saneado e a lista das câmeras liberadas.
 */
export function reconcileHeartbeats(
  registry: DetachedRegistry,
  now: number
): { registry: DetachedRegistry; lost: string[] } {
  const next: Record<string, DetachedWindow> = {};
  const lost: string[] = [];
  for (const [cameraId, entry] of Object.entries(registry)) {
    if (isAlive(entry, now)) next[cameraId] = entry;
    else lost.push(cameraId);
  }
  return { registry: next, lost };
}

/** Quantas janelas vivas existem agora. */
export function liveCount(registry: DetachedRegistry, now: number): number {
  return Object.values(registry).filter((e) => isAlive(e, now)).length;
}

/**
 * Decide o que fazer quando o operador pede para destacar uma câmera.
 * Operação pura: quem chama é responsável por executar a decisão.
 */
export function planDetach(input: {
  registry: DetachedRegistry;
  cameraId: string;
  now: number;
  maxWindows?: number;
}): DetachPlan {
  const { registry, cameraId, now } = input;
  const maxWindows = input.maxWindows ?? MAX_DETACHED_WINDOWS;

  if (typeof cameraId !== 'string' || cameraId.trim().length === 0) {
    return {
      decision: 'refused_invalid',
      windowName: null,
      registry,
      message: 'Câmera inválida: nada foi destacado.',
    };
  }

  // Saneia primeiro: janela morta não pode ocupar vaga do teto.
  const { registry: clean } = reconcileHeartbeats(registry, now);
  const existing = clean[cameraId];

  if (existing) {
    return {
      decision: 'focus_existing',
      windowName: existing.windowName,
      registry: clean,
      message: 'Esta câmera já está destacada — a janela existente foi trazida à frente.',
    };
  }

  if (Object.keys(clean).length >= maxWindows) {
    return {
      decision: 'refused_quota',
      windowName: null,
      registry: clean,
      message: `Limite de ${maxWindows} janelas destacadas atingido. Feche uma janela para abrir outra.`,
    };
  }

  const wasStale = Boolean(registry[cameraId]) && !clean[cameraId];
  const windowName = makeWindowName(cameraId, now);
  return {
    decision: wasStale ? 'reopen_stale' : 'open',
    windowName,
    registry: {
      ...clean,
      [cameraId]: { cameraId, windowName, openedAt: now, lastHeartbeatAt: now },
    },
    message: wasStale
      ? 'A janela anterior desta câmera havia sido perdida. Uma nova foi aberta.'
      : 'Janela destacada aberta. Arraste-a para o segundo monitor.',
  };
}

/**
 * Registra uma batida de ponto. Batida de janela desconhecida é aceita (a
 * janela existe de fato), mas nunca ressuscita identidade antiga: o nome
 * informado passa a ser o vigente.
 */
export function applyHeartbeat(
  registry: DetachedRegistry,
  beat: { cameraId: string; windowName: string; at: number }
): DetachedRegistry {
  const current = registry[beat.cameraId];
  // Batida de uma janela que não é mais a titular é ignorada: evita que uma
  // janela órfã sequestre o registro da janela vigente.
  if (current && current.windowName !== beat.windowName) return registry;
  return {
    ...registry,
    [beat.cameraId]: {
      cameraId: beat.cameraId,
      windowName: beat.windowName,
      openedAt: current?.openedAt ?? beat.at,
      lastHeartbeatAt: Math.max(current?.lastHeartbeatAt ?? beat.at, beat.at),
    },
  };
}

/** Fecha uma janela no livro. Idempotente (invariante 5). */
export function applyClosed(registry: DetachedRegistry, cameraId: string): DetachedRegistry {
  if (!registry[cameraId]) return registry;
  const next = { ...registry };
  delete next[cameraId];
  return next;
}

/** Mensagem de tipo trafegada no canal entre console e janelas destacadas. */
export type DetachedMessage =
  | { type: 'heartbeat'; cameraId: string; windowName: string; at: number }
  | { type: 'closed'; cameraId: string; windowName: string }
  | { type: 'close-request'; cameraId: string };
