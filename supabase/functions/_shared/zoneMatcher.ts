/**
 * VISÃO — Rule ⇔ Zone spatial matcher (Edge runtime port).
 *
 * Espelha `src/hooks/zone-detection/matchesRuleZone.ts` para uso em Deno.
 * Descarta detecções cujo bounding_box/ponto caem fora da zona atrelada à regra.
 *
 * A tabela `public.zones` guarda `points: JSONB` — pode ser:
 *   - `[{x,y}, ...]`  → polígono legado
 *   - `{ shape, points, center, radius }` → geometria completa
 *
 * Regras sem `zone_id` → sempre match. Zona ausente/inativa → false (fail-closed).
 */
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface Point { x: number; y: number; }
export interface BoundingBox { x: number; y: number; width: number; height: number; }
export type ZoneShape = "polygon" | "rectangle" | "circle" | "line";
export interface ZoneGeometry {
  shape: ZoneShape;
  points: Point[];
  center?: Point;
  radius?: number;
}
export interface ZoneRow {
  id: string;
  is_active: boolean;
  geometry: ZoneGeometry;
}
export interface Detection {
  bounding_box?: BoundingBox | null;
  point?: Point | null;
}
export interface RuleLike { zone_id?: string | null; }

export function isPointInPolygon(point: Point, polygon: Point[]): boolean {
  let inside = false;
  const n = polygon.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const pi = polygon[i]!, pj = polygon[j]!;
    if (((pi.y > point.y) !== (pj.y > point.y)) &&
        (point.x < (pj.x - pi.x) * (point.y - pi.y) / (pj.y - pi.y) + pi.x)) {
      inside = !inside;
    }
  }
  return inside;
}

export function isBoxInZone(box: BoundingBox, geometry: ZoneGeometry): boolean {
  const center: Point = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  if (geometry.shape === "polygon" || geometry.shape === "rectangle") {
    return isPointInPolygon(center, geometry.points);
  }
  if (geometry.shape === "circle" && geometry.center && typeof geometry.radius === "number") {
    const dx = center.x - geometry.center.x;
    const dy = center.y - geometry.center.y;
    return Math.sqrt(dx * dx + dy * dy) <= geometry.radius;
  }
  return false;
}

/** Normaliza o JSONB `points` da tabela `zones` em uma ZoneGeometry. */
export function normalizeGeometry(raw: unknown): ZoneGeometry | null {
  if (!raw) return null;
  if (Array.isArray(raw)) {
    const pts = raw.filter((p): p is Point =>
      !!p && typeof (p as Point).x === "number" && typeof (p as Point).y === "number");
    return pts.length >= 3 ? { shape: "polygon", points: pts } : null;
  }
  if (typeof raw === "object") {
    const g = raw as Partial<ZoneGeometry>;
    if (!g.shape) return null;
    return {
      shape: g.shape,
      points: Array.isArray(g.points) ? g.points : [],
      center: g.center,
      radius: g.radius,
    };
  }
  return null;
}

/** True quando a detecção casa espacialmente com a zona (ou regra sem zone_id). */
export function matchesRuleZone(
  rule: RuleLike,
  detection: Detection | null | undefined,
  zonesById: Map<string, ZoneRow>,
): boolean {
  if (!rule.zone_id) return true;
  if (!detection || (!detection.bounding_box && !detection.point)) {
    // Sem payload espacial não é possível verificar — mantemos o disparo para
    // preservar compatibilidade com callers legados que não enviam detection.
    return true;
  }
  const zone = zonesById.get(rule.zone_id);
  if (!zone || !zone.is_active) return false;
  if (detection.bounding_box) return isBoxInZone(detection.bounding_box, zone.geometry);
  if (detection.point) {
    if (zone.geometry.shape === "circle" && zone.geometry.center && typeof zone.geometry.radius === "number") {
      const dx = detection.point.x - zone.geometry.center.x;
      const dy = detection.point.y - zone.geometry.center.y;
      return Math.sqrt(dx * dx + dy * dy) <= zone.geometry.radius;
    }
    return isPointInPolygon(detection.point, zone.geometry.points);
  }
  return false;
}

/** Busca zonas ativas do usuário e devolve mapa indexado por id. */
export async function fetchZonesById(
  supabase: SupabaseClient,
  userId: string,
  zoneIds: string[],
): Promise<Map<string, ZoneRow>> {
  const map = new Map<string, ZoneRow>();
  const unique = Array.from(new Set(zoneIds.filter(Boolean)));
  if (unique.length === 0) return map;
  const { data, error } = await supabase
    .from("zones")
    .select("id, is_active, points")
    .eq("user_id", userId)
    .in("id", unique);
  if (error || !data) return map;
  for (const row of data as Array<{ id: string; is_active: boolean; points: unknown }>) {
    const geometry = normalizeGeometry(row.points);
    if (!geometry) continue;
    map.set(row.id, { id: row.id, is_active: row.is_active, geometry });
  }
  return map;
}
