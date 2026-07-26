/**
 * Onda 132 — Retenção justa dos avisos da rede colaborativa.
 *
 * Fonte da verdade em TypeScript da MESMA regra aplicada no banco por
 * `public.collab_retention_policy()` e `public.collab_purge_notifications()`.
 * A paridade é verificada no CI por `scripts/check-collab-retention.mjs`.
 *
 * ## O problema que esta onda corrige
 *
 * O expurgo anterior apagava por idade pura: `created_at <= now - 90d`. Isso
 * trata "convite esperando decisão há 91 dias" e "aviso informativo já lido"
 * como a mesma coisa. Na prática significava que um aviso **crítico e nunca
 * lido** (`membership_removed` — perda de dado compartilhado) desaparecia da
 * caixa de entrada sem que ninguém jamais o tivesse visto. Retenção não pode
 * apagar a única prova de um fato que ninguém reconheceu.
 *
 * ## A regra
 *
 * A idade mínima para apagar depende de **reconhecimento**, não só do relógio:
 *
 *  - aviso lido por qualquer pessoa da organização destinatária → `baseDays`;
 *  - aviso não lido que exige decisão humana (`actionable`) → `actionableGraceDays`;
 *  - aviso não lido de severidade `critical` → `criticalGraceDays`;
 *  - aviso não lido de severidade `attention` → `attentionGraceDays`;
 *  - aviso não lido meramente informativo → `baseDays`.
 *
 * Sobre todos existe um **teto absoluto** (`hardCeilingDays`): nada sobrevive
 * além dele, lido ou não. Sem teto, uma organização abandonada acumularia
 * avisos não lidos para sempre e a retenção viraria ficção — e LGPD não aceita
 * "guardamos porque ninguém clicou".
 *
 * ## Por que o expurgo é limitado por lote
 *
 * `DELETE` sem limite numa tabela grande segura locks por minutos e trava a
 * emissão por gatilho (Onda 130), que é síncrona com a governança. O expurgo
 * apaga no máximo `maxDeletePerRun` por execução e registra em
 * `collab_notification_purge_runs` se ficou trabalho pendente — o cron horário
 * converge em vez de tentar tudo de uma vez.
 */

import type { CollabNotificationKind, CollabNotificationSeverity } from './collabNotifications';
import { getNotificationSpec } from './collabNotifications';

/** Política de retenção — espelho de `public.collab_retention_policy()`. */
export const COLLAB_RETENTION_POLICY = {
  /** Idade mínima padrão para apagar um aviso já reconhecido. */
  baseDays: 90,
  /** Aviso não lido que espera decisão humana sobrevive mais tempo. */
  actionableGraceDays: 365,
  /** Aviso crítico não lido: prova de perda de dado, quase um ano de guarda. */
  criticalGraceDays: 365,
  /** Aviso de atenção não lido: meio ano. */
  attentionGraceDays: 180,
  /** Teto absoluto — nada sobrevive além disto, lido ou não. */
  hardCeilingDays: 365,
  /** Silêncio vencido (Onda 131) vira lixo depois desta folga. */
  expiredSilenceGraceDays: 30,
  /** Teto de linhas apagadas por execução, para não segurar lock longo. */
  maxDeletePerRun: 5000,
} as const;

/** Estado de um aviso no momento da decisão de expurgo. */
export interface CollabRetentionSubject {
  readonly kind: CollabNotificationKind;
  /** Alguém da organização destinatária já marcou como lido. */
  readonly hasRead: boolean;
  /** Idade do aviso em dias (fracionária é aceita). */
  readonly ageDays: number;
}

/**
 * Idade mínima, em dias, para que o aviso possa ser apagado.
 *
 * Nunca ultrapassa `hardCeilingDays`: o teto é o limite superior de qualquer
 * carência, e não uma exceção aplicada depois.
 */
export function effectiveRetentionDays(kind: CollabNotificationKind, hasRead: boolean): number {
  const p = COLLAB_RETENTION_POLICY;
  if (hasRead) return p.baseDays;

  const spec = getNotificationSpec(kind);
  const grace = graceForUnread(spec.actionable, spec.severity);
  return Math.min(Math.max(p.baseDays, grace), p.hardCeilingDays);
}

function graceForUnread(actionable: boolean, severity: CollabNotificationSeverity): number {
  const p = COLLAB_RETENTION_POLICY;
  // Ordem importa: exigir decisão humana pesa mais que a severidade nominal,
  // porque um convite pendente é uma obrigação, não um informe.
  if (actionable) return p.actionableGraceDays;
  if (severity === 'critical') return p.criticalGraceDays;
  if (severity === 'attention') return p.attentionGraceDays;
  return p.baseDays;
}

/** `true` quando o aviso já pode sair da caixa de entrada. */
export function isPurgeable(subject: CollabRetentionSubject): boolean {
  if (!Number.isFinite(subject.ageDays) || subject.ageDays < 0) return false;
  return subject.ageDays > effectiveRetentionDays(subject.kind, subject.hasRead);
}

/** Resultado de uma execução do expurgo — espelho do JSON devolvido pelo banco. */
export interface CollabPurgeOutcome {
  readonly deletedNotifications: number;
  readonly deletedSilences: number;
  /** Ainda havia elegíveis quando o lote acabou. */
  readonly truncated: boolean;
}

/**
 * Simula uma execução do expurgo sobre um conjunto de avisos — usado nos testes
 * e no gate para comparar a decisão do TypeScript com a do banco.
 */
export function planPurge(subjects: readonly CollabRetentionSubject[]): {
  readonly eligible: number;
  readonly deleted: number;
  readonly truncated: boolean;
} {
  const eligible = subjects.filter(isPurgeable).length;
  const deleted = Math.min(eligible, COLLAB_RETENTION_POLICY.maxDeletePerRun);
  return { eligible, deleted, truncated: eligible > deleted };
}
