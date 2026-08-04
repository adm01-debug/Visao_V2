import { describe, expect, it } from 'vitest';
import {
  COLLAB_NOTIFICATION_POLICY,
  audiencesForAction,
  buildDedupKey,
  formatUnreadBadge,
  isActionableKind,
  isExpiredNotification,
  notificationKindForAction,
  routeGovernanceEvent,
  severityForKind,
  type CollabNotificationKind,
} from '@/lib/collab/collabNotifications';
import type { GovernanceAction } from '@/lib/collab/collabGovernance';

const ACTIONS: GovernanceAction[] = [
  'invite_created',
  'invite_accepted',
  'invite_declined',
  'invite_revoked',
  'invite_expired',
  'membership_suspended',
  'membership_reinstated',
  'membership_removed',
];

const OWNER = 'aaaaaaaa-0000-0000-0000-000000000001';
const OTHER = 'bbbbbbbb-0000-0000-0000-000000000002';
const NET = 'cccccccc-0000-0000-0000-000000000003';

const baseEvent = (action: GovernanceAction, invitationId: string | null = 'inv-1') => ({
  action,
  ownerOrgId: OWNER,
  counterpartOrgId: OTHER,
  networkId: NET,
  invitationId,
});

describe('roteamento de notificações — matriz completa', () => {
  it('cobre toda ação de governança com um tipo de notificação', () => {
    for (const action of ACTIONS) {
      expect(notificationKindForAction(action)).toBeTruthy();
      expect(audiencesForAction(action).length).toBeGreaterThan(0);
    }
  });

  it('entrega o convite recebido só à convidada — a dona não é avisada do que fez', () => {
    const rows = routeGovernanceEvent(baseEvent('invite_created'));
    expect(rows).toHaveLength(1);
    expect(rows[0].organizationId).toBe(OTHER);
    expect(rows[0].actorOrgId).toBe(OWNER);
    expect(rows[0].kind).toBe('invite_received');
  });

  it('devolve resposta (aceite/recusa) à dona da rede, nunca à própria respondente', () => {
    for (const action of ['invite_accepted', 'invite_declined'] as GovernanceAction[]) {
      const rows = routeGovernanceEvent(baseEvent(action));
      expect(rows).toHaveLength(1);
      expect(rows[0].organizationId).toBe(OWNER);
      expect(rows[0].actorOrgId).toBe(OTHER);
    }
  });

  it('avisa as duas partes no vencimento, porque ninguém decidiu — o relógio decidiu', () => {
    const rows = routeGovernanceEvent(baseEvent('invite_expired'));
    expect(rows.map((r) => r.organizationId).sort()).toEqual([OWNER, OTHER].sort());
    // Chaves distintas: sem a organização na chave, uma das partes ficaria muda.
    expect(new Set(rows.map((r) => r.dedupKey)).size).toBe(2);
  });

  it('mudanças de participação só tocam a organização afetada', () => {
    for (const action of [
      'membership_suspended',
      'membership_reinstated',
      'membership_removed',
    ] as GovernanceAction[]) {
      const rows = routeGovernanceEvent(baseEvent(action, null));
      expect(rows).toHaveLength(1);
      expect(rows[0].organizationId).toBe(OTHER);
      expect(rows[0].invitationId).toBeNull();
    }
  });

  it('classifica remoção como crítica e suspensão/convite como acionável ou de atenção', () => {
    expect(severityForKind('membership_removed')).toBe('critical');
    expect(severityForKind('invite_received')).toBe('attention');
    expect(severityForKind('membership_suspended')).toBe('attention');
    expect(isActionableKind('invite_received')).toBe(true);
    expect(isActionableKind('invite_expired')).toBe(false);
    expect(isActionableKind('membership_removed')).toBe(false);
  });

  it('não emite nada quando dona e contraparte são a mesma organização', () => {
    for (const action of ACTIONS) {
      const rows = routeGovernanceEvent({ ...baseEvent(action), counterpartOrgId: OWNER });
      expect(rows).toEqual([]);
    }
  });
});

describe('deduplicação', () => {
  it('é estável sob reprocessamento do mesmo fato', () => {
    for (const action of ACTIONS) {
      const a = routeGovernanceEvent(baseEvent(action));
      const b = routeGovernanceEvent(baseEvent(action));
      expect(a.map((r) => r.dedupKey)).toEqual(b.map((r) => r.dedupKey));
    }
  });

  it('separa reconvite (novo id de convite) do convite anterior', () => {
    const first = routeGovernanceEvent(baseEvent('invite_created', 'inv-1'))[0];
    const second = routeGovernanceEvent(baseEvent('invite_created', 'inv-2'))[0];
    expect(first.dedupKey).not.toBe(second.dedupKey);
  });

  it('separa suspensão de reintegração do mesmo par rede+organização', () => {
    const susp = routeGovernanceEvent(baseEvent('membership_suspended', null))[0];
    const rein = routeGovernanceEvent(baseEvent('membership_reinstated', null))[0];
    expect(susp.dedupKey).not.toBe(rein.dedupKey);
  });

  it('não carimba relógio na chave — o mesmo evento dois segundos depois é o mesmo evento', () => {
    const key = buildDedupKey({
      kind: 'invite_received',
      organizationId: OTHER,
      networkId: NET,
      invitationId: 'inv-1',
      counterpartOrgId: OTHER,
    });
    expect(key).toBe('invite_received:inv-1:' + OTHER);
    // Nenhum carimbo temporal (ISO ou epoch) entra na chave.
    expect(/\d{4}-\d{2}-\d{2}T|:1[6-9]\d{11}\b/.test(key)).toBe(false);
  });
});

