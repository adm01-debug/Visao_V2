import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/lib/logger';
import {
  CAPABILITIES,
  type Capability,
  isKnownCapability,
} from '@/lib/permissions/capabilities';

/**
 * Onda 150 — leitura das capacidades EFETIVAS do usuário atual.
 *
 * A resolução acontece no banco (`public.my_capabilities()`), que é o mesmo
 * código de decisão usado pelas políticas de acesso. O cliente NÃO recalcula
 * a regra a partir do papel: se recalculasse, uma divergência de versão entre
 * front e banco viraria botão habilitado que falha no clique — ou, pior,
 * botão escondido para quem tem direito.
 *
 * Falha de rede degrada para o conjunto VAZIO (nega tudo). Esconder um botão
 * indevidamente é um incômodo; mostrá-lo por otimismo é uma brecha.
 */
interface UseCapabilitiesReturn {
  capabilities: ReadonlySet<Capability>;
  loading: boolean;
  error: string | null;
  can: (capability: Capability) => boolean;
  canAny: (...capabilities: Capability[]) => boolean;
  canAll: (...capabilities: Capability[]) => boolean;
  refetch: () => Promise<void>;
}

const EMPTY: ReadonlySet<Capability> = new Set<Capability>();

export function useCapabilities(): UseCapabilitiesReturn {
  const { user } = useAuth();
  const [capabilities, setCapabilities] = useState<ReadonlySet<Capability>>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCapabilities = useCallback(async () => {
    if (!user?.id) {
      setCapabilities(EMPTY);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error: rpcError } = await supabase.rpc('my_capabilities');
      if (rpcError) throw rpcError;

      // Capacidade desconhecida (banco à frente do front) é descartada:
      // o front não sabe o que fazer com ela e não deve fingir que sabe.
      const resolved = new Set<Capability>(
        (data ?? []).filter((value): value is Capability => isKnownCapability(value)),
      );
      setCapabilities(resolved);
      setError(null);
    } catch (cause) {
      logger.error('Falha ao carregar permissões efetivas', cause);
      setCapabilities(EMPTY);
      setError('Não foi possível carregar suas permissões.');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void fetchCapabilities();
  }, [fetchCapabilities]);

  const helpers = useMemo(
    () => ({
      can: (capability: Capability) => capabilities.has(capability),
      canAny: (...list: Capability[]) => list.some((c) => capabilities.has(c)),
      canAll: (...list: Capability[]) => list.every((c) => capabilities.has(c)),
    }),
    [capabilities],
  );

  return {
    capabilities,
    loading,
    error,
    ...helpers,
    refetch: fetchCapabilities,
  };
}

/** Catálogo exposto para telas de administração de permissões. */
export const ALL_CAPABILITIES = CAPABILITIES;
