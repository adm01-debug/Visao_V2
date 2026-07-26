/**
 * Onda 129 — Dados da tela de governança da rede colaborativa.
 *
 * Toda escrita passa pelas rotinas `SECURITY DEFINER` da Onda 128 (`rpc`), nunca
 * por `insert`/`update` direto: as tabelas só concedem `SELECT` a `authenticated`,
 * e é ali — não aqui — que cotas, carências e autoridade são decididas.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { InviteStatus, MembershipStatus } from '@/lib/collab/collabGovernance';

export interface CollabNetworkRow {
  id: string;
  name: string;
  slug: string;
  owner_org_id: string;
  reciprocity_required: boolean;
}

export interface CollabInvitationRow {
  id: string;
  network_id: string;
  invited_org_id: string;
  status: InviteStatus;
  ttl_days: number | null;
  expires_at: string | null;
  responded_at: string | null;
  note: string | null;
  created_at: string;
}

export interface CollabMembershipRow {
  id: string;
  network_id: string;
  organization_id: string;
  status: MembershipStatus;
  shares_data: boolean;
  created_at: string;
}

export interface OrganizationRow {
  id: string;
  name: string;
  slug: string;
}

/** Traduz o motivo cru do banco em uma frase que explica o que fazer a seguir. */
export function describeGovernanceError(message: string): string {
  const reason = message.match(/collab_governance:([a-z_]+)/)?.[1] ?? message;
  const dictionary: Record<string, string> = {
    not_network_owner: 'Apenas a organização dona da rede pode fazer isso.',
    target_is_owner: 'A organização dona da rede já participa e não pode ser convidada.',
    already_member: 'Essa organização já participa da rede.',
    duplicate_pending_invite: 'Já existe um convite em aberto para essa organização.',
    ttl_out_of_range: 'A validade do convite precisa estar entre 1 e 60 dias.',
    network_invite_quota: 'A rede atingiu o limite de convites em aberto.',
    org_invite_quota: 'Essa organização já tem convites em aberto demais.',
    reinvite_cooldown: 'Aguarde a carência antes de convidar essa organização de novo.',
    not_invited_org: 'Somente a organização convidada pode responder a este convite.',
    invite_expired: 'Este convite venceu e não pode mais ser respondido.',
    invite_not_pending: 'Este convite já foi respondido ou revogado.',
    owner_membership_immutable: 'A participação da organização dona da rede não pode ser alterada.',
    invalid_transition: 'Essa mudança de estado não é permitida.',
  };
  return dictionary[reason] ?? message;
}

export function useCollabGovernance(networkId: string | null) {
  const queryClient = useQueryClient();

  const viewerOrgs = useQuery({
    queryKey: ['collab', 'viewer-orgs'],
    queryFn: async (): Promise<string[]> => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return [];
      const { data, error } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', auth.user.id);
      if (error) throw error;
      return (data ?? []).map((row) => row.organization_id);
    },
    staleTime: 60_000,
  });

  const networks = useQuery({
    queryKey: ['collab', 'networks'],
    queryFn: async (): Promise<CollabNetworkRow[]> => {
      const { data, error } = await supabase
        .from('collab_networks')
        .select('id, name, slug, owner_org_id, reciprocity_required')
        .order('name');
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60_000,
  });

  const organizations = useQuery({
    queryKey: ['collab', 'organizations'],
    queryFn: async (): Promise<OrganizationRow[]> => {
      const { data, error } = await supabase.from('organizations').select('id, name, slug').order('name');
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60_000,
  });

  const invitations = useQuery({
    queryKey: ['collab', 'invitations', networkId],
    enabled: Boolean(networkId),
    // Convites vencem sozinhos: sem refetch periódico a tela mente sobre o prazo.
    refetchInterval: 60_000,
    queryFn: async (): Promise<CollabInvitationRow[]> => {
      const { data, error } = await supabase
        .from('collab_invitations')
        .select('id, network_id, invited_org_id, status, ttl_days, expires_at, responded_at, note, created_at')
        .eq('network_id', networkId as string)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as CollabInvitationRow[];
    },
  });

  const memberships = useQuery({
    queryKey: ['collab', 'memberships', networkId],
    enabled: Boolean(networkId),
    queryFn: async (): Promise<CollabMembershipRow[]> => {
      const { data, error } = await supabase
        .from('collab_memberships')
        .select('id, network_id, organization_id, status, shares_data, created_at')
        .eq('network_id', networkId as string)
        .order('created_at');
      if (error) throw error;
      return (data ?? []) as CollabMembershipRow[];
    },
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['collab', 'invitations', networkId] });
    void queryClient.invalidateQueries({ queryKey: ['collab', 'memberships', networkId] });
  };

  const onError = (error: unknown) => {
    toast.error(describeGovernanceError(error instanceof Error ? error.message : String(error)));
  };

  const invite = useMutation({
    mutationFn: async (input: { invitedOrgId: string; ttlDays: number | null; note: string | null }) => {
      const { error } = await supabase.rpc('collab_invite_org', {
        p_network_id: networkId as string,
        p_invited_org_id: input.invitedOrgId,
        p_ttl_days: input.ttlDays,
        p_note: input.note,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Convite enviado.');
      invalidate();
    },
    onError,
  });

  const respond = useMutation({
    mutationFn: async (input: { invitationId: string; accept: boolean }) => {
      const { error } = await supabase.rpc('collab_respond_invite', {
        p_invitation_id: input.invitationId,
        p_accept: input.accept,
      });
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      toast.success(variables.accept ? 'Convite aceito.' : 'Convite recusado.');
      invalidate();
    },
    onError,
  });

  const revoke = useMutation({
    mutationFn: async (invitationId: string) => {
      const { error } = await supabase.rpc('collab_revoke_invite', { p_invitation_id: invitationId });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Convite revogado.');
      invalidate();
    },
    onError,
  });

  const setMembership = useMutation({
    mutationFn: async (input: { organizationId: string; status: MembershipStatus }) => {
      const { error } = await supabase.rpc('collab_set_membership_status', {
        p_network_id: networkId as string,
        p_organization_id: input.organizationId,
        p_status: input.status,
      });
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      toast.success(variables.status === 'active' ? 'Participação reativada.' : 'Participação suspensa.');
      invalidate();
    },
    onError,
  });

  const removeMembership = useMutation({
    mutationFn: async (organizationId: string) => {
      const { data, error } = await supabase.rpc('collab_remove_membership', {
        p_network_id: networkId as string,
        p_organization_id: organizationId,
      });
      if (error) throw error;
      return (data as number | null) ?? 0;
    },
    onSuccess: (revokedEntries) => {
      toast.success(
        revokedEntries > 0
          ? `Organização removida. ${revokedEntries} compartilhamento(s) revogado(s).`
          : 'Organização removida da rede.',
      );
      invalidate();
    },
    onError,
  });

  return {
    viewerOrgs,
    networks,
    organizations,
    invitations,
    memberships,
    invite,
    respond,
    revoke,
    setMembership,
    removeMembership,
  };
}
