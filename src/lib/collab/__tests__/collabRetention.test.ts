import { describe, expect, it } from 'vitest';
import {
  COLLAB_RETENTION_POLICY,
  effectiveRetentionDays,
  isPurgeable,
  planPurge,
  type CollabRetentionSubject,
} from '@/lib/collab/collabRetention';
import type { CollabNotificationKind } from '@/lib/collab/collabNotifications';
import { isActionableKind, severityForKind } from '@/lib/collab/collabNotifications';

const KINDS: CollabNotificationKind[] = [
  'invite_received',
  'invite_accepted',
  'invite_declined',
  'invite_revoked',
  'invite_expired',
  'membership_suspended',
  'membership_reinstated',
  'membership_removed',
];

describe('Onda 132 — retenção justa de avisos colaborativos', () => {
  it('nenhuma carência ultrapassa o teto absoluto', () => {
    for (const kind of KINDS) {
      for (const hasRead of [true, false]) {
        expect(effectiveRetentionDays(kind, hasRead)).toBeLessThanOrEqual(
          COLLAB_RETENTION_POLICY.hardCeilingDays
        );
        expect(effectiveRetentionDays(kind, hasRead)).toBeGreaterThanOrEqual(
          COLLAB_RETENTION_POLICY.baseDays
        );
      }
    }
  });

  it('reconhecer um aviso nunca aumenta o tempo de guarda', () => {
    for (const kind of KINDS) {
      expect(effectiveRetentionDays(kind, true)).toBeLessThanOrEqual(
        effectiveRetentionDays(kind, false)
      );
      expect(effectiveRetentionDays(kind, true)).toBe(COLLAB_RETENTION_POLICY.baseDays);
    }
  });

  it('acionável e crítico não lidos sobrevivem à retenção base', () => {
    expect(isPurgeable({ kind: 'invite_received', hasRead: false, ageDays: 120 })).toBe(false);
    expect(isPurgeable({ kind: 'membership_removed', hasRead: false, ageDays: 120 })).toBe(false);
    expect(isPurgeable({ kind: 'membership_suspended', hasRead: false, ageDays: 120 })).toBe(false);
    expect(isPurgeable({ kind: 'invite_accepted', hasRead: false, ageDays: 120 })).toBe(true);
  });

  it('lido e vencido sai; teto absoluto apaga até o crítico não lido', () => {
    expect(isPurgeable({ kind: 'membership_removed', hasRead: true, ageDays: 91 })).toBe(true);
    expect(isPurgeable({ kind: 'membership_removed', hasRead: false, ageDays: 366 })).toBe(true);
    expect(isPurgeable({ kind: 'invite_received', hasRead: false, ageDays: 366 })).toBe(true);
  });

  it('idade inválida nunca autoriza apagar', () => {
    for (const ageDays of [-1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(isPurgeable({ kind: 'invite_accepted', hasRead: true, ageDays })).toBe(false);
    }
  });

  it('simulação exaustiva: monotonicidade no tempo para todos os tipos', () => {
    // 8 tipos × 2 estados × 400 idades = 6.400 cenários; uma vez apagável,
    // sempre apagável — retenção não pode "ressuscitar" um aviso.
    let scenarios = 0;
    for (const kind of KINDS) {
      for (const hasRead of [true, false]) {
        let seenPurgeable = false;
        for (let ageDays = 0; ageDays <= 400; ageDays += 1) {
          const subject: CollabRetentionSubject = { kind, hasRead, ageDays };
          const purgeable = isPurgeable(subject);
          if (seenPurgeable) expect(purgeable).toBe(true);
          if (purgeable) seenPurgeable = true;
          scenarios += 1;
        }
        expect(seenPurgeable).toBe(true);
      }
    }
    expect(scenarios).toBeGreaterThan(6_000);
  });

  it('simulação exaustiva: a fronteira coincide com a carência declarada', () => {
    for (const kind of KINDS) {
      for (const hasRead of [true, false]) {
        const limit = effectiveRetentionDays(kind, hasRead);
        expect(isPurgeable({ kind, hasRead, ageDays: limit })).toBe(false);
        expect(isPurgeable({ kind, hasRead, ageDays: limit + 0.001 })).toBe(true);
      }
    }
  });

  it('a carência não lida deriva de acionabilidade e severidade, sem exceções manuais', () => {
    for (const kind of KINDS) {
      const days = effectiveRetentionDays(kind, false);
      if (isActionableKind(kind)) {
        expect(days).toBe(COLLAB_RETENTION_POLICY.actionableGraceDays);
      } else if (severityForKind(kind) === 'critical') {
        expect(days).toBe(COLLAB_RETENTION_POLICY.criticalGraceDays);
      } else if (severityForKind(kind) === 'attention') {
        expect(days).toBe(COLLAB_RETENTION_POLICY.attentionGraceDays);
      } else {
        expect(days).toBe(COLLAB_RETENTION_POLICY.baseDays);
      }
    }
  });

  it('o lote respeita o teto por execução e sinaliza trabalho pendente', () => {
    const many: CollabRetentionSubject[] = Array.from({ length: 6_000 }, () => ({
      kind: 'invite_accepted' as const,
      hasRead: true,
      ageDays: 500,
    }));
    const plan = planPurge(many);
    expect(plan.eligible).toBe(6_000);
    expect(plan.deleted).toBe(COLLAB_RETENTION_POLICY.maxDeletePerRun);
    expect(plan.truncated).toBe(true);

    const few = planPurge(many.slice(0, 10));
    expect(few.truncated).toBe(false);
    expect(few.deleted).toBe(10);
  });
});
