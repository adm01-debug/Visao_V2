import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CollabInvitesCard } from '@/components/collab/CollabInvitesCard';
import { CollabMembersCard } from '@/components/collab/CollabMembersCard';
import type { CollabInvitationRow, CollabMembershipRow } from '@/hooks/useCollabGovernance';

const NOW = new Date('2026-07-26T12:00:00Z');
const ORG_A = '11111111-1111-1111-1111-111111111111';
const ORG_B = '22222222-2222-2222-2222-222222222222';
const ORGS = [
  { id: ORG_A, name: 'Condomínio Alfa', slug: 'alfa' },
  { id: ORG_B, name: 'Comércio Beta', slug: 'beta' },
];

function invitation(overrides: Partial<CollabInvitationRow> = {}): CollabInvitationRow {
  return {
    id: 'inv-1',
    network_id: 'net-1',
    invited_org_id: ORG_B,
    status: 'pending',
    ttl_days: 14,
    expires_at: new Date(NOW.getTime() + 86_400_000).toISOString(),
    responded_at: null,
    note: null,
    created_at: NOW.toISOString(),
    ...overrides,
  };
}

function membership(overrides: Partial<CollabMembershipRow> = {}): CollabMembershipRow {
  return {
    id: 'mem-1',
    network_id: 'net-1',
    organization_id: ORG_B,
    status: 'active',
    shares_data: true,
    created_at: NOW.toISOString(),
    ...overrides,
  };
}

const noop = () => undefined;

describe('CollabInvitesCard', () => {
  it('mostra o prazo e oferece revogação à dona da rede', () => {
    render(
      <CollabInvitesCard
        invitations={[invitation()]}
        organizations={ORGS}
        memberships={[]}
        viewerIsNetworkOwner
        viewerOrgIds={[ORG_A]}
        isLoading={false}
        onInvite={noop}
        onRespond={noop}
        onRevoke={noop}
        isBusy={false}
        now={NOW}
      />,
    );
    expect(screen.getByText('Comércio Beta')).toBeInTheDocument();
    expect(screen.getByText('vence em 1 dia')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /revogar/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /aceitar/i })).not.toBeInTheDocument();
  });

  it('não oferece ação alguma em convite vencido, mesmo com status pendente gravado', () => {
    render(
      <CollabInvitesCard
        invitations={[invitation({ expires_at: new Date(NOW.getTime() - 1_000).toISOString() })]}
        organizations={ORGS}
        memberships={[]}
        viewerIsNetworkOwner
        viewerOrgIds={[ORG_A]}
        isLoading={false}
        onInvite={noop}
        onRespond={noop}
        onRevoke={noop}
        isBusy={false}
        now={NOW}
      />,
    );
    expect(screen.getByText('Vencido')).toBeInTheDocument();
    expect(screen.getByText('Sem ações')).toBeInTheDocument();
  });

  it('permite à organização convidada aceitar e recusar', async () => {
    const onRespond = vi.fn();
    render(
      <CollabInvitesCard
        invitations={[invitation()]}
        organizations={ORGS}
        memberships={[]}
        viewerIsNetworkOwner={false}
        viewerOrgIds={[ORG_B]}
        isLoading={false}
        onInvite={noop}
        onRespond={onRespond}
        onRevoke={noop}
        isBusy={false}
        now={NOW}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /aceitar/i }));
    expect(onRespond).toHaveBeenCalledWith({ invitationId: 'inv-1', accept: true });
  });

  it('recusa validade fora da faixa antes de incomodar o servidor', async () => {
    const onInvite = vi.fn();
    render(
      <CollabInvitesCard
        invitations={[]}
        organizations={ORGS}
        memberships={[]}
        viewerIsNetworkOwner
        viewerOrgIds={[ORG_A]}
        isLoading={false}
        onInvite={onInvite}
        onRespond={noop}
        onRevoke={noop}
        isBusy={false}
        now={NOW}
      />,
    );
    const ttl = screen.getByLabelText(/validade/i);
    await userEvent.clear(ttl);
    await userEvent.type(ttl, '999');
    expect(screen.getByRole('button', { name: /enviar convite/i })).toBeDisabled();
    expect(onInvite).not.toHaveBeenCalled();
  });
});

describe('CollabMembersCard', () => {
  it('blinda a participação da dona da rede', () => {
    render(
      <CollabMembersCard
        memberships={[membership({ organization_id: ORG_A })]}
        organizations={ORGS}
        ownerOrgId={ORG_A}
        viewerIsNetworkOwner
        isLoading={false}
        onSetStatus={noop}
        onRemove={noop}
        isBusy={false}
      />,
    );
    expect(screen.getByText('Dona da rede')).toBeInTheDocument();
    expect(screen.getByText('Sem ações')).toBeInTheDocument();
  });

  it('exige confirmação explícita antes de remover, explicando a perda', async () => {
    const onRemove = vi.fn();
    render(
      <CollabMembersCard
        memberships={[membership()]}
        organizations={ORGS}
        ownerOrgId={ORG_A}
        viewerIsNetworkOwner
        isLoading={false}
        onSetStatus={noop}
        onRemove={onRemove}
        isBusy={false}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /remover/i }));
    expect(await screen.findByText(/Remover é definitivo/i)).toBeInTheDocument();
    expect(onRemove).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: /remover em definitivo/i }));
    expect(onRemove).toHaveBeenCalledWith(ORG_B);
  });

  it('suspende quem está ativo e reativa quem está suspenso', async () => {
    const onSetStatus = vi.fn();
    const { rerender } = render(
      <CollabMembersCard
        memberships={[membership()]}
        organizations={ORGS}
        ownerOrgId={ORG_A}
        viewerIsNetworkOwner
        isLoading={false}
        onSetStatus={onSetStatus}
        onRemove={noop}
        isBusy={false}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /suspender/i }));
    expect(onSetStatus).toHaveBeenCalledWith({ organizationId: ORG_B, status: 'suspended' });

    rerender(
      <CollabMembersCard
        memberships={[membership({ status: 'suspended' })]}
        organizations={ORGS}
        ownerOrgId={ORG_A}
        viewerIsNetworkOwner
        isLoading={false}
        onSetStatus={onSetStatus}
        onRemove={noop}
        isBusy={false}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /reativar/i }));
    expect(onSetStatus).toHaveBeenCalledWith({ organizationId: ORG_B, status: 'active' });
  });
});
