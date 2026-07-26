import { describe, expect, it } from 'vitest';
import {
  deriveInviteView,
  deriveMembershipView,
  formatRemaining,
} from '@/lib/collab/collabGovernanceView';
import type { InviteStatus, MembershipStatus } from '@/lib/collab/collabGovernance';

const NOW = new Date('2026-07-26T12:00:00Z');
const STATUSES: InviteStatus[] = ['pending', 'accepted', 'declined', 'revoked', 'expired'];
const MEMBERSHIP_STATUSES: MembershipStatus[] = ['pending', 'active', 'suspended'];
const ORG_A = '11111111-1111-1111-1111-111111111111';
const ORG_B = '22222222-2222-2222-2222-222222222222';

describe('modelo de visão — convites', () => {
  it('mostra convite vencido como vencido antes do cron materializar a coluna', () => {
    const view = deriveInviteView({
      viewerIsNetworkOwner: false,
      viewerOrgId: ORG_A,
      invitedOrgId: ORG_A,
      storedStatus: 'pending',
      expiresAt: new Date(NOW.getTime() - 1_000),
      now: NOW,
    });
    expect(view.effectiveStatus).toBe('expired');
    expect(view.label).toBe('Vencido');
    expect(view.canAccept).toBe(false);
    expect(view.secondsRemaining).toBeNull();
  });

  it('oferece resposta apenas à organização convidada', () => {
    const live = { storedStatus: 'pending' as const, expiresAt: new Date(NOW.getTime() + 86_400_000), now: NOW };
    const invited = deriveInviteView({ ...live, viewerIsNetworkOwner: false, viewerOrgId: ORG_A, invitedOrgId: ORG_A });
    const bystander = deriveInviteView({ ...live, viewerIsNetworkOwner: false, viewerOrgId: ORG_B, invitedOrgId: ORG_A });
    expect([invited.canAccept, invited.canDecline, invited.canRevoke]).toEqual([true, true, false]);
    expect([bystander.canAccept, bystander.canDecline, bystander.canRevoke]).toEqual([false, false, false]);
  });

  it('oferece revogação apenas à dona da rede e nunca autoaceite', () => {
    const view = deriveInviteView({
      viewerIsNetworkOwner: true,
      viewerOrgId: ORG_A,
      invitedOrgId: ORG_A, // registro inconsistente: a dona jamais é convidada
      storedStatus: 'pending',
      expiresAt: new Date(NOW.getTime() + 60_000),
      now: NOW,
    });
    expect(view.canRevoke).toBe(true);
    expect(view.canAccept).toBe(false);
  });

  it('preserva o status gravado quando não há prazo registrado', () => {
    const view = deriveInviteView({
      viewerIsNetworkOwner: false,
      viewerOrgId: ORG_A,
      invitedOrgId: ORG_A,
      storedStatus: 'pending',
      expiresAt: null,
      now: NOW,
    });
    expect(view.effectiveStatus).toBe('pending');
    expect(view.canAccept).toBe(true);
    expect(view.secondsRemaining).toBeNull();
  });

  it('não deixa prazo corrompido virar convite vivo sem contagem coerente', () => {
    const view = deriveInviteView({
      viewerIsNetworkOwner: false,
      viewerOrgId: ORG_A,
      invitedOrgId: ORG_A,
      storedStatus: 'pending',
      expiresAt: 'data-invalida',
      now: NOW,
    });
    expect(view.effectiveStatus).toBe('pending');
    expect(view.secondsRemaining).toBeNull();
  });

  it('formata o prazo restante em dias, horas e minutos', () => {
    expect(formatRemaining(null)).toBeNull();
    expect(formatRemaining(0)).toBe('vence agora');
    expect(formatRemaining(59)).toBe('vence em 1 min');
    expect(formatRemaining(3_600)).toBe('vence em 1h');
    expect(formatRemaining(86_400)).toBe('vence em 1 dia');
    expect(formatRemaining(172_800)).toBe('vence em 2 dias');
  });
});

describe('modelo de visão — participações', () => {
  it('protege a participação da dona da rede', () => {
    for (const status of MEMBERSHIP_STATUSES) {
      const view = deriveMembershipView({ viewerIsNetworkOwner: true, isOwnerMembership: true, status });
      expect([view.canSuspend, view.canReinstate, view.canRemove]).toEqual([false, false, false]);
    }
  });

  it('só a dona da rede altera participações alheias', () => {
    const view = deriveMembershipView({ viewerIsNetworkOwner: false, isOwnerMembership: false, status: 'active' });
    expect([view.canSuspend, view.canReinstate, view.canRemove]).toEqual([false, false, false]);
  });

  it('suspende o que está ativo e reativa o que está suspenso', () => {
    const active = deriveMembershipView({ viewerIsNetworkOwner: true, isOwnerMembership: false, status: 'active' });
    const suspended = deriveMembershipView({ viewerIsNetworkOwner: true, isOwnerMembership: false, status: 'suspended' });
    expect([active.canSuspend, active.canReinstate]).toEqual([true, false]);
    expect([suspended.canSuspend, suspended.canReinstate]).toEqual([false, true]);
    expect(active.removeWarning).toMatch(/definitivo/i);
  });
});

