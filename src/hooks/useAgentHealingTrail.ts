import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type {
  HealingTrailAction,
  HealingTrailEntry,
  HealingTrailSeverity,
} from '@/lib/agents/healingTrail';

/**
 * Onda 140 — leitura do rastro de decisão do auto-healing.
 *
 * Somente leitura. Quem decide é a rotina agendada no banco (`heal_local_agents`);
 * este hook existe apenas para tornar visível a decisão de NÃO agir, que hoje é
 * gravada em `agent_healing_actions` mas não aparece em nenhuma tela.
 *
 * RLS já restringe as linhas ao dono do agente ou a administradores — não há
 * filtro de `user_id` no cliente de propósito: duplicar a regra aqui criaria uma
 * segunda fonte de verdade que pode divergir da política do banco.
 */

const TRAIL_ACTIONS: readonly HealingTrailAction[] = ['observe', 'defer', 'suppress'];

interface TrailRow {
  id: string;
  agent_id: string;
  action: string;
  severity: string;
  reason: string;
  silent_minutes: number | null;
  deaf_ratio: number | null;
  attempts: number | null;
  created_at: string;
}

function normalizeAction(value: string): HealingTrailAction {
  return (TRAIL_ACTIONS as readonly string[]).includes(value)
    ? (value as HealingTrailAction)
    : 'observe';
}

function normalizeSeverity(value: string): HealingTrailSeverity {
  return value === 'critical' || value === 'warning' || value === 'ok'
    ? (value as HealingTrailSeverity)
    : 'warning';
}

export interface UseAgentHealingTrailOptions {
  /** Quantas decisões trazer. Padrão 20 — o suficiente para uma varredura inteira. */
  readonly limit?: number;
}

export function useAgentHealingTrail(options: UseAgentHealingTrailOptions = {}) {
  const limit = options.limit ?? 20;

  return useQuery<HealingTrailEntry[]>({
    queryKey: ['agent-healing-trail', limit],
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agent_healing_actions')
        .select('id, agent_id, action, severity, reason, silent_minutes, deaf_ratio, attempts, created_at')
        .in('action', TRAIL_ACTIONS as string[])
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      const rows = (data ?? []) as TrailRow[];
      if (rows.length === 0) return [];

      // Nome do agente vem de outra tabela; sem ele o operador vê um UUID e não
      // consegue agir. Busca única em lote — nunca uma query por linha.
      const agentIds = [...new Set(rows.map((row) => row.agent_id))];
      const { data: agents } = await supabase
        .from('local_agents')
        .select('id, name')
        .in('id', agentIds);

      const nameById = new Map<string, string>(
        (agents ?? []).map((agent) => [agent.id as string, (agent.name as string) ?? '']),
      );

      return rows.map<HealingTrailEntry>((row) => ({
        id: row.id,
        agentId: row.agent_id,
        agentName: nameById.get(row.agent_id) ?? null,
        action: normalizeAction(row.action),
        severity: normalizeSeverity(row.severity),
        reason: row.reason ?? '',
        silentMinutes: row.silent_minutes,
        deafRatio: row.deaf_ratio,
        attempts: row.attempts ?? 0,
        createdAt: row.created_at,
      }));
    },
  });
}
