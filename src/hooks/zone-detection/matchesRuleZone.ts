/**
 * VISÃO — Rule ⇔ Zone spatial matcher
 *
 * Uso: chame `matchesRuleZone(rule, detection, zonesById)` no avaliador
 * client-side de regras (ou reuse a lógica em edge functions) para descartar
 * detecções que caíram fora do polígono/círculo cadastrado para a regra.
 *
 * Regras sem `zone_id` (toda a imagem) sempre casam.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { isBoxInZone, isPointInPolygon } from '@/types/zones/helpers';
import type { Zone, ZoneGeometry, Point } from '@/types/zones/types';

export interface RuleZoneDetection {
  bounding_box?: { x: number; y: number; width: number; height: number } | null;
  point?: Point | null;
}

export interface RuleLike {
  zone_id?: string | null;
}

/**
 * Retorna true se a detecção casa com a zona da regra.
 * - Regra sem zona → sempre true.
 * - Zona não encontrada / inativa → false (fail-closed).
 */
export function matchesRuleZone(
  rule: RuleLike,
  detection: RuleZoneDetection,
  zonesById: Map<string, Zone>
): boolean {
  if (!rule.zone_id) return true;
  const zone = zonesById.get(rule.zone_id);
  if (!zone) return false;
  if (detection.bounding_box) return isBoxInZone(detection.bounding_box, zone);
  if (detection.point) return isPointInPolygon(detection.point, extractPoints(zone.geometry));
  return false;
}

function extractPoints(geometry: ZoneGeometry): Point[] {
  if (geometry.shape === 'polygon' || geometry.shape === 'rectangle') return geometry.points;
  return [];
}

/**
 * Hook cacheado (60s) que devolve o mapa de zonas ativas indexado por id,
 * pronto para alimentar `matchesRuleZone`.
 */
export function useZonesById() {
  return useQuery({
    queryKey: ['zones-by-id'],
    queryFn: async () => {
      const { data, error } = await supabase.from('zones').select('*').eq('is_active', true);
      if (error) throw error;
      const map = new Map<string, Zone>();
      for (const row of data || []) {
        map.set(row.id, row as unknown as Zone);
      }
      return map;
    },
    staleTime: 60_000,
  });
}