describe('simulação exaustiva — invariantes da tela de governança', () => {
  it('não oferece nenhuma ação impossível em 100% da matriz de convites', () => {
    const offsets = [-864_000_000, -1, 0, 1, 60_000, 86_400_000, 3_153_600_000];
    let scenarios = 0;

    for (const storedStatus of STATUSES) {
      for (const offset of offsets) {
        for (const viewerIsNetworkOwner of [true, false]) {
          for (const viewerOrgId of [ORG_A, ORG_B, null]) {
            for (const invitedOrgId of [ORG_A, ORG_B]) {
              const expiresAt = new Date(NOW.getTime() + offset);
              const view = deriveInviteView({
                viewerIsNetworkOwner,
                viewerOrgId,
                invitedOrgId,
                storedStatus,
                expiresAt,
                now: NOW,
              });
              scenarios += 1;

              const live = storedStatus === 'pending' && offset > 0;
              // 1. Nenhuma ação sobre convite que não está de pé.
              if (!live) {
                expect([view.canAccept, view.canDecline, view.canRevoke]).toEqual([false, false, false]);
                expect(view.secondsRemaining).toBeNull();
              }
              // 2. Aceitar e revogar jamais coexistem: são papéis opostos.
              expect(view.canAccept && view.canRevoke).toBe(false);
              // 3. Quem aceita também recusa — nunca um caminho só de saída.
              expect(view.canAccept).toBe(view.canDecline);
              // 4. Ninguém sem organização ativa age sobre convite alheio.
              if (viewerOrgId === null) expect(view.canAccept).toBe(false);
              // 5. Estado terminal gravado nunca é reescrito pelo relógio.
              if (storedStatus !== 'pending') expect(view.effectiveStatus).toBe(storedStatus);
              // 6. Todo estado tem rótulo em português, nunca vazio.
              expect(view.label.length).toBeGreaterThan(0);
            }
          }
        }
      }
    }

    expect(scenarios).toBe(STATUSES.length * offsets.length * 2 * 3 * 2);
  });

  it('mantém as invariantes sob 120.000 cenários aleatórios', () => {
    let seed = 0x9e3779b9;
    const rand = () => {
      seed ^= seed << 13;
      seed ^= seed >>> 17;
      seed ^= seed << 5;
      return ((seed >>> 0) % 1_000_000) / 1_000_000;
    };
    const pick = <T,>(items: readonly T[]): T => items[Math.floor(rand() * items.length) % items.length];

    for (let i = 0; i < 120_000; i += 1) {
      const now = new Date(1_700_000_000_000 + Math.floor(rand() * 3_000_000_000));
      const view = deriveInviteView({
        viewerIsNetworkOwner: rand() < 0.5,
        viewerOrgId: pick([ORG_A, ORG_B, null]),
        invitedOrgId: pick([ORG_A, ORG_B]),
        storedStatus: pick(STATUSES),
        expiresAt: pick([
          new Date(now.getTime() + Math.floor((rand() - 0.5) * 6_000_000_000)),
          null,
          'lixo',
        ]),
        now,
      });

      expect(view.canAccept && view.canRevoke).toBe(false);
      expect(view.canAccept).toBe(view.canDecline);
      if (view.effectiveStatus !== 'pending') {
        expect([view.canAccept, view.canRevoke, view.secondsRemaining]).toEqual([false, false, null]);
      }
      if (view.secondsRemaining !== null) expect(view.secondsRemaining).toBeGreaterThanOrEqual(0);

      const membership = deriveMembershipView({
        viewerIsNetworkOwner: rand() < 0.5,
        isOwnerMembership: rand() < 0.5,
        status: pick(MEMBERSHIP_STATUSES),
      });
      // Suspender e reativar são mutuamente exclusivos por construção.
      expect(membership.canSuspend && membership.canReinstate).toBe(false);
      // Quem pode suspender pode remover; o inverso não é garantido.
      if (membership.canSuspend) expect(membership.canRemove).toBe(true);
    }
  });
});
