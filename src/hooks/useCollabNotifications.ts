/**
 * Onda 130 — Caixa de entrada da rede colaborativa.
 *
 * A leitura é direta na tabela (que só concede `SELECT` a `authenticated`, com
 * RLS por organização); marcar como lido passa pela rotina `SECURITY DEFINER`,
 * porque "quem pode marcar" é uma decisão do banco, não do cliente.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type {
  CollabNotificationKind,
  CollabNotificationSeverity,
} from '@/lib/collab/collabNotifications';

export interface CollabNotificationRow {
  id: string;
  network_id: string;
  organization_id: string;
  actor_org_id: string | null;
  invitation_id: string | null;
  kind: CollabNotificationKind;
  severity: CollabNotificationSeverity;
  created_at: string;
}

export interface CollabNotificationItem extends CollabNotificationRow {
  read: boolean;
}

const PAGE_SIZE = 50;

export function useCollabNotifications(networkId: string | null) {
  const queryClient = useQueryClient();

  const notifications = useQuery({
    queryKey: ['collab', 'notifications', networkId],
    enabled: networkId !== null,
    queryFn: async (): Promise<CollabNotificationItem[]> => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user || networkId === null) return [];

      const { data, error } = await supabase
        .from('collab_notifications')
        .select(
          'id, network_id, organization_id, actor_org_id, invitation_id, kind, severity, created_at'
        )
        .eq('network_id', networkId)
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE);
      if (error) throw error;

      const rows = (data ?? []) as CollabNotificationRow[];
      if (rows.length === 0) return [];

      // Uma consulta separada para as leituras: a tabela de avisos não sabe
      // quem leu, e juntar isso no servidor exigiria expor leitura alheia.
      const { data: reads, error: readsError } = await supabase
        .from('collab_notification_reads')
        .select('notification_id')
        .in(
          'notification_id',
          rows.map((row) => row.id)
        );
      if (readsError) throw readsError;

      const readIds = new Set((reads ?? []).map((row) => row.notification_id));
      return rows.map((row) => ({ ...row, read: readIds.has(row.id) }));
    },
  });

  const markRead = useMutation({
    mutationFn: async (ids: string[]) => {
      if (ids.length === 0) return 0;
      const { data, error } = await supabase.rpc('collab_mark_notifications_read', { p_ids: ids });
      if (error) throw error;
      return data ?? 0;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['collab', 'notifications'] });
    },
    onError: (error: Error) => {
      toast.error('Não foi possível marcar como lido', { description: error.message });
    },
  });

  return { notifications, markRead };
}
