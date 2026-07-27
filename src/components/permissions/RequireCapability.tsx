import type { ReactNode } from 'react';
import { useCapabilities } from '@/hooks/useCapabilities';
import type { Capability } from '@/lib/permissions/capabilities';
import { Skeleton } from '@/components/ui/skeleton';

export interface RequireCapabilityProps {
  /** Capacidade exigida (ou lista, avaliada com "todas" por padrão). */
  capability: Capability | Capability[];
  /** Quando `true`, basta UMA das capacidades da lista. */
  anyOf?: boolean;
  /** Conteúdo liberado quando a permissão existe. */
  children: ReactNode;
  /** Alternativa exibida quando falta permissão. Padrão: nada. */
  fallback?: ReactNode;
  /** Placeholder durante a leitura das permissões. Padrão: esqueleto. */
  pending?: ReactNode;
}

/**
 * Onda 150 — guarda declarativo de UI por capacidade.
 *
 * Este componente **não é segurança** — é ergonomia. A autorização real vive
 * nas políticas de acesso e nas rotinas do banco; aqui apenas evitamos
 * oferecer ao operador um botão que o servidor recusaria.
 *
 * Enquanto as permissões carregam nada é liberado: o estado intermediário
 * pende para o lado fechado, para que um piscar de tela não vire um clique
 * indevido em ação destrutiva.
 */
export function RequireCapability({
  capability,
  anyOf = false,
  children,
  fallback = null,
  pending,
}: RequireCapabilityProps) {
  const { loading, canAll, canAny } = useCapabilities();
  const required = Array.isArray(capability) ? capability : [capability];

  if (loading) {
    return <>{pending ?? <Skeleton className="h-9 w-32" />}</>;
  }

  const allowed = anyOf ? canAny(...required) : canAll(...required);
  return <>{allowed ? children : fallback}</>;
}

export default RequireCapability;
