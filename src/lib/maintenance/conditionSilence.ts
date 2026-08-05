/**
 * Onda 241 — **Silêncio ativo por condição, visível no console**.
 *
 * ## O defeito que esta onda corrige
 *
 * A Onda 240 deu ao despachante externo um silêncio por CONDIÇÃO: enquanto a
 * mesma chave de rotina persiste, o canal externo recebe no máximo uma
 * notificação por janela do perfil (1 dia, para as fontes de contabilidade).
 * Foi a decisão certa — canal que repete a mesma frase todo dia é canal que o
 * operador desliga. Mas ela criou um estado **invisível**: existe agora uma
 * condição aberta, crítica, sobre a qual *nenhuma* notificação externa sairá
 * pelas próximas 23 horas, e nada na tela diz isso.
 *
 * Silêncio invisível é pior que ruído. O operador que olha o console vê um
 * crítico aberto e supõe — corretamente, até a Onda 239 — que o canal externo
 * está cuidando de avisar quem precisa. Não está. Ele foi calado por uma regra
 * legítima que ninguém consegue observar. A ausência de aviso passa a ser
 * indistinguível de um despachante quebrado.
 *
 * Este módulo é a leitura **read-only** desse silêncio: espelha, em TypeScript
 * puro, as mesmas leis Q1–Q10 de
 * `supabase/functions/_shared/maintenanceDispatchPolicy.ts`, mas para PREVER e
 * EXIBIR — nunca para decidir envio. Quem despacha continua sendo a edge
 * function; se as duas divergirem, é a edge que manda e o gate de paridade que
 * acusa.
 *
 * ## Leis R1–R10
 *
 *  R1. A condição é a **chave da rotina**, igual à Q1. Silêncio é por
 *      (condição, canal) — nunca por linha de alerta.
 *  R2. A janela sai do **perfil de escalada** (Onda 238): perfil ancorado na
 *      condição (`streak`) herda `minStepMinutes`; perfil operacional tem
 *      janela zero e portanto NUNCA aparece como silenciado. Não-regressão
 *      bit-a-bit do que o operador via antes da Onda 240.
 *  R3. Só **entrega bem-sucedida** cala. Falha de transporte não é silêncio, e
 *      exibi-la como tal esconderia justamente o canal quebrado.
 *  R4. **Agravamento fura.** Se o entregue foi `warning` e a condição hoje é
 *      `critical`, a próxima execução do despachante notifica: o estado é
 *      `escalation_breaks`, nunca `silenced`.
 *  R5. Relógio ilegível ou envio no futuro **não** silencia (fail-open, igual
 *      Q6). Na dúvida a tela diz "vai notificar", que é o erro barato.
 *  R6. Silêncio é **por canal**: Telegram calado com e-mail livre é reportado
 *      como parcialmente silenciado, e o restante exibido é o do canal que
 *      ainda demora mais a falar.
 *  R7. Condição **sem nenhuma entrega** nunca é silenciada (Q7).
 *  R8. Alerta **reconhecido** não exibe silêncio: reconhecer encerra a
 *      expectativa de notificação, e mostrar silêncio ali seria ruído.
 *  R9. O restante exibido nunca é negativo e nunca excede a janela.
 *  R10. Nenhuma inferência é feita a partir de canal desconhecido: canal fora
 *      do conjunto suportado é descartado, não tratado como silêncio.
 *
 * Módulo **puro**: sem React, sem rede, sem relógio implícito.
 */

import { escalationProfileFor } from '@/lib/escalationProfiles';
import type { MaintenanceSeverity } from '@/lib/maintenanceEscalation';

const MINUTE_MS = 60_000;

/** Canais externos suportados pelo despachante (Onda 111). */
export const SILENCE_CHANNELS = ['telegram', 'email'] as const;
export type SilenceChannel = (typeof SILENCE_CHANNELS)[number];

/** Linha crua de `maintenance_alert_dispatches` já resolvida para a condição. */
export interface ConditionNoticeRow {
  /** Chave de rotina do alerta que originou o despacho (R1). */
  readonly conditionKey: string;
  readonly channel: string;
  /** Severidade do alerta notificado, para decidir R4. */
  readonly severity: string;
  /** `status` do despacho — só `sent` conta (R3). */
  readonly status: string;
  /** ISO da última tentativa (que, sendo `sent`, é a entrega). */
  readonly sentAt: string | null;
}

export type ChannelSilenceState = 'silenced' | 'escalation_breaks' | 'expired';

export interface ChannelSilenceView {
  readonly channel: SilenceChannel;
  readonly state: ChannelSilenceState;
  /** Minutos restantes de silêncio; 0 quando não há silêncio efetivo (R9). */
  readonly remainingMinutes: number;
  /** Severidade que foi de fato entregue naquele canal. */
  readonly notifiedSeverity: MaintenanceSeverity;
  readonly sentAtMs: number;
}

