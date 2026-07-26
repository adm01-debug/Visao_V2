/**
 * Onda 131 — Preferência de silenciamento da caixa de entrada colaborativa.
 *
 * A leitura é direta na tabela (só `SELECT` para `authenticated`, com RLS pelo
 * próprio usuário); a escrita passa pela rotina `SECURITY DEFINER`, porque
 * "quem pode silenciar o quê, e por quanto tempo" é decisão do banco. A tela
 * não reimplementa a regra: ela pede, e mostra o que o banco devolveu.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  normalizeSilencedKinds,
  type SilencePreference,
} from '@/lib/collab/collabNotificationSilencing';

/** Mensagens amigáveis para as recusas levantadas pelo banco. */
const REJECTION_LABEL: Readonly<Record<string, string>> = {
  silence_no_valid_kind: 'Nenhum dos tipos escolhidos pode ser silenciado.',
  silence_requires_deadline: 'Silenciar exige um prazo — silêncio permanente não é permitido.',
  silence_deadline_in_past: 'O prazo escolhido já passou.',
  silence_deadline_too_far: 'O prazo excede o limite de 90 dias.',
  not_a_member: 'Você não participa desta organização.',
  not_authenticated: 'Sessão expirada. Entre novamente.',
};

const describeError = (message: string): string => {
  for (const [code, label] of Object.entries(REJECTION_LABEL)) {
    if (message.includes(code)) return label;
  }
  return message;
};

export function useCollabSilence(organizationId: string | null) {
  const queryClient = useQueryClient();
  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['collab', 'silence'] });
    void queryClient.invalidateQueries({ queryKey: ['collab', 'notifications'] });
  };

  const preference = useQuery({
    queryKey: ['collab', 'silence', organizationId],
    enabled: organizationId !== null,
    queryFn: async (): Promise<SilencePreference | null> => {
      if (organizationId === null) return null;
      const { data, error } = await supabase
        .from('collab_notification_silences')
        .select('silenced_kinds, silenced_until')
        .eq('organization_id', organizationId)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return {
        silencedKinds: normalizeSilencedKinds(data.silenced_kinds),
        silencedUntil: data.silenced_until,
      };
    },
  });

  const silence = useMutation({
    mutationFn: async (input: { kinds: readonly string[]; until: Date }) => {
      if (organizationId === null) return;
      const { error } = await supabase.rpc('collab_set_notification_silence', {
        p_organization_id: organizationId,
        p_kinds: [...input.kinds],
        p_until: input.until.toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success('Avisos silenciados');
    },
    onError: (error: Error) => {
      toast.error('Não foi possível silenciar', { description: describeError(error.message) });
    },
  });

  const clear = useMutation({
    mutationFn: async () => {
      if (organizationId === null) return;
      const { error } = await supabase.rpc('collab_clear_notification_silence', {
        p_organization_id: organizationId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success('Silenciamento removido');
    },
    onError: (error: Error) => {
      toast.error('Não foi possível reativar os avisos', {
        description: describeError(error.message),
      });
    },
  });

  return { preference, silence, clear };
}