describe('simulação massiva de eventos concorrentes', () => {
  it('mantém invariantes em 200.000 eventos aleatórios', () => {
    let seed = 0x5eed130;
    const rnd = () => {
      seed = (seed * 1_664_525 + 1_013_904_223) >>> 0;
      return seed / 0x1_0000_0000;
    };
    const orgs = Array.from({ length: 12 }, (_, i) => `org-${i}`);
    const violations: string[] = [];
    // Deduplicação simulada como o índice único do banco: chave → destinatário.
    const emitted = new Map<string, string>();

    for (let i = 0; i < 200_000; i += 1) {
      const action = ACTIONS[Math.floor(rnd() * ACTIONS.length)];
      const owner = orgs[Math.floor(rnd() * orgs.length)];
      const counterpart = orgs[Math.floor(rnd() * orgs.length)];
      const networkId = `net-${Math.floor(rnd() * 5)}`;
      const invitationId = rnd() < 0.7 ? `inv-${Math.floor(rnd() * 2000)}` : null;
      const rows = routeGovernanceEvent({
        action,
        ownerOrgId: owner,
        counterpartOrgId: counterpart,
        networkId,
        invitationId,
      });

      if (owner === counterpart) {
        if (rows.length !== 0) violations.push(`auto-endereçamento em ${action}`);
        continue;
      }
      if (rows.length < 1 || rows.length > 2) violations.push(`fan-out inválido em ${action}`);

      const seen = new Set<string>();
      for (const row of rows) {
        // 1) Só as duas partes recebem — jamais um terceiro.
        if (row.organizationId !== owner && row.organizationId !== counterpart) {
          violations.push(`terceiro notificado em ${action}`);
        }
        // 2) Ninguém é notificado da própria ação.
        if (row.organizationId === row.actorOrgId)
          violations.push(`ator = destinatário em ${action}`);
        // 3) Uma linha por destinatário dentro do mesmo evento.
        if (seen.has(row.organizationId)) violations.push(`destinatário repetido em ${action}`);
        seen.add(row.organizationId);
        // 4) A chave carrega o destinatário: nenhuma colisão entre partes.
        const prev = emitted.get(row.dedupKey);
        if (prev !== undefined && prev !== row.organizationId) {
          violations.push(`colisão de chave entre organizações em ${action}`);
        }
        emitted.set(row.dedupKey, row.organizationId);
        // 5) Severidade e tipo consistentes com a tabela declarada.
        if (row.severity !== severityForKind(row.kind))
          violations.push(`severidade divergente em ${action}`);
        if (row.kind !== notificationKindForAction(action))
          violations.push(`tipo divergente em ${action}`);
      }
    }
    expect(violations.slice(0, 5)).toEqual([]);
  }, 60_000);
});

describe('contador e retenção', () => {
  it('aplica o teto do contador de não lidas', () => {
    expect(formatUnreadBadge(0)).toBe('');
    expect(formatUnreadBadge(-3)).toBe('');
    expect(formatUnreadBadge(Number.NaN)).toBe('');
    expect(formatUnreadBadge(1)).toBe('1');
    expect(formatUnreadBadge(COLLAB_NOTIFICATION_POLICY.unreadBadgeCap)).toBe('99');
    expect(formatUnreadBadge(COLLAB_NOTIFICATION_POLICY.unreadBadgeCap + 1)).toBe('99+');
    expect(formatUnreadBadge(5000)).toBe('99+');
  });

  it('usa relógio injetável na retenção, com fronteira fechada no limite', () => {
    const created = new Date('2026-01-01T00:00:00Z');
    const days = (n: number) => new Date(created.getTime() + n * 86_400_000);
    expect(isExpiredNotification(created, days(89))).toBe(false);
    expect(isExpiredNotification(created, days(90))).toBe(true);
    expect(isExpiredNotification(created, days(91))).toBe(true);
    // Relógio para trás (skew do servidor) nunca expira nada.
    expect(isExpiredNotification(created, days(-400))).toBe(false);
  });
});

describe('cobertura de tipos', () => {
  it('todo tipo declarado tem severidade e origem em alguma ação', () => {
    const kinds: CollabNotificationKind[] = [
      'invite_received',
      'invite_accepted',
      'invite_declined',
      'invite_revoked',
      'invite_expired',
      'membership_suspended',
      'membership_reinstated',
      'membership_removed',
    ];
    const produced = new Set(ACTIONS.map(notificationKindForAction));
    for (const kind of kinds) {
      expect(produced.has(kind)).toBe(true);
      expect(['info', 'attention', 'critical']).toContain(severityForKind(kind));
    }
  });
});