export interface ConditionSilenceView {
  readonly conditionKey: string;
  /** Janela do perfil, em minutos. Sempre > 0 quando esta view existe. */
  readonly windowMinutes: number;
  readonly channels: readonly ChannelSilenceView[];
  /** Canais efetivamente calados agora. */
  readonly silencedChannels: number;
  /**
   * Maior restante entre os canais calados — é quando o canal externo volta a
   * falar sobre esta condição. `null` quando nenhum canal está calado.
   */
  readonly remainingMinutes: number | null;
  /** Algum canal só voltará a falar porque a condição agravou (R4). */
  readonly breaksOnEscalation: boolean;
}

function normalizeSeverity(value: string): MaintenanceSeverity {
  return value === 'warning' ? 'warning' : 'critical';
}

function parseMs(value: string | null): number | null {
  if (value === null) return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

function isChannel(value: string): value is SilenceChannel {
  return (SILENCE_CHANNELS as readonly string[]).includes(value);
}

/**
 * R2 — janela de silêncio (minutos) de uma condição. `0` = nunca silencia.
 *
 * Deriva do perfil, e não de uma tabela própria, exatamente para que painel e
 * despachante não possam divergir sem que o gate de paridade perceba.
 */
export function conditionSilenceWindowMinutes(routine: string | null | undefined): number {
  const profile = escalationProfileFor(routine);
  return profile.anchorMode === 'streak' ? profile.minStepMinutes : 0;
}

/**
 * Indexa as entregas por (condição, canal), guardando a MAIS RECENTE válida.
 *
 * Descarta, em silêncio deliberado: status diferente de `sent` (R3), relógio
 * ilegível ou futuro (R5) e canal desconhecido (R10).
 */
export function indexConditionNotices(
  notices: readonly ConditionNoticeRow[],
  nowMs: number
): Map<string, { atMs: number; severity: MaintenanceSeverity }> {
  const index = new Map<string, { atMs: number; severity: MaintenanceSeverity }>();
  for (const notice of notices) {
    if (notice.status !== 'sent') continue;
    if (!notice.conditionKey) continue;
    if (!isChannel(notice.channel)) continue;
    const atMs = parseMs(notice.sentAt);
    if (atMs === null || atMs > nowMs) continue;
    const key = `${notice.conditionKey}:${notice.channel}`;
    const prev = index.get(key);
    if (!prev || atMs > prev.atMs) {
      index.set(key, { atMs, severity: normalizeSeverity(notice.severity) });
    }
  }
  return index;
}

/**
 * Estado de silêncio de UMA condição, na severidade corrente.
 *
 * Devolve `null` quando não há silêncio possível (perfil sem janela, R2) ou
 * quando nenhuma entrega existe (R7) — a tela não deve exibir nada nesses
 * casos, porque "não silenciado" é o estado normal e anunciá-lo é ruído.
 */
export function buildConditionSilence(
  conditionKey: string,
  severity: MaintenanceSeverity,
  index: ReadonlyMap<string, { atMs: number; severity: MaintenanceSeverity }>,
  nowMs: number
): ConditionSilenceView | null {
  const windowMinutes = conditionSilenceWindowMinutes(conditionKey);
  if (windowMinutes <= 0) return null;

  const channels: ChannelSilenceView[] = [];
  for (const channel of SILENCE_CHANNELS) {
    const last = index.get(`${conditionKey}:${channel}`);
    if (!last) continue; // R7

    const elapsed = Math.max(0, (nowMs - last.atMs) / MINUTE_MS);
    const remaining = Math.max(0, Math.min(windowMinutes, windowMinutes - elapsed)); // R9

    let state: ChannelSilenceState;
    if (elapsed >= windowMinutes) {
      state = 'expired';
    } else if (severity === 'critical' && last.severity === 'warning') {
      state = 'escalation_breaks'; // R4
    } else {
      state = 'silenced';
    }

    channels.push({
      channel,
      state,
      remainingMinutes: state === 'silenced' ? Math.round(remaining * 10) / 10 : 0,
      notifiedSeverity: last.severity,
      sentAtMs: last.atMs,
    });
  }

  if (channels.length === 0) return null;

  const silenced = channels.filter((entry) => entry.state === 'silenced');
  const remainingMinutes =
    silenced.length === 0 ? null : Math.max(...silenced.map((entry) => entry.remainingMinutes)); // R6

  return {
    conditionKey,
    windowMinutes,
    channels,
    silencedChannels: silenced.length,
    remainingMinutes,
    breaksOnEscalation: channels.some((entry) => entry.state === 'escalation_breaks'),
  };
}
