import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import type { CapabilityGrant, CapabilityGrantEffect } from '@/lib/permissions/capabilities';

/**
 * Onda 151 — leitura e escrita das concessões de um usuário.
 *
 * A escrita NUNCA usa INSERT/UPDATE direto: passa pelas rotinas
 * `grant_capability` / `revoke_capability_grant`, que são a regra de
 * admissão no servidor. O cliente pré-valida apenas para dar mensagem
 * imediata — o veredito que vale é o do banco.
 */
export interface CapabilityGrantRow extends CapabilityGrant {
  id: string;
  userId: string;
  reason: string | null;
  grantedBy: string | null;
  createdAtMs: number;
}

interface UseCapabilityGrantsReturn {
  grants: CapabilityGrantRow[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  grantsOf: (userId: string) => CapabilityGrantRow[];
  createGrant: (input: {
    userId: string;
    capability: string;
    effect: CapabilityGrantEffect;
    reason: string;
    expiresAtMs: number;
  }) => Promise<{ ok: boolean; message: string }>;
  revokeGrant: (grantId: string, reason: string) => Promise<{ ok: boolean; message: string }>;
}

/** Traduz o código de recusa devolvido pelo banco para PT-BR. */
const SERVER_MESSAGES: Record<string, string> = {
  actor_missing_capability: 'Você não tem permissão para conceder capacidades.',
  self_grant: 'Não é possível conceder ou negar capacidades para si mesmo.',
  unknown_capability: 'Capacidade desconhecida.',
  reason_required: 'Informe uma justificativa com pelo menos 8 caracteres.',
  expiry_required: 'Toda concessão precisa de prazo de validade.',
  expiry_in_past: 'O prazo informado já está vencido.',
  expiry_too_far: 'O prazo máximo é de 90 dias.',
  escalation: 'Você não pode conceder uma capacidade que não possui.',
  redundant_grant: 'O usuário já possui essa capacidade — a concessão não teria efeito.',
  ineffective_deny: 'A negação não teria efeito sobre este usuário.',
  not_found: 'Concessão não encontrada.',
  invalid_effect: 'Efeito inválido.',
};

const translate = (raw: string): string => {
  for (const [code, message] of Object.entries(SERVER_MESSAGES)) {
    if (raw.includes(code)) return message;
  }
  return raw;
};

export function useCapabilityGrants(): UseCapabilityGrantsReturn {
  const [grants, setGrants] = useState<CapabilityGrantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error: queryError } = await supabase
        .from('user_capability_grants')
        .select('id, user_id, capability, effect, reason, granted_by, expires_at, revoked_at, created_at')
        .order('created_at', { ascending: false });

      if (queryError) throw queryError;

      setGrants(
        (data ?? []).map((row) => ({
          id: row.id,
          userId: row.user_id,
          capability: row.capability,
          effect: row.effect as CapabilityGrantEffect,
          reason: row.reason,
          grantedBy: row.granted_by,
          expiresAtMs: row.expires_at ? new Date(row.expires_at).getTime() : null,
          revokedAtMs: row.revoked_at ? new Date(row.revoked_at).getTime() : null,
          createdAtMs: new Date(row.created_at).getTime(),
        })),
      );
      setError(null);
    } catch (cause) {
      logger.error('Falha ao carregar concessões de permissão', cause);
      setGrants([]);
      setError('Não foi possível carregar as concessões.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const byUser = useMemo(() => {
    const map = new Map<string, CapabilityGrantRow[]>();
    for (const grant of grants) {
      const list = map.get(grant.userId) ?? [];
      list.push(grant);
      map.set(grant.userId, list);
    }
    return map;
  }, [grants]);

  const grantsOf = useCallback((userId: string) => byUser.get(userId) ?? [], [byUser]);

  const createGrant: UseCapabilityGrantsReturn['createGrant'] = useCallback(
    async (input) => {
      try {
        const { error: rpcError } = await supabase.rpc('grant_capability', {
          _user_id: input.userId,
          _capability: input.capability,
          _effect: input.effect,
          _reason: input.reason,
          _expires_at: new Date(input.expiresAtMs).toISOString(),
        });
        if (rpcError) throw rpcError;
        await refetch();
        return { ok: true, message: 'Concessão registrada.' };
      } catch (cause) {
        const raw = cause instanceof Error ? cause.message : String(cause);
        return { ok: false, message: translate(raw) };
      }
    },
    [refetch],
  );

  const revokeGrant: UseCapabilityGrantsReturn['revokeGrant'] = useCallback(
    async (grantId, reason) => {
      try {
        const { data, error: rpcError } = await supabase.rpc('revoke_capability_grant', {
          _grant_id: grantId,
          _reason: reason || undefined,
        });
        if (rpcError) throw rpcError;
        await refetch();
        return { ok: true, message: data ? 'Concessão revogada.' : 'A concessão já estava revogada.' };
      } catch (cause) {
        const raw = cause instanceof Error ? cause.message : String(cause);
        return { ok: false, message: translate(raw) };
      }
    },
    [refetch],
  );

  return { grants, loading, error, refetch, grantsOf, createGrant, revokeGrant };
}
